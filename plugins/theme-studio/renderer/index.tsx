import React, { useState, useEffect, useMemo } from 'react';
import { Theme, ThemeColors, ThemeTypography, DEFAULT_THEME } from './types';
import { hexToTailwindHsl, tailwindHslToHex, getContrastRatio, generatePalette } from './utils/color';

interface PluginContext {
    registerComponent: (location: string, options: any) => void;
    useAppStore: () => {
        activeSidebarView: string;
        setActiveSidebarView: (view: string) => void;
    };
}

// --- Icons ---
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const RefreshIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const PaletteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.093 0-.678.5-1.25 1.125-1.25h2.688c3.048 0 5.5-2.459 5.5-5.5C22 6.46 17.541 2 12 2Z"/></svg>;
const TextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>;
const WarningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const GridIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;

// --- Components ---

const ColorInput = ({ 
    label, 
    variable, 
    value, 
    onChange, 
    contrastWith 
}: { 
    label: string, 
    variable: string, 
    value: string, 
    onChange: (val: string) => void,
    contrastWith?: string
}) => {
    const hexValue = useMemo(() => tailwindHslToHex(value), [value]);
    
    // Calculate contrast if needed
    const contrastRatio = useMemo(() => {
        if (!contrastWith) return null;
        const bgHex = tailwindHslToHex(contrastWith);
        return getContrastRatio(hexValue, bgHex);
    }, [hexValue, contrastWith]);

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHex = e.target.value;
        onChange(hexToTailwindHsl(newHex));
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow direct HSL editing or Hex input
        const val = e.target.value;
        if (val.startsWith('#')) {
            onChange(hexToTailwindHsl(val));
        } else {
            onChange(val);
        }
    };

    return (
        <div className="flex flex-col gap-1 mb-3">
            <div className="flex justify-between items-center">
                <label className="text-xs text-gray-400 font-medium">{label}</label>
                {contrastRatio !== null && (
                    <div className="flex items-center gap-1" title={`Contrast Ratio: ${contrastRatio.toFixed(2)}:1`}>
                        {contrastRatio < 4.5 && <WarningIcon />}
                        <span className={`text-[10px] ${contrastRatio < 4.5 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {contrastRatio.toFixed(1)}
                        </span>
                    </div>
                )}
            </div>
            <div className="flex gap-2 items-center">
                <div className="relative w-8 h-8 rounded overflow-hidden border border-white/10 shrink-0">
                    <input 
                        type="color" 
                        value={hexValue}
                        onChange={handleHexChange}
                        className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-0"
                    />
                </div>
                <input 
                    type="text"
                    value={value}
                    onChange={handleTextChange}
                    className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-gray-300 focus:border-blue-500 outline-none transition-colors"
                />
            </div>
        </div>
    );
};

const TypographyEditor = ({ theme, onChange }: { theme: Theme, onChange: (t: Theme) => void }) => {
    const fonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'JetBrains Mono', 'Fira Code', 'System UI'];
    
    const updateFont = (key: keyof ThemeTypography, value: string) => {
        onChange({
            ...theme,
            typography: {
                ...(theme.typography || DEFAULT_THEME.typography!),
                [key]: value
            }
        });
    };

    return (
        <div className="space-y-4 p-1">
            <div>
                <label className="text-xs text-gray-400 block mb-1">Base Font Family</label>
                <select 
                    value={theme.typography?.fontFamily}
                    onChange={(e) => updateFont('fontFamily', e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm outline-none text-gray-300"
                >
                    {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
            </div>
            <div>
                <label className="text-xs text-gray-400 block mb-1">Monospace Font</label>
                <select 
                    value={theme.typography?.monoFontFamily}
                    onChange={(e) => updateFont('monoFontFamily', e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm outline-none text-gray-300"
                >
                    {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
            </div>
             <div>
                <label className="text-xs text-gray-400 block mb-1">Base Font Size</label>
                <input 
                    type="text"
                    value={theme.typography?.baseFontSize}
                    onChange={(e) => updateFont('baseFontSize', e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm outline-none text-gray-300"
                />
            </div>
        </div>
    );
};

export const activate = (context: PluginContext) => {
    console.log('[Theme Studio] Renderer activated');

    const ThemePanel = () => {
        const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
        const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'gallery'>('colors');
        const [savedThemes, setSavedThemes] = useState<Theme[]>([]);

        // Load saved themes on mount
        useEffect(() => {
            const saved = localStorage.getItem('theme-studio-themes');
            if (saved) {
                try {
                    setSavedThemes(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to load themes', e);
                }
            }
            // Also try to load the currently active theme
            const active = localStorage.getItem('theme-studio-active');
            if (active) {
                try {
                    const parsed = JSON.parse(active);
                    // Merge with default to ensure all fields exist (e.g. typography)
                    setTheme({ ...DEFAULT_THEME, ...parsed, colors: { ...DEFAULT_THEME.colors, ...parsed.colors }, typography: { ...DEFAULT_THEME.typography, ...parsed.typography } });
                } catch (e) {}
            }
        }, []);

        // Apply theme whenever it changes
        useEffect(() => {
            const root = document.documentElement;
            const body = document.body;

            // Colors
            Object.entries(theme.colors).forEach(([key, value]) => {
                const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                root.style.setProperty(cssVar, value);
                if (body) body.style.setProperty(cssVar, value);
            });

            // Typography
            if (theme.typography) {
                if (theme.typography.fontFamily) root.style.setProperty('--font-sans', theme.typography.fontFamily);
                if (theme.typography.monoFontFamily) root.style.setProperty('--font-mono', theme.typography.monoFontFamily);
                // Note: baseFontSize might need a different handling depending on app structure, typically on html/body
            }

            // Dark/Light mode classes
            if (theme.type === 'light') {
                root.classList.remove('dark');
                body?.classList.remove('dark');
                root.style.colorScheme = 'light';
            } else {
                root.classList.add('dark');
                body?.classList.add('dark');
                root.style.colorScheme = 'dark';
            }
            
            // Save active theme state
            localStorage.setItem('theme-studio-active', JSON.stringify(theme));

        }, [theme]);

        const handleColorChange = (key: keyof ThemeColors, value: string) => {
            setTheme(prev => ({
                ...prev,
                colors: {
                    ...prev.colors,
                    [key]: value
                }
            }));
        };

        const handleSaveTheme = () => {
            const newThemes = [...savedThemes.filter(t => t.id !== theme.id), theme];
            setSavedThemes(newThemes);
            localStorage.setItem('theme-studio-themes', JSON.stringify(newThemes));
            alert('Theme saved to local storage!');
        };

        const handleExport = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(theme, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `${theme.name.replace(/\s+/g, '-').toLowerCase()}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        };

        const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedTheme = JSON.parse(event.target?.result as string);
                    // Basic validation
                    if (importedTheme.colors && importedTheme.colors.background) {
                        setTheme(importedTheme);
                    } else {
                        alert('Invalid theme file');
                    }
                } catch (e) {
                    alert('Error parsing theme file');
                }
            };
            reader.readAsText(file);
        };

        const handleAutoGenerate = () => {
            const seed = prompt('Enter a hex color for your primary theme:', '#3b82f6');
            if (!seed) return;
            
            const palette = generatePalette(seed);
            if (palette) {
                setTheme(prev => ({
                    ...prev,
                    colors: {
                        ...prev.colors,
                        primary: hexToTailwindHsl(palette.primary),
                        secondary: hexToTailwindHsl(palette.secondary),
                        accent: hexToTailwindHsl(palette.accent),
                        muted: hexToTailwindHsl(palette.muted),
                        // Reset others to reasonable defaults or keep?
                        // For now let's just update the main ones
                    }
                }));
            }
        };

        const handleDeleteTheme = (e: React.MouseEvent, id: string) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this theme?')) {
                const newThemes = savedThemes.filter(t => t.id !== id);
                setSavedThemes(newThemes);
                localStorage.setItem('theme-studio-themes', JSON.stringify(newThemes));
            }
        };

        return (
            <div className="h-full flex flex-col bg-[#0f1115] text-gray-300 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#13161b]">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Theme Studio</h2>
                    <div className="flex gap-2">
                        <button onClick={handleSaveTheme} title="Save Theme" className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                            <SaveIcon />
                        </button>
                        <button onClick={handleExport} title="Export JSON" className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                            <DownloadIcon />
                        </button>
                        <label className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors cursor-pointer" title="Import JSON">
                            <UploadIcon />
                            <input type="file" onChange={handleImport} className="hidden" accept=".json" />
                        </label>
                    </div>
                </div>

                <div className="flex border-b border-white/5">
                    <button 
                        className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'colors' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => setActiveTab('colors')}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <PaletteIcon /> Colors
                        </div>
                    </button>
                    <button 
                        className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'typography' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => setActiveTab('typography')}
                    >
                         <div className="flex items-center justify-center gap-2">
                            <TextIcon /> Typography
                        </div>
                    </button>
                    <button 
                        className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'gallery' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => setActiveTab('gallery')}
                    >
                         <div className="flex items-center justify-center gap-2">
                            <GridIcon /> Gallery
                        </div>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {activeTab === 'colors' && (
                        <div className="space-y-6">
                            <div className="flex gap-2 mb-4">
                                <button 
                                    onClick={handleAutoGenerate}
                                    className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs py-2 rounded transition-colors"
                                >
                                    <RefreshIcon /> Auto-Generate from Color
                                </button>
                            </div>

                            <section>
                                <h3 className="text-xs font-bold text-white mb-3 uppercase opacity-50">Base</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    <ColorInput label="Background" variable="background" value={theme.colors.background} onChange={(v) => handleColorChange('background', v)} />
                                    <ColorInput label="Foreground" variable="foreground" value={theme.colors.foreground} onChange={(v) => handleColorChange('foreground', v)} contrastWith={theme.colors.background} />
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-white mb-3 uppercase opacity-50">Primary</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    <ColorInput label="Primary" variable="primary" value={theme.colors.primary} onChange={(v) => handleColorChange('primary', v)} />
                                    <ColorInput label="Primary Foreground" variable="primaryForeground" value={theme.colors.primaryForeground} onChange={(v) => handleColorChange('primaryForeground', v)} contrastWith={theme.colors.primary} />
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-white mb-3 uppercase opacity-50">Secondary</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    <ColorInput label="Secondary" variable="secondary" value={theme.colors.secondary} onChange={(v) => handleColorChange('secondary', v)} />
                                    <ColorInput label="Secondary Foreground" variable="secondaryForeground" value={theme.colors.secondaryForeground} onChange={(v) => handleColorChange('secondaryForeground', v)} contrastWith={theme.colors.secondary} />
                                </div>
                            </section>

                             <section>
                                <h3 className="text-xs font-bold text-white mb-3 uppercase opacity-50">UI Elements</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    <ColorInput label="Card Background" variable="card" value={theme.colors.card} onChange={(v) => handleColorChange('card', v)} />
                                    <ColorInput label="Card Foreground" variable="cardForeground" value={theme.colors.cardForeground} onChange={(v) => handleColorChange('cardForeground', v)} contrastWith={theme.colors.card} />
                                    <ColorInput label="Border" variable="border" value={theme.colors.border} onChange={(v) => handleColorChange('border', v)} />
                                    <ColorInput label="Input" variable="input" value={theme.colors.input} onChange={(v) => handleColorChange('input', v)} />
                                    <ColorInput label="Muted" variable="muted" value={theme.colors.muted} onChange={(v) => handleColorChange('muted', v)} />
                                    <ColorInput label="Muted Foreground" variable="mutedForeground" value={theme.colors.mutedForeground} onChange={(v) => handleColorChange('mutedForeground', v)} contrastWith={theme.colors.muted} />
                                </div>
                            </section>

                             <section>
                                <h3 className="text-xs font-bold text-white mb-3 uppercase opacity-50">States</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    <ColorInput label="Accent" variable="accent" value={theme.colors.accent} onChange={(v) => handleColorChange('accent', v)} />
                                    <ColorInput label="Accent Foreground" variable="accentForeground" value={theme.colors.accentForeground} onChange={(v) => handleColorChange('accentForeground', v)} contrastWith={theme.colors.accent} />
                                    <ColorInput label="Destructive" variable="destructive" value={theme.colors.destructive} onChange={(v) => handleColorChange('destructive', v)} />
                                    <ColorInput label="Destructive Foreground" variable="destructiveForeground" value={theme.colors.destructiveForeground} onChange={(v) => handleColorChange('destructiveForeground', v)} contrastWith={theme.colors.destructive} />
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'typography' && (
                        <TypographyEditor theme={theme} onChange={setTheme} />
                    )}

                    {activeTab === 'gallery' && (
                        <div className="grid grid-cols-2 gap-4">
                            {savedThemes.map(t => (
                                <div key={t.id} className="relative group bg-white/5 border border-white/10 rounded p-3 hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => setTheme(t)}>
                                    <div className="h-20 rounded mb-2 flex gap-1 overflow-hidden">
                                        <div className="flex-1" style={{backgroundColor: tailwindHslToHex(t.colors.background)}} />
                                        <div className="w-4" style={{backgroundColor: tailwindHslToHex(t.colors.primary)}} />
                                        <div className="w-4" style={{backgroundColor: tailwindHslToHex(t.colors.secondary)}} />
                                    </div>
                                    <div className="font-medium text-xs truncate text-white">{t.name}</div>
                                    <div className="text-[10px] text-gray-500 truncate">{t.description}</div>
                                    <button 
                                        className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-500/80 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => handleDeleteTheme(e, t.id)}
                                        title="Delete Theme"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                </div>
                            ))}
                            {savedThemes.length === 0 && (
                                <div className="col-span-2 text-center py-8 text-gray-500 text-xs">
                                    No saved themes yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const ThemeStudioButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'theme-studio';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('theme-studio')}
                title="Theme Studio"
            >
                <PaletteIcon />
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'theme-studio-nav',
        component: ThemeStudioButton
    });

    context.registerComponent('sidebar:view:theme-studio', {
        id: 'theme-studio-panel',
        component: ThemePanel
    });
};
