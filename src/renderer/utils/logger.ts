import { LogEntry, ChildComponentType } from '../../types'

export class Logger {
  private static instance: Logger
  private windowType?: ChildComponentType

  private constructor(windowType?: ChildComponentType) {
    this.windowType = windowType
  }

  static getInstance(windowType?: ChildComponentType): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(windowType)
    }
    return Logger.instance
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    data?: any,
    context?: string
  ): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      windowType: this.windowType,
      context,
    }
  }

  private sendToMain(logEntry: LogEntry): void {
    try {
      if (window.electronAPI?.log) {
        window.electronAPI.log(logEntry.level, logEntry.message, {
          ...logEntry.data,
          timestamp: logEntry.timestamp,
          windowType: logEntry.windowType,
          context: logEntry.context,
        })
      }
    } catch (error) {
      console.error('Failed to send log to main process:', error)
    }
  }

  info(message: string, data?: any, context?: string): void {
    const logEntry = this.createLogEntry('info', message, data, context)
    console.log(`[INFO] ${message}`, data || '')
    this.sendToMain(logEntry)
  }

  warn(message: string, data?: any, context?: string): void {
    const logEntry = this.createLogEntry('warn', message, data, context)
    console.warn(`[WARN] ${message}`, data || '')
    this.sendToMain(logEntry)
  }

  error(message: string, data?: any, context?: string): void {
    const logEntry = this.createLogEntry('error', message, data, context)
    console.error(`[ERROR] ${message}`, data || '')
    this.sendToMain(logEntry)
  }

  debug(message: string, data?: any, context?: string): void {
    const logEntry = this.createLogEntry('debug', message, data, context)
    console.debug(`[DEBUG] ${message}`, data || '')
    this.sendToMain(logEntry)
  }

  // Specialized methods for common scenarios
  apiError(operation: string, error: any, context?: string): void {
    this.error(
      `API operation failed: ${operation}`,
      {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      context
    )
  }

  ipcError(channel: string, error: any, context?: string): void {
    this.error(
      `IPC communication failed: ${channel}`,
      {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      context
    )
  }

  windowError(operation: string, error: any, context?: string): void {
    this.error(
      `Window operation failed: ${operation}`,
      {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      context
    )
  }
}

// Export convenience functions
export const createLogger = (windowType?: ChildComponentType): Logger => {
  return Logger.getInstance(windowType)
}
