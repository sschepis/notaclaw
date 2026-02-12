# OpenClaw Skills Design Document

## Overview
This document outlines the design for enhancing the OpenClaw Skills plugin to support modern, executable skills with validation, dependency management, and versioning.

## Architecture

### 1. Skill Validation (`SkillValidator`)
- **Schema Validation**: Use a strict schema to validate skill definitions (metadata, inputs, outputs).
- **Security Check**: Scan skill code for forbidden patterns (e.g., accessing sensitive file system paths) before execution.

### 2. Dependency Management (`DependencyManager`)
- **Manifest**: Skills declare dependencies in a `manifest.json` or within the `SKILL.md` metadata.
- **Installation**: A manager that handles `npm install` or `pip install` into a dedicated `node_modules` or `venv` for each skill to avoid conflicts.
- **Isolation**: Ensure dependencies are scoped to the skill.

### 3. Execution Engine (`ModernSkillAdapter`)
- **Support**: Extends the system to support executable skills (JavaScript/TypeScript/Python) alongside legacy Markdown skills.
- **Sandbox**: Execute code in a sandboxed environment (Node.js `vm` or distinct child processes) to prevent unauthorized access.
- **Interface**: Standardized `execute(args)` method for all skills.

### 4. Versioning & Registry
- **Versioning**: Enforce SemVer. Store multiple versions if needed.
- **Registry**: A client to fetch skills from a central repository (mocked for this implementation).

## Implementation Plan

### Phase 1: Core Infrastructure
1.  Create `src/types.ts` for shared skill definitions.
2.  Create `src/SkillValidator.ts` for schema validation.
3.  Create `src/DependencyManager.ts` for handling packages.

### Phase 2: Modern Skill Adapter
1.  Create `src/ModernSkillAdapter.ts` to handle executable skills.
2.  Implement `execute` method with sandboxing.
3.  Integrate with `main/index.ts`.

### Phase 3: Testing & Validation
1.  Create unit tests for Validator and DependencyManager.
2.  Create integration tests for running a modern skill.

## Data Structures

```typescript
interface ModernSkill {
    id: string;
    name: string;
    version: string;
    description: string;
    entryPoint: string; // path to main.js or main.py
    dependencies: Record<string, string>;
    inputs: Record<string, { type: string; description: string }>;
    outputs: Record<string, { type: string; description: string }>;
}
```

## Security Considerations
- **Sandboxing**: Code execution must be isolated.
- **Permissions**: Skills should declare permissions (e.g., network access, file access) which the user must approve.
