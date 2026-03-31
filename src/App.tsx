import { useState, useEffect } from 'react';
import { initSDK } from './runanywhere';
import { DecorationSearch } from './components/DecorationSearch';

export function DecorationApp() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  useEffect(() => {
    initSDK()
      .then(() => setSdkReady(true))
      .catch((err) => setSdkError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (sdkError) {
    return (
      <div className="app-loading">
        <h2>SDK Error</h2>
        <p className="error-text">{sdkError}</p>
      </div>
    );
  }

  if (!sdkReady) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <h2>Loading Decoration AI Search...</h2>
        <p>Initializing AI engine</p>
      </div>
    );
  }

  return (
    <div className="app decoration-app">
      <DecorationSearch />
    </div>
  );
}