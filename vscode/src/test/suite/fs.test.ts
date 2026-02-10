import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileSystemService } from '../../services/FileSystemService';

suite('FileSystemService Test Suite', () => {
	let fsService: FileSystemService;
    let tempDir: string;

	setup(async () => {
		fsService = new FileSystemService();
        // Create a temp dir for testing
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-agent-test-'));
	});

	teardown(() => {
        // Cleanup temp dir
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
	});

	test('should write and read a file', async () => {
        const filePath = path.join(tempDir, 'test.txt');
        const content = 'Hello World';

        await fsService.writeFile({ path: filePath, content });
        
        const result = await fsService.readFile({ path: filePath });
        assert.strictEqual(result.content, content);
	});

    test('should exist check', async () => {
        const filePath = path.join(tempDir, 'test.txt');
        await fsService.writeFile({ path: filePath, content: 'test' });

        const result = await fsService.exists({ path: filePath });
        assert.strictEqual(result.exists, true);
        assert.strictEqual(result.isFile, true);
    });
});
