import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { WindowManager } from './WindowManager'
import { ChildComponentType, WindowDimensions } from '../types'

// Global window manager instance
let windowManager: WindowManager

// Child window configurations based on requirements
const CHILD_WINDOW_CONFIGS: Record<ChildComponentType, WindowDimensions> = {
  child1: { width: 300, height: 300 },
  child2: { width: 500, height: 300 },
  child3: { width: 250, height: 200 },
}

function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Load the main renderer
  mainWindow.loadFile(path.join(__dirname, '../renderer/main.html'))

  // Set up window lifecycle handlers for main window
  mainWindow.on('closed', () => {
    // Clean up all child windows when main window closes
    if (windowManager) {
      windowManager.closeAllChildWindows()
    }
  })

  return mainWindow
}

function setupIpcHandlers(): void {
  // Handle child window creation requests
  ipcMain.handle(
    'open-child-window',
    async (event, data: { type: ChildComponentType }) => {
      try {
        // Validate input data
        if (!data || typeof data !== 'object') {
          throw new Error(
            'Invalid request data: expected object with type property'
          )
        }

        const { type } = data

        if (!type || typeof type !== 'string') {
          throw new Error(
            'Invalid child window type: type must be a non-empty string'
          )
        }

        const dimensions = CHILD_WINDOW_CONFIGS[type as ChildComponentType]
        if (!dimensions) {
          throw new Error(
            `Invalid child window type: ${type}. Valid types are: ${Object.keys(
              CHILD_WINDOW_CONFIGS
            ).join(', ')}`
          )
        }

        // Ensure window manager is initialized
        if (!windowManager) {
          throw new Error('Window manager not initialized')
        }

        const childWindow = windowManager.createChildWindow(
          type as ChildComponentType,
          dimensions
        )

        console.log(
          `Successfully created child window: ${type} (ID: ${childWindow.id})`
        )
        return { success: true, windowId: childWindow.id }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred'
        console.error('Failed to create child window:', errorMessage, error)
        return {
          success: false,
          error: errorMessage,
        }
      }
    }
  )

  // Handle terminate all windows request
  ipcMain.handle('terminate-all-windows', async () => {
    try {
      // Ensure window manager is initialized
      if (!windowManager) {
        throw new Error('Window manager not initialized')
      }

      const closedCount = windowManager.closeAllChildWindows()
      console.log(`Successfully closed ${closedCount} child windows`)
      return { success: true, closedCount }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Failed to terminate child windows:', errorMessage, error)
      return {
        success: false,
        error: errorMessage,
      }
    }
  })

  // Handle request for active window count
  ipcMain.handle('get-active-window-count', async () => {
    try {
      // Ensure window manager is initialized
      if (!windowManager) {
        throw new Error('Window manager not initialized')
      }

      const count = windowManager.getActiveWindowCount()
      return { success: true, count }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Failed to get active window count:', errorMessage, error)
      return {
        success: false,
        error: errorMessage,
      }
    }
  })

  // Handle IPC errors globally
  ipcMain.on('ipc-error', (event, error) => {
    console.error('IPC communication error:', error)
  })

  // Handle child window logging
  ipcMain.on('child-log', (event, logData) => {
    try {
      const { level, message, data, timestamp, windowType } = logData
      const logMessage = `[${timestamp}] [${
        windowType || 'unknown'
      }] [${level.toUpperCase()}] ${message}`

      // Log to console with appropriate level
      switch (level) {
        case 'error':
          console.error(logMessage, data || '')
          break
        case 'warn':
          console.warn(logMessage, data || '')
          break
        case 'debug':
          console.debug(logMessage, data || '')
          break
        default:
          console.log(logMessage, data || '')
      }
    } catch (error) {
      console.error('Failed to process child log:', error)
    }
  })

  // Handle child window errors
  ipcMain.on('child-error', (event, errorData) => {
    try {
      const { error, context, timestamp, windowType, url } = errorData
      console.error(
        `[${timestamp}] [${windowType || 'unknown'}] Child window error:`,
        error
      )
      if (context) {
        console.error('Error context:', context)
      }
      if (url) {
        console.error('Window URL:', url)
      }
    } catch (processingError) {
      console.error('Failed to process child error:', processingError)
    }
  })

  // Handle logging from renderer processes
  ipcMain.handle(
    'log',
    async (event, level: string, message: string, data?: any) => {
      try {
        const timestamp = new Date().toISOString()
        const logMessage = `[${timestamp}] [RENDERER] [${level.toUpperCase()}] ${message}`

        switch (level) {
          case 'error':
            console.error(logMessage, data || '')
            break
          case 'warn':
            console.warn(logMessage, data || '')
            break
          case 'debug':
            console.debug(logMessage, data || '')
            break
          default:
            console.log(logMessage, data || '')
        }

        return { success: true }
      } catch (error) {
        console.error('Failed to process log message:', error)
        return { success: false, error: 'Failed to process log message' }
      }
    }
  )
}

// Initialize the application
app.whenReady().then(() => {
  // Initialize window manager
  windowManager = new WindowManager()

  // Set up IPC handlers
  setupIpcHandlers()

  // Create main window
  createMainWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

// Clean up on app quit
app.on('before-quit', () => {
  if (windowManager) {
    windowManager.closeAllChildWindows()
  }
})
