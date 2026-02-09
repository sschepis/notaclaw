# Software Factory Plugin TODOs

## Immediate Tasks (Phase 1)
- [ ] Fix imports in `src/engine/` files. Most point to `../types` or `../AIError` which need adjustment.
- [ ] Fix imports in `src/skills/raw_tools.ts`.
- [ ] Fix imports in `src/workflows/raw_prompts.ts`.
- [ ] Implement `SkillDefinition` adapter in `src/index.ts`.
- [ ] Wire up `AssistantRunner` to use `DSNNode` event bus instead of CLI.

## Phase 2 (Integration)
- [ ] Replace `process.env` usage with `DSNNode` configuration/secrets.
- [ ] Map `software-factory` intent to `SRIA` task delegation.
