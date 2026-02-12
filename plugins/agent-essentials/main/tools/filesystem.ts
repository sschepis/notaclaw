import { PluginContext } from '../../../../client/src/shared/plugin-types';
import { FilesystemService } from '../services/FilesystemService';

export function registerFilesystemTools(context: PluginContext, service: FilesystemService) {
    context.dsn.registerTool({
        name: 'fs_read_file',
        description: 'Read the contents of a file within the sandbox',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Relative path to the file' }
            },
            required: ['path']
        },
        semanticDomain: 'perceptual',
        primeDomain: [5], // Data
        smfAxes: [0.5, 0.5],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ path }: { path: string }) => {
        return { content: await service.readFile(path) };
    });

    context.dsn.registerTool({
        name: 'fs_write_file',
        description: 'Write content to a file within the sandbox',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Relative path to the file' },
                content: { type: 'string', description: 'Content to write' }
            },
            required: ['path', 'content']
        },
        semanticDomain: 'cognitive',
        primeDomain: [5],
        smfAxes: [0.5, 0.5],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ path, content }: { path: string, content: string }) => {
        await service.writeFile(path, content);
        return { success: true, message: `File written to ${path}` };
    });

    context.dsn.registerTool({
        name: 'fs_list_files',
        description: 'List files and directories in a path',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Directory path to list' }
            },
            required: ['path']
        },
        semanticDomain: 'perceptual',
        primeDomain: [5],
        smfAxes: [0.5, 0.5],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ path }: { path: string }) => {
        const files = await service.listFiles(path);
        return { files };
    });

    context.dsn.registerTool({
        name: 'fs_delete_file',
        description: 'Delete a file',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to the file' }
            },
            required: ['path']
        },
        semanticDomain: 'cognitive',
        primeDomain: [5],
        smfAxes: [0.5, 0.5],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ path }: { path: string }) => {
        await service.deleteFile(path);
        return { success: true };
    });

    context.dsn.registerTool({
        name: 'fs_create_directory',
        description: 'Create a directory',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Directory path' }
            },
            required: ['path']
        },
        semanticDomain: 'cognitive',
        primeDomain: [5],
        smfAxes: [0.5, 0.5],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ path }: { path: string }) => {
        await service.createDirectory(path);
        return { success: true };
    });

    context.dsn.registerTool({
        name: 'fs_compress_files',
        description: 'Compress files into a zip archive',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                sourcePaths: { type: 'array', items: { type: 'string' }, description: 'List of file paths to compress' },
                outputPath: { type: 'string', description: 'Path for the output zip file' }
            },
            required: ['sourcePaths', 'outputPath']
        },
        semanticDomain: 'cognitive',
        primeDomain: [5],
        smfAxes: [0.5, 0.5],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ sourcePaths, outputPath }: { sourcePaths: string[], outputPath: string }) => {
        await service.compressFiles(sourcePaths, outputPath);
        return { success: true, message: `Created archive at ${outputPath}` };
    });

    context.dsn.registerTool({
        name: 'fs_extract_archive',
        description: 'Extract a zip archive',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                archivePath: { type: 'string', description: 'Path to the zip file' },
                outputDir: { type: 'string', description: 'Directory to extract to' }
            },
            required: ['archivePath', 'outputDir']
        },
        semanticDomain: 'cognitive',
        primeDomain: [5],
        smfAxes: [0.5, 0.5],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ archivePath, outputDir }: { archivePath: string, outputDir: string }) => {
        await service.extractArchive(archivePath, outputDir);
        return { success: true, message: `Extracted to ${outputDir}` };
    });
}
