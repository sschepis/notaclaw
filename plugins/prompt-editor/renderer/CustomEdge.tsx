import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { usePromptEditorStore } from './store';

/**
 * AnimatedEdge — a custom ReactFlow edge with:
 * - Smooth bezier path
 * - Directional arrowhead marker
 * - Animated dashed stroke when source node is executing
 * - Color tinting based on execution state
 * - Edge label rendering
 */

const EDGE_COLORS = {
    idle: '#555',
    running: '#fbbf24',
    completed: '#4ade80',
    error: '#f87171',
};

const AnimatedEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    label,
    selected,
    markerEnd,
    style = {},
    source,
}) => {
    const executionStatus = usePromptEditorStore(state => state.executionStatus);
    const sourceStatus = executionStatus[source]?.status;

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // Determine edge color and animation
    let strokeColor = selected ? '#6c6cff' : EDGE_COLORS.idle;
    let isAnimated = false;
    let strokeWidth = selected ? 2.5 : 1.5;

    if (sourceStatus === 'running') {
        strokeColor = EDGE_COLORS.running;
        isAnimated = true;
        strokeWidth = 2.5;
    } else if (sourceStatus === 'completed') {
        strokeColor = EDGE_COLORS.completed;
        strokeWidth = 2;
    } else if (sourceStatus === 'error') {
        strokeColor = EDGE_COLORS.error;
        strokeWidth = 2;
    }

    const displayLabel = label || data?.label || data?.condition;

    return (
        <>
            {/* Background path for hover area */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                className="react-flow__edge-interaction"
            />
            {/* Main edge path */}
            <path
                id={id}
                d={edgePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={isAnimated ? '8 4' : undefined}
                markerEnd={`url(#arrow-${id})`}
                style={{
                    transition: 'stroke 0.3s ease, stroke-width 0.2s ease',
                    ...(isAnimated ? {
                        animation: 'edgeFlowDash 0.6s linear infinite',
                    } : {}),
                    ...style,
                }}
            />
            {/* Arrowhead marker */}
            <defs>
                <marker
                    id={`arrow-${id}`}
                    viewBox="0 0 12 12"
                    refX="10"
                    refY="6"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto-start-reverse"
                >
                    <path
                        d="M 2 2 L 10 6 L 2 10 z"
                        fill={strokeColor}
                        style={{ transition: 'fill 0.3s ease' }}
                    />
                </marker>
            </defs>
            {/* Label */}
            {displayLabel && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            pointerEvents: 'all',
                            fontSize: 10,
                            fontWeight: 500,
                            background: '#1e1e38',
                            color: '#bbb',
                            padding: '2px 6px',
                            borderRadius: 3,
                            border: `1px solid ${strokeColor}33`,
                            whiteSpace: 'nowrap',
                        }}
                        className="nodrag nopan"
                    >
                        {displayLabel}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

/**
 * CSS keyframes for animated dashes — injected once.
 */
export const EDGE_ANIMATION_CSS = `
@keyframes edgeFlowDash {
    0% { stroke-dashoffset: 24; }
    100% { stroke-dashoffset: 0; }
}
`;

export default AnimatedEdge;
