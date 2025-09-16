#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying build setup...\n');

// Check if required directories exist
const requiredDirs = ['dist', 'dist/main', 'dist/renderer'];
const missingDirs = requiredDirs.filter(dir => !fs.existsSync(dir));

if (missingDirs.length > 0) {
  console.error('❌ Missing required directories:', missingDirs.join(', '));
  console.log('💡 Run "npm run build" first to create build artifacts');
  process.exit(1);
}

// Check if required files exist
const requiredFiles = [
  'dist/main/main.js',
  'dist/renderer/main.html',
  'dist/renderer/main.js',
  'dist/renderer/child.html',
  'dist/renderer/child.js'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ Missing required build files:', missingFiles.join(', '));
  console.log('💡 Run "npm run build" to generate missing files');
  process.exit(1);
}

console.log('✅ All required build files present');

// Check package.json build configuration
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const buildConfig = packageJson.build;

if (!buildConfig) {
  console.error('❌ Missing build configuration in package.json');
  process.exit(1);
}

console.log('✅ Build configuration found');

// Verify main entry point
if (packageJson.main !== 'dist/main/main.js') {
  console.error('❌ Incorrect main entry point in package.json');
  console.log('Expected: dist/main/main.js, Found:', packageJson.main);
  process.exit(1);
}

console.log('✅ Main entry point configured correctly');

// Test if electron can start (quick test)
console.log('🚀 Testing if application can start...');

const electronProcess = spawn('npm', ['run', 'start:prod'], {
  stdio: 'pipe',
  shell: true
});

let output = '';
let hasError = false;

electronProcess.stdout.on('data', (data) => {
  output += data.toString();
});

electronProcess.stderr.on('data', (data) => {
  const errorText = data.toString();
  if (errorText.includes('Error') || errorText.includes('FATAL')) {
    hasError = true;
    console.error('❌ Application startup error:', errorText);
  }
});

// Kill the process after 5 seconds (just testing startup)
setTimeout(() => {
  electronProcess.kill();

  if (!hasError) {
    console.log('✅ Application starts successfully');
    console.log('\n🎉 Build verification completed successfully!');
    console.log('\n📦 Available packaging commands:');
    console.log('  npm run package        - Package for current platform');
    console.log('  npm run package:win     - Package for Windows');
    console.log('  npm run package:mac     - Package for macOS');
    console.log('  npm run package:linux   - Package for Linux');
    console.log('  npm run package:all     - Package for all platforms');
  } else {
    console.log('\n❌ Build verification failed');
    process.exit(1);
  }
}, 5000);

electronProcess.on('error', (error) => {
  console.error('❌ Failed to start application:', error.message);
  process.exit(1);
});
