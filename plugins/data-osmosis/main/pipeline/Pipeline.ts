import { TransformationStep } from '../types';

export class Pipeline {
    private steps: TransformationStep[] = [];

    addStep(step: TransformationStep) {
        this.steps.push(step);
    }

    async execute(data: any[]): Promise<any[]> {
        let result = data;
        for (const step of this.steps) {
            result = await step.process(result);
        }
        return result;
    }
}
