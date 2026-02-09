import { Config } from '../types';
import { AssistantRunner } from '../engine';
import { exec } from 'child_process';

export const tools: Config['tools'] = [
    {
        type: 'function',
        function: {
            name: 'executeBash',
            description: 'Execute a bash command',
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'The bash command to execute'
                    }
                },
                required: ['command']
            },
            script: async (parameters: any, context: any) => {
                const { command } = parameters;
                // Use imported exec instead of context.require
                return new Promise((resolve, reject) => {
                    exec(command.trim(), { cwd: process.cwd() }, (error: any, stdout: any, stderr: any) => {
                        if (error) {
                            resolve(error || stderr);
                        } else {
                            resolve(stdout);
                        }
                    });
                });
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'callStructuredPrompt',
            description: 'Call a structured prompt',
            parameters: {
                type: 'object',
                properties: {
                    promptName: {
                        type: 'string',
                        description: 'The name of the prompt to call'
                    },
                    args: {
                        type: 'object',
                        description: 'Arguments to pass to the prompt'
                    }
                },
                required: ['promptName', 'args']
            },
            script: async (parameters: any, context: any) => {
                const { promptName, args } = parameters;
                const { runner } = context;
                return AssistantRunner.run(runner, promptName, args);
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'completeTask',
            description: 'Complete the original task',
            parameters: {
                type: 'object',
                properties: {
                    response: {
                        type: 'string',
                        description: 'The response to complete'
                    }
                },
                required: ['response']
            },
            script: async (parameters: any, context: any) => {
                const { response } = parameters;
                console.log(response);
                await context.tools.setState({ key: 'taskCompleted', value: true });
                return { response, taskCompleted: true };
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'respond',
            description: 'Respond to the user',
            parameters: {
                type: 'object',
                properties: {
                    response: {
                        type: 'string',
                        description: 'The response to send to the user'
                    }
                },
                required: ['response']
            },
            script: async (parameters: any, context: any) => {
                const { response } = parameters;
                console.log(response);
                return { response };
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'getState',
            description: 'Get a value from the state',
            parameters: {
                type: 'object',
                properties: {
                    key: {
                        type: 'string',
                        description: 'The key of the state value to get'
                    }
                },
                required: ['key']
            },
            script: async (parameters: any, context: any) => {
                const { key } = parameters;
                return { value: context.state[key] };
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'setState',
            description: 'Set a value in the state',
            parameters: {
                type: 'object',
                properties: {
                    key: {
                        type: 'string',
                        description: 'The key of the state value to set'
                    },
                    value: {
                        type: 'any',
                        description: 'The value to set in the state'
                    }
                },
                required: ['key', 'value']
            },
            script: async (parameters: any, context: any) => {
                const { key, value } = parameters;
                context.state[key] = value;
                return { success: true };
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'listStateKeys',
            description: 'List all keys in the state',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            },
            script: async (parameters: any, context: any) => {
                return { keys: Object.keys(context.state) };
            }
        }
    }
];
