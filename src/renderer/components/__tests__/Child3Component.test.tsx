import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Child3Component } from '../Child3Component'

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

describe('Child3Component', () => {
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

  it('renders with correct title', () => {
    render(<Child3Component />)
    expect(screen.getByText('Child 3')).toBeInTheDocument()
  })

  it('displays loading state correctly', () => {
    mockUseDogApi.loading = true

    render(<Child3Component />)

    expect(screen.getByText('Loading dog image...')).toBeInTheDocument()
  })

  it('displays dog image when API call succeeds', () => {
    mockUseDogApi.data = {
      message: 'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
      status: 'success',
    }

    render(<Child3Component />)

    expect(screen.getByRole('img', { name: 'Random dog' })).toBeInTheDocument()
    expect(screen.getByText('Status: success')).toBeInTheDocument()
  })

  it('displays error message when API call fails', () => {
    mockUseDogApi.error = true

    render(<Child3Component />)

    expect(screen.getByText('Something wrong')).toBeInTheDocument()
  })

  it('displays error message when status is not success', () => {
    mockUseDogApi.data = {
      message: 'https://images.dog.ceo/breeds/hound-afghan/n02088094_1007.jpg',
      status: 'error',
    }

    render(<Child3Component />)

    expect(screen.getByText('Something wrong')).toBeInTheDocument()
  })

  it('shows retry button when error occurs and canRetry is true', () => {
    mockUseDogApi.error = true
    mockUseDogApi.canRetry = true

    render(<Child3Component />)

    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('calls retry function when retry button is clicked', async () => {
    const user = userEvent.setup()
    mockUseDogApi.error = true
    mockUseDogApi.canRetry = true

    render(<Child3Component />)

    const retryButton = screen.getByRole('button', { name: 'Try Again' })
    await user.click(retryButton)

    expect(mockRetry).toHaveBeenCalledTimes(1)
  })

  it('handles image load error correctly', async () => {
    mockUseDogApi.data = {
      message: 'https://invalid-url.com/image.jpg',
      status: 'success',
    }

    render(<Child3Component />)

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

    render(<Child3Component />)

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

  it('renders fallback UI when component throws error', () => {
    // Mock console.error to prevent error output in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { })

    // Force an error by making useDogApi throw
    jest.doMock('../../hooks/useDogApi', () => ({
      useDogApi: () => {
        throw new Error('Test error')
      },
    }))

    render(<Child3Component />)

    expect(screen.getByText('Child 3')).toBeInTheDocument()
    expect(screen.getByText('Something wrong')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
