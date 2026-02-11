import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RendererPluginContext } from '../../../../src/shared/plugin-types';

interface VSCodeStatus {
    connected: boolean;
    authenticated: boolean;
    paired: boolean;
    host: string;
    port: number;
    deviceId?: string;
    pairedAt?: string;
}

type ActivityState = 'idle' | 'active' | 'error';

interface VSCodeFooterIconProps {
    context: RendererPluginContext;
}

/**
 * A compact footer icon for the NavRail that shows VS Code connection
 * and activity state at a glance.
 *
 * States:
 *  - Disconnected (red dot, dim icon)
 *  - Connected but unauthenticated (yellow dot, pulsing)
 *  - Connected & authenticated (green dot, solid)
 *  - Active / sending command (blue pulse animation)
 *  - Error (red flash)
 */
export const VSCodeFooterIcon: React.FC<VSCodeFooterIconProps> = ({ context }) => {
    const [status, setStatus] = useState<VSCodeStatus>({
        connected: false,
        authenticated: false,
        paired: false,
        host: '127.0.0.1',
        port: 19876,
    });
    const [activity, setActivity] = useState<ActivityState>('idle');
    const [showTooltip, setShowTooltip] = useState(false);
    const activityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Poll connection status
    const refreshStatus = useCallback(async () => {
        try {
            const s = await context.ipc.invoke('vscode-control:status', {});
            setStatus(s);
        } catch {
            setStatus((prev) => ({ ...prev, connected: false, authenticated: false }));
        }
    }, [context]);

    useEffect(() => {
        refreshStatus();
        const interval = setInterval(refreshStatus, 4000);
        return () => clearInterval(interval);
    }, [refreshStatus]);

    // Listen for log events to detect activity & errors
    useEffect(() => {
        const handler = (entry: any) => {
            if (!entry) return;
            const t = entry.type as string;
            if (t === 'tool-call') {
                setActivity('active');
                // Reset after 1.5s
                if (activityTimer.current) clearTimeout(activityTimer.current);
                activityTimer.current = setTimeout(() => setActivity('idle'), 1500);
            } else if (t === 'error') {
                setActivity('error');
                if (activityTimer.current) clearTimeout(activityTimer.current);
                activityTimer.current = setTimeout(() => setActivity('idle'), 2500);
            }
        };
        context.ipc.on('vscode-control:log', handler);
        return () => {
            if (activityTimer.current) clearTimeout(activityTimer.current);
        };
    }, [context]);

    // Derive visual state
    const { dotColor, dotPulse, iconOpacity, ringColor } = deriveVisuals(status, activity);

    return (
        <div
            className="relative flex items-center justify-center"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {/* Icon button */}
            <button
                onClick={refreshStatus}
                className={`
                    relative w-9 h-9 rounded-lg flex items-center justify-center
                    transition-all duration-200
                    bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground
                    border border-transparent hover:border-border
                    ${iconOpacity}
                `}
                aria-label={`VS Code: ${tooltipText(status, activity)}`}
            >
                {/* VS Code bracket icon */}
                <svg
                    className={`w-4 h-4 transition-colors duration-300 ${activity === 'active' ? 'text-blue-400' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                </svg>

                {/* Status dot indicator */}
                <span
                    className={`
                        absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full
                        border-2 border-background
                        ${dotColor}
                        ${dotPulse ? 'animate-pulse' : ''}
                        transition-colors duration-300
                    `}
                />

                {/* Activity ring (shown during active calls) */}
                {activity === 'active' && (
                    <span
                        className={`
                            absolute inset-0 rounded-lg
                            border-2 ${ringColor}
                            animate-ping opacity-30
                        `}
                    />
                )}
            </button>

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute left-full ml-3 z-[100] px-2.5 py-1.5 rounded-md bg-popover text-popover-foreground border border-border shadow-lg text-xs whitespace-nowrap pointer-events-none">
                    <div className="font-medium">{tooltipText(status, activity)}</div>
                    {status.connected && (
                        <div className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                            {status.host}:{status.port}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function deriveVisuals(status: VSCodeStatus, activity: ActivityState) {
    let dotColor = 'bg-red-500'; // disconnected
    let dotPulse = false;
    let iconOpacity = 'opacity-50';
    let ringColor = 'border-blue-400';

    if (activity === 'error') {
        dotColor = 'bg-red-500';
        dotPulse = true;
        iconOpacity = 'opacity-100';
        ringColor = 'border-red-400';
    } else if (status.connected) {
        if (status.authenticated) {
            dotColor = activity === 'active' ? 'bg-blue-400' : 'bg-emerald-500';
            dotPulse = activity === 'active';
            iconOpacity = 'opacity-100';
        } else {
            dotColor = 'bg-yellow-500';
            dotPulse = true;
            iconOpacity = 'opacity-80';
        }
    } else if (status.paired) {
        // Paired but disconnected — amber
        dotColor = 'bg-orange-400';
        dotPulse = false;
        iconOpacity = 'opacity-60';
    }

    return { dotColor, dotPulse, iconOpacity, ringColor };
}

function tooltipText(status: VSCodeStatus, activity: ActivityState): string {
    if (activity === 'error') return 'VS Code — Error';
    if (activity === 'active') return 'VS Code — Active';
    if (!status.connected) {
        return status.paired ? 'VS Code — Paired (offline)' : 'VS Code — Disconnected';
    }
    if (!status.authenticated) return 'VS Code — Authenticating…';
    return 'VS Code — Connected';
}
