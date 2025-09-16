import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MainApp from '../MainApp'

// Mock the hooks and utilities
jest.mock('../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: jest.fn(),
  }),
}))

jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
  }),
}))

describe('MainApp Component', () => {
  const mockElectronAPI = {
    openChildWindow: jest.fn(),
    terminateAllWindows: jest.fn(),
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Setup window.electronAPI mock
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Rendering', () => {
    it('renders the main app title', () => {
      render(<MainApp />)
      expect(screen.getByText('Electron Multi-Window App')).toBeInTheDocument()
    })

    it('renders all four buttons', () => {
      render(<MainApp />)

      expect(ByRole('button', { name: /child1/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /child2/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /child3/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /terminate/i })).toBeInTheDocument()
    })

    it('shows warning when electronAPI is not available', () => {
      // Remove electronAPI
      delete (window as any).electronAPI

      render(<MainApp />)

      expect(screen.getByText(/warning: electron api not detected/i)).toBeInTheDocument()
    })
  })

  describe('Button Interactions', () => {
    it('calls openChildWindow with correct parameters for Child1 button', async () => {
      const user = userEvent.setup()
      mockElectronAPI.openChildWindow.mockResolvedValue({ success: true, windowId: 1 })

      render(<MainApp />)

      const child1Button = screen.getByRole('button', { name: /child1/i })
      await user.click(child1Button)

      expect(mockElectronAPI.openChildWindow).toHaveBeenCalledWith('child1')
    })

    it('calls openChildWindow with correct parameters for Child2 button', async () => {
      const user = userEvent.setup()
      mockElectronAPI.openChildWindow.mockResolvedValue({ success: true, windowId: 2 })

      render(<MainApp />)

      const child2Button = screen.getByRole('button', { name: /child2/i })
      await user.click(child2Button)

      expect(mockElectronAPI.openChildWindow).toHaveBeenCalledWith('child2')
    })

    it('calls openChildWindow with correct parameters for Child3 button', async () => {
      const user = userEvent.setup()
      mockElectronAPI.openChildWindow.mockResolvedValue({ success: true, windowId: 3 })

      render(<MainApp />)

      const child3Button = screen.getByRole('button', { name: /child3/i })
      await user.click(child3Button)

      expect(mockElectronAPI.openChildWindow).toHaveBeenCalledWith('child3')
    })

    it('calls terminateAllWindows when Terminate button is clicked', async () => {
      const user = userEvent.setup()
      mockElectronAPI.terminateAllWindows.mockResolvedValue({ success: true, closedCount: 2 })

      render(<MainApp />)

      const terminateButton = screen.getByRole('button', { name: /terminate/i })
      await user.click(terminateButton)

      expect(mockElectronAPI.terminateAllWindows).toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('shows loading state for Child1 button during operation', async () => {
      const user = userEvent.setup()
      // Create a promise that we can control
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockElectronAPI.openChildWindow.mockReturnValue(promise)

      render(<MainApp />)

      const child1Button = screen.getByRole('button', { name: /child1/i })
      await user.click(child1Button)

      // Check loading state
      expect(screen.getByText('Opening...')).toBeInTheDocument()
      expect(child1Button).toBeDisabled()

      // Resolve the promise
      resolvePromise!({ success: true, windowId: 1 })

      await waitFor(() => {
        expect(screen.getByText('Child1')).toBeInTheDocument()
        expect(child1Button).not.toBeDisabled()
      })
    })

    it('shows loading state for Terminate button during operation', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockElectronAPI.terminateAllWindows.mockReturnValue(promise)

      render(<MainApp />)

      const terminateButton = screen.getByRole('button', { name: /terminate/i })
      await user.click(terminateButton)

      // Check loading state
      expect(screen.getByText('Terminating...')).toBeInTheDocument()
      expect(terminateButton).toBeDisabled()

      // Resolve the promise
      resolvePromise!({ success: true, closedCount: 0 })

      await waitFor(() => {
        expect(screen.getByText('Terminate')).toBeInTheDocument()
        expect(terminateButton).not.toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when openChildWindow fails', async () => {
      const user = userEvent.setup()
      mockElectronAPI.openChildWindow.mockRejectedValue(new Error('Failed to open window'))

      render(<MainApp />)

      const child1Button = screen.getByRole('button', { name: /child1/i })
      await user.click(child1Button)

      await waitFor(() => {
        expect(screen.getByText(/failed to open child1 window/i)).toBeInTheDocument()
      })
    })

    it('displays error message when terminateAllWindows fails', async () => {
      const user = userEvent.setup()
      mockElectronAPI.terminateAllWindows.mockRejectedValue(new Error('Failed to terminate'))

      render(<MainApp />)

      const terminateButton = screen.getByRole('button', { name: /terminate/i })
      await user.click(terminateButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to terminate windows/i)).toBeInTheDocument()
      })
    })

    it('displays error message when electronAPI returns unsuccessful response', async () => {
      const user = userEvent.setup()
      mockElectronAPI.openChildWindow.mockResolvedValue({
        success: false,
        error: 'Window creation failed'
      })

      render(<MainApp />)

      const child1Button = screen.getByRole('button', { name: /child1/i })
      await user.click(child1Button)

      await waitFor(() => {
        expect(screen.getByText(/failed to open child1 window/i)).toBeInTheDocument()
      })
    })

    it('allows clearing error messages', async () => {
      const user = userEvent.setup()
      mockElectronAPI.openChildWindow.mockRejectedValue(new Error('Test error'))

      render(<MainApp />)

      const child1Button = screen.getByRole('button', { name: /child1/i })
      await user.click(child1Button)

      await waitFor(() => {
        expect(screen.getByText(/failed to open child1 window/i)).toBeInTheDocument()
      })

      // Click the close button (×)
      const closeButton = screen.getByText('×')
      await user.click(closeButton)

      expect(screen.queryByText(/failed to open child1 window/i)).not.toBeInTheDocument()
    })
  })

  describe('Retry Functionality', () => {
    it('tracks retry count for failed operations', async () => {
      const user = userEvent.setup()
      mockElectronAPI.openChildWindow.mockRejectedValue(new Error('Test error'))

      render(<MainApp />)

      const child1Button = screen.getByRole('button', { name: /child1/i })

      // First attempt
      await user.click(child1Button)
      await waitFor(() => {
        expect(screen.getByText(/failed to open child1 window/i)).toBeInTheDocument()
      })

      // Second attempt - should show retry count
      await user.click(child1Button)
      await waitFor(() => {
        expect(screen.getByText('(1)')).toBeInTheDocument() // Retry count indicator
      })
    })
  })

  describe('Button Disabled States', () => {
    it('disables all buttons when electronAPI is not available', () => {
      delete (window as any).electronAPI

      render(<MainApp />)

      expect(screen.getByRole('button', { name: /child1/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /child2/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /child3/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /terminate/i })).toBeDisabled()
    })

    it('disables only the active button during loading', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockElectronAPI.openChildWindow.mockReturnValue(promise)

      render(<MainApp />)

      const child1Button = screen.getByRole('button', { name: /child1/i })
      const child2Button = screen.getByRole('button', { name: /child2/i })

      await user.click(child1Button)

      expect(child1Button).toBeDisabled()
      expect(child2Button).not.toBeDisabled()

      resolvePromise!({ success: true, windowId: 1 })
    })
  })

  describe('IPC Timeout Handling', () => {
    it('handles IPC operation timeout', async () => {
      const user = userEvent.setup()
      // Mock a promise that never resolves to simulate timeout
      mockElectronAPI.openChildWindow.mockImplementation(() => new Promise(() => { }))

      render(<MainApp />)

      const child1Button = screen.getByRole('button', { name: /child1/i })
      await user.click(child1Button)

      // Wait for timeout (5 seconds in the component)
      await waitFor(() => {
        expect(screen.getByText(/ipc operation timed out/i)).toBeInTheDocument()
      }, { timeout: 6000 })
    })
  })
})
