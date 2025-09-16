import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Child1Component } from '../Child1Component'

// Mock the hooks and utilities
const mockRetry = jest.fn()
const mockUseDogApi = {
  data: null,
  loading: false,
  error: false,
  errorDetails: undefined,
  retry: mockRetry,
  canRetry: true,
}

jest.mock('../../hooks/useDogApi', () => ({
  useDogApi: () => mockUseDogApi,
}))

jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
  }),
}))

describe('Child1Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock state
    Object.assign(mockUseDogApi, {
      data: null,
      loading: false,
      error: false,
      errorDetails: undefined,
      retry: mockRetry,
      canRetry: true,
    })
  })

  describe('Loading State', () => {
    it('displays loading spinner when loading is true', () => {
      mockUseDogApi.loading = true

      render(<Child1Component />)

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Loading dog image...')).toBeInTheDocument()

      // Check for spinner (div with specific styles)
      const spinner = screen.getByText('Loading dog image...').previousElementSibling
      expect(spinner).toHaveStyle({
        width: '40px',
        height: '40px',
        borderRadius: '50%',
      })
    })
  })

  describe('Success State', () => {
    it('displays dog image when API call succeeds', () => {
      mockUseDogApi.data = {
        message: 'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
        status: 'success',
      }

      render(<Child1Component />)

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'Random dog' })).toBeInTheDocument()
      expect(screen.getByText('Status: success')).toBeInTheDocument()

      const image = screen.getByRole('img', { name: 'Random dog' })
      expect(image).toHaveAttribute('src', 'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg')
    })

    it('handles image lo event correctly', () => {
      mockUseDogApi.data = {
        message: 'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
        status: 'success',
      }

      render(<Child1Component />)

      const image = screen.getByRole('img', { name: 'Random dog' })

      // Simulate successful image load
      fireEvent.load(image)

      // Image should still be visible (no error state)
      expect(image).toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('displays "Something wrong" when error is true', () => {
      mockUseDogApi.error = true

      render(<Child1Component />)

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Something wrong')).toBeInTheDocument()
    })

    it('displays "Something wrong" when data is null', () => {
      mockUseDogApi.data = null

      render(<Child1Component />)

      expect(screen.getByText('Something wrong')).toBeInTheDocument()
    })

    it('displays "Something wrong" when status is not success', () => {
      mockUseDogApi.data = {
        message: 'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
        status: 'error',
      }

      render(<Child1Component />)

      expect(screen.getByText('Something wrong')).toBeInTheDocument()
    })

    it('displays error details when available', () => {
      mockUseDogApi.error = true
      mockUseDogApi.errorDetails = {
        status: 404,
        statusText: 'Not Found',
        message: 'API endpoint not found',
      }

      render(<Child1Component />)

      expect(screen.getByText('Something wrong')).toBeInTheDocument()
      expect(screen.getByText('API endpoint not found')).toBeInTheDocument()
    })

    it('displays error details with status code when message is not available', () => {
      mockUseDogApi.error = true
      mockUseDogApi.errorDetails = {
        status: 500,
        statusText: 'Internal Server Error',
      }

      render(<Child1Component />)

      expect(screen.getByText('Something wrong')).toBeInTheDocument()
      expect(screen.getByText('Error 500: Internal Server Error')).toBeInTheDocument()
    })
  })

  describe('Retry Functionality', () => {
    it('shows retry button when canRetry is true and there is an error', () => {
      mockUseDogApi.error = true
      mockUseDogApi.canRetry = true

      render(<Child1Component />)

      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    it('does not show retry button when canRetry is false', () => {
      mockUseDogApi.error = true
      mockUseDogApi.canRetry = false

      render(<Child1Component />)

      expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument()
    })

    it('calls retry function when retry button is clicked', async () => {
      const user = userEvent.setup()
      mockUseDogApi.error = true
      mockUseDogApi.canRetry = true

      render(<Child1Component />)

      const retryButton = screen.getByRole('button', { name: 'Try Again' })
      await user.click(retryButton)

      expect(mockRetry).toHaveBeenCalledTimes(1)
    })
  })

  describe('Image Error Handling', () => {
    it('shows image error state when image fails to load', async () => {
      const user = userEvent.setup()
      mockUseDogApi.data = {
        message: 'https://invalid-url.com/image.jpg',
        status: 'success',
      }

      render(<Child1Component />)

      const image = screen.getByRole('img', { name: 'Random dog' })

      // Simulate image load error
      fireEvent.error(image)

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Reload Image' })).toBeInTheDocument()
      })
    })

    it('allows retrying image load after image error', async () => {
      const user = userEvent.setup()
      mockUseDogApi.data = {
        message: 'https://invalid-url.com/image.jpg',
        status: 'success',
      }

      render(<Child1Component />)

      const image = screen.getByRole('img', { name: 'Random dog' })

      // Simulate image load error
      fireEvent.error(image)

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument()
      })

      // Click reload image button
      const reloadButton = screen.getByRole('button', { name: 'Reload Image' })
      await user.click(reloadButton)

      expect(mockRetry).toHaveBeenCalledTimes(1)
    })

    it('clears image error state when retry is successful', async () => {
      const user = userEvent.setup()
      mockUseDogApi.data = {
        message: 'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
        status: 'success',
      }

      render(<Child1Component />)

      const image = screen.getByRole('img', { name: 'Random dog' })

      // Simulate image load error first
      fireEvent.error(image)

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument()
      })

      // Simulate successful image load
      fireEvent.load(image)

      // Error state should be cleared
      expect(screen.queryByText('Failed to load image')).not.toBeInTheDocument()
      expect(image).toBeInTheDocument()
    })
  })

  describe('Error Boundary Integration', () => {
    it('renders fallback UI when component throws error', () => {
      // Mock console.error to prevent error output in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { })

      // Force an error by making useDogApi throw
      const OriginalChild1Component = require('../Child1Component').Child1Component
      jest.doMock('../../hooks/useDogApi', () => ({
        useDogApi: () => {
          throw new Error('Test error')
        },
      }))

      render(<Child1Component />)

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Something wrong')).toBeInTheDocument()

      consoleSpy.mockRestore()
    })
  })

  describe('Component Styling', () => {
    it('applies correct styles to main container', () => {
      mockUseDogApi.data = {
        message: 'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
        status: 'success',
      }

      render(<Child1Component />)

      const container = screen.getByText('Child 1').parentElement
      expect(container).toHaveStyle({
        padding: '20px',
        textAlign: 'center',
      })
    })

    it('applies correct styles to error container', () => {
      mockUseDogApi.error = true

      render(<Child1Component />)

      const errorContainer = screen.getByText('Something wrong').parentElement
      expect(errorContainer).toHaveStyle({
        backgroundColor: '#fee',
        border: '1px solid #fcc',
        borderRadius: '4px',
      })
    })

    it('applies correct styles to image', () => {
      mockUseDogApi.data = {
        message: 'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
        status: 'success',
      }

      render(<Child1Component />)

      const image = screen.getByRole('img', { name: 'Random dog' })
      expect(image).toHaveStyle({
        maxWidth: '100%',
        maxHeight: '200px',
        objectFit: 'contain',
      })
    })
  })
})
