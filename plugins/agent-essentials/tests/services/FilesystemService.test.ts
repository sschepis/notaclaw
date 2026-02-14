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
    const homeDir = '/home/user';

    beforeEach(() => {
        jest.clearAllMocks();
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        service = new FilesystemService();
    });

    it('should resolve relative paths under home directory by default', async () => {
        (fs.promises.readFile as jest.Mock).mockResolvedValue('content');
        
        await service.readFile('test.txt');
        
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(homeDir, 'test.txt'), 'utf-8');
    });

    it('should allow paths outside the base directory (no sandbox restriction)', async () => {
        (fs.promises.readFile as jest.Mock).mockResolvedValue('content');
        
        // This should NOT throw — agent has full filesystem access
        await service.readFile('/etc/hosts');
        
        expect(fs.promises.readFile).toHaveBeenCalledWith('/etc/hosts', 'utf-8');
    });

    it('should resolve tilde paths to home directory', async () => {
        (fs.promises.readFile as jest.Mock).mockResolvedValue('content');
        
        await service.readFile('~/Documents/notes.txt');
        
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(homeDir, 'Documents/notes.txt'), 'utf-8');
    });

    it('should list files', async () => {
        (fs.promises.readdir as jest.Mock).mockResolvedValue(['file1.txt', 'file2.txt']);
        
        const files = await service.listFiles('.');
        
        expect(files).toEqual(['file1.txt', 'file2.txt']);
        expect(fs.promises.readdir).toHaveBeenCalledWith(homeDir);
    });

    it('should write file', async () => {
        await service.writeFile('new.txt', 'hello');
        
        expect(fs.promises.mkdir).toHaveBeenCalled(); // Ensures dir exists
        expect(fs.promises.writeFile).toHaveBeenCalledWith(path.join(homeDir, 'new.txt'), 'hello', 'utf-8');
    });

    it('should delete file', async () => {
        await service.deleteFile('old.txt');
        
        expect(fs.promises.rm).toHaveBeenCalledWith(path.join(homeDir, 'old.txt'), { recursive: true, force: true });
    });

    it('should accept a custom base root', async () => {
        const customService = new FilesystemService('/opt/myproject');
        (fs.promises.readFile as jest.Mock).mockResolvedValue('data');
        
        await customService.readFile('config.json');
        
        expect(fs.promises.readFile).toHaveBeenCalledWith(path.join('/opt/myproject', 'config.json'), 'utf-8');
    });
});
