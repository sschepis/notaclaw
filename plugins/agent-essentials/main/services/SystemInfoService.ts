import * as si from 'systeminformation';

export class SystemInfoService {
    public async getSystemInfo(): Promise<any> {
        const [cpu, mem, osInfo, currentLoad, networkInterfaces] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.osInfo(),
            si.currentLoad(),
            si.networkInterfaces()
        ]);

        return {
            cpu: {
                manufacturer: cpu.manufacturer,
                brand: cpu.brand,
                speed: cpu.speed,
                cores: cpu.cores,
                physicalCores: cpu.physicalCores,
                load: currentLoad.currentLoad,
                loadUser: currentLoad.currentLoadUser,
                loadSystem: currentLoad.currentLoadSystem
            },
            memory: {
                total: mem.total,
                free: mem.free,
                used: mem.used,
                active: mem.active,
                available: mem.available
            },
            os: {
                platform: osInfo.platform,
                distro: osInfo.distro,
                release: osInfo.release,
                hostname: osInfo.hostname
            },
            network: Array.isArray(networkInterfaces) 
                ? networkInterfaces.map(iface => ({
                    iface: iface.iface,
                    ip4: iface.ip4,
                    mac: iface.mac,
                    internal: iface.internal
                  }))
                : []
        };
    }

    public async getProcessList(): Promise<any[]> {
        const processes = await si.processes();
        return processes.list.slice(0, 20).map(p => ({
            pid: p.pid,
            name: p.name,
            cpu: p.cpu,
            mem: p.mem
        }));
    }
}
