import { Component, type ReactNode } from 'react';
import { Alert, Button } from '@mantine/core';

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo?: string;
}

/**
 * A reusable React error boundary that prevents the entire app from crashing
 * on render errors.  It displays a graceful fallback UI and gives the user a
 * chance to reload.  All production builds should wrap the root <App /> with
 * this component (see src/main.tsx).
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    // Log to an error reporting service in future (Sentry / LogRocket etc.)
    console.error(
      'Unhandled render error captured by ErrorBoundary:',
      error,
      errorInfo
    );
  }

  private handleReload = () => {
    // Simple full-page refresh – avoids leaving the app in a bad state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert title="Something went wrong" color="red" withCloseButton={false}>
          <p>
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          <Button mt="sm" color="red" onClick={this.handleReload}>
            Refresh Page
          </Button>
        </Alert>
      );
    }

    return this.props.children;
  }
}
