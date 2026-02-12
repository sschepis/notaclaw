import { ModernSkill } from './types';

export class SkillValidator {
    static validate(skill: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!skill.name) errors.push('Missing skill name');
        if (!skill.version) errors.push('Missing skill version');
        if (!skill.description) errors.push('Missing skill description');
        if (!skill.entryPoint) errors.push('Missing skill entryPoint');

        if (skill.name && !/^[a-zA-Z0-9-_]+$/.test(skill.name)) {
            errors.push('Invalid skill name format. Use alphanumeric, hyphens, or underscores.');
        }

        if (skill.version && !/^\d+\.\d+\.\d+$/.test(skill.version)) {
            errors.push('Invalid version format. Use SemVer (x.y.z).');
        }

        if (skill.inputs) {
            for (const [key, value] of Object.entries(skill.inputs)) {
                if (typeof value !== 'object' || !value) {
                    errors.push(`Invalid input definition for '${key}'`);
                    continue;
                }
                // @ts-ignore
                if (!value.type || !value.description) {
                    errors.push(`Input '${key}' missing type or description`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static async validateCode(entryPointPath: string): Promise<{ safe: boolean; errors: string[] }> {
        // Basic static analysis for dangerous patterns
        // This is not a replacement for a real sandbox
        const errors: string[] = [];
        // TODO: Implement actual code scanning (e.g. searching for 'eval', 'child_process', 'fs')
        // For now, we assume the sandbox handles execution safety.
        return { safe: true, errors };
    }
}
