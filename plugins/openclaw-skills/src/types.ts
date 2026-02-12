export interface SkillInput {
    type: string;
    description: string;
    required?: boolean;
}

export interface SkillOutput {
    type: string;
    description: string;
}

export interface ModernSkill {
    id: string;
    name: string;
    version: string;
    description: string;
    entryPoint: string; // path to main.js or main.py
    dependencies?: Record<string, string>;
    inputs?: Record<string, SkillInput>;
    outputs?: Record<string, SkillOutput>;
    path: string;
    dir: string;
    type: 'modern';
}

export interface LegacySkill {
    id: string;
    name: string;
    description: string;
    path: string;
    dir: string;
    version: string;
    semanticDomain: string;
    type: 'legacy';
}

export type Skill = ModernSkill | LegacySkill;
