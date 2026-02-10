import React from 'react';

interface MetricCardProps {
  title: string;
  data: any;
  context?: any;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, data, context }) => {
  const value = typeof data === 'object' ? (data.value || data.usage || data.temp || data.price) : data;
  const unit = data.unit || (context === 'weather' ? '°F' : context === 'cpu' ? '%' : '');
  const trend = data.trend;

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md flex flex-col items-center justify-center min-w-[150px]">
      <div className="text-gray-400 text-sm uppercase tracking-wider mb-2">{title}</div>
      <div className="text-3xl font-bold text-white">
        {value}
        <span className="text-lg text-gray-500 ml-1">{unit}</span>
      </div>
      {trend && (
        <div className={`text-sm mt-2 ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {trend === 'up' ? '▲' : '▼'} {trend}
        </div>
      )}
    </div>
  );
};
