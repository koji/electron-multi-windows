# Build and Packaging Guide

This document describes how to build and package the Electron Multi-Window App.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Platform-specific build tools (for native dependencies)

### Platform-specific Requirements

**Windows:**

- Windows 10/11
- Visual Studio Build Tools or Visual Studio Community

**macOS:**

- macOS 10.15 or higher
- Xcode Command Line Tools

**Linux:**

- Ubuntu 18.04+ or equivalent
- Build essentials (`sudo apt-get install build-essential`)

## Development Build

```bash
# Install dependencies
npm install

# Build for development
npm run build

# Start the application
npm start
```

## Production Build

```bash
# Clean previous builds
npm run clean

# Build for production
npm run build

# Test production build
npm run start:prod

# Verify build integrity
npm run verify-build
```

## Packaging

### Simple Package (Recommended)

```bash
# Create a simple package without code signing
npm run package:simple
```

This creates a portable package in `release/simple-package/` that can be distributed and run on any system with Node.js.

### Advanced Packaging (electron-builder)

**Note**: Advanced packaging may require additional setup for code signing and platform-specific tools.

```bash
# Package for current platform
npm run package

# Package for specific platforms
npm run package:win     # Windows
npm run package:mac     # macOS
npm run package:linux   # Linux
npm run package:all     # All platforms
```

## Build Output

### Development Files

- `dist/main/` - Main process compiled files
- `dist/renderer/` - Renderer process compiled files

### Package Output

**Simple Package:**

- `release/simple-package/` - Portable package (recommended)

**Advanced Packages:**

- `release/` - Platform-specific installers and packages

## Build Configuration

The build is configured in `package.json` under the `build` section:

- **App ID**: `com.example.electron-multi-window-app`
- **Product Name**: `Electron Multi-Window App`
- **Output Directory**: `release/`

### Included Files

- All files in `dist/` directory
- `package.json`
- Excludes source files, configuration files, and development dependencies

### Platform Targets

**Windows:**

- NSIS installer (x64, ia32)
- Portable executable (x64)

**macOS:**

- DMG disk image (x64, arm64)
- ZIP archive (x64, arm64)

**Linux:**

- AppImage (x64)
- DEB package (x64)

## Troubleshooting

### Common Issues

1. **Missing Dependencies**

   ```bash
   npm install
   ```

2. **Build Fails**

   ```bash
   npm run clean
   npm run build
   ```

3. **Electron Won't Start**

   ```bash
   npm run verify-build
   ```

4. **Packaging Fails**
   - Try simple packaging first: `npm run package:simple`
   - For advanced packaging: ensure all dependencies are installed
   - Check platform-specific requirements
   - Verify build completed successfully
   - On Windows: Code signing issues can be resolved by using simple packaging

### Build Verification

Run the build verification script to check if everything is configured correctly:

```bash
npm run verify-build
```

This script checks:

- Required directories exist
- All build files are present
- Package.json configuration is correct
- Application can start successfully

## Icons

Place application icons in the `build/` directory:

- `icon.png` (512x512) for Linux
- `icon.ico` for Windows
- `icon.icns` for macOS

## Environment Variables

Set these environment variables for advanced configuration:

- `DEBUG=electron-builder` - Enable electron-builder debug output
- `CSC_LINK` - Path to code signing certificate (macOS/Windows)
- `CSC_KEY_PASSWORD` - Certificate password

## Continuous Integration

For CI/CD pipelines, use these commands:

```bash
# Install dependencies
npm ci

# Run tests
npm test

# Build and verify
npm run build
npm run verify-build

# Package (platform-specific)
npm run package
```

## Distribution

After packaging, distribute the files from the `release/` directory:

- **Windows**: `.exe` installer or portable `.exe`
- **macOS**: `.dmg` disk image or `.zip` archive
- **Linux**: `.AppImage` or `.deb` package
