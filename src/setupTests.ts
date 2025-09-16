// Jest setup file for testing configuration
import '@testing-library/jest-dom'

// Mock Electron API for testing
global.window = Object.create(window)
Object.defineProperty(window, 'electronAPI', {
  value: {
    openChildWindow: jest.fn(),
    terminateAllWindows: jest.fn(),
  },
  writable: true,
})

// Mock fetch for API testing
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}
