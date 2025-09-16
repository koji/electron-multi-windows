import React, { useEffect, useState } from 'react';
import { useDogApi } from '../hooks/useDogApi';
import { ErrorBoundary } from './ErrorBoundary';
import { createLogger } from '../utils/logger';

const Child1ComponentContent: React.FC = () => {
  const { data, loading, error, errorDetails, retry, canRetry } = useDogApi();
  const [imageError, setImageError] = useState(false);
  const logger = createLogger('child1');

  useEffect(() => {
    logger.info('Child1Component initialized');
  }, [logger]);

  const handleImageError = () => {
    setImageError(true);
    logger.error('Failed to load dog image', {
      imageUrl: data?.message
    }, 'Child1Component-image');
  };

  const handleImageLoad = () => {
    setImageError(false);
    logger.info('Dog image loaded successfully', {
      imageUrl: data?.message
    }, 'Child1Component-image');
  };

  const handleRetry = () => {
    setImageError(false);
    retry();
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Child 1</h2>
        <div style={{ margin: '20px 0' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
          <p style={{ marginTop: '10px', color: '#666' }}>Loading dog image...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !data || data.status !== 'success') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Child 1</h2>
        <div style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          padding: '15px',
          margin: '10px 0'
        }}>
          <p style={{ color: '#c33', marginBottom: '10px' }}>Something wrong</p>
          {errorDetails && (
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              {errorDetails.message || `Error ${errorDetails.status}: ${errorDetails.statusText}`}
            </p>
          )}
          {canRetry && (
            <button
              onClick={handleRetry}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007cba',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Child 1</h2>
      {imageError ? (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          padding: '15px',
          margin: '10px 0'
        }}>
          <p style={{ color: '#856404', marginBottom: '10px' }}>
            Failed to load image
          </p>
          <button
            onClick={handleRetry}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007cba',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Reload Image
          </button>
        </div>
      ) : (
        <img
          src={data.message}
          alt="Random dog"
          style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
      <p style={{ marginTop: '10px', color: '#666' }}>Status: {data.status}</p>
    </div>
  );
};

export const Child1Component: React.FC = () => {
  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Child 1</h2>
          <p style={{ color: '#c33' }}>Something wrong</p>
        </div>
      }
    >
      <Child1ComponentContent />
    </ErrorBoundary>
  );
};
