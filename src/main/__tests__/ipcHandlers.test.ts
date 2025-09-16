import { ipcMain } from 'electron'
import { WindowManager } from '../WindowManager'

// Mock Electron modules
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  BrowserWindow: jest.fn(),
  app: {
    whenReady: jest.fn().mockReturnValue(Promise.resolve()),
    on: jest.fn(),
  },
}))

// Mock WindowManager
jest.mock('../WindowManager')

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}))

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation()
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation()

describe('IPC Handlers', () => {
  let mockWindowManager: jest.Mocked<WindowManager>
  let ipcHandlers: Record<string, Function>

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock window manager
    mockWindowManager = {
      createChildWindow: jest.fn(),
      closeAllChildWindows: jest.fn(),
      getActiveWindowCount: jest.fn(),
    } as any

    // Mock WindowManager constructor
    ;(
      WindowManager as jest.MockedClass<typeof WindowManager>
    ).mockImplementation(() => mockWindowManager)

    // Capture IPC handlers
    ipcHandlers = {}
    ;(ipcMain.handle as jest.Mock).mockImplementation(
      (channel: string, handler: Function) => {
        ipcHandlers[channel] = handler
      }
    )

    // Import main.ts to set up handlers
    require('../main')
  })

  afterAll(() => {
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
    mockConsoleWarn.mockRestore()
    mockConsoleDebug.mockRestore()
  })

  describe('open-child-window Handler', () => {
    it('creates child window successfully', async () => {
      const mockWindow = { id: 123 }
      mockWindowManager.createChildWindow.mockReturnValue(mockWindow as any)

      const result = await ipcHandlers['open-child-window'](null, {
        type: 'child1',
      })

      expect(mockWindowManager.createChildWindow).toHaveBeenCalledWith(
        'child1',
        { width: 300, height: 300 }
      )
      expect(result).toEqual({
        success: true,
        windowId: 123,
      })
    })

    it('handles invalid request data', async () => {
      const result = await ipcHandlers['open-child-window'](null, null)

      expect(result).toEqual({
        success: false,
        error: 'Invalid request data: expected object with type property',
      })
      expect(mockWindowManager.createChildWindow).not.toHaveBeenCalled()
    })

    it('handles missing type property', async () => {
      const result = await ipcHandlers['open-child-window'](null, {})

      expect(result).toEqual({
        success: false,
        error: 'Invalid child window type: type must be a non-empty string',
      })
    })

    it('handles invalid window type', async () => {
      const result = await ipcHandlers['open-child-window'](null, {
        type: 'invalid',
      })

      expect(result).toEqual({
        success: false,
        error:
          'Invalid child window type: invalid. Valid types are: child1, child2, child3',
      })
    })

    it('handles window manager creation error', async () => {
      mockWindowManager.createChildWindow.mockImplementation(() => {
        throw new Error('Window creation failed')
      })

      const result = await ipcHandlers['open-child-window'](null, {
        type: 'child1',
      })

      expect(result).toEqual({
        success: false,
        error: 'Window creation failed',
      })
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to create child window:',
        'Window creation failed',
        expect.any(Error)
      )
    })

    it('creates child2 window with correct dimensions', async () => {
      const mockWindow = { id: 456 }
      mockWindowManager.createChildWindow.mockReturnValue(mockWindow as any)

      const result = await ipcHandlers['open-child-window'](null, {
        type: 'child2',
      })

      expect(mockWindowManager.createChildWindow).toHaveBeenCalledWith(
        'child2',
        { width: 500, height: 300 }
      )
      expect(result).toEqual({
        success: true,
        windowId: 456,
      })
    })

    it('creates child3 window with correct dimensions', async () => {
      const mockWindow = { id: 789 }
      mockWindowManager.createChildWindow.mockReturnValue(mockWindow as any)

      const result = await ipcHandlers['open-child-window'](null, {
        type: 'child3',
      })

      expect(mockWindowManager.createChildWindow).toHaveBeenCalledWith(
        'child3',
        { width: 250, height: 200 }
      )
      expect(result).toEqual({
        success: true,
        windowId: 789,
      })
    })
  })

  describe('terminate-all-windows Handler', () => {
    it('terminates all windows successfully', async () => {
      mockWindowManager.closeAllChildWindows.mockReturnValue(3)

      const result = await ipcHandlers['terminate-all-windows']()

      expect(mockWindowManager.closeAllChildWindows).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        closedCount: 3,
      })
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Successfully closed 3 child windows'
      )
    })

    it('handles termination error', async () => {
      mockWindowManager.closeAllChildWindows.mockImplementation(() => {
        throw new Error('Termination failed')
      })

      const result = await ipcHandlers['terminate-all-windows']()

      expect(result).toEqual({
        success: false,
        error: 'Termination failed',
      })
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to terminate child windows:',
        'Termination failed',
        expect.any(Error)
      )
    })

    it('handles zero windows closed', async () => {
      mockWindowManager.closeAllChildWindows.mockReturnValue(0)

      const result = await ipcHandlers['terminate-all-windows']()

      expect(result).toEqual({
        success: true,
        closedCount: 0,
      })
    })
  })

  describe('get-active-window-count Handler', () => {
    it('returns active window count successfully', async () => {
      mockWindowManager.getActiveWindowCount.mockReturnValue(2)

      const result = await ipcHandlers['get-active-window-count']()

      expect(mockWindowManager.getActiveWindowCount).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        count: 2,
      })
    })

    it('handles window count error', async () => {
      mockWindowManager.getActiveWindowCount.mockImplementation(() => {
        throw new Error('Count failed')
      })

      const result = await ipcHandlers['get-active-window-count']()

      expect(result).toEqual({
        success: false,
        error: 'Count failed',
      })
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to get active window count:',
        'Count failed',
        expect.any(Error)
      )
    })

    it('returns zero for no active windows', async () => {
      mockWindowManager.getActiveWindowCount.mockReturnValue(0)

      const result = await ipcHandlers['get-active-window-count']()

      expect(result).toEqual({
        success: true,
        count: 0,
      })
    })
  })

  describe('log Handler', () => {
    it('handles info log messages', async () => {
      const result = await ipcHandlers['log'](null, 'info', 'Test message', {
        data: 'test',
      })

      expect(result).toEqual({ success: true })
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[RENDERER] [INFO] Test message'),
        { data: 'test' }
      )
    })

    it('handles error log messages', async () => {
      const result = await ipcHandlers['log'](null, 'error', 'Error message', {
        error: 'details',
      })

      expect(result).toEqual({ success: true })
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[RENDERER] [ERROR] Error message'),
        { error: 'details' }
      )
    })

    it('handles warn log messages', async () => {
      const result = await ipcHandlers['log'](null, 'warn', 'Warning message')

      expect(result).toEqual({ success: true })
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[RENDERER] [WARN] Warning message'),
        ''
      )
    })

    it('handles debug log messages', async () => {
      const result = await ipcHandlers['log'](null, 'debug', 'Debug message')

      expect(result).toEqual({ success: true })
      expect(mockConsoleDebug).toHaveBeenCalledWith(
        expect.stringContaining('[RENDERER] [DEBUG] Debug message'),
        ''
      )
    })

    it('handles log processing error', async () => {
      // Mock console.log to throw an error
      mockConsoleLog.mockImplementationOnce(() => {
        throw new Error('Console error')
      })

      const result = await ipcHandlers['log'](null, 'info', 'Test message')

      expect(result).toEqual({
        success: false,
        error: 'Failed to process log message',
      })
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to process log message:',
        expect.any(Error)
      )
    })
  })

  describe('IPC Event Handlers', () => {
    let ipcEventHandlers: Record<string, Function>

    beforeEach(() => {
      // Capture IPC event handlers
      ipcEventHandlers = {}
      ;(ipcMain.on as jest.Mock).mockImplementation(
        (channel: string, handler: Function) => {
          ipcEventHandlers[channel] = handler
        }
      )

      // Re-import to capture event handlers
      jest.resetModules()
      require('../main')
    })

    it('handles ipc-error events', () => {
      const errorData = {
        channel: 'test',
        error: 'Test error',
        timestamp: '2023-01-01',
      }

      ipcEventHandlers['ipc-error'](null, errorData)

      expect(mockConsoleError).toHaveBeenCalledWith(
        'IPC communication error:',
        errorData
      )
    })

    it('handles child-log events', () => {
      const logData = {
        level: 'info',
        message: 'Child log message',
        data: { test: 'data' },
        timestamp: '2023-01-01T12:00:00Z',
        windowType: 'child1',
      }

      ipcEventHandlers['child-log'](null, logData)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[2023-01-01T12:00:00Z] [child1] [INFO] Child log message',
        { test: 'data' }
      )
    })

    it('handles child-log events with different levels', () => {
      const errorLogData = {
        level: 'error',
        message: 'Child error message',
        timestamp: '2023-01-01T12:00:00Z',
        windowType: 'child2',
      }

      ipcEventHandlers['child-log'](null, errorLogData)

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[2023-01-01T12:00:00Z] [child2] [ERROR] Child error message',
        ''
      )
    })

    it('handles child-log events without windowType', () => {
      const logData = {
        level: 'warn',
        message: 'Warning message',
        timestamp: '2023-01-01T12:00:00Z',
      }

      ipcEventHandlers['child-log'](null, logData)

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[2023-01-01T12:00:00Z] [unknown] [WARN] Warning message',
        ''
      )
    })

    it('handles child-error events', () => {
      const errorData = {
        error: 'Child window error',
        context: 'test context',
        timestamp: '2023-01-01T12:00:00Z',
        windowType: 'child1',
        url: 'file://test.html',
      }

      ipcEventHandlers['child-error'](null, errorData)

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[2023-01-01T12:00:00Z] [child1] Child window error:',
        'Child window error'
      )
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error context:',
        'test context'
      )
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Window URL:',
        'file://test.html'
      )
    })

    it('handles child-error processing failure', () => {
      // Mock console.error to throw on first call
      let callCount = 0
      mockConsoleError.mockImplementation(() => {
        if (callCount === 0) {
          callCount++
          throw new Error('Console error')
        }
      })

      const errorData = { error: 'Test error' }

      ipcEventHandlers['child-error'](null, errorData)

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to process child error:',
        expect.any(Error)
      )
    })

    it('handles child-log processing failure', () => {
      // Mock console.log to throw
      mockConsoleLog.mockImplementationOnce(() => {
        throw new Error('Console error')
      })

      const logData = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00Z',
      }

      ipcEventHandlers['child-log'](null, logData)

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to process child log:',
        expect.any(Error)
      )
    })
  })

  describe('Window Manager Initialization', () => {
    it('handles window manager not initialized error', async () => {
      // Clear the window manager reference
      jest.resetModules()

      // Mock WindowManager to not be created
      ;(
        WindowManager as jest.MockedClass<typeof WindowManager>
      ).mockImplementation(() => {
        throw new Error('WindowManager creation failed')
      })

      // Re-import with broken WindowManager
      require('../main')

      // Try to use handlers without initialized window manager
      const result = await ipcHandlers['open-child-window'](null, {
        type: 'child1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Window manager not initialized')
    })
  })
})
