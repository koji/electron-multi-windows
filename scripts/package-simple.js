#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 Simple packaging without code signing...\n');

// Check if build exists
if (!fs.existsSync('dist')) {
  console.error('❌ Build directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Create a simple packaged version by copying files
const packageDir = 'release/simple-package';

// Create package directory
if (fs.existsSync(packageDir)) {
  fs.rmSync(packageDir, { recursive: true, force: true });
}
fs.mkdirSync(packageDir, { recursive: true });

// Copy essential files
const filesToCopy = [
  { src: 'dist', dest: path.join(packageDir, 'dist') },
  { src: 'package.json', dest: path.join(packageDir, 'package.json') },
  { src: 'node_modules/electron', dest: path.join(packageDir, 'node_modules/electron') }
];

console.log('📁 Creating simple package structure...');

// Copy dist directory
fs.cpSync('dist', path.join(packageDir, 'dist'), { recursive: true });
console.log('✅ Copied dist directory');

// Copy package.json
fs.copyFileSync('package.json', path.join(packageDir, 'package.json'));
console.log('✅ Copied package.json');

// Create a simple launcher script
const launcherScript = `@echo off
cd /d "%~dp0"
node_modules\\.bin\\electron .
`;

fs.writeFileSync(path.join(packageDir, 'start.bat'), launcherScript);
console.log('✅ Created launcher script');

// Create README for the package
const packageReadme = `# Electron Multi-Window App - Simple Package

This is a simple packaged version of the Electron Multi-Window App.

## Requirements

- Node.js installed on the system
- Electron dependencies (will be installed automatically)

## Running the Application

1. Install dependencies:
   \`\`\`
   npm install electron --save-dev
   \`\`\`

2. Run the application:
   - On Windows: Double-click \`start.bat\`
   - On other systems: \`npx electron .\`

## Files

- \`dist/\` - Compiled application files
- \`package.json\` - Application metadata and dependencies
- \`start.bat\` - Windows launcher script

## Build Information

- Built on: ${new Date().toISOString()}
- Platform: ${process.platform}
- Node.js: ${process.version}
`;

fs.writeFileSync(path.join(packageDir, 'README.md'), packageReadme);
console.log('✅ Created package README');

console.log('\n🎉 Simple package created successfully!');
console.log(`📍 Location: ${packageDir}`);
console.log('\n📋 Package contents:');
console.log('  - dist/           - Compiled application');
console.log('  - package.json    - Application metadata');
console.log('  - start.bat       - Windows launcher');
console.log('  - README.md       - Instructions');

console.log('\n💡 To run the packaged app:');
console.log('  1. Navigate to the package directory');
console.log('  2. Run: npm install electron --save-dev');
console.log('  3. Run: npx electron . (or double-click start.bat on Windows)');

console.log('\n✨ Build and packaging setup completed successfully!');
