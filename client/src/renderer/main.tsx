import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import 'flexlayout-react/style/dark.css'
import './index.css'
import './styles/flexlayout.css'
import '../shared/types' // Import for global types

console.log('Renderer process starting...');

try {
  // Force dark mode
  document.documentElement.classList.add('dark');

  // Expose React and ReactDOM for plugins
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  console.log('Mounting React app...');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
  console.log('React app mounted.');
} catch (err) {
  console.error('Fatal error during initialization:', err);
  document.body.innerHTML = `<div style="color:red;padding:20px;"><h1>Fatal Error</h1><pre>${err}</pre></div>`;
}
