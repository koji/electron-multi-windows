import React, { useState, useEffect } from 'react';
import { ChildComponentType } from '../../types';
import { ErrorBoundary } from './ErrorBoundary';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { createLogger } from '../utils/logger';
import './MainApp.css';

const MainAppContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});

  const { handleError } = useErrorHandler();
  const logger = createLogger();

  useEffect(() => {
    logger.info('MainApp initialized');

    // Check if electronAPI is available
    if (!window.electronAPI) {
      const apiError = 'Electron API not available - application may not be running in Electron context';
      logger.error(apiError, undefined, 'MainApp-initialization');
      setError(apiError);
    }
  }, [logger]);

  const handleOpenChildWindow = async (type: ChildComponentType) => {
    setIsLoading(type);
    setError(null);

    try {
      logger.info(`Attempting to open ${type} window`, undefined, 'MainApp-openWindow');

      // Validate electronAPI availability
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      if (!window.electronAPI.openChildWindow) {
        throw new Error('openChildWindow method not available');
      }

      // Add timeout for IPC operations
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('IPC operation timed out')), 5000);
      });

      const operationPromise = window.electronAPI.openChildWindow(type);

      const response = await Promise.race([operationPromise, timeoutPromise]) as any;

      if (!response) {
        throw new Error('No response received from main process');
      }

      if (!response.success) {
        const errorMsg = response.error || 'Unknown error occurred';
        logger.error(`Failed to open ${type} window`, { error: errorMsg }, 'MainApp-openWindow');
        throw new Error(errorMsg);
      }

      logger.info(`Successfully opened ${type} window`, { windowId: response.windowId }, 'MainApp-openWindow');

      // Reset retry count on success
      setRetryCount(prev => ({ ...prev, [type]: 0 }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      const fullErrorMsg = `Failed to open ${type} window: ${errorMessage}`;

      logger.error(fullErrorMsg, { error: err }, 'MainApp-openWindow');
      handleError(err, `MainApp-openWindow-${type}`);
      setError(fullErrorMsg);

      // Increment retry count
      setRetryCount(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
    } finally {
      setIsLoading(null);
    }
  };

  const handleTerminateAllWindows = async () => {
    setIsLoading('terminate');
    setError(null);

    try {
      logger.info('Attempting to terminate all windows', undefined, 'MainApp-terminate');

      // Validate electronAPI availability
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      if (!window.electronAPI.terminateAllWindows) {
        throw new Error('terminateAllWindows method not available');
      }

      // Add timeout for IPC operations
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('IPC operation timed out')), 5000);
      });

      const operationPromise = window.electronAPI.terminateAllWindows();

      const response = await Promise.race([operationPromise, timeoutPromise]) as any;

      if (!response) {
        throw new Error('No response received from main process');
      }

      if (!response.success) {
        const errorMsg = response.error || 'Unknown error occurred';
        logger.error('Failed to terminate windows', { error: errorMsg }, 'MainApp-terminate');
        throw new Error(errorMsg);
      }

      logger.info('Successfully terminated all windows', { closedCount: response.closedCount }, 'MainApp-terminate');

      // Reset retry count on success
      setRetryCount(prev => ({ ...prev, terminate: 0 }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      const fullErrorMsg = `Failed to terminate windows: ${errorMessage}`;

      logger.error(fullErrorMsg, { error: err }, 'MainApp-terminate');
      handleError(err, 'MainApp-terminate');
      setError(fullErrorMsg);

      // Increment retry count
      setRetryCount(prev => ({ ...prev, terminate: (prev.terminate || 0) + 1 }));
    } finally {
      setIsLoading(null);
    }
  };

  const isButtonDisabled = (buttonType: string) => {
    return isLoading === buttonType || !window.electronAPI;
  };

  const clearError = () => {
    setError(null);
  };

  const getRetryCount = (operation: string): number => {
    return retryCount[operation] || 0;
  };

  return (
    <div className="main-app-container">
      <h1 className="main-app-title">Electron Multi-Window App</h1>

      {error && (
        <div className="error-message" style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          padding: '15px',
          margin: '10px 0',
          position: 'relative'
        }}>
          <button
            onClick={clearError}
            style={{
              position: 'absolute',
              top: '5px',
              right: '10px',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#c33'
            }}
          >
            ×
          </button>
          <p style={{ color: '#c33', margin: 0 }}>{error}</p>
        </div>
      )}

      {!window.electronAPI && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          padding: '15px',
          margin: '10px 0'
        }}>
          <p style={{ color: '#856404', margin: 0 }}>
            Warning: Electron API not detected. Some features may not work properly.
          </p>
        </div>
      )}

      <div className="button-container">
        <button
          className={`main-app-button child-button ${isButtonDisabled('child1') ? 'button-disabled' : ''}`}
          onClick={() => handleOpenChildWindow('child1')}
          disabled={isButtonDisabled('child1')}
          title={getRetryCount('child1') > 0 ? `Retry count: ${getRetryCount('child1')}` : undefined}
        >
          {isLoading === 'child1' ? 'Opening...' : 'Child1'}
          {getRetryCount('child1') > 0 && (
            <span style={{ fontSize: '10px', marginLeft: '5px' }}>
              ({getRetryCount('child1')})
            </span>
          )}
        </button>

        <button
          className={`main-app-button child-button ${isButtonDisabled('child2') ? 'button-disabled' : ''}`}
          onClick={() => handleOpenChildWindow('child2')}
          disabled={isButtonDisabled('child2')}
          title={getRetryCount('child2') > 0 ? `Retry count: ${getRetryCount('child2')}` : undefined}
        >
          {isLoading === 'child2' ? 'Opening...' : 'Child2'}
          {getRetryCount('child2') > 0 && (
            <span style={{ fontSize: '10px', marginLeft: '5px' }}>
              ({getRetryCount('child2')})
            </span>
          )}
        </button>

        <button
          className={`main-app-button child-button ${isButtonDisabled('child3') ? 'button-disabled' : ''}`}
          onClick={() => handleOpenChildWindow('child3')}
          disabled={isButtonDisabled('child3')}
          title={getRetryCount('child3') > 0 ? `Retry count: ${getRetryCount('child3')}` : undefined}
        >
          {isLoading === 'child3' ? 'Opening...' : 'Child3'}
          {getRetryCount('child3') > 0 && (
            <span style={{ fontSize: '10px', marginLeft: '5px' }}>
              ({getRetryCount('child3')})
            </span>
          )}
        </button>

        <button
          className={`main-app-button terminate-button ${isButtonDisabled('terminate') ? 'button-disabled' : ''}`}
          onClick={handleTerminateAllWindows}
          disabled={isButtonDisabled('terminate')}
          title={getRetryCount('terminate') > 0 ? `Retry count: ${getRetryCount('terminate')}` : undefined}
        >
          {isLoading === 'terminate' ? 'Terminating...' : 'Terminate'}
          {getRetryCount('terminate') > 0 && (
            <span style={{ fontSize: '10px', marginLeft: '5px' }}>
              ({getRetryCount('terminate')})
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

const MainApp: React.FC = () => {
  return (
    <ErrorBoundary>
      <MainAppContent />
    </ErrorBoundary>
  );
};

export default MainApp;
