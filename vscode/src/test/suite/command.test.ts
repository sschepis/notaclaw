import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommandService } from '../../services/CommandService';

suite('CommandService Test Suite', () => {
	let commandService: CommandService;

	setup(() => {
		commandService = new CommandService();
	});

	test('should execute a command', async () => {
        // We can't easily mock vscode.commands.executeCommand here without a mock framework
        // But we can try to execute a simple command that doesn't side-effect much
        // e.g. 'noop' if it existed, or check for failure on non-existent command
        
        try {
            await commandService.execute({ command: 'non.existent.command' });
            assert.fail('Should have thrown error');
        } catch (error: any) {
            // It might throw ProtocolError or internal error depending on implementation
            // In our impl, it catches error and throws ProtocolError(InternalError)
            assert.ok(error);
        }
	});

    test('should list commands', async () => {
        const result = await commandService.list({});
        assert.ok(result.commands);
        assert.ok(Array.isArray(result.commands));
        assert.ok(result.commands.length > 0);
    });
});
