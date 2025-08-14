import './polyfills';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { brandTheme } from './theme/brand';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Import Google Analytics initialization
import './ga-init';

// Import Mantine styles
import '@mantine/core/styles.css';
import 'mantine-datatable/styles.css';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={brandTheme} defaultColorScheme="light">
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </MantineProvider>
  </StrictMode>
);
