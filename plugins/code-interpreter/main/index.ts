import { spawn, exec } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { PluginContext } from '../../../client/src/shared/plugin-types';
import { randomUUID } from 'crypto';

interface Session {
    id: string;
    language: 'python' | 'node';
    containerId: string;
    lastActive: number;
    workDir: string;
}

interface ExecutionResult {
    output: string;
    error?: string;
    code: number;
    images?: string[]; // Base64 encoded images
}

class CodeInterpreter {
    context: PluginContext;
    sessions: Map<string, Session>;
    dockerAvailable: boolean = false;
    
    // Limits
    maxMemory: string = '512m';
    maxCpus: number = 1.0;
    defaultTimeout: number = 10000; // 10s
    sessionTimeout: number = 3600000; // 1h
    cleanupInterval: NodeJS.Timeout | null = null;

    constructor(context: PluginContext) {
        this.context = context;
        this.sessions = new Map();
    }

    async activate() {
        this.dockerAvailable = await this.checkDocker();
        console.log(`[CodeInterpreter] Docker available: ${this.dockerAvailable}`);

        this.context.ipc.handle('create-session', async ({ language }: { language: string }) => this.createSession(language));
        this.context.ipc.handle('execute', async ({ sessionId, code }: { sessionId: string; code: string }) => this.executeCode(sessionId, code));
        this.context.ipc.handle('install-package', async ({ sessionId, packageName }: { sessionId: string; packageName: string }) => this.installPackage(sessionId, packageName));
        this.context.ipc.handle('end-session', async ({ sessionId }: { sessionId: string }) => this.endSession(sessionId));
        this.context.ipc.handle('upload-file', async ({ sessionId, filename, content }: { sessionId: string; filename: string; content: string }) => this.uploadFile(sessionId, filename, content));
        
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => this.cleanupSessions(), 60000);
    }

    deactivate() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    async checkDocker(): Promise<boolean> {
        return new Promise((resolve) => {
            exec('docker --version', (err) => {
                resolve(!err);
            });
        });
    }

    async createSession(language: string): Promise<{ sessionId: string; error?: string }> {
        if (!this.dockerAvailable) {
            return { sessionId: '', error: 'Docker is not available. Please install Docker to use the Code Interpreter.' };
        }

        const sessionId = randomUUID();
        const image = language === 'python' ? 'python:3.9-slim' : 'node:18-slim';
        // Create a temporary directory for the session
        const workDir = path.join(os.tmpdir(), `code-interpreter-${sessionId}`);
        fs.mkdirSync(workDir, { recursive: true });

        // Start container
        // Keep it running with 'tail -f /dev/null' or similar
        const cmd = language === 'python' ? 'tail -f /dev/null' : 'tail -f /dev/null';
        
        // We mount the workDir to /workspace
        const dockerCmd = `docker run -d --rm --network none --cpus ${this.maxCpus} --memory ${this.maxMemory} -v "${workDir}:/workspace" -w /workspace ${image} ${cmd}`;
        
        try {
            const containerId = await this.execPromise(dockerCmd);
            
            this.sessions.set(sessionId, {
                id: sessionId,
                language: language as 'python' | 'node',
                containerId: containerId.trim(),
                lastActive: Date.now(),
                workDir
            });

            // Initial setup for Python (install pandas/numpy if needed, but that takes time - maybe defer or use pre-built image)
            // For now, we start clean.

            return { sessionId };
        } catch (e: any) {
            return { sessionId: '', error: `Failed to start session: ${e.message}` };
        }
    }

    async executeCode(sessionId: string, code: string): Promise<ExecutionResult> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { output: '', error: 'Session not found', code: 1 };
        }

        session.lastActive = Date.now();

        // Write code to a file in the shared directory
        const scriptName = session.language === 'python' ? 'script.py' : 'script.js';
        const scriptPath = path.join(session.workDir, scriptName);
        fs.writeFileSync(scriptPath, code);

        // Execute inside container
        const cmd = session.language === 'python' ? `python ${scriptName}` : `node ${scriptName}`;
        const dockerExec = `docker exec ${session.containerId} ${cmd}`;

        try {
            // We use exec with a timeout
            const output = await this.execPromise(dockerExec, { timeout: this.defaultTimeout });
            return { output, code: 0 };
        } catch (e: any) {
            // Check if it was a timeout
            if (e.killed) {
                return { output: '', error: 'Execution timed out', code: 124 };
            }
            return { output: e.stdout || '', error: e.stderr || e.message, code: e.code || 1 };
        }
    }

    async installPackage(sessionId: string, packageName: string): Promise<{ success: boolean; output?: string; error?: string }> {
        const session = this.sessions.get(sessionId);
        if (!session) return { success: false, error: 'Session not found' };

        // Need network to install packages. This contradicts "secure sandbox" with --network none.
        // We might need to start container with network, or disconnect/connect network.
        // For simplicity in this enhancement, we'll assume we can't install dynamically if we want strict isolation, 
        // OR we allow network for installation.
        // Let's try to connect network temporarily or warn user.
        // Actually, 'docker exec' inherits container network. If container has --network none, we can't install.
        
        // Strategy: We can't easily change network of running container without restarting.
        // Alternative: Start container with network enabled but use firewall rules? Too complex.
        // Alternative: Use a proxy?
        // Decision: For this iteration, we will fail if network is disabled. 
        // But to support requirement 7 "Dynamic package installation", we MUST have network.
        // We can create a new container with network, install, commit, and replace? Too slow.
        
        // Compromise: Allow network access but warn? Or use a specific proxy?
        // For now, let's assume we started with network enabled OR we can't install.
        // Let's change creation to allow network for now, or make it configurable.
        // Ideally, we want a whitelist.
        
        // Let's try to run pip install. If it fails, it fails.
        // If we want to support this, we should probably allow network access but maybe restrict it?
        // Docker '--network none' is very strict.
        
        // Let's change creation to allow network but maybe we can restrict it later?
        // For now, I'll stick to --network none for security as requested, and note that package installation requires network.
        // If the user REALLY needs packages, they should be pre-installed or we need a way to enable network.
        
        // Wait, requirement 7 says "Allow dynamic package installation".
        // Requirement 1 says "Secure ... isolate code execution".
        // I'll enable network for the container but maybe we can use a firewall inside?
        // Or just accept that "dynamic installation" implies network access.
        // I will change the run command to allow network for now to satisfy req 7, but add a TODO for firewall.
        
        // Actually, let's try to run the install command.
        const cmd = session.language === 'python' ? `pip install ${packageName}` : `npm install ${packageName}`;
        // We need to run this as root (default in docker)
        
        // If we used --network none, this will hang or fail.
        // I'll update createSession to NOT use --network none if we want to support this, 
        // OR we can't support dynamic packages with strict network isolation.
        // I'll leave --network none in createSession for now (Security First) and return error here explaining why.
        
        return { success: false, error: 'Dynamic package installation is disabled in secure mode (Network isolated).' };
    }

    async uploadFile(sessionId: string, filename: string, content: string) {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session not found');
        
        const filePath = path.join(session.workDir, filename);
        fs.writeFileSync(filePath, content); // Helper to write string content
        // If binary, we need buffer. Assuming content is string or base64?
        // For now assuming text.
    }

    async endSession(sessionId: string) {
        const session = this.sessions.get(sessionId);
        if (session) {
            await this.execPromise(`docker kill ${session.containerId}`);
            fs.rmSync(session.workDir, { recursive: true, force: true });
            this.sessions.delete(sessionId);
        }
    }

    cleanupSessions() {
        const now = Date.now();
        for (const [id, session] of this.sessions) {
            if (now - session.lastActive > this.sessionTimeout) {
                this.endSession(id);
            }
        }
    }

    private execPromise(command: string, options: any = {}): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(command, { ...options, encoding: 'utf8' }, (error, stdout, stderr) => {
                if (error) {
                    // @ts-ignore
                    error.stdout = stdout;
                    // @ts-ignore
                    error.stderr = stderr;
                    reject(error);
                } else {
                    resolve(stdout as unknown as string);
                }
            });
        });
    }
}

let interpreter: CodeInterpreter;

export default {
    activate: async (context: PluginContext) => {
        console.log('[Code Interpreter] Activating...');
        interpreter = new CodeInterpreter(context);
        await interpreter.activate();
    },
    deactivate: () => {
        console.log('[Code Interpreter] Deactivated');
        if (interpreter) interpreter.deactivate();
    }
};
