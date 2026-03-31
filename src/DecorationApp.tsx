import { DecorationSearch } from './components/DecorationSearch';
import './styles/index.css';

/**
 * DecorationApp.tsx
 * 
 * Simplified app for Decoration AI Search
 * Single-purpose: Image search for decorations
 */

export function DecorationApp() {
  return (
    <div className="app decoration-app">
      <DecorationSearch />
    </div>
  );
}
