import React from 'react';
import { createRoot } from 'react-dom/client';
import { Child1Component } from '../components/Child1Component';
import { Child2Component } from '../components/Child2Component';
import { Child3Component } from '../components/Child3Component';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ChildComponentType } from '../../types';
import { createLogger } from '../utils/logger';

// Global error handler for unhandled errors in child windows
window.addEventListener('error', (event) => {
  console.error('Unhandled error in child window:', event.error);
  if (window.electronAPI?.log) {
    window.electronAPI.log('error', 'Unhandled child window error', {
      message: event.error?.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      url: window.location.href
    });
  }
});

// Global handler for unhandled promise rejections in child windows
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in child window:', event.reason);
  if (window.electronAPI?.log) {
    window.electronAPI.log('error', 'Unhandled promise rejection in child window', {
      reason: event.reason,
      stack: event.reason?.stack,
      url: window.location.href
    });
  }
});

// Router component that renders the appropriate child component based on URL parameters
const ChildRouter: React.FC = () => {
  const logger = createLogger();

  // Get the component type from URL search parameters
  const urlParams = new URLSearchParams(window.location.search);
  const componentType = urlParams.get('type') as ChildComponentType;

  React.useEffect(() => {
    logger.info(`Child router initialized with type: ${componentType}`, {
      url: window.location.href,
      search: window.location.search
    }, 'ChildRouter');
  }, [componentType, logger]);

  // Render the appropriate component based on the type parameter
  switch (componentType) {
    case 'child1':
      return <Child1Component />;
    case 'child2':
      return <Child2Component />;
    case 'child3':
      return <Child3Component />;
    default:
      logger.error(`Unknown component type: ${componentType}`, {
        availableTypes: ['child1', 'child2', 'child3'],
        url: window.location.href
      }, 'ChildRouter');

      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2 style={{ color: '#c33' }}>Error</h2>
          <p>Unknown component type: <strong>{componentType || 'null'}</strong></p>
          <p>Valid types are: child1, child2, child3</p>
          <details style={{ marginTop: '15px', textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer' }}>Debug Information</summary>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px',
              marginTop: '10px'
            }}>
              URL: {window.location.href}
              Search: {window.location.search}
              Component Type: {componentType || 'undefined'}
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
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary
      fallback={
        <div style={{
          padding: '50px',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h1 style={{ color: '#c33' }}>Child Window Error</h1>
          <p>This child window encountered an error and cannot continue.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007cba',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Reload Window
          </button>
        </div>
      }
    >
      <ChildRouter />
    </ErrorBoundary>
  );
} else {
  console.error('Root container not found in child window');
  if (window.electronAPI?.log) {
    window.electronAPI.log('error', 'Root container not found in child window', {
      containerElement: container,
      url: window.location.href
    });
  }
}
