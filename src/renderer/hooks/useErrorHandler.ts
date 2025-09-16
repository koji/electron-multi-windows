import { useState, useCallback } from 'react'
import { AppError, ErrorState } from '../../types'
import { createLogger } from '../utils/logger'

interface UseErrorHandlerReturn {
  errorState: ErrorState
  handleError: (error: any, context?: string) => void
  clearError: () => void
  retry: (retryFn: () => Promise<void> | void) => Promise<void>
}

export const useErrorHandler = (
  maxRetries: number = 3
): UseErrorHandlerReturn => {
  const logger = createLogger()

  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    retryCount: 0,
  })

  const createAppError = useCallback(
    (error: any, context?: string): AppError => {
      const timestamp = new Date().toISOString()

      if (error instanceof Error) {
        return {
          code: error.name || 'UnknownError',
          message: error.message,
          details: {
            stack: error.stack,
            cause: (error as any).cause, // TypeScript doesn't recognize cause in older versions
          },
          timestamp,
          context,
        }
      }

      if (typeof error === 'string') {
        return {
          code: 'StringError',
          message: error,
          timestamp,
          context,
        }
      }

      if (error && typeof error === 'object') {
        return {
          code: error.code || error.name || 'ObjectError',
          message: error.message || JSON.stringify(error),
          details: error,
          timestamp,
          context,
        }
      }

      return {
        code: 'UnknownError',
        message: 'An unknown error occurred',
        details: error,
        timestamp,
        context,
      }
    },
    []
  )

  const handleError = useCallback(
    (error: any, context?: string) => {
      const appError = createAppError(error, context)

      // Log the error
      logger.error(
        `Error handled: ${appError.message}`,
        {
          code: appError.code,
          details: appError.details,
          context: appError.context,
        },
        context
      )

      setErrorState((prev) => ({
        hasError: true,
        error: appError,
        retryCount: prev.retryCount,
        lastRetryAt: prev.lastRetryAt,
      }))
    },
    [createAppError, logger]
  )

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      retryCount: 0,
    })
  }, [])

  const retry = useCallback(
    async (retryFn: () => Promise<void> | void) => {
      if (errorState.retryCount >= maxRetries) {
        logger.warn(`Maximum retry attempts (${maxRetries}) reached`, {
          error: errorState.error?.message,
        })
        return
      }

      try {
        setErrorState((prev) => ({
          ...prev,
          retryCount: prev.retryCount + 1,
          lastRetryAt: new Date().toISOString(),
        }))

        logger.info(
          `Retrying operation (attempt ${
            errorState.retryCount + 1
          }/${maxRetries})`
        )

        await retryFn()

        // If successful, clear the error
        clearError()
        logger.info('Retry successful, error cleared')
      } catch (retryError) {
        logger.error(`Retry attempt ${errorState.retryCount + 1} failed`, {
          error: retryError instanceof Error ? retryError.message : retryError,
        })

        handleError(retryError, 'retry-operation')
      }
    },
    [errorState.retryCount, maxRetries, logger, clearError, handleError]
  )

  return {
    errorState,
    handleError,
    clearError,
    retry,
  }
}
