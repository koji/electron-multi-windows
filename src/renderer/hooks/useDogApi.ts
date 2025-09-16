import { useState, useEffect, useCallback } from 'react'
import { DogApiResponse, ApiErrorResponse } from '../../types'
import { useErrorHandler } from './useErrorHandler'
import { createLogger } from '../utils/logger'

interface UseDogApiReturn {
  data: DogApiResponse | null
  loading: boolean
  error: boolean
  errorDetails?: ApiErrorResponse
  retry: () => void
  canRetry: boolean
}

export const useDogApi = (): UseDogApiReturn => {
  const [data, setData] = useState<DogApiResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<boolean>(false)
  const [errorDetails, setErrorDetails] = useState<
    ApiErrorResponse | undefined
  >()

  const {
    errorState,
    handleError,
    retry: retryWithErrorHandler,
  } = useErrorHandler(3)
  const logger = createLogger()

  const fetchDogImage = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      setErrorDetails(undefined)

      logger.info('Starting Dog API request', undefined, 'useDogApi')

      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch('https://dog.ceo/api/breeds/image/random', {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorResponse: ApiErrorResponse = {
          status: response.status,
          statusText: response.statusText,
          message: `HTTP ${response.status}: ${response.statusText}`,
        }

        logger.apiError('fetch', errorResponse, 'useDogApi')
        setErrorDetails(errorResponse)
        throw new Error(
          `HTTP error! status: ${response.status} - ${response.statusText}`
        )
      }

      // Validate response content type
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const errorResponse: ApiErrorResponse = {
          status: response.status,
          statusText: response.statusText,
          message: 'Invalid response content type',
        }

        logger.apiError('content-type-validation', errorResponse, 'useDogApi')
        setErrorDetails(errorResponse)
        throw new Error('Invalid response content type')
      }

      const result: DogApiResponse = await response.json()

      // Validate response structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format: not an object')
      }

      if (!result.message || typeof result.message !== 'string') {
        throw new Error(
          'Invalid response format: missing or invalid message field'
        )
      }

      if (!result.status || typeof result.status !== 'string') {
        throw new Error(
          'Invalid response format: missing or invalid status field'
        )
      }

      logger.info(
        'Dog API request successful',
        {
          status: result.status,
          hasMessage: !!result.message,
        },
        'useDogApi'
      )

      setData(result)
      setError(false)
    } catch (err) {
      logger.apiError('fetchDogImage', err, 'useDogApi')

      // Handle specific error types
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          const timeoutError: ApiErrorResponse = {
            status: 408,
            statusText: 'Request Timeout',
            message: 'Request timed out after 10 seconds',
          }
          setErrorDetails(timeoutError)
          handleError(new Error('Request timed out'), 'useDogApi-timeout')
        } else if (err.message.includes('Failed to fetch')) {
          const networkError: ApiErrorResponse = {
            status: 0,
            statusText: 'Network Error',
            message: 'Network connection failed',
          }
          setErrorDetails(networkError)
          handleError(
            new Error('Network connection failed'),
            'useDogApi-network'
          )
        } else {
          handleError(err, 'useDogApi-general')
        }
      } else {
        handleError(err, 'useDogApi-unknown')
      }

      setError(true)
    } finally {
      setLoading(false)
    }
  }, [handleError, logger])

  const retry = useCallback(() => {
    retryWithErrorHandler(fetchDogImage)
  }, [retryWithErrorHandler, fetchDogImage])

  useEffect(() => {
    fetchDogImage()
  }, [fetchDogImage])

  return {
    data,
    loading,
    error: error || errorState.hasError,
    errorDetails,
    retry,
    canRetry: errorState.retryCount < 3,
  }
}
