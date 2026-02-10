import React from 'react';

interface SimpleChartProps {
  title: string;
  data: any; // { points: number[], labels?: string[] } or just number[]
}

export const SimpleChart: React.FC<SimpleChartProps> = ({ title, data }) => {
  const points = Array.isArray(data) ? data : (data.points || []);
  const values = points.map((p: any) => typeof p === 'number' ? p : p.value || 0);
  
  if (values.length === 0) {
    return <div className="text-gray-500 text-xs p-4">No chart data</div>;
  }

  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min;
  const width = 300;
  const height = 100;
  
  const path = values.map((val: number, i: number) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md min-w-[300px]">
      <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">{title}</div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth="2" />
        {values.map((val: number, i: number) => {
           const x = (i / (values.length - 1)) * width;
           const y = height - ((val - min) / range) * height;
           return <circle key={i} cx={x} cy={y} r="3" fill="#3b82f6" />;
        })}
      </svg>
    </div>
  );
};
