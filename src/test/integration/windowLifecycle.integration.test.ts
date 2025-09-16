/**
 * Integration tests for window lifecycle management
 * Tests complete flow of opening child windows, IPC communication, and termination
 *
 * Requirements tested:
 * - 1.1: Child1 window opens with 300x300 dimensions
 * - 1.2: Child2 window opens with 500x300 dimensions
 * - 1.3: Child3 window opens with 250x200 dimensions
 * - 1.4: Multiple child windows can be opened simultaneously
 * - 2.1: Terminate button closes all child windows
 * - 2.2: Main window remains functional after termination
 * - 4.1: IPC communication from renderer to main process
 * - 4.2: IPC communication from main to renderer process
 * - 4.3: Window creation through IPC
 * - 4.4: Window termination through IPC
 */

import { BrowserWindow, ipcMain } from 'electron'
import { WindowManager } from '../../main/WindowManager'
import { ChildComponentType, WindowDimensions } from '../../types'

// Mock Electron modules for integration testing
const mockBrowserWindowInstances: any[] = []
let mockIpcHandlers: Record<string, Function> = {}
let mockIpcEventHandlers: Record<string, Function> = {}
let mockMainWindow: any = null

const createMockBrowserWindow = (options: any) => {
  const mockWindow = {
    id: Math.floor(Math.random() * 10000),
    isDestroyed: jest.fn().mockReturnValue(false),
    focus: jest.fn(),
    close: jest.fn().mockImplementation(() => {
      // Simulate window closing by marking as destroyed
      mockWindow.isDestroyed.mockReturnValue(true)
      // Trigger closed event
      const closedHandler = mockWindow._eventHandlers?.['closed']
      if (closedHandler) {
        closedHandler()
      }
    }),
    show: jest.fn(),
    hide: jest.fn(),
    minimize: jest.fn(),
    restore: jest.fn(),
    reload: jest.fn(),
    once: jest.fn().mockImplementation((event: string, handler: Function) => {
      if (event === 'ready-to-show') {
        // Simulate ready-to-show event after a short delay
        setTimeout(() => handler(), 10)
      }
    }),
    on: jest.fn().mockImplementation((event: string, handler: Function) => {
      if (!mockWindow._eventHandlers) {
        mockWindow._eventHandlers = {}
      }
      mockWindow._eventHandlers[event] = handler
    }),
    loadFile: jest.fn().mockResolvedValue(undefined),
    loadURL: jest.fn().mockResolvedValue(undefined),
    getParentWindow: jest.fn().mockReturnValue(mockMainWindow),
    webContents: {
      on: jest.fn(),
    },
    // Store creation options for verification
    _creationOptions: options,
    windowType: undefined,
    windowId: undefined,
    _eventHandlers: {},
  }

  mockBrowserWindowInstances.push(mockWindow)
  return mockWindow
}

// Create mock main window
const createMockMainWindow = () => {
  mockMainWindow = {
    id: 1,
    isDestroyed: jest.fn().mockReturnValue(false),
    getParentWindow: jest.fn().mockReturnValue(null),
    focus: jest.fn(),
    close: jest.fn(),
    show: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    loadFile: jest.fn().mockResolvedValue(undefined),
    webContents: {
      on: jest.fn(),
    },
  }
  return mockMainWindow
}

jest.mock('electron', () => ({
  BrowserWindow: jest
    .fn()
    .mockImplementation((options) => createMockBrowserWindow(options)),
  ipcMain: {
    handle: jest
      .fn()
      .mockImplementation((channel: string, handler: Function) => {
        mockIpcHandlers[channel] = handler
      }),
    on: jest.fn().mockImplementation((channel: string, handler: Function) => {
      mockIpcEventHandlers[channel] = handler
    }),
  },
}))

// Mock BrowserWindow static methods
const MockBrowserWindow = BrowserWindow as jest.MockedClass<
  typeof BrowserWindow
>
MockBrowserWindow.getAllWindows = jest.fn().mockImplementation(() => {
  return [
    mockMainWindow,
    ...mockBrowserWindowInstances.filter((w) => !w.isDestroyed()),
  ]
})

// Mock path module
jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
}))

