#!/usr/bin/env node

/**
 * Update Service Worker Version Script
 * 
 * This script runs during the build process to inject the current
 * build version and timestamp into the service worker file.
 */

const fs = require('fs');
const path = require('path');

const SW_PATH = path.join(__dirname, '../public/sw.js');

// Generate version from current timestamp
const version = `v${Date.now()}`;
const buildTime = new Date().toISOString();

console.log('🔧 [SW Update] Updating service worker version...');
console.log(`📦 [SW Update] Version: ${version}`);
console.log(`⏰ [SW Update] Build Time: ${buildTime}`);

try {
  // Read the service worker file
  let swContent = fs.readFileSync(SW_PATH, 'utf8');
  
  // Replace placeholders with actual values
  swContent = swContent.replace('__SW_VERSION__', version);
  swContent = swContent.replace('__BUILD_TIME__', buildTime);
  
  // Write back to file
  fs.writeFileSync(SW_PATH, swContent, 'utf8');
  
  console.log('✅ [SW Update] Service worker updated successfully!');
  console.log(`📍 [SW Update] File: ${SW_PATH}`);
} catch (error) {
  console.error('❌ [SW Update] Failed to update service worker:', error);
  process.exit(1);
}

