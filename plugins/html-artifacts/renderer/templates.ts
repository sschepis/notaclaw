export const templates: { id: string; title: string; type: 'html' | 'react'; content: string }[] = [
  {
    id: 'html-basic',
    title: 'Basic HTML',
    type: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Basic HTML</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            padding: 2rem;
            background-color: #f3f4f6;
            color: #1f2937;
        }
        .card {
            background: white;
            padding: 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            max-width: 600px;
            margin: 0 auto;
        }
        h1 { color: #2563eb; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Hello World</h1>
        <p>This is a basic HTML artifact.</p>
        <button onclick="alert('Clicked!')" style="background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; cursor: pointer; margin-top: 1rem;">Click Me</button>
    </div>
</body>
</html>`
  },
  {
    id: 'react-counter',
    title: 'React Counter',
    type: 'react',
    content: `import React, { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">React Counter</h1>
        <div className="text-6xl font-bold text-blue-600 mb-6">{count}</div>
        <div className="space-x-4">
          <button 
            onClick={() => setCount(c => c - 1)}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Decrease
          </button>
          <button 
            onClick={() => setCount(c => c + 1)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            Increase
          </button>
        </div>
      </div>
    </div>
  );
};

export default Counter;`
  },
  {
    id: 'react-chart',
    title: 'Chart Example',
    type: 'react',
    content: `import React from 'react';

// Simple SVG Chart Component
const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value));
  const height = 200;
  const width = 300;
  const barWidth = width / data.length;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {data.map((d, i) => {
        const barHeight = (d.value / max) * height;
        return (
          <g key={i} transform={\`translate(\${i * barWidth}, 0)\`}>
            <rect
              y={height - barHeight}
              width={barWidth - 4}
              height={barHeight}
              fill="#3b82f6"
              rx="4"
            />
            <text
              x={(barWidth - 4) / 2}
              y={height + 20}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const App = () => {
  const data = [
    { label: 'Jan', value: 400 },
    { label: 'Feb', value: 300 },
    { label: 'Mar', value: 600 },
    { label: 'Apr', value: 800 },
    { label: 'May', value: 500 }
  ];

  return (
    <div className="p-8 bg-white min-h-screen flex flex-col items-center">
      <h1 className="text-xl font-bold mb-8">Monthly Sales</h1>
      <BarChart data={data} />
    </div>
  );
};

export default App;`
  }
];
