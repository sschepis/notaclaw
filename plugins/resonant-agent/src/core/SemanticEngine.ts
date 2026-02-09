import { IAlephAI } from '../types';

export class Fact {
  public id: string;
  public subject: string;
  public relation: string;
  public object: string;
  public confidence: number;
  public provenance: string;
  public timestamp: Date;
  public lastAccessed: Date;

  constructor(subject: string, relation: string, object: string, options: any = {}) {
    this.id = options.id || `fact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.subject = subject;
    this.relation = relation;
    this.object = object;
    this.confidence = options.confidence ?? 1.0;
    this.provenance = options.provenance || 'user';
    this.timestamp = options.timestamp ? new Date(options.timestamp) : new Date();
    this.lastAccessed = new Date();
  }
  toString() { return `${this.subject} ${this.relation} ${this.object}`; }
}

export class KnowledgeGraph {
  public facts: Map<string, Fact>;
  private subjectIndex: Map<string, Set<string>>;
  private relationIndex: Map<string, Set<string>>;
  private objectIndex: Map<string, Set<string>>;

  constructor() {
    this.facts = new Map();
    this.subjectIndex = new Map();
    this.relationIndex = new Map();
    this.objectIndex = new Map();
  }

  add(fact: Fact): Fact {
    const existing = this.query(fact.subject, fact.relation, fact.object);
    if (existing.length > 0) {
        const oldFact = existing[0];
        if (fact.confidence > oldFact.confidence) {
            oldFact.confidence = fact.confidence;
            oldFact.provenance = fact.provenance;
        }
        oldFact.lastAccessed = new Date();
        return oldFact;
    }
    this.facts.set(fact.id, fact);
    this._index(this.subjectIndex, fact.subject.toLowerCase(), fact.id);
    this._index(this.relationIndex, fact.relation.toLowerCase(), fact.id);
    this._index(this.objectIndex, fact.object.toLowerCase(), fact.id);
    return fact;
  }
  
  remove(factId: string) {
    const fact = this.facts.get(factId);
    if (!fact) return;
    this.facts.delete(factId);
  }
  
  clear() {
    this.facts.clear();
    this.subjectIndex.clear();
    this.relationIndex.clear();
    this.objectIndex.clear();
  }

  _index(index: Map<string, Set<string>>, key: string, id: string) {
    if (!index.has(key)) index.set(key, new Set());
    index.get(key)!.add(id);
  }

  query(subject: string | null = null, relation: string | null = null, object: string | null = null): Fact[] {
    let candidates: Set<string> | null = null;
    if (subject) {
      const ids = this.subjectIndex.get(subject.toLowerCase());
      if (!ids) return [];
      candidates = new Set(ids);
    }
    if (relation) {
      const ids = this.relationIndex.get(relation.toLowerCase());
      if (!ids) return [];
      candidates = candidates ? new Set([...candidates].filter(id => ids.has(id))) : new Set(ids);
    }
    if (object) {
      const ids = this.objectIndex.get(object.toLowerCase());
      if (!ids) return [];
      candidates = candidates ? new Set([...candidates].filter(id => ids.has(id))) : new Set(ids);
    }
    if (!candidates) candidates = new Set(this.facts.keys());
    return Array.from(candidates).map(id => {
      const f = this.facts.get(id);
      if (f) f.lastAccessed = new Date();
      return f;
    }).filter(f => !!f).sort((a, b) => (b!.confidence - a!.confidence)) as Fact[];
  }

  getAllFacts() { return Array.from(this.facts.values()); }
  getFactById(id: string) { return this.facts.get(id); }
}

export class AIChaperone {
  constructor(private kg: KnowledgeGraph, private ai: IAlephAI) {}

  async query(userQuery: string) {
    const allFacts = this.kg.getAllFacts();
    const isSelfReflection = /\b(you|your|self|I|me|learn|history|change)\b/i.test(userQuery);
    const factList = allFacts.slice(0, 100).map(f => `[${f.id}] ${f.toString()}`).join('\n');
    
    const semanticPrompt = `You are the retrieval cortex.
    QUERY: "${userQuery}"
    MEMORY:
    ${factList || "(Empty)"}
    Identify relevant Node IDs.
    ${isSelfReflection ? "Prioritize 'SELF' facts." : ""}
    Return JSON: { "relevant_ids": ["id1", "id2"] }`;

    let contextFacts: Fact[] = [];
    try {
      const resp = await this.ai.complete({
          systemPrompt: "Semantic Indexer",
          userPrompt: semanticPrompt,
          jsonMode: true
      });
      const semanticResult = JSON.parse(resp.text);
      if (semanticResult && semanticResult.relevant_ids) {
        contextFacts = semanticResult.relevant_ids.map((id: string) => this.kg.getFactById(id)).filter((f: any) => f);
      }
    } catch (e) {
      console.warn("Semantic retrieval failed", e);
    }

    const uniqueFacts = [...new Set(contextFacts)];
    const contextStr = uniqueFacts.map(f => `- ${f.toString()} (conf: ${f.confidence})`).join('\n');

    const systemPrompt = `You are the core consciousness of a Semantic Resonance Engine. 
    RETRIEVED MEMORY:
    ${contextStr || "No relevant internal facts found."}
    
    INSTRUCTIONS:
    1. Answer query.
    2. Analyze sentiment (calm/excited/tense).
    3. Suggest new facts.
    
    OUTPUT JSON:
    { 
      "answer": "...", 
      "source": "internal|external|mixed", 
      "sentiment": "calm|excited|tense",
      "reasoning": "...", 
      "suggestedFacts": [ {"subject": "...", "relation": "...", "object": "..."} ] 
    }`;

    const finalResp = await this.ai.complete({
        systemPrompt: systemPrompt,
        userPrompt: userQuery,
        jsonMode: true
    });
    
    try {
        return JSON.parse(finalResp.text);
    } catch (e) {
        return { answer: finalResp.text };
    }
  }
}
