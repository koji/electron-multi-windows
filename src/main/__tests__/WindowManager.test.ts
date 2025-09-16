import { BrowserWindow } from 'electron'
import { WindowManager } from '../WindowManager'
import { ChildComponentType, WindowDimensions } from '../../types'

// Mock Electron's BrowserWindow
const mockBrowserWindowClass = jest.fn().mockImplementation(() => ({
  isDestroyed: jest.fn().mockReturnValue(false),
  focus: jest.fn(),
  close: jest.fn(),
  show: jest.fn(),
  reload: jest.fn(),
  loadFile: jest.fn().mockResolvedValue(undefined),
  loadURL: jest.fn().mockResolvedValue(undefined),
  once: jest.fn(),
  on: jest.fn(),
  webContents: {
    on: jest.fn(),
  },
  getParentWindow: jest.fn().mockReturnValue(null),
}))

// Add static methods to the mock class
mockBrowserWindowClass.getAllWindows = jest.fn().mockReturnValue([])

jest.mock('electron', () => ({
  BrowserWindow: mockBrowserWindowClass,
}))

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}))

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation()

describe('WindowManager', () => {
  let windowManager: WindowManager
  let mockBrowserWindow: jest.MockedFunction<any>

  beforeEach(() => {
    windowManager = new WindowManager()
    mockBrowserWindow = BrowserWindow as jest.MockedFunction<any>
    jest.clearAllMocks()
  })

  afterAll(() => {
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
    mockConsoleWarn.mockRestore()
  })

  describe('createChildWindow', () => {
    const validDimensions: WindowDimensions = { width: 300, height: 300 }

    it('creates a new child window with correct dimensions', () => {
      const mockWindow = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }
      mockBrowserWindow.mockReturnValueOnce(mockWindow as any)

      const result = windowManager.createChildWindow('child1', validDimensions)

      expect(mockBrowserWindow).toHaveBeenCalledWith({
        width: 300,
        height: 300,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: expect.stringContaining('childPreload.js'),
        },
        parent: undefined,
        modal: false,
        show: false,
        title: 'Child Window - child1',
        resizable: true,
        minimizable: true,
        maximizable: true,
        closable: true,
      })

      expect(result).toBe(mockWindow)
    })

    it('sets window properties correctly', () => {
      const mockWindow = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }
      mockBrowserWindow.mockReturnValueOnce(mockWindow as any)

      windowManager.createChildWindow('child2', validDimensions)

      expect((mockWindow as any).windowType).toBe('child2')
      expect((mockWindow as any).windowId).toMatch(/^child2-\d+$/)
    })

    it('loads the correct child component file', () => {
      const mockWindow = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }
      mockBrowserWindow.mockReturnValueOnce(mockWindow as any)

      windowManager.createChildWindow('child3', validDimensions)

      expect(mockWindow.loadFile).toHaveBeenCalledWith(
        expect.stringContaining('child.html'),
        {
          query: {
            type: 'child3',
          },
        }
      )
    })

    it('sets up window event handlers', () => {
      const mockWindow = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }
      mockBrowserWindow.mockReturnValueOnce(mockWindow as any)

      windowManager.createChildWindow('child1', validDimensions)

      // Verify event handlers are set up
      expect(mockWindow.on).toHaveBeenCalledWith('closed', expect.any(Function))
      expect(mockWindow.on).toHaveBeenCalledWith('focus', expect.any(Function))
      expect(mockWindow.on).toHaveBeenCalledWith('blur', expect.any(Function))
      expect(mockWindow.on).toHaveBeenCalledWith('show', expect.any(Function))
      expect(mockWindow.on).toHaveBeenCalledWith('hide', expect.any(Function))
      expect(mockWindow.on).toHaveBeenCalledWith(
        'minimize',
        expect.any(Function)
      )
      expect(mockWindow.on).toHaveBeenCalledWith(
        'restore',
        expect.any(Function)
      )
    })

    it('sets up webContents error handlers', () => {
      const mockWindow = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }
      mockBrowserWindow.mockReturnValueOnce(mockWindow as any)

      windowManager.createChildWindow('child1', validDimensions)

      expect(mockWindow.webContents.on).toHaveBeenCalledWith(
        'render-process-gone',
        expect.any(Function)
      )
      expect(mockWindow.webContents.on).toHaveBeenCalledWith(
        'unresponsive',
        expect.any(Function)
      )
      expect(mockWindow.webContents.on).toHaveBeenCalledWith(
        'responsive',
        expect.any(Function)
      )
      expect(mockWindow.webContents.on).toHaveBeenCalledWith(
        'did-fail-load',
        expect.any(Function)
      )
      expect(mockWindow.webContents.on).toHaveBeenCalledWith(
        'console-message',
        expect.any(Function)
      )
      expect(mockWindow.webContents.on).toHaveBeenCalledWith(
        'certificate-error',
        expect.any(Function)
      )
    })

    it('shows window when ready-to-show event is emitted', () => {
      const mockWindow = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }
      mockBrowserWindow.mockReturnValueOnce(mockWindow as any)

      windowManager.createChildWindow('child1', validDimensions)

      // Get the ready-to-show callback and call it
      const readyToShowCallback = mockWindow.once.mock.calls.find(
        (call) => call[0] === 'ready-to-show'
      )?.[1]

      expect(readyToShowCallback).toBeDefined()
      readyToShowCallback?.()

      expect(mockWindow.show).toHaveBeenCalled()
    })
  })

  describe('Input Validation', () => {
    it('throws error for invalid window type', () => {
      expect(() => {
        windowManager.createChildWindow('' as ChildComponentType, {
          width: 300,
          height: 300,
        })
      }).toThrow('Invalid window type:')
    })

    it('throws error for invalid dimensions object', () => {
      expect(() => {
        windowManager.createChildWindow('child1', null as any)
      }).toThrow('Invalid dimensions:')
    })

    it('throws error for missing width', () => {
      expect(() => {
        windowManager.createChildWindow('child1', { height: 300 } as any)
      }).toThrow('Invalid dimensions:')
    })

    it('throws error for missing height', () => {
      expect(() => {
        windowManager.createChildWindow('child1', { width: 300 } as any)
      }).toThrow('Invalid dimensions:')
    })

    it('throws error for zero width', () => {
      expect(() => {
        windowManager.createChildWindow('child1', { width: 0, height: 300 })
      }).toThrow(
        'Invalid dimensions: width and height must be positive numbers'
      )
    })

    it('throws error for negative height', () => {
      expect(() => {
        windowManager.createChildWindow('child1', { width: 300, height: -100 })
      }).toThrow(
        'Invalid dimensions: width and height must be positive numbers'
      )
    })
  })

  describe('Existing Window Handling', () => {
    it('focuses existing window instead of creating new one', () => {
      const mockWindow = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
        windowType: 'child1',
      }
      mockBrowserWindow.mockReturnValueOnce(mockWindow as any)

      // Create first window
      const firstWindow = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })

      // Try to create second window of same type
      const secondWindow = windowManager.createChildWindow('child1', {
        width: 400,
        height: 400,
      })

      expect(firstWindow).toBe(secondWindow)
      expect(mockWindow.focus).toHaveBeenCalled()
      expect(mockBrowserWindow).toHaveBeenCalledTimes(1) // Only one window created
    })

    it('creates new window if existing window is destroyed', () => {
      const mockWindow1 = {
        isDestroyed: jest.fn().mockReturnValue(true), // First window is destroyed
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
        windowType: 'child1',
      }

      const mockWindow2 = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }

      mockBrowserWindow
        .mockReturnValueOnce(mockWindow1 as any)
        .mockReturnValueOnce(mockWindow2 as any)

      // Create first window
      windowManager.createChildWindow('child1', { width: 300, height: 300 })

      // Try to create second window of same type
      const secondWindow = windowManager.createChildWindow('child1', {
        width: 400,
        height: 400,
      })

      expect(secondWindow).toBe(mockWindow2)
      expect(mockBrowserWindow).toHaveBeenCalledTimes(2) // Two windows created
    })
  })

  describe('closeAllChildWindows', () => {
    it('closes all active child windows', () => {
      const mockWindow1 = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }

      const mockWindow2 = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }

      mockBrowserWindow
        .mockReturnValueOnce(mockWindow1 as any)
        .mockReturnValueOnce(mockWindow2 as any)

      // Create two windows
      windowManager.createChildWindow('child1', { width: 300, height: 300 })
      windowManager.createChildWindow('child2', { width: 500, height: 300 })

      const closedCount = windowManager.closeAllChildWindows()

      expect(mockWindow1.close).toHaveBeenCalled()
      expect(mockWindow2.close).toHaveBeenCalled()
      expect(closedCount).toBe(2)
    })

    it('skips already destroyed windows', () => {
      const mockWindow1 = {
        isDestroyed: jest.fn().mockReturnValue(true), // Already destroyed
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }

      const mockWindow2 = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }

      mockBrowserWindow
        .mockReturnValueOnce(mockWindow1 as any)
        .mockReturnValueOnce(mockWindow2 as any)

      // Create two windows
      windowManager.createChildWindow('child1', { width: 300, height: 300 })
      windowManager.createChildWindow('child2', { width: 500, height: 300 })

      const closedCount = windowManager.closeAllChildWindows()

      expect(mockWindow1.close).not.toHaveBeenCalled()
      expect(mockWindow2.close).toHaveBeenCalled()
      expect(closedCount).toBe(1)
    })

    it('returns 0 when no windows exist', () => {
      const closedCount = windowManager.closeAllChildWindows()
      expect(closedCount).toBe(0)
    })

    it('handles errors when closing windows', () => {
      const mockWindow = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn().mockImplementation(() => {
          throw new Error('Close failed')
        }),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }

      mockBrowserWindow.mockReturnValueOnce(mockWindow as any)

      windowManager.createChildWindow('child1', { width: 300, height: 300 })

      const closedCount = windowManager.closeAllChildWindows()

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to close window'),
        expect.any(Error)
      )
      expect(closedCount).toBe(0)
    })
  })

  describe('getActiveWindowCount', () => {
    it('returns correct count of active windows', () => {
      const mockWindow1 = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }

      const mockWindow2 = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }

      mockBrowserWindow
        .mockReturnValueOnce(mockWindow1 as any)
        .mockReturnValueOnce(mockWindow2 as any)

      windowManager.createChildWindow('child1', { width: 300, height: 300 })
      windowManager.createChildWindow('child2', { width: 500, height: 300 })

      expect(windowManager.getActiveWindowCount()).toBe(2)
    })

    it('excludes destroyed windows from count', () => {
      const mockWindow1 = {
        isDestroyed: jest.fn().mockReturnValue(true), // Destroyed
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }

      const mockWindow2 = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }

      mockBrowserWindow
        .mockReturnValueOnce(mockWindow1 as any)
        .mockReturnValueOnce(mockWindow2 as any)

      windowManager.createChildWindow('child1', { width: 300, height: 300 })
      windowManager.createChildWindow('child2', { width: 500, height: 300 })

      expect(windowManager.getActiveWindowCount()).toBe(1)
    })

    it('returns 0 when no windows exist', () => {
      expect(windowManager.getActiveWindowCount()).toBe(0)
    })

    it('cleans up destroyed windows from tracking', () => {
      const mockWindow = {
        isDestroyed: jest.fn().mockReturnValue(true),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockResolvedValue(undefined),
      }

      mockBrowserWindow.mockReturnValueOnce(mockWindow as any)

      windowManager.createChildWindow('child1', { width: 300, height: 300 })

      // First call should find and clean up destroyed window
      expect(windowManager.getActiveWindowCount()).toBe(0)

      // Second call should still return 0 (window was cleaned up)
      expect(windowManager.getActiveWindowCount()).toBe(0)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up destroyed window')
      )
    })
  })

  describe('Error Handling', () => {
    it('handles BrowserWindow creation failure', () => {
      mockBrowserWindow.mockImplementationOnce(() => {
        throw new Error('Window creation failed')
      })

      expect(() => {
        windowManager.createChildWindow('child1', { width: 300, height: 300 })
      }).toThrow('Window creation failed')

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create child window'),
        expect.any(Error)
      )
    })

    it('handles loadFile failure with fallback', async () => {
      const mockWindow = {
        isDestroyed: jest.fn().mockReturnValue(false),
        focus: jest.fn(),
        close: jest.fn(),
        show: jest.fn(),
        once: jest.fn(),
        on: jest.fn(),
        webContents: { on: jest.fn() },
        loadFile: jest.fn().mockRejectedValue(new Error('Load failed')),
        loadURL: jest.fn().mockResolvedValue(undefined),
      }

      mockBrowserWindow.mockReturnValueOnce(mockWindow as any)

      windowManager.createChildWindow('child1', { width: 300, height: 300 })

      // Wait for loadFile to be called and fail
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockWindow.loadURL).toHaveBeenCalledWith(
        expect.stringContaining('data:text/html')
      )
    })
  })
})
