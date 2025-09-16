import { BrowserWindow } from "electron";
import * as path from "path";
import { ChildComponentType, WindowDimensions } from "../types";

export class WindowManager {
  private childWindows: Map<string, BrowserWindow> = new Map();
  private windowCounter: number = 0;

  /**
   * Creates a new child window with specified dimensions and component type
   */
  createChildWindow(
    type: ChildComponentType,
    dimensions: WindowDimensions
  ): BrowserWindow {
    try {
      const windowId = `${type}-${++this.windowCounter}`;
      console.log(`Creating child window: ${windowId}`);

      // Validate input parameters
      if (!type || typeof type !== "string") {
        throw new Error(`Invalid window type: ${type}`);
      }

      if (
        !dimensions ||
        typeof dimensions.width !== "number" ||
        typeof dimensions.height !== "number" ||
        isNaN(dimensions.width) ||
        isNaN(dimensions.height)
      ) {
        throw new Error(`Invalid dimensions: ${JSON.stringify(dimensions)}`);
      }

      if (dimensions.width <= 0 || dimensions.height <= 0) {
        throw new Error(
          `Invalid dimensions: width and height must be positive numbers`
        );
      }

      // Check if a window of this type already exists
      const existingWindow = this.findWindowByType(type);
      if (existingWindow && !existingWindow.isDestroyed()) {
        console.log(`Window of type ${type} already exists, bringing to front`);
        try {
          existingWindow.focus();
          return existingWindow;
        } catch (focusError) {
          console.error(`Failed to focus existing window: ${focusError}`);
          // Continue to create new window if focus fails
        }
      }

      // Validate preload script path
      const preloadPath = path.join(__dirname, "childPreload.js");
      console.log(`Using preload script: ${preloadPath}`);

      const childWindow = new BrowserWindow({
        width: dimensions.width,
        height: dimensions.height,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: preloadPath,
        },
        parent: this.getMainWindow(),
        modal: false,
        show: false, // Don't show until ready
        title: `Child Window - ${type}`,
        resizable: true,
        minimizable: true,
        maximizable: true,
        closable: true,
      });

      // Store the window with its type for tracking
      this.childWindows.set(windowId, childWindow);

      // Set window type as a property for later reference
      (childWindow as any).windowType = type;
      (childWindow as any).windowId = windowId;

      // Set up window lifecycle event handlers
      this.setupWindowEventHandlers(childWindow, windowId, type);

      // Set up error handling for the window
      this.setupWindowErrorHandlers(childWindow, windowId, type);

      // Load the appropriate child component
      this.loadChildComponent(childWindow, type);

      // Show window once it's ready with timeout
      const showTimeout = setTimeout(() => {
        console.warn(
          `Window ${windowId} did not emit ready-to-show within 10 seconds, showing anyway`
        );
        if (!childWindow.isDestroyed()) {
          childWindow.show();
        }
      }, 10000);

      childWindow.once("ready-to-show", () => {
        clearTimeout(showTimeout);
        try {
          if (!childWindow.isDestroyed()) {
            childWindow.show();
            console.log(`Child window ${windowId} shown successfully`);
          }
        } catch (showError) {
          console.error(`Failed to show window ${windowId}:`, showError);
        }
      });

      console.log(`Successfully created child window: ${windowId}`);
      return childWindow;
    } catch (error) {
      console.error(`Failed to create child window of type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Closes all child windows
   * @returns The number of windows that were closed
   */
  closeAllChildWindows(): number {
    let closedCount = 0;
    const windowsToClose = Array.from(this.childWindows.entries());

    console.log(`Attempting to close ${windowsToClose.length} child windows`);

    windowsToClose.forEach(([windowId, window]) => {
      try {
        if (!window.isDestroyed()) {
          console.log(`Closing window: ${windowId}`);
          window.close();
          closedCount++;
        } else {
          console.log(`Window ${windowId} already destroyed`);
        }
      } catch (error) {
        console.error(`Failed to close window ${windowId}:`, error);
      }
    });

    // Clear the map after attempting to close all windows
    this.childWindows.clear();

    console.log(`Successfully closed ${closedCount} child windows`);
    return closedCount;
  }

  /**
   * Gets the count of active child windows
   */
  getActiveWindowCount(): number {
    let activeCount = 0;
    const destroyedWindows: string[] = [];

    this.childWindows.forEach((window, windowId) => {
      try {
        if (!window.isDestroyed()) {
          activeCount++;
        } else {
          destroyedWindows.push(windowId);
        }
      } catch (error) {
        console.error(`Error checking window ${windowId} status:`, error);
        destroyedWindows.push(windowId);
      }
    });

    // Clean up destroyed windows from tracking
    destroyedWindows.forEach((windowId) => {
      this.childWindows.delete(windowId);
      console.log(`Cleaned up destroyed window: ${windowId}`);
    });

    return activeCount;
  }

  /**
   * Finds a window by its component type
   */
  private findWindowByType(
    type: ChildComponentType
  ): BrowserWindow | undefined {
    for (const [, window] of this.childWindows) {
      if (!window.isDestroyed() && (window as any).windowType === type) {
        return window;
      }
    }
    return undefined;
  }

  /**
   * Gets the main application window
   */
  private getMainWindow(): BrowserWindow | undefined {
    const allWindows = BrowserWindow.getAllWindows();
    return allWindows.find((window) => !window.getParentWindow());
  }

  /**
   * Sets up event handlers for window lifecycle events
   */
  private setupWindowEventHandlers(
    window: BrowserWindow,
    windowId: string,
    type: ChildComponentType
  ): void {
    // Handle window closed event
    window.on("closed", () => {
      this.childWindows.delete(windowId);
      console.log(`Child window ${type} (${windowId}) closed`);
    });

    // Handle window focus events
    window.on("focus", () => {
      console.log(`Child window ${type} (${windowId}) focused`);
    });

    window.on("blur", () => {
      console.log(`Child window ${type} (${windowId}) blurred`);
    });

    // Handle window show/hide events
    window.on("show", () => {
      console.log(`Child window ${type} (${windowId}) shown`);
    });

    window.on("hide", () => {
      console.log(`Child window ${type} (${windowId}) hidden`);
    });

    // Handle window minimize/restore events
    window.on("minimize", () => {
      console.log(`Child window ${type} (${windowId}) minimized`);
    });

    window.on("restore", () => {
      console.log(`Child window ${type} (${windowId}) restored`);
    });
  }

  /**
   * Sets up error handlers for window-specific errors
   */
  private setupWindowErrorHandlers(
    window: BrowserWindow,
    windowId: string,
    type: ChildComponentType
  ): void {
    // Handle renderer process crashes
    window.webContents.on("render-process-gone", (event, details) => {
      console.error(
        `Renderer process crashed for window ${windowId}:`,
        details
      );

      // Attempt to reload the window if it was an abnormal exit
      if (details.reason !== "clean-exit" && !window.isDestroyed()) {
        console.log(`Attempting to reload crashed window: ${windowId}`);
        try {
          window.reload();
        } catch (reloadError) {
          console.error(
            `Failed to reload crashed window ${windowId}:`,
            reloadError
          );
        }
      }
    });

    // Handle unresponsive renderer
    window.webContents.on("unresponsive", () => {
      console.warn(`Window ${windowId} became unresponsive`);
    });

    window.webContents.on("responsive", () => {
      console.log(`Window ${windowId} became responsive again`);
    });

    // Handle navigation errors
    window.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription, validatedURL) => {
        console.error(`Failed to load content in window ${windowId}:`, {
          errorCode,
          errorDescription,
          url: validatedURL,
        });
      }
    );

    // Handle console messages from renderer
    window.webContents.on(
      "console-message",
      (event, level, message, line, sourceId) => {
        const logLevel = level === 1 ? "warn" : level === 2 ? "error" : "info";
        console.log(`[${windowId}] [${logLevel.toUpperCase()}] ${message}`);
      }
    );

    // Handle certificate errors
    window.webContents.on(
      "certificate-error",
      (event, url, error, certificate, callback) => {
        console.error(`Certificate error in window ${windowId}:`, {
          url,
          error,
        });
        // For development, you might want to ignore certificate errors
        // In production, handle this appropriately
        callback(false); // Reject the certificate
      }
    );
  }

  /**
   * Loads the appropriate child component based on type
   */
  private loadChildComponent(
    window: BrowserWindow,
    type: ChildComponentType
  ): void {
    try {
      // Load the child HTML file with routing parameters
      const htmlPath = path.join(__dirname, "../renderer/child.html");

      console.log(`Loading child component for ${type} from: ${htmlPath}`);

      // Use loadFile with query parameters to pass the component type to the renderer
      window
        .loadFile(htmlPath, {
          query: {
            type: type,
          },
        })
        .catch((loadError) => {
          console.error(
            `Failed to load child component for ${type}:`,
            loadError
          );

          // Try to load a fallback error page
          const errorHtml = `
          <html>
            <head><title>Error Loading Component</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Error Loading Component</h1>
              <p>Failed to load ${type} component</p>
              <p>Error: ${loadError.message}</p>
              <button onclick="window.location.reload()">Retry</button>
            </body>
          </html>
        `;

          window
            .loadURL(
              `data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`
            )
            .catch((fallbackError) => {
              console.error(
                `Failed to load fallback error page:`,
                fallbackError
              );
            });
        });
    } catch (error) {
      console.error(`Error in loadChildComponent for ${type}:`, error);
    }
  }
}
