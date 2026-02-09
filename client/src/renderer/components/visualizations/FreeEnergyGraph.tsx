import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';

interface FreeEnergyDataPoint {
  timestamp: number;
  freeEnergy: number;
  state?: 'Idle' | 'Perceiving' | 'Minimizing Free Energy' | 'Acting';
}

interface FreeEnergyGraphProps {
  currentFreeEnergy: number;
  agentState: 'Idle' | 'Perceiving' | 'Minimizing Free Energy' | 'Acting';
  maxPoints?: number;
  height?: number;
  showGradient?: boolean;
}

const STATE_COLORS = {
  'Idle': '#6b7280',
  'Perceiving': '#3b82f6',
  'Minimizing Free Energy': '#10b981',
  'Acting': '#f59e0b'
};

export const FreeEnergyGraph: React.FC<FreeEnergyGraphProps> = ({
  currentFreeEnergy,
  agentState,
  maxPoints = 60,
  height = 150,
  showGradient = true
}) => {
  const [history, setHistory] = useState<FreeEnergyDataPoint[]>([]);

  // Add new data point every second
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory(prev => {
        const newPoint: FreeEnergyDataPoint = {
          timestamp: Date.now(),
          freeEnergy: currentFreeEnergy,
          state: agentState
        };
        
        const updated = [...prev, newPoint];
        // Keep only the last maxPoints
        return updated.slice(-maxPoints);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentFreeEnergy, agentState, maxPoints]);

  const data = useMemo(() => {
    return history.map((point, index) => ({
      ...point,
      index,
      displayTime: new Date(point.timestamp).toLocaleTimeString([], { 
        minute: '2-digit', 
        second: '2-digit' 
      })
    }));
  }, [history]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (history.length === 0) return { min: 0, max: 1, avg: 0.5, trend: 'stable' };
    
    const values = history.map(h => h.freeEnergy);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Calculate trend from last 10 points
    const recent = values.slice(-10);
    let trend: 'decreasing' | 'increasing' | 'stable' = 'stable';
    if (recent.length >= 2) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg < firstAvg - 0.02) trend = 'decreasing';
      else if (secondAvg > firstAvg + 0.02) trend = 'increasing';
    }
    
    return { min, max, avg, trend };
  }, [history]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const stateKey = data.state as keyof typeof STATE_COLORS;
      return (
        <div className="bg-zinc-800 border border-zinc-600 rounded p-2 text-xs">
          <p className="font-medium text-white">Free Energy</p>
          <p className="text-zinc-300">
            Value: <span className="text-emerald-400">{data.freeEnergy.toFixed(4)}</span>
          </p>
          <p className="text-zinc-300">
            State: <span style={{ color: STATE_COLORS[stateKey] || '#6b7280' }}>{data.state}</span>
          </p>
          <p className="text-zinc-400">{data.displayTime}</p>
        </div>
      );
    }
    return null;
  };

  const trendIcon = stats.trend === 'decreasing' ? '↓' : stats.trend === 'increasing' ? '↑' : '→';
  const trendColor = stats.trend === 'decreasing' ? 'text-emerald-400' : 
                     stats.trend === 'increasing' ? 'text-red-400' : 'text-zinc-400';

  return (
    <div className="flex flex-col">
      {/* Stats Header */}
      <div className="flex justify-between items-center mb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Current:</span>
          <span className="text-white font-mono">{currentFreeEnergy.toFixed(4)}</span>
          <span className={trendColor}>{trendIcon}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-zinc-500">
            Min: <span className="text-emerald-400">{stats.min.toFixed(3)}</span>
          </span>
          <span className="text-zinc-500">
            Avg: <span className="text-blue-400">{stats.avg.toFixed(3)}</span>
          </span>
          <span className="text-zinc-500">
            Max: <span className="text-orange-400">{stats.max.toFixed(3)}</span>
          </span>
        </div>
      </div>
      
      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        {showGradient ? (
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="freeEnergyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="displayTime"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={stats.avg}
              stroke="#3b82f6"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="freeEnergy"
              stroke="#10b981"
              fill="url(#freeEnergyGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="displayTime"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={stats.avg}
              stroke="#3b82f6"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="freeEnergy"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#10b981' }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
      
      {/* Agent State Indicator */}
      <div className="flex items-center justify-center gap-2 mt-2">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: STATE_COLORS[agentState] }}
        />
        <span className="text-xs" style={{ color: STATE_COLORS[agentState] }}>
          {agentState}
        </span>
      </div>
    </div>
  );
};

export default FreeEnergyGraph;
