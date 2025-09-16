import { renderHook, waitFor } from '@testing-library/react'
import { useDogApi } from '../useDogApi'
import { DogApiResponse } from '../../../types'

// Mock the useErrorHandler hook
const mockHandleError = jest.fn()
const mockRetryWithErrorHandler = jest.fn()

jest.mock('../useErrorHandler', () => ({
  useErrorHandler: () => ({
    errorState: { hasError: false, retryCount: 0 },
    handleError: mockHandleError,
    retry: mockRetryWithErrorHandler,
  }),
}))

// Mock the logger
jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    apiError: jest.fn(),
  }),
}))

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('useDogApi Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('SuccessfulI Calls', () => {
    it('fetches dog image successfully', async () => {
      const mockResponse: DogApiResponse = {
        message:
          'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
        status: 'success',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useDogApi())

      // Initially loading
      expect(result.current.loading).toBe(true)
      expect(result.current.data).toBe(null)
      expect(result.current.error).toBe(false)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toEqual(mockResponse)
      expect(result.current.error).toBe(false)
      expect(result.current.canRetry).toBe(true)
    })

    it('makes request with correct parameters', async () => {
      const mockResponse: DogApiResponse = {
        message:
          'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
        status: 'success',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => mockResponse,
      } as Response)

      renderHook(() => useDogApi())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://dog.ceo/api/breeds/image/random',
          {
            signal: expect.any(AbortSignal),
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          }
        )
      })
    })
  })

  describe('HTTP Error Handling', () => {
    it('handles HTTP 404 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: () => null,
        },
      } as Response)

      const { result } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(true)
      expect(result.current.data).toBe(null)
      expect(result.current.errorDetails).toEqual({
        status: 404,
        statusText: 'Not Found',
        message: 'HTTP 404: Not Found',
      })
      expect(mockHandleError).toHaveBeenCalled()
    })

    it('handles HTTP 500 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: () => null,
        },
      } as Response)

      const { result } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(true)
      expect(result.current.errorDetails).toEqual({
        status: 500,
        statusText: 'Internal Server Error',
        message: 'HTTP 500: Internal Server Error',
      })
    })
  })

  describe('Network Error Handling', () => {
    it('handles network connection failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      const { result } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(true)
      expect(result.current.errorDetails).toEqual({
        status: 0,
        statusText: 'Network Error',
        message: 'Network connection failed',
      })
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        'useDogApi-network'
      )
    })

    it('handles request timeout', async () => {
      // Mock AbortController to simulate timeout
      const mockAbortController = {
        signal: { aborted: false },
        abort: jest.fn(),
      }
      global.AbortController = jest.fn(() => mockAbortController) as any

      // Mock setTimeout to immediately call the timeout callback
      jest
        .spyOn(global, 'setTimeout')
        .mockImplementationOnce((callback: any) => {
          callback()
          return 123 as any
        })

      mockFetch.mockRejectedValueOnce({ name: 'AbortError' })

      const { result } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(true)
      expect(result.current.errorDetails).toEqual({
        status: 408,
        statusText: 'Request Timeout',
        message: 'Request timed out after 10 seconds',
      })
    })
  })

  describe('Response Validation', () => {
    it('handles invalid content type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name === 'content-type' ? 'text/html' : null),
        },
      } as Response)

      const { result } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(true)
      expect(result.current.errorDetails).toEqual({
        status: 200,
        statusText: 'OK',
        message: 'Invalid response content type',
      })
    })

    it('handles missing content type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => null,
        },
      } as Response)

      const { result } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(true)
      expect(result.current.errorDetails).toEqual({
        status: 200,
        statusText: 'OK',
        message: 'Invalid response content type',
      })
    })

    it('handles invalid JSON response structure - not an object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => 'invalid response',
      } as Response)

      const { result } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(true)
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid response format: not an object',
        }),
        'useDogApi-general'
      )
    })

    it('handles missing message field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ status: 'success' }),
      } as Response)

      const { result } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(true)
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid response format: missing or invalid message field',
        }),
        'useDogApi-general'
      )
    })

    it('handles missing status field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => ({ message: 'https://example.com/dog.jpg' }),
      } as Response)

      const { result } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(true)
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid response format: missing or invalid status field',
        }),
        'useDogApi-general'
      )
    })
  })

  describe('Retry Functionality', () => {
    it('provides retry function', () => {
      const { result } = renderHook(() => useDogApi())

      expect(typeof result.current.retry).toBe('function')
    })

    it('calls retry with error handler', () => {
      const { result } = renderHook(() => useDogApi())

      result.current.retry()

      expect(mockRetryWithErrorHandler).toHaveBeenCalledWith(
        expect.any(Function)
      )
    })

    it('indicates retry capability', () => {
      const { result } = renderHook(() => useDogApi())

      expect(result.current.canRetry).toBe(true)
    })
  })

  describe('Loading States', () => {
    it('starts with loading true', () => {
      // Mock fetch to never resolve to keep loading state
      mockFetch.mockImplementationOnce(() => new Promise(() => {}))

      const { result } = renderHook(() => useDogApi())

      expect(result.current.loading).toBe(true)
      expect(result.current.data).toBe(null)
      expect(result.current.error).toBe(false)
    })

    it('sets loading to false after successful request', async () => {
      const mockResponse: DogApiResponse = {
        message:
          'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
        status: 'success',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => mockResponse,
      } as Response)

      const { result } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('sets loading to false after failed request', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('Error State Management', () => {
    it('clears error state on successful retry', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(result.current.error).toBe(true)
      })

      // Second call succeeds
      const mockResponse: DogApiResponse = {
        message:
          'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
        status: 'success',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name === 'content-type' ? 'application/json' : null,
        },
        json: async () => mockResponse,
      } as Response)

      // Trigger retry by calling the hook again
      const { result: retryResult } = renderHook(() => useDogApi())

      await waitFor(() => {
        expect(retryResult.current.error).toBe(false)
        expect(retryResult.current.data).toEqual(mockResponse)
      })
    })
  })
})
