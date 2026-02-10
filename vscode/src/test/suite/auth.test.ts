import * as assert from 'assert';
import * as vscode from 'vscode';
import { AuthService } from '../../services/AuthService';

suite('AuthService Test Suite', () => {
	let authService: AuthService;

	setup(async () => {
		authService = new AuthService();
		await authService.initialize();
	});

	teardown(() => {
		authService.dispose();
	});

	test('should create a challenge', () => {
		const clientId = 'test-client';
		const challenge = authService.createChallenge(clientId);
		assert.ok(challenge.nonce);
		assert.strictEqual(challenge.nonce.length, 32); // 16 bytes hex
	});

	test('should authenticate with valid token', async () => {
		const clientId = 'test-client';
		const challenge = authService.createChallenge(clientId);
		
		// Get the token (it's auto-generated in initialize)
        // We can't easily access the private configuredToken, but we can get it from config
        const config = vscode.workspace.getConfiguration('agentControl');
        const token = config.get<string>('token');
        assert.ok(token, 'Token should be generated');

		const result = authService.authenticate(clientId, {
			token: token!,
			nonce: challenge.nonce
		});

		assert.strictEqual(result.authenticated, true);
		assert.ok(result.sessionId);
		assert.strictEqual(authService.isAuthenticated(clientId), true);
	});

	test('should fail with invalid token', () => {
		const clientId = 'test-client';
		const challenge = authService.createChallenge(clientId);

		const result = authService.authenticate(clientId, {
			token: 'invalid-token',
			nonce: challenge.nonce
		});

		assert.strictEqual(result.authenticated, false);
		assert.strictEqual(authService.isAuthenticated(clientId), false);
	});

    test('should fail with invalid nonce', async () => {
		const clientId = 'test-client';
		authService.createChallenge(clientId);
        
        const config = vscode.workspace.getConfiguration('agentControl');
        const token = config.get<string>('token')!;

		const result = authService.authenticate(clientId, {
			token: token,
			nonce: 'wrong-nonce'
		});

		assert.strictEqual(result.authenticated, false);
	});
});
