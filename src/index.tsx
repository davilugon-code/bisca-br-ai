import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error handler for "White Screen" debugging on Itch.io
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = `
      <div style="color: white; background: #990000; padding: 20px; font-family: sans-serif;">
        <h2>Erro de Inicialização</h2>
        <p>${event.message}</p>
        <p>Verifique o console (F12) para mais detalhes.</p>
      </div>
    `;
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  console.error("Render error:", e);
  rootElement.innerHTML = `<div style="color:red">Falha ao renderizar app: ${e}</div>`;
}