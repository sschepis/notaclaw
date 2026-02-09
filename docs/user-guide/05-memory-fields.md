# Memory Fields

Memory Fields are a core feature of the AlephNet system, providing semantic memory storage that enables context-aware AI interactions. Unlike simple chat history, Memory Fields capture the meaning of information and make it retrievable through semantic similarity.

## Understanding Memory Fields

### What is a Memory Field?
A Memory Field is a container for semantic knowledge, represented as:
- **Fragments**: Individual pieces of information (facts, observations, summaries)
- **SMF Vectors**: 16-dimensional semantic field vectors for each fragment
- **Entropy Score**: A measure of information coherence (0 = highly coherent, 1 = chaotic)

### Memory Scopes

Memory Fields are organized into hierarchical scopes:

| Scope | Description | Lifetime | Visibility |
|-------|-------------|----------|------------|
| **Global** | Shared across the AlephNet mesh | Permanent | Public to all nodes |
| **User** | Your personal memory | Permanent | Private |
| **Conversation** | Context for a specific chat | Session-based | Private |
| **Organization** | Shared with group members | Permanent | Group members |

## Accessing Memory Fields

### Via NavRail
1. Click the **Memory Fields** icon (database) in the NavRail
2. The sidebar shows all available fields organized by scope
3. Click a field to view its details in the Stage

### Field Panel Features
- **Search**: Filter fields by name or description
- **Scope Filters**: View fields by scope category
- **Create**: Add new user memory fields
- **Fold**: Merge conversation memory into user memory

## Working with Memory Fields

### Viewing Field Contents
1. Select a field in the sidebar
2. The Memory Viewer opens in the Stage
3. Browse fragments with their:
   - Content preview
   - Contribution count
   - Entropy indicator
   - Creation timestamp

### Creating a Memory Field
1. Click the **+** button in the Memory Fields panel
2. Enter field details:
   - **Name**: Descriptive name
   - **Description**: What this field stores
   - **Visibility**: Private or shared
3. Click Create

### Adding Fragments
Fragments are typically added automatically:
- **From Conversations**: Important information is extracted
- **From Tools**: Agent actions generate observations
- **Manually**: Right-click and "Add to Memory"

### Folding Conversation Memory
After a productive conversation, you can "fold" its memory into your permanent user memory:

1. Find a conversation-scoped field in the panel
2. Click the fold icon (↕️)
3. Confirm the operation
4. Fragments merge into your user memory
5. Original conversation field is locked

**Why Fold?**
- Preserves valuable insights beyond the conversation
- Consolidates scattered knowledge
- Reduces entropy by organizing information

### Deleting Fields
1. Hover over a field
2. Click the delete icon (🗑️)
3. Confirm deletion
4. **Warning**: This permanently removes all fragments

## Memory in AI Conversations

### Automatic Context
The AI agent automatically considers relevant memory:
1. Your message is analyzed for semantic content
2. Similar fragments are retrieved from your memory fields
3. Context is injected into the AI prompt
4. Response is informed by your stored knowledge

### Memory Indicators
In the chat interface:
- 🧠 icon indicates memory was used
- Hover to see which fragments were retrieved
- Click to view fragment details

### Controlling Memory Usage
In the input deck:
- Toggle memory inclusion on/off
- Select specific memory fields to search
- Adjust retrieval threshold

## Entropy and Coherence

### What is Entropy?
Entropy measures how organized the information in a field is:

| Entropy Range | Meaning | Visual Indicator |
|---------------|---------|------------------|
| 0% - 30% | Highly coherent, well-organized | 🟢 Green |
| 30% - 70% | Mixed coherence | 🟡 Amber |
| 70% - 100% | High entropy, chaotic | 🔴 Red |

### Reducing Entropy
High entropy indicates fragmented or contradictory information:
1. Review and consolidate similar fragments
2. Delete outdated or irrelevant fragments
3. Use the "Summarize" action to create coherent summaries
4. Fold related conversation memories together

### Entropy Impact
- **Low entropy**: Better retrieval, more coherent AI responses
- **High entropy**: May retrieve conflicting information

## SMF Vectors

### Understanding SMF
The Semantic Meaning Field (SMF) is a 16-dimensional vector representing the semantic content of text. Each dimension captures a different aspect of meaning.

### Viewing SMF
In the Inspector's Cortex tab:
- **Radar Chart**: Visualizes the 16 SMF dimensions
- **Current Vector**: Shows the active context's SMF
- **Field Vectors**: Aggregate SMF of memory fields

### SMF Dimensions
The 16 dimensions capture aspects like:
- Cognitive complexity
- Temporal orientation
- Emotional valence
- Action orientation
- Abstract vs. concrete
- And more...

## Memory Field Best Practices

### Organization
1. **Thematic Fields**: Create fields for specific topics
2. **Project Fields**: Dedicate fields to major projects
3. **Archive Fields**: Move old but valuable memory

### Maintenance
1. **Regular Review**: Periodically check entropy levels
2. **Prune Irrelevant**: Delete outdated fragments
3. **Consolidate**: Fold related memories together

### Privacy
1. **User Scope**: Default for personal information
2. **Organization Scope**: Only for appropriate sharing
3. **Be Mindful**: Consider what you store

## Advanced Features

### Fragment Search
1. Use the search bar in Memory Viewer
2. Search by:
   - Text content (keyword match)
   - Semantic similarity (finds related concepts)
3. Filter by date range or contribution source

### Export/Import
- **Export**: Download field contents as JSON
- **Import**: Load fragments from external sources
- **Sync**: Fields sync across AlephNet peers (by scope)

### API Access
Plugins can interact with memory fields:
```javascript
// In plugin main process
context.dsn.publishObservation(content, smfVector);
context.dsn.query("semantic query", { scope: 'user' });
```

## Troubleshooting

### Memory Not Being Retrieved
1. Check memory is enabled in input deck
2. Verify field has fragments
3. Check entropy isn't too high
4. Try more specific queries

### High Entropy
1. Review fragment contents
2. Remove duplicates or conflicts
3. Use summarization
4. Consider splitting into multiple fields

### Missing Fields
1. Check scope filter in sidebar
2. Verify field wasn't deleted
3. Check permissions for organization fields
4. Reload the Memory Fields panel
