import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import archiver from 'archiver';
import * as unzipper from 'unzipper';

export class FilesystemService {
    private sandboxRoot: string;

    constructor(sandboxRoot?: string) {
        const root = sandboxRoot || '~/alephnet/sandbox';
        if (root.startsWith('~')) {
            this.sandboxRoot = path.join(os.homedir(), root.slice(1));
        } else {
            this.sandboxRoot = path.resolve(root);
        }
        this.ensureSandboxExists();
    }

    private resolvePath(filePath: string): string {
        if (filePath.startsWith('~')) {
            return path.join(os.homedir(), filePath.slice(1));
        }
        if (path.isAbsolute(filePath)) {
            return path.resolve(filePath);
        }
        return path.resolve(this.sandboxRoot, filePath);
    }

    private ensureSandboxExists() {
        if (!fs.existsSync(this.sandboxRoot)) {
            fs.mkdirSync(this.sandboxRoot, { recursive: true });
        }
    }

    private validatePath(filePath: string): string {
        const resolvedPath = this.resolvePath(filePath);
        // Check if the resolved path starts with the sandbox root
        if (!resolvedPath.startsWith(this.sandboxRoot)) {
            throw new Error(`Security Error: Access denied to path '${filePath}'. Outside of sandbox '${this.sandboxRoot}'.`);
        }
        return resolvedPath;
    }

    public async readFile(filePath: string): Promise<string> {
        const fullPath = this.validatePath(filePath);
        return fs.promises.readFile(fullPath, 'utf-8');
    }

    public async writeFile(filePath: string, content: string): Promise<void> {
        const fullPath = this.validatePath(filePath);
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        return fs.promises.writeFile(fullPath, content, 'utf-8');
    }

    public async listFiles(dirPath: string): Promise<string[]> {
        const fullPath = this.validatePath(dirPath);
        const files = await fs.promises.readdir(fullPath);
        return files;
    }

    public async createDirectory(dirPath: string): Promise<void> {
        const fullPath = this.validatePath(dirPath);
        await fs.promises.mkdir(fullPath, { recursive: true });
    }

    public async deleteFile(filePath: string): Promise<void> {
        const fullPath = this.validatePath(filePath);
        return fs.promises.rm(fullPath, { recursive: true, force: true });
    }

    public async move(sourcePath: string, destPath: string): Promise<void> {
        const fullSource = this.validatePath(sourcePath);
        const fullDest = this.validatePath(destPath);
        return fs.promises.rename(fullSource, fullDest);
    }

    public async getStats(filePath: string): Promise<fs.Stats> {
        const fullPath = this.validatePath(filePath);
        return fs.promises.stat(fullPath);
    }

    public async compressFiles(sourcePaths: string[], outputPath: string): Promise<void> {
        const fullOutputPath = this.validatePath(outputPath);
        const output = fs.createWriteStream(fullOutputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);

            archive.pipe(output);

            for (const sourcePath of sourcePaths) {
                const fullSourcePath = this.validatePath(sourcePath);
                const stats = fs.statSync(fullSourcePath);
                if (stats.isDirectory()) {
                    archive.directory(fullSourcePath, path.basename(fullSourcePath));
                } else {
                    archive.file(fullSourcePath, { name: path.basename(fullSourcePath) });
                }
            }

            archive.finalize();
        });
    }

    public async extractArchive(archivePath: string, outputDir: string): Promise<void> {
        const fullArchivePath = this.validatePath(archivePath);
        const fullOutputDir = this.validatePath(outputDir);

        return fs.createReadStream(fullArchivePath)
            .pipe(unzipper.Extract({ path: fullOutputDir }))
            .promise();
    }
}
