import React, { useState, useEffect } from 'react';
import { Zap, Plus, RefreshCw, Settings, Download, Upload, List } from 'lucide-react';

export const activate = (context: any) => {
    console.log('[OpenClaw Skills] Renderer activated');
    const { ui, useAppStore } = context;

    const SkillsPanel = () => {
        const [skills, setSkills] = useState<any[]>([]);

        useEffect(() => {
            const fetchSkills = async () => {
                if (context.ipc && context.ipc.invoke) {
                    const list = await context.ipc.invoke('skills:list');
                    setSkills(list);
                }
            };
            fetchSkills();
        }, []);

        return (
            <div className="h-full flex flex-col p-4 text-white">
                <h2 className="text-xl font-bold mb-4">OpenClaw Skills</h2>
                
                <div className="flex-1 overflow-y-auto space-y-3">
                    {skills.map((skill) => (
                        <div key={skill.name} className="bg-white/5 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-sm text-blue-400">{skill.name}</h3>
                                <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded text-gray-300">Legacy</span>
                            </div>
                            <p className="text-sm text-gray-300">{skill.description}</p>
                            <div className="mt-2 text-xs text-gray-500 font-mono truncate">
                                {skill.path}
                            </div>
                        </div>
                    ))}
                    {skills.length === 0 && <div className="text-center text-gray-500 mt-8">No legacy skills found</div>}
                </div>
            </div>
        );
    };

    const SkillsButton = () => {
        const { activeSidebarView, setActiveSidebarView } = useAppStore();
        const isActive = activeSidebarView === 'openclaw-skills';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('openclaw-skills')}
                title="OpenClaw Skills"
            >
                SKL
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'openclaw-skills-nav',
        component: SkillsButton
    });

    context.registerComponent('sidebar:view:openclaw-skills', {
        id: 'openclaw-skills-panel',
        component: SkillsPanel
    });

    // Register Commands for Command Menu
    const cleanups: Array<() => void> = [];

    if (ui?.registerCommand) {
        cleanups.push(ui.registerCommand({
            id: 'openclaw-skills:open',
            label: 'Open OpenClaw Skills',
            icon: Zap,
            category: 'OpenClaw Skills',
            action: () => {
                const store = useAppStore?.getState?.();
                store?.setActiveSidebarView?.('openclaw-skills');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'openclaw-skills:list',
            label: 'List All Skills',
            icon: List,
            category: 'OpenClaw Skills',
            action: () => {
                const store = useAppStore?.getState?.();
                store?.setActiveSidebarView?.('openclaw-skills');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'openclaw-skills:create',
            label: 'Create New Skill',
            icon: Plus,
            category: 'OpenClaw Skills',
            action: () => {
                context.ipc?.invoke?.('skills:create');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'openclaw-skills:refresh',
            label: 'Refresh Skills List',
            icon: RefreshCw,
            category: 'OpenClaw Skills',
            action: () => {
                context.ipc?.invoke?.('skills:refresh');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'openclaw-skills:import',
            label: 'Import Skill',
            icon: Download,
            category: 'OpenClaw Skills',
            action: () => {
                context.ipc?.invoke?.('skills:import');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'openclaw-skills:export',
            label: 'Export Skill',
            icon: Upload,
            category: 'OpenClaw Skills',
            action: () => {
                context.ipc?.invoke?.('skills:export');
            }
        }));

        cleanups.push(ui.registerCommand({
            id: 'openclaw-skills:settings',
            label: 'Skill Settings',
            icon: Settings,
            category: 'OpenClaw Skills',
            action: () => {
                context.ipc?.invoke?.('skills:openSettings');
            }
        }));
    }

    context._cleanups = cleanups;
};

export const deactivate = (context: any) => {
    console.log('[OpenClaw Skills] Renderer deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};
