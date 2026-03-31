import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DecorationApp } from './App';
import './styles/index.css';
import './components/DecorationSearch.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DecorationApp />
  </StrictMode>,
);