import { execFile } from 'child_process';
import { writeFile, unlink, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';

/**
 * WhisperService — runs local whisper.cpp for speech-to-text.
 *
 * Avoids the whisper-node-ts wrapper because it uses shelljs.cd() at import
 * time, which mutates the process working directory — fatal in Electron.
 *
 * Instead we call the pre-built `main` binary directly via child_process.execFile.
 *
 * Production considerations:
 *   - Binary path resolution handles dev, packaged (asar), and fallback
 *   - Temp files are cleaned up after each transcription and on destroy
 *   - Transcription has a 30s timeout to prevent zombie processes
 *   - Thread count is set to CPU cores / 2 (capped at 4) for responsiveness
 *   - Input validation on WAV buffer size
 *   - Concurrent transcription is serialized via a queue to prevent CPU thrashing
 */
export class WhisperService {
  private whisperBinaryPath: string = '';
  private modelPath: string = '';
  private tmpDir: string;
  private ready = false;
  private threadCount: number;
  private transcriptionQueue: Array<{
    wavBuffer: Buffer;
    resolve: (text: string) => void;
    reject: (err: Error) => void;
  }> = [];
  private processing = false;

  // Max audio chunk size: ~30s of 16kHz 16-bit mono = ~960KB + 44 byte header
  private static readonly MAX_WAV_SIZE = 1024 * 1024; // 1MB
  // Min audio chunk size: header + some samples
  private static readonly MIN_WAV_SIZE = 100;

  constructor() {
    this.tmpDir = path.join(os.tmpdir(), 'notaclaw-whisper');
    // Use half the CPU cores (min 1, max 4) for transcription threads
    this.threadCount = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)));
  }

  /**
   * Resolve the whisper.cpp directory from multiple candidate locations.
   * Handles dev mode, packaged app, and workspace-relative paths.
   */
  private resolveWhisperCppDir(): string {
    const candidates: string[] = [];

    // 1. Relative to compiled main process code (dev with vite-plugin-electron)
    candidates.push(
      path.resolve(__dirname, '../../node_modules/whisper-node-ts/lib/whisper.cpp')
    );

    // 2. From app.getAppPath() — works in both dev and packaged
    try {
      const appPath = app.getAppPath();
      candidates.push(
        path.resolve(appPath, 'node_modules/whisper-node-ts/lib/whisper.cpp')
      );
    } catch {
      // app may not be ready yet
    }

    // 3. From process.resourcesPath (packaged app)
    if (process.resourcesPath) {
      candidates.push(
        path.resolve(process.resourcesPath, 'whisper.cpp')
      );
    }

    // 4. From process.cwd() — fallback for dev
    candidates.push(
      path.resolve(process.cwd(), 'node_modules/whisper-node-ts/lib/whisper.cpp')
    );

    for (const dir of candidates) {
      const binaryPath = path.join(dir, 'main');
      if (existsSync(binaryPath)) {
        return dir;
      }
    }

    // Return first candidate — init() will handle the error
    return candidates[0];
  }

  async init(): Promise<void> {
    // Ensure tmp directory exists
    try {
      if (!existsSync(this.tmpDir)) {
        await mkdir(this.tmpDir, { recursive: true });
      }
    } catch (err) {
      console.error('[WhisperService] Failed to create temp directory:', err);
      return;
    }

    const whisperCppDir = this.resolveWhisperCppDir();
    this.whisperBinaryPath = path.join(whisperCppDir, 'main');
    this.modelPath = path.join(whisperCppDir, 'models', 'ggml-base.en.bin');

    if (!existsSync(this.whisperBinaryPath)) {
      console.warn(
        '[WhisperService] Binary not found at:', this.whisperBinaryPath,
        '— speech-to-text disabled.'
      );
      return;
    }

    if (!existsSync(this.modelPath)) {
      console.warn(
        '[WhisperService] Model not found at:', this.modelPath,
        '— speech-to-text disabled.'
      );
      return;
    }

    // Verify the binary is executable with a quick --help check
    try {
      await this.testBinary();
    } catch (err) {
      console.error('[WhisperService] Binary test failed:', err);
      return;
    }

    this.ready = true;
    console.log(
      `[WhisperService] Ready. Binary: ${this.whisperBinaryPath}, ` +
      `Model: ${path.basename(this.modelPath)}, Threads: ${this.threadCount}`
    );
  }

  /** Verify the whisper binary can execute. */
  private testBinary(): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(
        this.whisperBinaryPath,
        ['--help'],
        { timeout: 5000 },
        (error) => {
          // --help exits with code 0 or sometimes 1 — both are fine
          // Only reject if the binary can't be executed at all
          if (error && error.code === 'ENOENT') {
            reject(new Error('Binary not found'));
          } else if (error && error.code === 'EACCES') {
            reject(new Error('Binary not executable'));
          } else {
            resolve();
          }
        }
      );
    });
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Transcribe a WAV buffer (16kHz, 16-bit, mono PCM).
   * Returns the concatenated speech text.
   *
   * Transcriptions are serialized — only one whisper process runs at a time
   * to prevent CPU thrashing during progressive capture.
   */
  async transcribe(wavBuffer: Buffer): Promise<string> {
    if (!this.ready) {
      throw new Error('WhisperService not initialized or binary/model missing');
    }

    // Input validation
    if (!Buffer.isBuffer(wavBuffer)) {
      throw new Error('Invalid input: expected a Buffer');
    }
    if (wavBuffer.length < WhisperService.MIN_WAV_SIZE) {
      return ''; // Too small to contain meaningful audio
    }
    if (wavBuffer.length > WhisperService.MAX_WAV_SIZE) {
      throw new Error(`WAV buffer too large: ${wavBuffer.length} bytes (max ${WhisperService.MAX_WAV_SIZE})`);
    }

    // Serialize via queue
    return new Promise<string>((resolve, reject) => {
      this.transcriptionQueue.push({ wavBuffer, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    if (this.transcriptionQueue.length === 0) return;

    this.processing = true;

    while (this.transcriptionQueue.length > 0) {
      const item = this.transcriptionQueue.shift()!;
      try {
        const text = await this.transcribeInternal(item.wavBuffer);
        item.resolve(text);
      } catch (err: any) {
        item.reject(err);
      }
    }

    this.processing = false;
  }

  private async transcribeInternal(wavBuffer: Buffer): Promise<string> {
    // Write WAV to temp file
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tmpFile = path.join(this.tmpDir, `chunk-${id}.wav`);

    try {
      await writeFile(tmpFile, wavBuffer);
      const text = await this.runWhisper(tmpFile);
      return text;
    } finally {
      // Always clean up temp file
      unlink(tmpFile).catch(() => {});
    }
  }

  private runWhisper(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-m', this.modelPath,
        '-f', filePath,
        '--no-timestamps',
        '-t', String(this.threadCount),
        '-l', 'en',
      ];

      const child = execFile(
        this.whisperBinaryPath,
        args,
        {
          cwd: path.dirname(this.whisperBinaryPath),
          timeout: 30000,
          maxBuffer: 1024 * 1024,
          env: {
            ...process.env,
            // Suppress Metal GPU logging noise
            GGML_METAL_LOG_LEVEL: '0',
          },
        },
        (error, stdout, stderr) => {
          if (error) {
            // Timeout errors
            if (error.killed) {
              reject(new Error('Whisper transcription timed out (30s)'));
              return;
            }
            console.error('[WhisperService] Error:', error.message);
            if (stderr) {
              console.error('[WhisperService] stderr:', stderr.substring(0, 500));
            }
            reject(new Error(`Whisper transcription failed: ${error.message}`));
            return;
          }

          // Check stderr for argument errors (binary exits 0 even on bad args)
          if (stderr && stderr.includes('error: unknown argument')) {
            console.error('[WhisperService] Argument error:', stderr.substring(0, 300));
            reject(new Error('Whisper binary rejected arguments'));
            return;
          }

          const text = this.parseOutput(stdout);
          resolve(text);
        }
      );

      // Handle unexpected child process issues
      child.on('error', (err) => {
        reject(new Error(`Failed to start whisper: ${err.message}`));
      });
    });
  }

  /**
   * Parse whisper.cpp stdout output to extract just the speech text.
   * With --no-timestamps, stdout contains just the transcribed text lines.
   * stderr receives debug/timing output and is handled separately.
   * We still filter known prefixes in case they leak through to stdout.
   */
  private parseOutput(stdout: string): string {
    const lines = stdout.split('\n');
    const speechLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Skip known debug/timing prefixes
      if (trimmed.startsWith('whisper_')) continue;
      if (trimmed.startsWith('main:')) continue;
      if (trimmed.startsWith('system_info:')) continue;
      if (trimmed.startsWith('ggml_')) continue;
      if (trimmed.startsWith('metal_')) continue;
      if (trimmed.startsWith('[')) continue;       // timestamp lines
      if (trimmed.startsWith('output_')) continue;  // output format lines
      speechLines.push(trimmed);
    }

    return speechLines.join(' ').trim();
  }

  /**
   * Cleanup resources. Called on app shutdown.
   */
  async destroy(): Promise<void> {
    this.ready = false;
    this.transcriptionQueue = [];

    // Clean up temp directory
    try {
      if (existsSync(this.tmpDir)) {
        const files = await readdir(this.tmpDir);
        await Promise.all(
          files.map(f => unlink(path.join(this.tmpDir, f)).catch(() => {}))
        );
      }
    } catch {
      // ignore cleanup errors
    }
  }
}
