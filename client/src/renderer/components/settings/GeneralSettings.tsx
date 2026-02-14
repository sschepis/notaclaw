import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Network, FileText, Plus, Trash2, Shield } from 'lucide-react';

export const GeneralSettings: React.FC = () => {
    const [networkConfig, setNetworkConfig] = useState<any>(null);
    const [loggingConfig, setLoggingConfig] = useState<any>(null);
    const [newPeer, setNewPeer] = useState('');
    const [sandboxed, setSandboxed] = useState<boolean>(true);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const net = await window.electronAPI.configGetNetwork();
            const log = await window.electronAPI.configGetLogging();
            const isSandboxed = await window.electronAPI.configIsSandboxed();
            setNetworkConfig(net);
            setLoggingConfig(log);
            setSandboxed(isSandboxed);
        } catch (error) {
            console.error("Failed to load config:", error);
        }
    };

    const handleToggleSandbox = async (checked: boolean) => {
        // Switch shows "sandboxed" state: checked = sandboxed, unchecked = unrestricted
        setSandboxed(checked);
        try {
            await window.electronAPI.configSetSandboxed(checked);
        } catch (error) {
            console.error("Failed to update sandbox setting:", error);
            setSandboxed(!checked); // revert on error
        }
    };

    const handleAddPeer = async () => {
        if (newPeer) {
            await window.electronAPI.configAddPeer(newPeer);
            setNewPeer('');
            loadConfig();
        }
    };

    const handleRemovePeer = async (peer: string) => {
        await window.electronAPI.configRemovePeer(peer);
        loadConfig();
    };

    const handleUpdateNetwork = async (key: string, value: any) => {
        await window.electronAPI.configUpdateNetwork({ [key]: value });
        loadConfig();
    };

    const handleUpdateLogging = async (key: string, value: any) => {
        await window.electronAPI.configUpdateLogging({ [key]: value });
        loadConfig();
    };

    if (!networkConfig || !loggingConfig) return <div className="p-8 text-center text-muted-foreground">Loading configuration...</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-foreground mb-6">General Settings</h2>

            {/* Agent Sandbox */}
            <Card className="bg-card/40 border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-amber-400" />
                        Agent Filesystem Access
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Sandbox agent to workspace</Label>
                            <p className="text-xs text-muted-foreground max-w-md">
                                When enabled, AI agents can only access files within the active workspace folder.
                                Disable this to allow agents to read and write files anywhere on your system
                                (e.g. your home folder).
                            </p>
                        </div>
                        <Switch
                            checked={sandboxed}
                            onCheckedChange={handleToggleSandbox}
                        />
                    </div>
                    {!sandboxed && (
                        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                            <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-300">
                                <strong>Unrestricted mode active.</strong> The agent can access any file your OS user can reach.
                                Use with caution — the agent may read or modify files outside the workspace.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Network Settings */}
            <Card className="bg-card/40 border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Network className="w-5 h-5 text-blue-400" />
                        Network Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Bootstrap URL</Label>
                        <Input 
                            value={networkConfig.bootstrapUrl} 
                            onChange={(e) => handleUpdateNetwork('bootstrapUrl', e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Heartbeat Interval (ms)</Label>
                        <Input 
                            type="number"
                            value={networkConfig.heartbeatIntervalMs} 
                            onChange={(e) => handleUpdateNetwork('heartbeatIntervalMs', parseInt(e.target.value))}
                        />
                    </div>

                    <Separator className="my-2" />

                    <div className="space-y-2">
                        <Label>Peers</Label>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Add peer URL..." 
                                value={newPeer}
                                onChange={(e) => setNewPeer(e.target.value)}
                            />
                            <Button onClick={handleAddPeer} size="icon">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-2 mt-2">
                            {networkConfig.peers.map((peer: string) => (
                                <div key={peer} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                    <span className="text-sm font-mono truncate">{peer}</span>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleRemovePeer(peer)}
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logging Settings */}
            <Card className="bg-card/40 border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-400" />
                        Logging Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Log Level</Label>
                        <Select 
                            value={loggingConfig.level} 
                            onValueChange={(val) => handleUpdateLogging('level', val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="debug">Debug</SelectItem>
                                <SelectItem value="info">Info</SelectItem>
                                <SelectItem value="warn">Warn</SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Format</Label>
                        <Select 
                            value={loggingConfig.format} 
                            onValueChange={(val) => handleUpdateLogging('format', val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="json">JSON</SelectItem>
                                <SelectItem value="pretty">Pretty</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
