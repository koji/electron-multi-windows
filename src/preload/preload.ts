import { contextBridge, ipcRenderer } from 'electron'
import { ChildComponentType } from '../types'

// Utility function for IPC calls with retry logic
async function invokeWithRetry<T>(
  channel: string,
  data?: any,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await ipcRenderer.invoke(channel, data)
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(
        `IPC call attempt ${attempt}/${maxRetries} failed for channel '${channel}':`,
        lastError.message
      )

      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }
    }
  }

  // If all retries failed, throw the last error
  throw lastError || new Error('All retry attempts failed')
}

// Expose IPC methods to renderer processes
contextBridge.exposeInMainWorld('electronAPI', {
  // Window management operations
  openChildWindow: async (type: ChildComponentType) => {
    try {
      // Validate input
      if (!type || typeof type !== 'string') {
        return {
          success: false,
          error: 'Invalid window type: must be a non-empty string',
        }
      }

      const result = await invokeWithRetry('open-child-window', { type })
      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'IPC communication failed'
      console.error('Failed to send open-child-window message:', errorMessage)

      // Send error event to main process for logging
      ipcRenderer.send('ipc-error', {
        channel: 'open-child-window',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })

      return {
        success: false,
        error: errorMessage,
      }
    }
  },

  terminateAllWindows: async () => {
    try {
      const result = await invokeWithRetry('terminate-all-windows')
      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'IPC communication failed'
      console.error(
        'Failed to send terminate-all-windows message:',
        errorMessage
      )

      // Send error event to main process for logging
      ipcRenderer.send('ipc-error', {
        channel: 'terminate-all-windows',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })

      return {
        success: false,
        error: errorMessage,
      }
    }
  },

  getActiveWindowCount: async () => {
    try {
      const result = await invokeWithRetry('get-active-window-count')
      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'IPC communication failed'
      console.error(
        'Failed to send get-active-window-count message:',
        errorMessage
      )

      // Send error event to main process for logging
      ipcRenderer.send('ipc-error', {
        channel: 'get-active-window-count',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })

      return {
        success: false,
        error: errorMessage,
      }
    }
  },
})
