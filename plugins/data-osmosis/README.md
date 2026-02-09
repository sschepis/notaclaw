# Data Osmosis

**Data Osmosis** is a universal data connector plugin for the AlephNet-Integrated Durable Agent Mesh. It bridges the gap between traditional data silos and the semantic, distributed world of AlephNet.

## Features

- **Multi-Source Ingestion**: Connect to PostgreSQL, MySQL, MongoDB, Redis, and REST APIs.
- **Semantic Mapping**: Automatically map relational tables or JSON documents to semantic entities in the Global Memory Field (GMF).
- **Real-Time Sync**: Keep the semantic graph updated as the source data changes (Change Data Capture support).
- **Privacy Filters**: Configure which fields are public, private, or redacted before entering the mesh.
- **Auto-Tagging**: Use local LLMs to automatically tag and categorize ingested data.

## Supported Connectors

- **Databases**: PostgreSQL, MySQL, SQLite, MongoDB.
- **APIs**: REST, GraphQL, SOAP.
- **Files**: CSV, JSON, XML (via local upload).
- **Services**: Notion, Airtable, Google Sheets.

## Usage

1.  Go to the **Data Osmosis** dashboard.
2.  Click **Add Source** and select a connector type.
3.  Enter connection details (host, port, credentials).
4.  Define the **Mapping Strategy**:
    - *Entity Type*: What AlephNet entity does this row represent?
    - *ID Field*: Which column is the unique identifier?
    - *Semantic Relationships*: How do foreign keys map to graph edges?
5.  Click **Start Sync**.

## Example

Mapping a `users` table to AlephNet:
- `id` -> `node.uuid`
- `name` -> `Person.name`
- `email` -> `Person.contact.email` (Private)
- `bio` -> `Person.description` (Embedded for semantic search)

## License

MIT
