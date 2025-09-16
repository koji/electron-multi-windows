import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Store error info in state
    this.setState({ errorInfo });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to main process if available
    if (window.electronAPI?.log) {
      window.electronAPI.log('error', 'React Error Boundary triggered', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          margin: '10px'
        }}>
          <h2 style={{ color: '#c33', marginBottom: '10px' }}>Something went wrong</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            An unexpected error occurred. Please try refreshing the window.
          </p>
          <details style={{ textAlign: 'left', marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', color: '#666' }}>
              Error Details (Click to expand)
            </summary>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              marginTop: '10px'
            }}>
              {this.state.error?.message}
              {this.state.error?.stack && (
                <>
                  {'\n\nStack Trace:\n'}
                  {this.state.error.stack}
                </>
              )}
              {this.state.errorInfo?.componentStack && (
                <>
                  {'\n\nComponent Stack:\n'}
                  {this.state.errorInfo.componentStack}
                </>
              )}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#007cba',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Window
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
