import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import { PluginContext } from '../../../client/src/shared/plugin-types';

/**
 * Production-Grade Code Interpreter
 * - Handles process cleanup
 * - Enforces timeouts
 * - Limits output buffer
 * - Validates inputs (basic)
 */
class CodeInterpreter {
  context: PluginContext;
  sessions: Map<string, any>;
  maxOutputSize: number;
  defaultTimeout: number;
  maxTimeout: number;

  constructor(context: PluginContext) {
    this.context = context;
    this.sessions = new Map();
    
    // Limits
    this.maxOutputSize = 1024 * 1024; // 1MB
    this.defaultTimeout = 10000; // 10s
    this.maxTimeout = 60000; // 60s
  }

  activate() {
    this.context.ipc.handle('exec', async (params: any) => this.executeCommand(params));
    this.context.ipc.handle('spawn', async (params: any) => this.spawnProcess(params));
    this.context.ipc.handle('kill', async ({ pid }: { pid: number }) => this.killProcess(pid));
    
    if (this.context.services && this.context.services.tools) {
      this.context.services.tools.register({
        name: 'exec',
        description: 'Execute shell commands (Local Host)',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string' },
            cwd: { type: 'string' },
            timeout: { type: 'number', description: 'Timeout in ms (max 60000)' }
          },
          required: ['command']
        },
        handler: async (args: any) => this.executeCommand(args)
      });
    }
  }

  async executeCommand({ command, cwd, timeout }: { command: string; cwd?: string; timeout?: number }) {
    console.log(`[CodeInterpreter] Executing: ${command.substring(0, 50)}...`);
    
    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command provided');
    }

    // Safety: prevent obvious dangerous patterns if running unsandboxed
    // (This is a weak check, robust security requires Docker/VM)
    if (this.isForbidden(command)) {
        throw new Error('Command blocked by security policy');
    }

    return new Promise((resolve, reject) => {
      const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash';
      const args = os.platform() === 'win32' ? ['-Command', command] : ['-c', command];
      
      const safeTimeout = Math.min(timeout || this.defaultTimeout, this.maxTimeout);

      // Spawn with detached: false to ensure we can kill it
      const child = spawn(shell, args, {
        cwd: cwd || process.cwd(),
        env: process.env, // Inherit env (be careful here in prod)
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let killed = false;
      let outputSize = 0;

      // Timeout handler
      const timer = setTimeout(() => {
        killed = true;
        child.kill('SIGTERM'); 
        // Force kill if it doesn't exit
        setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 1000);
        reject(new Error(`Command timed out after ${safeTimeout}ms`));
      }, safeTimeout);

      const appendOutput = (data: Buffer, isError: boolean) => {
        if (outputSize >= this.maxOutputSize) return;
        
        const str = data.toString();
        const len = str.length;
        
        if (outputSize + len > this.maxOutputSize) {
            const truncated = str.substring(0, this.maxOutputSize - outputSize);
            if (isError) stderr += truncated + '\n[Truncated]';
            else stdout += truncated + '\n[Truncated]';
            outputSize = this.maxOutputSize;
            
            // Kill process if spamming output
            child.kill(); 
        } else {
            if (isError) stderr += str;
            else stdout += str;
            outputSize += len;
        }
      };

      child.stdout?.on('data', (data) => appendOutput(data, false));
      child.stderr?.on('data', (data) => appendOutput(data, true));

      child.on('error', (err) => {
        clearTimeout(timer);
        if (!killed) reject(err);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (!killed) {
          if (code === 0) {
            resolve({ output: stdout, code });
          } else {
            resolve({ output: stdout, error: stderr, code });
          }
        }
      });
    });
  }

  isForbidden(command: string) {
      // Basic heuristic for dangerous commands in unsandboxed environment
      const forbidden = [
          'rm -rf /', ':(){ :|:& };:', 'mkfs', 'dd if=/dev/zero'
      ];
      return forbidden.some(f => command.includes(f));
  }

  spawnProcess({ command, cwd }: { command: string; cwd?: string }) {
    // Background processes not supported in Alpha
    return { error: "Background processes not supported in this version." };
  }

  killProcess(pid: number) {
    if (!pid || typeof pid !== 'number') return { success: false, error: "Invalid PID" };
    try {
      process.kill(pid);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

export default {
  activate: (context: PluginContext) => {
    console.log('[Code Interpreter] Activating...');
    const interpreter = new CodeInterpreter(context);
    interpreter.activate();
    
    context.on('ready', () => {
      console.log('[Code Interpreter] Ready (Local Host Mode)');
    });
  },
  
  deactivate: () => {
    console.log('[Code Interpreter] Deactivated');
  }
};
