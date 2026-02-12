import { DSNNode } from '../DSNNode';

export class WorkflowState {
    private localState: Record<string, any> = {};
    private fieldId: string | null = null;
    private dsnNode: DSNNode;

    constructor(dsnNode: DSNNode, initialState: Record<string, any> = {}, fieldId?: string) {
        this.dsnNode = dsnNode;
        this.localState = { ...initialState };
        this.fieldId = fieldId || null;
    }

    async initialize(name: string) {
        if (!this.fieldId) {
            try {
                const bridge = this.dsnNode.getBridge() as any;
                if (bridge && typeof bridge.memoryCreate === 'function') {
                    const field = await bridge.memoryCreate({ name });
                    this.fieldId = field.id;
                    console.log(`[WorkflowState] Created memory field: ${this.fieldId}`);
                } else {
                    console.warn('[WorkflowState] Memory API not available on bridge');
                }
            } catch (error) {
                console.warn('[WorkflowState] Failed to initialize persistent memory:', error);
            }
        }
    }

    get(key: string) {
        return this.localState[key];
    }

    set(key: string, value: any) {
        this.localState[key] = value;
        this.persist();
    }

    update(newState: Record<string, any>) {
        this.localState = { ...this.localState, ...newState };
        this.persist();
    }

    getAll() {
        return { ...this.localState };
    }

    private async persist() {
        if (this.fieldId) {
            try {
                const bridge = this.dsnNode.getBridge() as any;
                if (bridge && typeof bridge.memoryStore === 'function') {
                    await bridge.memoryStore({ 
                        fieldId: this.fieldId, 
                        content: { type: 'workflow-state', data: this.localState }
                    });
                }
            } catch (error) {
                console.warn('[WorkflowState] Failed to persist state:', error);
            }
        }
    }
}
