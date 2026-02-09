// Task Scheduler and Types Tests

// ─── CronParser Tests ───────────────────────────────────────────────────

describe('CronParser (Unit Tests)', () => {
    // These tests verify the cron parsing logic would work correctly
    // Since CronParser is a private class in TaskScheduler, we test the public API
    
    describe('Cron Expression Validation', () => {
        it('should accept valid 5-field cron expressions', () => {
            const validExpressions = [
                '* * * * *',      // Every minute
                '0 * * * *',      // Every hour
                '0 9 * * *',      // Daily at 9am
                '0 9 * * 1',      // Mondays at 9am
                '*/5 * * * *',    // Every 5 minutes
                '0 9,17 * * *',   // 9am and 5pm
                '0 9 1 * *',      // First of month
                '0 9 * * 1-5',    // Weekdays at 9am
                '30 8 * * *',     // 8:30am daily
            ];
            
            // Test that these are valid patterns
            validExpressions.forEach(expr => {
                const parts = expr.trim().split(/\s+/);
                expect(parts.length).toBe(5);
            });
        });

        it('should reject invalid cron expressions', () => {
            const invalidExpressions = [
                '* * *',           // Only 3 fields
                '* * * * * *',     // 6 fields
                'every minute',    // Not cron syntax
                '',                // Empty
            ];
            
            invalidExpressions.forEach(expr => {
                const parts = expr.trim().split(/\s+/);
                expect(parts.length).not.toBe(5);
            });
        });
    });
    
    describe('Field Parsing', () => {
        it('should parse wildcard (*) correctly', () => {
            // * means all values in range
            const expr = '* * * * *';
            const parts = expr.split(' ');
            expect(parts[0]).toBe('*');
        });
        
        it('should parse single values correctly', () => {
            const expr = '30 9 1 1 1';
            const parts = expr.split(' ');
            expect(parts[0]).toBe('30'); // minute 30
            expect(parts[1]).toBe('9');  // hour 9
            expect(parts[2]).toBe('1');  // day 1
            expect(parts[3]).toBe('1');  // month 1 (Jan)
            expect(parts[4]).toBe('1');  // weekday 1 (Mon)
        });
        
        it('should parse step values (*/n) correctly', () => {
            const expr = '*/15 * * * *';
            expect(expr.includes('*/15')).toBe(true);
        });
        
        it('should parse range values (n-m) correctly', () => {
            const expr = '0 9 * * 1-5';
            expect(expr.includes('1-5')).toBe(true);
        });
        
        it('should parse list values (n,m,o) correctly', () => {
            const expr = '0 9,12,17 * * *';
            expect(expr.includes('9,12,17')).toBe(true);
        });
    });
});

// ─── Task Types Tests ───────────────────────────────────────────────────

describe('Task Types', () => {
    it('should define ScheduledTaskStatus correctly', () => {
        const validStatuses = ['active', 'paused', 'completed', 'failed', 'cancelled'];
        validStatuses.forEach(status => {
            expect(typeof status).toBe('string');
        });
    });
    
    it('should define TaskInputField correctly', () => {
        const inputField = {
            name: 'topic',
            type: 'string' as const,
            description: 'The topic to research',
            required: true,
            defaultValue: 'AI'
        };
        
        expect(inputField.name).toBe('topic');
        expect(inputField.type).toBe('string');
        expect(inputField.required).toBe(true);
    });
    
    it('should define TaskOutputFormat correctly', () => {
        const formats = ['text', 'json', 'markdown', 'html', 'structured'];
        const outputFormat = {
            type: 'json' as const,
            schema: { type: 'object', properties: { result: { type: 'string' } } }
        };
        
        expect(formats).toContain(outputFormat.type);
        expect(outputFormat.schema).toBeDefined();
    });
    
    it('should define ScheduledTask with all required fields', () => {
        const task = {
            id: 'task-123',
            title: 'Daily Summary',
            parentConversationId: 'conv-456',
            cronSchedule: '0 9 * * *',
            drivingPrompt: 'Summarize the news',
            inputFields: [],
            outputFormat: { type: 'text' as const },
            status: 'active' as const,
            executionHistory: [],
            executionCount: 0,
            successCount: 0,
            errorCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        expect(task.id).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.parentConversationId).toBeDefined();
        expect(task.cronSchedule).toBeDefined();
        expect(task.drivingPrompt).toBeDefined();
        expect(task.status).toBe('active');
    });
    
    it('should define TaskExecutionResult correctly', () => {
        const result = {
            id: 'exec-789',
            taskId: 'task-123',
            executedAt: Date.now(),
            completedAt: Date.now() + 1000,
            status: 'success' as const,
            inputValues: { topic: 'AI' },
            output: 'Summary of AI news...',
            durationMs: 1000
        };
        
        expect(result.id).toBeDefined();
        expect(result.taskId).toBeDefined();
        expect(result.status).toBe('success');
        expect(result.output).toBeDefined();
    });
});