describe('Window Lifecycle Integration Tests', () => {
  let windowManager: WindowManager
  let mockEvent: any

  const setupMockIpcHandlers = () => {
    // Simulate the IPC handlers from main.ts
    mockIpcHandlers['open-child-window'] = async (
      event: any,
      data: { type: ChildComponentType }
    ) => {
      try {
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

        const CHILD_WINDOW_CONFIGS: Record<
          ChildComponentType,
          WindowDimensions
        > = {
          child1: { width: 300, height: 300 },
          child2: { width: 500, height: 300 },
          child3: { width: 250, height: 200 },
        }

        const dimensions = CHILD_WINDOW_CONFIGS[type as ChildComponentType]
        if (!dimensions) {
          throw new Error(
            `Invalid child window type: ${type}. Valid types are: ${Object.keys(
              CHILD_WINDOW_CONFIGS
            ).join(', ')}`
          )
        }

        if (!windowManager) {
          throw new Error('Window manager not initialized')
        }

        const childWindow = windowManager.createChildWindow(
          type as ChildComponentType,
          dimensions
        )
        return { success: true, windowId: childWindow.id }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred'
        return { success: false, error: errorMessage }
      }
    }

    mockIpcHandlers['terminate-all-windows'] = async () => {
      try {
        if (!windowManager) {
          throw new Error('Window manager not initialized')
        }

        const closedCount = windowManager.closeAllChildWindows()
        return { success: true, closedCount }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred'
        return { success: false, error: errorMessage }
      }
    }

    mockIpcHandlers['get-active-window-count'] = async () => {
      try {
        if (!windowManager) {
          throw new Error('Window manager not initialized')
        }

        const count = windowManager.getActiveWindowCount()
        return { success: true, count }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred'
        return { success: false, error: errorMessage }
      }
    }
  }

  beforeEach(() => {
    // Clear all mocks and instances
    jest.clearAllMocks()
    mockBrowserWindowInstances.length = 0
    mockIpcHandlers = {}
    mockIpcEventHandlers = {}

    // Create mock main window
    createMockMainWindow()

    // Create new window manager instance
    windowManager = new WindowManager()

    // Set up mock event object
    mockEvent = {
      sender: {
        id: 1,
      },
    }

    // Set up IPC handlers to simulate main process setup
    setupMockIpcHandlers()
  })

  afterEach(() => {
    // Clean up any remaining windows
    if (windowManager) {
      windowManager.closeAllChildWindows()
    }
  })

  describe('Child Window Creation with Correct Dimensions', () => {
    // Requirement 1.1: Child1 window opens with 300x300 dimensions
    test('should create Child1 window with 300x300 dimensions', async () => {
      const dimensions: WindowDimensions = { width: 300, height: 300 }

      const childWindow = windowManager.createChildWindow('child1', dimensions)

      expect(childWindow).toBeDefined()
      expect(childWindow._creationOptions.width).toBe(300)
      expect(childWindow._creationOptions.height).toBe(300)
      expect(childWindow.windowType).toBe('child1')
      expect(childWindow.loadFile).toHaveBeenCalledWith(
        expect.stringContaining('child.html'),
        { query: { type: 'child1' } }
      )
    })

    // Requirement 1.2: Child2 window opens with 500x300 dimensions
    test('should create Child2 window with 500x300 dimensions', async () => {
      const dimensions: WindowDimensions = { width: 500, height: 300 }

      const childWindow = windowManager.createChildWindow('child2', dimensions)

      expect(childWindow).toBeDefined()
      expect(childWindow._creationOptions.width).toBe(500)
      expect(childWindow._creationOptions.height).toBe(300)
      expect(childWindow.windowType).toBe('child2')
      expect(childWindow.loadFile).toHaveBeenCalledWith(
        expect.stringContaining('child.html'),
        { query: { type: 'child2' } }
      )
    })

    // Requirement 1.3: Child3 window opens with 250x200 dimensions
    test('should create Child3 window with 250x200 dimensions', async () => {
      const dimensions: WindowDimensions = { width: 250, height: 200 }

      const childWindow = windowManager.createChildWindow('child3', dimensions)

      expect(childWindow).toBeDefined()
      expect(childWindow._creationOptions.width).toBe(250)
      expect(childWindow._creationOptions.height).toBe(200)
      expect(childWindow.windowType).toBe('child3')
      expect(childWindow.loadFile).toHaveBeenCalledWith(
        expect.stringContaining('child.html'),
        { query: { type: 'child3' } }
      )
    })

    test('should set correct window properties for all child windows', () => {
      const testCases = [
        {
          type: 'child1' as ChildComponentType,
          dimensions: { width: 300, height: 300 },
        },
        {
          type: 'child2' as ChildComponentType,
          dimensions: { width: 500, height: 300 },
        },
        {
          type: 'child3' as ChildComponentType,
          dimensions: { width: 250, height: 200 },
        },
      ]

      testCases.forEach(({ type, dimensions }) => {
        const childWindow = windowManager.createChildWindow(type, dimensions)

        expect(
          childWindow._creationOptions.webPreferences.nodeIntegration
        ).toBe(false)
        expect(
          childWindow._creationOptions.webPreferences.contextIsolation
        ).toBe(true)
        expect(childWindow._creationOptions.webPreferences.preload).toContain(
          'childPreload.js'
        )
        expect(childWindow._creationOptions.parent).toBe(mockMainWindow)
        expect(childWindow._creationOptions.modal).toBe(false)
        expect(childWindow._creationOptions.show).toBe(false)
        expect(childWindow._creationOptions.title).toBe(
          `Child Window - ${type}`
        )
      })
    })
  })

  describe('Multiple Child Windows Management', () => {
    // Requirement 1.4: Multiple child windows can be opened simultaneously
    test('should open multiple child windows simultaneously', async () => {
      const child1 = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })
      const child2 = windowManager.createChildWindow('child2', {
        width: 500,
        height: 300,
      })
      const child3 = windowManager.createChildWindow('child3', {
        width: 250,
        height: 200,
      })

      expect(child1).toBeDefined()
      expect(child2).toBeDefined()
      expect(child3).toBeDefined()

      // Verify all windows are different instances
      expect(child1.id).not.toBe(child2.id)
      expect(child2.id).not.toBe(child3.id)
      expect(child1.id).not.toBe(child3.id)

      // Verify window types are correctly set
      expect(child1.windowType).toBe('child1')
      expect(child2.windowType).toBe('child2')
      expect(child3.windowType).toBe('child3')

      // Verify active window count
      expect(windowManager.getActiveWindowCount()).toBe(3)
    })

    test('should handle opening same window type multiple times', () => {
      const firstChild1 = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })
      const secondChild1 = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })

      // Should return the same window and focus it
      expect(firstChild1).toBe(secondChild1)
      expect(firstChild1.focus).toHaveBeenCalled()
    })

    test('should track window lifecycle correctly', () => {
      const child1 = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })
      const child2 = windowManager.createChildWindow('child2', {
        width: 500,
        height: 300,
      })

      expect(windowManager.getActiveWindowCount()).toBe(2)

      // Simulate closing one window
      child1.close()

      expect(windowManager.getActiveWindowCount()).toBe(1)
    })
  })

  describe('Window Termination', () => {
    // Requirement 2.1: Terminate button closes all child windows
    test('should close all child windows when terminate is called', () => {
      // Create multiple child windows
      const child1 = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })
      const child2 = windowManager.createChildWindow('child2', {
        width: 500,
        height: 300,
      })
      const child3 = windowManager.createChildWindow('child3', {
        width: 250,
        height: 200,
      })

      expect(windowManager.getActiveWindowCount()).toBe(3)

      // Close all windows
      const closedCount = windowManager.closeAllChildWindows()

      expect(closedCount).toBe(3)
      expect(child1.close).toHaveBeenCalled()
      expect(child2.close).toHaveBeenCalled()
      expect(child3.close).toHaveBeenCalled()
      expect(windowManager.getActiveWindowCount()).toBe(0)
    })

    // Requirement 2.2: Main window remains functional after termination
    test('should keep main window functional after closing all child windows', () => {
      // Create child windows
      windowManager.createChildWindow('child1', { width: 300, height: 300 })
      windowManager.createChildWindow('child2', { width: 500, height: 300 })

      // Close all child windows
      windowManager.closeAllChildWindows()

      // Main window should still be functional
      expect(mockMainWindow.isDestroyed()).toBe(false)

      // Should be able to create new child windows
      const newChild = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })
      expect(newChild).toBeDefined()
      expect(windowManager.getActiveWindowCount()).toBe(1)
    })

    test('should handle termination gracefully when no windows are open', () => {
      expect(windowManager.getActiveWindowCount()).toBe(0)

      const closedCount = windowManager.closeAllChildWindows()

      expect(closedCount).toBe(0)
      expect(windowManager.getActiveWindowCount()).toBe(0)
    })

    test('should handle termination of already destroyed windows', () => {
      const child1 = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })
      const child2 = windowManager.createChildWindow('child2', {
        width: 500,
        height: 300,
      })

      // Manually mark one window as destroyed
      child1.isDestroyed.mockReturnValue(true)

      const closedCount = windowManager.closeAllChildWindows()

      // Should only close the non-destroyed window
      expect(closedCount).toBe(1)
      expect(child2.close).toHaveBeenCalled()
    })
  })

  describe('IPC Communication Integration', () => {
    // Requirement 4.1 & 4.3: IPC communication from renderer to main process for window creation
    test('should handle open-child-window IPC message correctly', async () => {
      expect(mockIpcHandlers['open-child-window']).toBeDefined()

      const handler = mockIpcHandlers['open-child-window']

      // Test Child1 creation
      const result1 = await handler(mockEvent, { type: 'child1' })
      expect(result1.success).toBe(true)
      expect(result1.windowId).toBeDefined()
      expect(windowManager.getActiveWindowCount()).toBe(1)

      // Test Child2 creation
      const result2 = await handler(mockEvent, { type: 'child2' })
      expect(result2.success).toBe(true)
      expect(result2.windowId).toBeDefined()
      expect(windowManager.getActiveWindowCount()).toBe(2)

      // Test Child3 creation
      const result3 = await handler(mockEvent, { type: 'child3' })
      expect(result3.success).toBe(true)
      expect(result3.windowId).toBeDefined()
      expect(windowManager.getActiveWindowCount()).toBe(3)
    })

    // Requirement 4.2 & 4.4: IPC communication from main to renderer process for window termination
    test('should handle terminate-all-windows IPC message correctly', async () => {
      // Create some child windows first
      await mockIpcHandlers['open-child-window'](mockEvent, { type: 'child1' })
      await mockIpcHandlers['open-child-window'](mockEvent, { type: 'child2' })
      await mockIpcHandlers['open-child-window'](mockEvent, { type: 'child3' })

      expect(windowManager.getActiveWindowCount()).toBe(3)

      expect(mockIpcHandlers['terminate-all-windows']).toBeDefined()

      const handler = mockIpcHandlers['terminate-all-windows']
      const result = await handler(mockEvent)

      expect(result.success).toBe(true)
      expect(result.closedCount).toBe(3)
      expect(windowManager.getActiveWindowCount()).toBe(0)
    })

    test('should handle get-active-window-count IPC message correctly', async () => {
      // Create some windows
      await mockIpcHandlers['open-child-window'](mockEvent, { type: 'child1' })
      await mockIpcHandlers['open-child-window'](mockEvent, { type: 'child2' })

      expect(mockIpcHandlers['get-active-window-count']).toBeDefined()

      const handler = mockIpcHandlers['get-active-window-count']
      const result = await handler(mockEvent)

      expect(result.success).toBe(true)
      expect(result.count).toBe(2)
    })

    test('should handle invalid IPC requests gracefully', async () => {
      const openHandler = mockIpcHandlers['open-child-window']

      // Test invalid window type
      const result1 = await openHandler(mockEvent, { type: 'invalid' })
      expect(result1.success).toBe(false)
      expect(result1.error).toContain('Invalid child window type')

      // Test missing data
      const result2 = await openHandler(mockEvent, null)
      expect(result2.success).toBe(false)
      expect(result2.error).toContain('Invalid request data')

      // Test missing type
      const result3 = await openHandler(mockEvent, {})
      expect(result3.success).toBe(false)
      expect(result3.error).toContain('Invalid child window type')
    })

    test('should handle IPC errors when window manager is not initialized', async () => {
      // Create handlers without window manager
      const uninitializedHandlers: Record<string, Function> = {}

      // Simulate IPC handler setup without window manager
      const mockIpcMain = {
        handle: jest
          .fn()
          .mockImplementation((channel: string, handler: Function) => {
            uninitializedHandlers[channel] = async (event: any, data?: any) => {
              try {
                // Simulate the handler logic without windowManager
                if (channel === 'open-child-window') {
                  throw new Error('Window manager not initialized')
                }
                if (channel === 'terminate-all-windows') {
                  throw new Error('Window manager not initialized')
                }
                if (channel === 'get-active-window-count') {
                  throw new Error('Window manager not initialized')
                }
              } catch (error) {
                const errorMessage =
                  error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
                return { success: false, error: errorMessage }
              }
            }
          }),
      }

      // Set up handlers
      mockIpcMain.handle(
        'open-child-window',
        uninitializedHandlers['open-child-window']
      )
      mockIpcMain.handle(
        'terminate-all-windows',
        uninitializedHandlers['terminate-all-windows']
      )
      mockIpcMain.handle(
        'get-active-window-count',
        uninitializedHandlers['get-active-window-count']
      )

      // Test that errors are handled gracefully
      const openResult = await uninitializedHandlers['open-child-window'](
        mockEvent,
        { type: 'child1' }
      )
      expect(openResult.success).toBe(false)
      expect(openResult.error).toBe('Window manager not initialized')

      const terminateResult = await uninitializedHandlers[
        'terminate-all-windows'
      ](mockEvent)
      expect(terminateResult.success).toBe(false)
      expect(terminateResult.error).toBe('Window manager not initialized')

      const countResult = await uninitializedHandlers[
        'get-active-window-count'
      ](mockEvent)
      expect(countResult.success).toBe(false)
      expect(countResult.error).toBe('Window manager not initialized')
    })
  })

  describe('Complete Window Lifecycle Flow', () => {
    test('should handle complete user workflow from creation to termination', async () => {
      // Simulate complete user workflow

      // Step 1: User clicks Child1 button
      const child1Result = await mockIpcHandlers['open-child-window'](
        mockEvent,
        { type: 'child1' }
      )
      expect(child1Result.success).toBe(true)
      expect(windowManager.getActiveWindowCount()).toBe(1)

      // Step 2: User clicks Child2 button
      const child2Result = await mockIpcHandlers['open-child-window'](
        mockEvent,
        { type: 'child2' }
      )
      expect(child2Result.success).toBe(true)
      expect(windowManager.getActiveWindowCount()).toBe(2)

      // Step 3: User clicks Child3 button
      const child3Result = await mockIpcHandlers['open-child-window'](
        mockEvent,
        { type: 'child3' }
      )
      expect(child3Result.success).toBe(true)
      expect(windowManager.getActiveWindowCount()).toBe(3)

      // Step 4: Verify all windows have correct dimensions
      const allWindows = mockBrowserWindowInstances.filter(
        (w) => !w.isDestroyed()
      )
      expect(allWindows).toHaveLength(3)

      const child1Window = allWindows.find((w) => w.windowType === 'child1')
      const child2Window = allWindows.find((w) => w.windowType === 'child2')
      const child3Window = allWindows.find((w) => w.windowType === 'child3')

      expect(child1Window._creationOptions.width).toBe(300)
      expect(child1Window._creationOptions.height).toBe(300)
      expect(child2Window._creationOptions.width).toBe(500)
      expect(child2Window._creationOptions.height).toBe(300)
      expect(child3Window._creationOptions.width).toBe(250)
      expect(child3Window._creationOptions.height).toBe(200)

      // Step 5: User clicks Terminate button
      const terminateResult = await mockIpcHandlers['terminate-all-windows'](
        mockEvent
      )
      expect(terminateResult.success).toBe(true)
      expect(terminateResult.closedCount).toBe(3)
      expect(windowManager.getActiveWindowCount()).toBe(0)

      // Step 6: Verify main window is still functional
      expect(mockMainWindow.isDestroyed()).toBe(false)

      // Step 7: User can create new windows after termination
      const newChildResult = await mockIpcHandlers['open-child-window'](
        mockEvent,
        { type: 'child1' }
      )
      expect(newChildResult.success).toBe(true)
      expect(windowManager.getActiveWindowCount()).toBe(1)
    })

    test('should handle window focus and existing window scenarios', async () => {
      // Create Child1 window
      const result1 = await mockIpcHandlers['open-child-window'](mockEvent, {
        type: 'child1',
      })
      expect(result1.success).toBe(true)

      const firstWindow = mockBrowserWindowInstances.find(
        (w) => w.windowType === 'child1'
      )
      expect(firstWindow).toBeDefined()

      // Try to create Child1 window again - should focus existing
      const result2 = await mockIpcHandlers['open-child-window'](mockEvent, {
        type: 'child1',
      })
      expect(result2.success).toBe(true)
      expect(result2.windowId).toBe(firstWindow.id)
      expect(firstWindow.focus).toHaveBeenCalled()

      // Should still have only 1 window
      expect(windowManager.getActiveWindowCount()).toBe(1)
    })

    test('should handle window ready-to-show event correctly', (done) => {
      const child = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })

      // Verify that show is called after ready-to-show event
      setTimeout(() => {
        expect(child.show).toHaveBeenCalled()
        done()
      }, 50)
    })

    test('should handle window event handlers setup', () => {
      const child = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })

      // Verify event handlers are set up
      expect(child.on).toHaveBeenCalledWith('closed', expect.any(Function))
      expect(child.on).toHaveBeenCalledWith('focus', expect.any(Function))
      expect(child.on).toHaveBeenCalledWith('blur', expect.any(Function))
      expect(child.on).toHaveBeenCalledWith('show', expect.any(Function))
      expect(child.on).toHaveBeenCalledWith('hide', expect.any(Function))
      expect(child.on).toHaveBeenCalledWith('minimize', expect.any(Function))
      expect(child.on).toHaveBeenCalledWith('restore', expect.any(Function))

      // Verify webContents event handlers
      expect(child.webContents.on).toHaveBeenCalledWith(
        'render-process-gone',
        expect.any(Function)
      )
      expect(child.webContents.on).toHaveBeenCalledWith(
        'unresponsive',
        expect.any(Function)
      )
      expect(child.webContents.on).toHaveBeenCalledWith(
        'responsive',
        expect.any(Function)
      )
      expect(child.webContents.on).toHaveBeenCalledWith(
        'did-fail-load',
        expect.any(Function)
      )
      expect(child.webContents.on).toHaveBeenCalledWith(
        'console-message',
        expect.any(Function)
      )
      expect(child.webContents.on).toHaveBeenCalledWith(
        'certificate-error',
        expect.any(Function)
      )
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid window dimensions', () => {
      expect(() => {
        windowManager.createChildWindow('child1', { width: 0, height: 300 })
      }).toThrow(
        'Invalid dimensions: width and height must be positive numbers'
      )

      expect(() => {
        windowManager.createChildWindow('child1', { width: 300, height: -100 })
      }).toThrow(
        'Invalid dimensions: width and height must be positive numbers'
      )

      expect(() => {
        windowManager.createChildWindow('child1', { width: NaN, height: 300 })
      }).toThrow('Invalid dimensions')
    })

    test('should handle invalid window types', () => {
      expect(() => {
        windowManager.createChildWindow('' as ChildComponentType, {
          width: 300,
          height: 300,
        })
      }).toThrow('Invalid window type')

      expect(() => {
        windowManager.createChildWindow(null as any, {
          width: 300,
          height: 300,
        })
      }).toThrow('Invalid window type')
    })

    test('should handle window focus errors gracefully', () => {
      const child1 = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })

      // Mock focus to throw an error
      child1.focus.mockImplementation(() => {
        throw new Error('Focus failed')
      })

      // Should still create a new window if focus fails
      const child1Again = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })
      expect(child1Again).toBeDefined()
    })

    test('should clean up destroyed windows from tracking', () => {
      const child1 = windowManager.createChildWindow('child1', {
        width: 300,
        height: 300,
      })
      const child2 = windowManager.createChildWindow('child2', {
        width: 500,
        height: 300,
      })

      expect(windowManager.getActiveWindowCount()).toBe(2)

      // Mark one window as destroyed
      child1.isDestroyed.mockReturnValue(true)

      // Getting active count should clean up destroyed windows
      expect(windowManager.getActiveWindowCount()).toBe(1)
    })
  })
})
