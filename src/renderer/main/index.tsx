import React from 'react';
import { createRoot } from 'react-dom/client';
import MainApp from '../components/MainApp';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
  if (window.electronAPI?.log) {
    window.electronAPI.log('error', 'Unhandled window error', {
      message: event.error?.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
  }
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (window.electronAPI?.log) {
    window.electronAPI.log('error', 'Unhandled promise rejection', {
      reason: event.reason,
      stack: event.reason?.stack
    });
  }
});

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
          <h1 style={{ color: '#c33' }}>Application Error</h1>
          <p>The main application encountered an error and cannot continue.</p>
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
            Reload Application
          </button>
        </div>
      }
    >
      <MainApp />
    </ErrorBoundary>
  );
} else {
  console.error('Root container not found');
  if (window.electronAPI?.log) {
    window.electronAPI.log('error', 'Root container not found', {
      containerElement: container
    });
  }
}