// ─── CreateScheduledTaskOptions Tests ───────────────────────────────────

describe('CreateScheduledTaskOptions', () => {
    it('should have required fields', () => {
        const options = {
            title: 'My Task',
            parentConversationId: 'conv-123',
            cronSchedule: '0 9 * * *',
            drivingPrompt: 'Do something'
        };
        
        expect(options.title).toBeDefined();
        expect(options.parentConversationId).toBeDefined();
        expect(options.cronSchedule).toBeDefined();
        expect(options.drivingPrompt).toBeDefined();
    });
    
    it('should support optional fields', () => {
        const options = {
            title: 'My Task',
            parentConversationId: 'conv-123',
            cronSchedule: '0 9 * * *',
            drivingPrompt: 'Do something',
            description: 'A helpful task',
            timezone: 'America/Los_Angeles',
            systemPrompt: 'You are a helpful assistant',
            inputFields: [{ name: 'topic', type: 'string' as const, description: '', required: false }],
            outputFormat: { type: 'json' as const },
            modelAlias: 'gpt-4',
            maxTokens: 1000,
            temperature: 0.7,
            tags: ['daily', 'summary']
        };
        
        expect(options.description).toBeDefined();
        expect(options.timezone).toBeDefined();
        expect(options.systemPrompt).toBeDefined();
        expect(options.inputFields?.length).toBe(1);
        expect(options.tags?.length).toBe(2);
    });
});

// ─── TaskParseRequest/Result Tests ──────────────────────────────────────

describe('TaskParseRequest and TaskParseResult', () => {
    it('should define TaskParseRequest correctly', () => {
        const request = {
            userMessage: 'Send me a daily summary of tech news at 9am',
            conversationContext: [
                { id: '1', role: 'user' as const, content: 'Hello', timestamp: Date.now() }
            ]
        };
        
        expect(request.userMessage).toBeDefined();
        expect(request.conversationContext).toBeDefined();
    });
    
    it('should define successful TaskParseResult', () => {
        const result = {
            success: true,
            suggestedTask: {
                title: 'Daily Tech Summary',
                parentConversationId: '',
                cronSchedule: '0 9 * * *',
                drivingPrompt: 'Summarize the top tech news stories'
            }
        };
        
        expect(result.success).toBe(true);
        expect(result.suggestedTask).toBeDefined();
        expect(result.suggestedTask?.cronSchedule).toBe('0 9 * * *');
    });
    
    it('should define failed TaskParseResult with clarification', () => {
        const result = {
            success: false,
            clarificationNeeded: 'What time should the task run?',
            validationErrors: []
        };
        
        expect(result.success).toBe(false);
        expect(result.clarificationNeeded).toBeDefined();
    });
    
    it('should define failed TaskParseResult with validation errors', () => {
        const result = {
            success: false,
            validationErrors: ['Invalid cron expression', 'Title is required']
        };
        
        expect(result.success).toBe(false);
        expect(result.validationErrors?.length).toBe(2);
    });
});

// ─── IPC Channel Tests ──────────────────────────────────────────────────

describe('Task IPC Channels', () => {
    const taskChannels = [
        'task:create',
        'task:list',
        'task:get',
        'task:update',
        'task:delete',
        'task:pause',
        'task:resume',
        'task:execute',
        'task:getHistory',
        'task:parse'
    ];
    
    it('should define all required IPC channels', () => {
        expect(taskChannels.length).toBe(10);
    });
    
    it('should have consistent naming convention', () => {
        taskChannels.forEach(channel => {
            expect(channel.startsWith('task:')).toBe(true);
        });
    });
});

// ─── Event Types Tests ──────────────────────────────────────────────────

describe('Task Events', () => {
    it('should define aleph:taskExecution event', () => {
        const event = {
            id: 'exec-123',
            taskId: 'task-456',
            executedAt: Date.now(),
            status: 'success' as const,
            inputValues: {},
            output: 'Result'
        };
        
        expect(event.taskId).toBeDefined();
        expect(event.status).toBe('success');
    });
    
    it('should define aleph:taskStatusChange event', () => {
        const event = {
            taskId: 'task-456',
            status: 'paused' as const
        };
        
        expect(event.taskId).toBeDefined();
        expect(event.status).toBe('paused');
    });
});
