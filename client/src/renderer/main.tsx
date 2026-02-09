import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import 'flexlayout-react/style/dark.css'
import './index.css'
import './styles/flexlayout.css'
import '../shared/types' // Import for global types

// Force dark mode
document.documentElement.classList.add('dark');

// Expose React and ReactDOM for plugins
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
