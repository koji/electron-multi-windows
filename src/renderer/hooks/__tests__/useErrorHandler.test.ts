import { renderHook, act } from '@testing-library/react'
import { useErrorHandler } from '../useErrorHandler'

// Mock the logger
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}

jest.mock('../../utils/logger', () => ({
  createLogger: () => mockLogger,
}))

describe('useErrorHandler Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('starts with no error state', () => {
      const { result } = renderHook(() => useErrorHandler())

      expect(result.current.errorState).toEqual({
        hasError: false,
        retryCount: 0,
      })
    })

    it('accepts custom max retries', () => {
      const { result } = renderHook(() => useErrorHandler(5))

      expect(result.current.errorState.retryCount).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('handles Error objects correctly', () => {
      const { result } = renderHook(() => useErrorHandler())
      const testError = new Error('essage')
      testError.stack = 'Error stack trace'

      act(() => {
        result.current.handleError(testError, 'test-context')
      })

      expect(result.current.errorState.hasError).toBe(true)
      expect(result.current.errorState.error).toEqual({
        code: 'Error',
        message: 'Test error message',
        details: {
          stack: 'Error stack trace',
          cause: undefined,
        },
        timestamp: expect.any(String),
        context: 'test-context',
      })
    })

    it('handles string errors', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        result.current.handleError('String error message', 'string-context')
      })

      expect(result.current.errorState.hasError).toBe(true)
      expect(result.current.errorState.error).toEqual({
        code: 'StringError',
        message: 'String error message',
        timestamp: expect.any(String),
        context: 'string-context',
      })
    })

    it('handles object errors', () => {
      const { result } = renderHook(() => useErrorHandler())
      const objectError = {
        code: 'CUSTOM_ERROR',
        message: 'Custom error message',
        details: { extra: 'info' },
      }

      act(() => {
        result.current.handleError(objectError, 'object-context')
      })

      expect(result.current.errorState.hasError).toBe(true)
      expect(result.current.errorState.error).toEqual({
        code: 'CUSTOM_ERROR',
        message: 'Custom error message',
        details: objectError,
        timestamp: expect.any(String),
        context: 'object-context',
      })
    })

    it('handles object errors without code or message', () => {
      const { result } = renderHook(() => useErrorHandler())
      const objectError = { someProperty: 'value' }

      act(() => {
        result.current.handleError(objectError)
      })

      expect(result.current.errorState.hasError).toBe(true)
      expect(result.current.errorState.error).toEqual({
        code: 'ObjectError',
        message: JSON.stringify(objectError),
        details: objectError,
        timestamp: expect.any(String),
        context: undefined,
      })
    })

    it('handles unknown error types', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        result.current.handleError(null)
      })

      expect(result.current.errorState.hasError).toBe(true)
      expect(result.current.errorState.error).toEqual({
        code: 'UnknownError',
        message: 'An unknown error occurred',
        details: null,
        timestamp: expect.any(String),
        context: undefined,
      })
    })

    it('logs errors when handled', () => {
      const { result } = renderHook(() => useErrorHandler())
      const testError = new Error('Test error')

      act(() => {
        result.current.handleError(testError, 'test-context')
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error handled: Test error',
        {
          code: 'Error',
          details: expect.any(Object),
          context: 'test-context',
        },
        'test-context'
      )
    })
  })

  describe('Clear Error', () => {
    it('clears error state', () => {
      const { result } = renderHook(() => useErrorHandler())

      // Set error first
      act(() => {
        result.current.handleError(new Error('Test error'))
      })

      expect(result.current.errorState.hasError).toBe(true)

      // Clear error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.errorState).toEqual({
        hasError: false,
        retryCount: 0,
      })
    })

    it('resets retry count when clearing error', () => {
      const { result } = renderHook(() => useErrorHandler())

      // Set error and increment retry count
      act(() => {
        result.current.handleError(new Error('Test error'))
      })

      // Simulate retry attempts
      act(() => {
        result.current.retry(async () => {
          throw new Error('Retry failed')
        })
      })

      expect(result.current.errorState.retryCount).toBeGreaterThan(0)

      // Clear error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.errorState.retryCount).toBe(0)
    })
  })

  describe('Retry Functionality', () => {
    it('increments retry count on retry attempt', async () => {
      const { result } = renderHook(() => useErrorHandler())

      await act(async () => {
        await result.current.retry(async () => {
          throw new Error('Retry failed')
        })
      })

      expect(result.current.errorState.retryCount).toBe(1)
      expect(result.current.errorState.lastRetryAt).toBeDefined()
    })

    it('clears error on successful retry', async () => {
      const { result } = renderHook(() => useErrorHandler())

      // Set initial error
      act(() => {
        result.current.handleError(new Error('Initial error'))
      })

      expect(result.current.errorState.hasError).toBe(true)

      // Successful retry
      await act(async () => {
        await result.current.retry(async () => {
          // Success - no error thrown
        })
      })

      expect(result.current.errorState.hasError).toBe(false)
      expect(result.current.errorState.retryCount).toBe(0)
    })

    it('handles retry failure', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const retryError = new Error('Retry failed')

      await act(async () => {
        await result.current.retry(async () => {
          throw retryError
        })
      })

      expect(result.current.errorState.hasError).toBe(true)
      expect(result.current.errorState.retryCount).toBe(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Retry attempt 1 failed'),
        expect.any(Object)
      )
    })

    it('stops retrying after max attempts', async () => {
      const { result } = renderHook(() => useErrorHandler(2)) // Max 2 retries

      // First retry
      await act(async () => {
        await result.current.retry(async () => {
          throw new Error('Retry 1 failed')
        })
      })

      // Second retry
      await act(async () => {
        await result.current.retry(async () => {
          throw new Error('Retry 2 failed')
        })
      })

      expect(result.current.errorState.retryCount).toBe(2)

      // Third retry should be blocked
      await act(async () => {
        await result.current.retry(async () => {
          throw new Error('Retry 3 failed')
        })
      })

      expect(result.current.errorState.retryCount).toBe(2) // Should not increment
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Maximum retry attempts (2) reached',
        expect.any(Object)
      )
    })

    it('logs retry attempts', async () => {
      const { result } = renderHook(() => useErrorHandler())

      await act(async () => {
        await result.current.retry(async () => {
          throw new Error('Retry failed')
        })
      })

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Retrying operation (attempt 1/3)'
      )
    })

    it('logs successful retry', async () => {
      const { result } = renderHook(() => useErrorHandler())

      await act(async () => {
        await result.current.retry(async () => {
          // Success
        })
      })

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Retry successful, error cleared'
      )
    })

    it('works with synchronous retry functions', async () => {
      const { result } = renderHook(() => useErrorHandler())

      await act(async () => {
        await result.current.retry(() => {
          // Synchronous success
        })
      })

      expect(result.current.errorState.hasError).toBe(false)
    })

    it('handles synchronous retry function errors', async () => {
      const { result } = renderHook(() => useErrorHandler())

      await act(async () => {
        await result.current.retry(() => {
          throw new Error('Sync retry failed')
        })
      })

      expect(result.current.errorState.hasError).toBe(true)
      expect(result.current.errorState.retryCount).toBe(1)
    })
  })

  describe('Error State Persistence', () => {
    it('maintains error state across retry attempts', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const originalError = new Error('Original error')

      // Set initial error
      act(() => {
        result.current.handleError(originalError)
      })

      const initialErrorState = result.current.errorState

      // Failed retry
      await act(async () => {
        await result.current.retry(async () => {
          throw new Error('Retry failed')
        })
      })

      // Original error should be replaced by retry error
      expect(result.current.errorState.hasError).toBe(true)
      expect(result.current.errorState.retryCount).toBe(1)
      expect(result.current.errorState.error?.message).toBe('Retry failed')
    })

    it('preserves retry count across multiple retry attempts', async () => {
      const { result } = renderHook(() => useErrorHandler())

      // First retry
      await act(async () => {
        await result.current.retry(async () => {
          throw new Error('First retry failed')
        })
      })

      expect(result.current.errorState.retryCount).toBe(1)

      // Second retry
      await act(async () => {
        await result.current.retry(async () => {
          throw new Error('Second retry failed')
        })
      })

      expect(result.current.errorState.retryCount).toBe(2)
    })
  })

  describe('Timestamp Handling', () => {
    it('sets timestamp when handling errors', () => {
      const { result } = renderHook(() => useErrorHandler())
      const beforeTime = new Date().toISOString()

      act(() => {
        result.current.handleError(new Error('Test error'))
      })

      const afterTime = new Date().toISOString()
      const errorTimestamp = result.current.errorState.error?.timestamp

      expect(errorTimestamp).toBeDefined()
      expect(errorTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(errorTimestamp! >= beforeTime).toBe(true)
      expect(errorTimestamp! <= afterTime).toBe(true)
    })

    it('sets lastRetryAt when retrying', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const beforeTime = new Date().toISOString()

      await act(async () => {
        await result.current.retry(async () => {
          throw new Error('Retry failed')
        })
      })

      const afterTime = new Date().toISOString()
      const lastRetryAt = result.current.errorState.lastRetryAt

      expect(lastRetryAt).toBeDefined()
      expect(lastRetryAt! >= beforeTime).toBe(true)
      expect(lastRetryAt! <= afterTime).toBe(true)
    })
  })
})
