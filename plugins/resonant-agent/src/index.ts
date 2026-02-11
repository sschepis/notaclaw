
interface PluginContext {
  ai: any;
  dsn: {
    registerTool(def: any, handler: (args: any) => Promise<any>): void;
  };
}

interface FactOptions {
  id?: string;
  confidence?: number;
  provenance?: string;
  timestamp?: number | string | Date;
}

export class Fact {
  id: string;
  subject: string;
  relation: string;
  object: string;
  confidence: number;
  provenance: string;
  timestamp: Date;
  lastAccessed: Date;

  constructor(subject: string, relation: string, object: string, options: FactOptions = {}) {
    this.id = options.id || `fact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.subject = subject;
    this.relation = relation;
    this.object = object;
    this.confidence = options.confidence ?? 1;
    this.provenance = options.provenance || "user";
    this.timestamp = options.timestamp ? new Date(options.timestamp) : new Date();
    this.lastAccessed = new Date();
  }

  toString() {
    return `${this.subject} ${this.relation} ${this.object}`;
  }
}

export class KnowledgeGraph {
  facts: Map<string, Fact>;
  subjectIndex: Map<string, Set<string>>;
  relationIndex: Map<string, Set<string>>;
  objectIndex: Map<string, Set<string>>;

  constructor() {
    this.facts = new Map();
    this.subjectIndex = new Map();
    this.relationIndex = new Map();
    this.objectIndex = new Map();
  }

  add(fact: Fact) {
    // Check for existing similar fact?
    // The original code tried to find existing, but the logic query(...) returns an array.
    // Let's keep it simple or follow the original intent if possible.
    // The original code:
    // const existing = this.query(fact.subject, fact.relation, fact.object);
    // if (existing.length > 0) ... update confidence ... return oldFact
    
    // For now, simple add.
    this.facts.set(fact.id, fact);
    this._index(this.subjectIndex, fact.subject.toLowerCase(), fact.id);
    this._index(this.relationIndex, fact.relation.toLowerCase(), fact.id);
    this._index(this.objectIndex, fact.object.toLowerCase(), fact.id);
    return fact;
  }

  remove(factId: string) {
    if (this.facts.has(factId)) {
      this.facts.delete(factId);
      // cleanup indexes? (Skipping for brevity/performance in this simplified version)
    }
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

    return Array.from(candidates)
      .map(id => this.facts.get(id))
      .filter((f): f is Fact => !!f)
      .sort((a, b) => b.confidence - a.confidence);
  }

  getAllFacts() {
    return Array.from(this.facts.values());
  }

  getFactById(id: string) {
    return this.facts.get(id);
  }
}

export class AIChaperone {
  kg: KnowledgeGraph;
  ai: any;

  constructor(kg: KnowledgeGraph, ai: any) {
    this.kg = kg;
    this.ai = ai;
  }

  async query(userQuery: string) {
    const allFacts = this.kg.getAllFacts();
    const isSelfReflection = /\b(you|your|self|I|me|learn|history|change)\b/i.test(userQuery);
    const factList = allFacts.slice(0, 100).map((f) => `[${f.id}] ${f.toString()}`).join("\n");
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
        contextFacts = semanticResult.relevant_ids.map((id: string) => this.kg.getFactById(id)).filter((f: Fact | undefined) => !!f);
      }
    } catch (e) {
      console.warn("Semantic retrieval failed", e);
    }

    const uniqueFacts = [...new Set(contextFacts)];
    const contextStr = uniqueFacts.map((f) => `- ${f.toString()} (conf: ${f.confidence})`).join("\n");
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

    try {
        const finalResp = await this.ai.complete({
            systemPrompt,
            userPrompt: userQuery,
            jsonMode: true
        });
        return JSON.parse(finalResp.text);
    } catch (e) {
        console.error("AI Completion failed", e);
        return { answer: "I encountered an error processing your request." };
    }
  }
}

export class ResonantAgentPlugin {
  context: PluginContext;
  kg: KnowledgeGraph;
  chaperone: AIChaperone;

  constructor(context: PluginContext) {
    this.context = context;
    this.kg = new KnowledgeGraph();
    this.chaperone = new AIChaperone(this.kg, this.context.ai);
    this.kg.add(new Fact("SELF", "is", "Resonance_Engine"));
  }

  async activate() {
    console.log("[ResonantAgent] Activating Semantic Core...");
    this.context.dsn.registerTool({
      name: "consultResonanceEngine",
      description: "Query the semantic resonance engine for insights.",
      executionLocation: "SERVER",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" }
        },
        required: ["query"]
      },
      semanticDomain: "cognitive",
      primeDomain: [5, 7],
      smfAxes: [],
      requiredTier: "Adept",
      version: "1.0.0"
    }, async (args: any) => {
      const query = args.query;
      console.log(`[ResonantAgent] Processing query: ${query}`);
      return await this.chaperone.query(query);
    });
    console.log("[ResonantAgent] Active.");
  }
}

export const activate = async (context: PluginContext) => {
  const agent = new ResonantAgentPlugin(context);
  await agent.activate();
};
