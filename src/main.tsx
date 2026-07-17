import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Eliminar el loading inicial una vez montado
const initialLoading = document.getElementById('initial-loading');
if (initialLoading) initialLoading.remove();
