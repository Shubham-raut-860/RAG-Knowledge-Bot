import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './lib/ThemeContext.tsx';
import { ToastProvider } from './lib/toast.tsx';
import './index.css';

// Apply saved theme before first render (prevents flash)
const savedTheme = localStorage.getItem('rag_theme');
if (savedTheme === 'light') {
  document.documentElement.classList.add('light');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <ToastProvider />
    </ThemeProvider>
  </StrictMode>,
);
