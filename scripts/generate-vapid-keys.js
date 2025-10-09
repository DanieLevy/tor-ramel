const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('🔑 Generating VAPID keys for push notifications...\n');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');

// Validate key lengths for P-256 curve (iOS requirement)
const publicKeyBytes = Buffer.from(vapidKeys.publicKey, 'base64url');
const privateKeyBytes = Buffer.from(vapidKeys.privateKey, 'base64url');

console.log(`📊 Key Statistics:`);
console.log(`  Public Key Length: ${vapidKeys.publicKey.length} characters (${publicKeyBytes.length} bytes)`);
console.log(`  Private Key Length: ${vapidKeys.privateKey.length} characters (${privateKeyBytes.length} bytes)\n`);

// Check if keys meet P-256 requirements
if (publicKeyBytes.length === 65) {
  console.log('✅ Public key is valid P-256 uncompressed format (65 bytes)');
} else if (publicKeyBytes.length === 33) {
  console.log('✅ Public key is valid P-256 compressed format (33 bytes)');
} else {
  console.log('⚠️  Warning: Public key length unusual for P-256');
}

console.log('\n📝 Add these to your .env.local file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:daniellofficial@gmail.com\n`);

// Optionally save to a file
const envPath = path.join(__dirname, '..', '.env.vapid');
const envContent = `# Generated VAPID keys for push notifications
# Copy these to your .env.local file

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_EMAIL=mailto:daniellofficial@gmail.com
`;

fs.writeFileSync(envPath, envContent);
console.log(`💾 Keys also saved to: ${envPath}`);
console.log('\n✨ Done! Your VAPID keys are iOS-compatible.');
console.log('\n⚠️  IMPORTANT: Add these keys to .env.local and NEVER commit them to git!');

