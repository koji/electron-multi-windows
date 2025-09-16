// Type definitions for Electron Multi-Window App

// API Response Types
export interface DogApiResponse {
  message: string // URL to dog image
  status: string // "success" or other status
}

// Window Management Types
export interface WindowDimensions {
  width: number
  height: number
}

export interface WindowConfig {
  type: 'child1' | 'child2' | 'child3'
  width: number
  height: number
  component: string
}

// Component Types
export type ChildComponentType = 'child1' | 'child2' | 'child3'

export type ComponentState = 'loading' | 'success' | 'error'

export interface ComponentProps {
  windowType: ChildComponentType
}

// IPC Communication Types
export interface IPCMessages {
  'open-child-window': {
    type: ChildComponentType
    dimensions: WindowDimensions
  }
  'terminate-all-windows': void
  'get-active-window-count': void
  'ipc-error': {
    channel: string
    error: string
    timestamp: string
  }
}

// Window Management Events
export type WindowEvent = 'created' | 'closed' | 'focused' | 'blurred'

export interface WindowEventData {
  windowId: number
  windowType: ChildComponentType
  event: WindowEvent
}

// IPC Response Types
export interface IPCResponse<T = any> {
  success: boolean
  error?: string
  data?: T
}

export interface WindowCreationResponse extends IPCResponse {
  windowId?: number
}

export interface WindowCountResponse extends IPCResponse {
  count?: number
}

export interface WindowTerminationResponse extends IPCResponse {
  closedCount?: number
}

// Error Handling Types
export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: string
  context?: string
}

export interface ErrorState {
  hasError: boolean
  error?: AppError
  retryCount: number
  lastRetryAt?: string
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: any
  timestamp: string
  windowType?: ChildComponentType
  context?: string
}

// API Error Types
export interface ApiErrorResponse {
  status: number
  statusText: string
  message?: string
}

// Window Management Error Types
export interface WindowError {
  windowId?: number
  windowType?: ChildComponentType
  operation: 'create' | 'close' | 'focus' | 'load'
  error: string
  timestamp: string
}
