// Global type declarations for Electron API exposed through preload

import { ChildComponentType } from './index'

// IPC Response types
interface IPCResponse<T = any> {
  success: boolean
  error?: string
  data?: T
}

interface WindowCreationResponse extends IPCResponse {
  windowId?: number
}

interface WindowCountResponse extends IPCResponse {
  count?: number
}

interface WindowTerminationResponse extends IPCResponse {
  closedCount?: number
}

// Main window Electron API interface
interface MainElectronAPI {
  openChildWindow?: (
    type: ChildComponentType
  ) => Promise<WindowCreationResponse>
  terminateAllWindows?: () => Promise<WindowTerminationResponse>
  getActiveWindowCount?: () => Promise<WindowCountResponse>
}

// Child window Electron API interface
interface ChildElectronAPI {
  log?: (
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data?: any
  ) => void
  reportError?: (error: string, context?: any) => void
  getWindowInfo?: () => {
    type: string | null
    url: string
    timestamp: string
  }
}

// Combined Electron API interface (all methods are optional to handle different contexts)
type ElectronAPI = MainElectronAPI & ChildElectronAPI

// Global window interface extension
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
