import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { brandTheme } from './theme/brand';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Defer Google Analytics initialization to user interaction / idle time (PROD only)
if (import.meta.env.PROD && typeof window !== 'undefined') {
  let initialized = false;
  const init = () => {
    if (initialized) return;
    initialized = true;
    import('./ga-init');
  };
  const onFirstInteraction = () => {
    document.removeEventListener('pointerdown', onFirstInteraction);
    document.removeEventListener('keydown', onFirstInteraction);
    init();
  };
  document.addEventListener('pointerdown', onFirstInteraction, { once: true });
  document.addEventListener('keydown', onFirstInteraction, { once: true });
  // Fallback: idle or timeout after a delay
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(() => init());
  } else {
    setTimeout(() => init(), 5000);
  }
}

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';
import 'react';
import 'react-dom';

import './index.css';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <MantineProvider theme={brandTheme} defaultColorScheme="auto">
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </MantineProvider>
    </StrictMode>
  );
}
