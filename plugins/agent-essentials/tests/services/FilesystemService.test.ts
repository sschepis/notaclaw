import { FilesystemService } from '../../main/services/FilesystemService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs and os
jest.mock('fs', () => {
    const originalFs = jest.requireActual('fs');
    return {
        ...originalFs,
        existsSync: jest.fn(),
        mkdirSync: jest.fn(),
        statSync: jest.fn(),
        createWriteStream: jest.fn(),
        createReadStream: jest.fn(),
        promises: {
            readFile: jest.fn(),
            writeFile: jest.fn(),
            readdir: jest.fn(),
            mkdir: jest.fn(),
            rm: jest.fn(),
            rename: jest.fn(),
            stat: jest.fn(),
        }
    };
});

jest.mock('os', () => ({
    homedir: () => '/home/user',
    platform: () => 'linux'
}));

describe('FilesystemService', () => {
    let service: FilesystemService;
    const sandboxRoot = '/home/user/alephnet/sandbox';

    beforeEach(() => {
        jest.clearAllMocks();
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        service = new FilesystemService();
    });

    it('should resolve paths within sandbox', async () => {
        (fs.promises.readFile as jest.Mock).mockResolvedValue('content');
        
        await service.readFile('test.txt');
        
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(sandboxRoot, 'test.txt'), 'utf-8');
    });

    it('should throw error for paths outside sandbox', async () => {
        await expect(service.readFile('../test.txt')).rejects.toThrow('Security Error');
    });

    it('should list files', async () => {
        (fs.promises.readdir as jest.Mock).mockResolvedValue(['file1.txt', 'file2.txt']);
        
        const files = await service.listFiles('.');
        
        expect(files).toEqual(['file1.txt', 'file2.txt']);
        expect(fs.promises.readdir).toHaveBeenCalledWith(sandboxRoot);
    });

    it('should write file', async () => {
        await service.writeFile('new.txt', 'hello');
        
        expect(fs.promises.mkdir).toHaveBeenCalled(); // Ensures dir exists
        expect(fs.promises.writeFile).toHaveBeenCalledWith(path.join(sandboxRoot, 'new.txt'), 'hello', 'utf-8');
    });

    it('should delete file', async () => {
        await service.deleteFile('old.txt');
        
        expect(fs.promises.rm).toHaveBeenCalledWith(path.join(sandboxRoot, 'old.txt'), { recursive: true, force: true });
    });
});
