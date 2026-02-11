import * as _ from 'lodash';

function stringifyComplex(value: any, indent: string = ''): string {
    if (Array.isArray(value)) {
        const arrayItems = value.map(item => stringifyComplex(item, indent + '  ')).join(',\n');
        return `[\n${indent}  ${arrayItems}\n${indent}]`;
    } else if (typeof value === 'object' && value !== null) {
        const objectItems = Object.entries(value)
            .map(([key, val]) => `${key}: ${stringifyComplex(val, indent + '  ')}`)
            .join(',\n');
        return `{\n${indent}  ${objectItems}\n${indent}}`;
    } else if (typeof value === 'string') {
        return `"${value}"`;
    } else {
        return String(value);
    }
}

function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
    return Object.keys(obj).reduce((acc: Record<string, any>, k: string) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            acc[pre + k] = obj[k];  // Preserve the object instead of flattening
            Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
}

export function interpolate(template: string | object, args: Record<string, any>): any {
    const defaultArgs: any = {
        history: '',
        query: '',
        response: '',
        ...args
    };
    const flattenedArgs = flattenObject(defaultArgs);

    const interpolateString = (str: string): string => {
        return str.replace(/{([\w.]+)}/g, (match, p1) => {
            if (p1 in flattenedArgs) {
                const value = flattenedArgs[p1];
                return typeof value === 'object' && value !== null
                    ? stringifyComplex(value)
                    : String(value);
            }
            return match;
        });
    };

    const interpolateValue = (value: any): any => {
        if (typeof value === 'string') {
            return interpolateString(value);
        } else if (Array.isArray(value)) {
            return value.map(interpolateValue);
        } else if (typeof value === 'object' && value !== null) {
            const result: Record<string, any> = {};
            for (const [key, val] of Object.entries(value)) {
                const interpolatedKey = interpolateString(key);
                if (interpolatedKey.startsWith('{') && interpolatedKey.endsWith('}')) {
                    // This is a condition, interpolate and evaluate it
                    const condition = interpolatedKey.slice(1, -1);
                    const interpolatedCondition = interpolateString(condition);
                    if (safeEvaluate(interpolatedCondition, flattenedArgs)) {
                        Object.assign(result, interpolateValue(val));
                    }
                } else {
                    result[interpolatedKey] = interpolateValue(val);
                }
            }
            return result;
        }
        return value;
    };

    return interpolateValue(template);
}

export function interpolateArgs(args: Record<string, any>, result: any): Record<string, any> {
    return _.mapValues(args, value => {
        if (typeof value === 'string') {
            try {
                const interpolated = interpolate(value, { result, state: result.state, ...result });
                console.log(value, interpolated);
                return interpolated;
            } catch (error) {
                console.warn(`Interpolation error for value: ${value}. Using original value.`);
                return value;
            }
        } else if (Array.isArray(value)) {
            return value.map(item => interpolateArgs(item, result));
        } else if (typeof value === 'object' && value !== null) {
            return interpolateArgs(value, result);
        }
        return value;
    });
}

interface Action {
    prompt?: string;
    function?: string;
    arguments: Record<string, any>;
}

export function evaluateConditions(
    conditions: Record<string, Action>,
    result: any
): { type: string; name: string; arguments: Record<string, any> } {
    if(result.state) {
        Object.keys(result.state).forEach(stateKey=>{
            result[`state.${stateKey}`] = typeof result.state[stateKey] === 'object' ? stringifyComplex(result.state[stateKey]) : result.state[stateKey];
        })
    }

    const interpolatedConditions = interpolateArgs(conditions, result);
    for (let [condition, action] of Object.entries(interpolatedConditions)) {
        condition = interpolate(condition, result)
        if (safeEvaluate(condition, result)) {
            return {
                type: 'prompt' in action ? 'prompt' : 'function',
                name: action.prompt || action.function || '',
                arguments: action.arguments
            };
        }
    }
    return { type: 'complete', name: 'complete', arguments: {} };
}

export function safeEvaluate(condition: string, variables: Record<string, any>): boolean {
    try {
        const interpolatedCondition = Object.entries(variables).reduce(
            (acc, [key, value]) => acc.replace(new RegExp(`\\b${key}\\b`, 'g'), JSON.stringify(value)),
            condition
        );
        const result = new Function(`return ${interpolatedCondition}`)();
        return Boolean(result);
    } catch (error) {
        console.error(`Error evaluating condition: ${condition}`, error);
        return false;
    }
}

// Enhanced EventEmitter class
export class EnhancedEventEmitter {
    private listeners: { [event: string]: Array<{ callback: Function; isSync: boolean }> } = {};

    on(event: string, callback: Function, isSync: boolean = false): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push({ callback, isSync });
    }

    emit(event: string, context: any, ...args: any[]): boolean {
        if (!this.listeners[event]) {
            return true; // No listeners, so event wasn't prevented
        }

        let prevented = false;
        let stopPropagation = false;

        const eventContext = {
            ...context,
            preventDefault: () => { prevented = true; },
            stopPropagation: () => { stopPropagation = true; }
        };

        for (const { callback, isSync } of this.listeners[event]) {
            if (isSync) {
                callback(eventContext, ...args);
                if (stopPropagation) break;
            } else {
                setTimeout(() => {
                    if (!stopPropagation) {
                        callback(eventContext, ...args);
                    }
                }, 0);
            }
        }

        return !prevented;
    }

    off(event: string, callback: Function): void {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(listener => listener.callback !== callback);
        }
    }
}

// Test function to verify interpolation
export function testInterpolation() {
    const template = {
        "{state.taskCompleted === true}": {
            function: "completeTask",
            arguments: {
                response: "{result.response}"
            }
        },
        "{state.taskCompleted !== true}": {
            prompt: "main",
            arguments: {
                primaryTask: "{state.primaryTask}",
                history: "{history}\nQ: {state.primaryTask}\nA: {result.response}"
            }
        },
        "{state.currentStep === '{state.nextStep}'}": {
            function: "proceedToNextStep",
            arguments: {
                step: "{state.nextStep}"
            }
        }
    };

    const args1 = {
        state: {
            taskCompleted: true,
            primaryTask: "What is the capital of France?",
            currentStep: "step2",
            nextStep: "step2"
        },
        result: {
            response: "The capital of France is Paris."
        },
        history: "Previous conversation history"
    };

    const args2 = {
        state: {
            taskCompleted: false,
            primaryTask: "What is the capital of Spain?",
            currentStep: "step1",
            nextStep: "step2"
        },
        result: {
            response: "The capital of Spain is Madrid."
        },
        history: "Previous conversation history"
    };

    console.log("Test case 1 (taskCompleted = true, currentStep = nextStep):");
    const interpolated1 = interpolate(template, args1);
    console.log(JSON.stringify(interpolated1, null, 2));

    console.log("\nTest case 2 (taskCompleted = false, currentStep != nextStep):");
    const interpolated2 = interpolate(template, args2);
    console.log(JSON.stringify(interpolated2, null, 2));
}

// Run the test function
if (require.main === module) {
    testInterpolation();
}
