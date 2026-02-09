import React, { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface SMFRadarChartProps {
  smf: number[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  color?: string;
  fillOpacity?: number;
}

// Semantic domains map to SMF axes
const DOMAIN_LABELS = [
  'Percept-0', 'Percept-1', 'Percept-2', 'Percept-3', // Perceptual (0-3)
  'Cognit-0', 'Cognit-1', 'Cognit-2', 'Cognit-3',     // Cognitive (4-7)
  'Tempor-0', 'Tempor-1', 'Tempor-2', 'Tempor-3',     // Temporal (8-11)
  'Meta-0', 'Meta-1', 'Meta-2', 'Meta-3'              // Meta (12-15)
];

const DOMAIN_COLORS = {
  perceptual: '#3b82f6', // blue
  cognitive: '#10b981',  // green
  temporal: '#f59e0b',   // amber
  meta: '#8b5cf6'        // purple
};

const getDomainColor = (index: number): string => {
  if (index < 4) return DOMAIN_COLORS.perceptual;
  if (index < 8) return DOMAIN_COLORS.cognitive;
  if (index < 12) return DOMAIN_COLORS.temporal;
  return DOMAIN_COLORS.meta;
};

const SIZE_CONFIG = {
  sm: { width: 200, height: 200, fontSize: 8 },
  md: { width: 300, height: 300, fontSize: 10 },
  lg: { width: 400, height: 400, fontSize: 12 }
};

export const SMFRadarChart: React.FC<SMFRadarChartProps> = ({
  smf,
  size = 'md',
  showLabels = true,
  color = '#3b82f6',
  fillOpacity = 0.3
}) => {
  const data = useMemo(() => {
    if (!smf || smf.length !== 16) {
      return DOMAIN_LABELS.map((label, i) => ({
        axis: label,
        value: 0,
        fullMark: 1,
        domain: Math.floor(i / 4)
      }));
    }
    
    return DOMAIN_LABELS.map((label, i) => ({
      axis: label,
      value: Math.abs(smf[i]), // Normalize to positive for display
      rawValue: smf[i],
      fullMark: 1,
      domain: Math.floor(i / 4)
    }));
  }, [smf]);

  const sizeConfig = SIZE_CONFIG[size];

  // Calculate domain averages for tooltip
  const domainAverages = useMemo(() => {
    const domains = ['Perceptual', 'Cognitive', 'Temporal', 'Meta'];
    return domains.map((name, i) => {
      const start = i * 4;
      const values = smf?.slice(start, start + 4) || [0, 0, 0, 0];
      const avg = values.reduce((a, b) => a + Math.abs(b), 0) / 4;
      return { name, average: avg.toFixed(3) };
    });
  }, [smf]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const domainNames = ['Perceptual', 'Cognitive', 'Temporal', 'Meta'];
      return (
        <div className="bg-zinc-800 border border-zinc-600 rounded p-2 text-xs">
          <p className="font-medium text-white">{data.axis}</p>
          <p className="text-zinc-300">
            Value: <span className="text-blue-400">{data.rawValue?.toFixed(4) || '0'}</span>
          </p>
          <p className="text-zinc-400">
            Domain: {domainNames[data.domain]}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={sizeConfig.width} height={sizeConfig.height}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#374151" />
          {showLabels && (
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: '#9ca3af', fontSize: sizeConfig.fontSize }}
              tickLine={false}
            />
          )}
          <PolarRadiusAxis
            angle={90}
            domain={[0, 1]}
            tick={{ fill: '#6b7280', fontSize: sizeConfig.fontSize - 2 }}
            tickCount={3}
          />
          <Radar
            name="SMF"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={fillOpacity}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
      
      {/* Domain Legend */}
      <div className="flex flex-wrap gap-3 mt-2 text-xs">
        {domainAverages.map((domain, i) => (
          <div key={domain.name} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: Object.values(DOMAIN_COLORS)[i] }}
            />
            <span className="text-zinc-400">{domain.name}:</span>
            <span className="text-white">{domain.average}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SMFRadarChart;
