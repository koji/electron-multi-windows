import { contextBridge, ipcRenderer } from 'electron'

// Helper function to get window type from URL
const getWindowType = (): string | null => {
  try {
    // Use globalThis instead of window for better compatibility
    const search = (globalThis as any).location?.search || ''
    return new URLSearchParams(search).get('type')
  } catch {
    return null
  }
}

// Helper function to get current URL
const getCurrentUrl = (): string => {
  try {
    return (globalThis as any).location?.href || 'unknown'
  } catch {
    return 'unknown'
  }
}

// Expose minimal API for child windows
// Child windows primarily need to communicate back to main process for logging or error reporting
contextBridge.exposeInMainWorld('electronAPI', {
  // Log messages to main process for debugging
  log: (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    ipcRenderer.send('child-log', {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      windowType: getWindowType(),
    })
  },

  // Report errors to main process
  reportError: (error: string, context?: any) => {
    ipcRenderer.send('child-error', {
      error,
      context,
      timestamp: new Date().toISOString(),
      windowType: getWindowType(),
      url: getCurrentUrl(),
    })
  },

  // Get window information
  getWindowInfo: () => {
    return {
      type: getWindowType(),
      url: getCurrentUrl(),
      timestamp: new Date().toISOString(),
    }
  },
})

// Set up error handlers after DOM is ready
const setupErrorHandlers = () => {
  const win = globalThis as any

  if (win.addEventListener) {
    // Handle uncaught errors and report them to main process
    win.addEventListener('error', (event: any) => {
      ipcRenderer.send('child-error', {
        error: event.error?.message || 'Unknown error',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
        timestamp: new Date().toISOString(),
        windowType: getWindowType(),
        url: getCurrentUrl(),
      })
    })

    // Handle unhandled promise rejections
    win.addEventListener('unhandledrejection', (event: any) => {
      ipcRenderer.send('child-error', {
        error: event.reason?.message || 'Unhandled promise rejection',
        context: {
          reason: event.reason,
          stack: event.reason?.stack,
        },
        timestamp: new Date().toISOString(),
        windowType: getWindowType(),
        url: getCurrentUrl(),
      })
    })
  }
}

// Set up error handlers when DOM is ready
if ((globalThis as any).document?.readyState === 'loading') {
  ;(globalThis as any).document.addEventListener(
    'DOMContentLoaded',
    setupErrorHandlers
  )
} else {
  setupErrorHandlers()
}
