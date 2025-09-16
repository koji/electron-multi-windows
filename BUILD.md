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

### Package for Current Platform

```bash
npm run package
```

### Package for Specific Platforms

```bash
# Windows
npm run package:win

# macOS
npm run package:mac

# Linux
npm run package:linux

# All platforms (requires platform-specific tools)
npm run package:all
```

## Build Output

### Development Files

- `dist/main/` - Main process compiled files
- `dist/renderer/` - Renderer process compiled files

### Package Output

- `release/` - Packaged applications for distribution

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
   - Ensure all dependencies are installed
   - Check platform-specific requirements
   - Verify build completed successfully

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
