import * as Babel from '@babel/standalone';

export const compileReact = (code: string): string => {
  try {
    // Transform JSX to JS
    const result = Babel.transform(code, {
      presets: ['react', 'env'],
      filename: 'artifact.tsx',
    });

    const compiledCode = result.code;

    // Wrap in a complete HTML document
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Artifact</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- React & ReactDOM -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <style>
      body { background-color: transparent; }
      #root { width: 100%; height: 100%; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script>
      // Error handling
      window.onerror = function(message, source, lineno, colno, error) {
        window.parent.postMessage({ type: 'error', message, source, lineno, colno }, '*');
        document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: monospace; background: #fee2e2; border: 1px solid #ef4444; border-radius: 4px;">' + 
          '<h3>Runtime Error</h3>' +
          '<p>' + message + '</p>' +
          '<p>Line: ' + lineno + '</p>' +
        '</div>';
      };

      // Console proxy
      const originalLog = console.log;
      console.log = function(...args) {
        window.parent.postMessage({ type: 'log', args }, '*');
        originalLog.apply(console, args);
      };
    </script>
    <script type="text/javascript">
      try {
        const { useState, useEffect, useRef, useMemo, useCallback } = React;
        
        // User code execution wrapper
        const exports = {};
        const require = (module) => {
          if (module === 'react') return React;
          if (module === 'react-dom') return ReactDOM;
          return {};
        };

        // Evaluate the compiled code
        ${compiledCode}

        // Mount the default export
        const App = exports.default || ((typeof App !== 'undefined') ? App : null);
        
        if (App) {
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(React.createElement(App));
        } else {
          throw new Error('No default export found. Please export your component as default.');
        }
      } catch (err) {
        console.error(err);
        document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: monospace; background: #fee2e2; border: 1px solid #ef4444; border-radius: 4px;">' + 
          '<h3>Compilation/Execution Error</h3>' +
          '<pre>' + err.message + '</pre>' +
        '</div>';
      }
    </script>
</body>
</html>`;
  } catch (err: any) {
    return `
      <html>
        <body style="color: red; font-family: monospace; padding: 20px;">
          <h3>Transpilation Error</h3>
          <pre>${err.message}</pre>
        </body>
      </html>
    `;
  }
};
