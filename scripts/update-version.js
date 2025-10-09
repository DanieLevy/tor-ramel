const fs = require('fs');
const path = require('path');

console.log('🔧 [Version] Updating version and service worker...');

// Read current version
const versionPath = path.join(__dirname, 'version.json');
let versionData = { version: '0.1', buildTime: '' };

if (fs.existsSync(versionPath)) {
  versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
}

// Increment version (0.1 -> 0.2 -> 0.3 etc.)
const currentVersion = parseFloat(versionData.version);
const newVersion = (currentVersion + 0.1).toFixed(1);
const buildTime = new Date().toISOString();

// Update version.json
versionData.version = newVersion;
versionData.buildTime = buildTime;
fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));

console.log(`📦 [Version] Updated: v${currentVersion} → v${newVersion}`);
console.log(`⏰ [Version] Build Time: ${buildTime}`);

// Update service worker
const swPath = path.join(__dirname, '../public/sw.js');
const swContent = fs.readFileSync(swPath, 'utf8');

// Replace version and build time
const updatedContent = swContent
  .replace(/const VERSION = 'v[\d.]+';/, `const VERSION = 'v${newVersion}';`)
  .replace(/const BUILD_TIME = '.*?';/, `const BUILD_TIME = '${buildTime}';`);

fs.writeFileSync(swPath, updatedContent);

console.log('✅ [Version] Service worker updated successfully!');
console.log(`📍 [Version] Version: v${newVersion}`);
console.log(`📍 [Version] File: ${swPath}`);

