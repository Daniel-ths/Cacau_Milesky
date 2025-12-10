// frontend/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
// 🚨 A IMPORTAÇÃO DEVE SER ASSIM (SEM CHAVES) 🚨
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);