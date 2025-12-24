# Netlify Functions Complete Implementation Guide

> A comprehensive, production-ready guide for building serverless functions with Netlify Functions v2, database integrations (Supabase), push notifications, email services, and scheduled tasks.

## Table of Contents

1. [Overview](#1-overview)
2. [Project Structure](#2-project-structure)
3. [netlify.toml Configuration](#3-netlifytoml-configuration)
4. [Required Packages](#4-required-packages)
5. [Environment Variables](#5-environment-variables)
6. [Basic Function Anatomy](#6-basic-function-anatomy)
7. [Scheduled Functions (Cron Jobs)](#7-scheduled-functions-cron-jobs)
8. [Database Integration (Supabase)](#8-database-integration-supabase)
9. [Push Notifications from Functions](#9-push-notifications-from-functions)
10. [Email Service Integration](#10-email-service-integration)
11. [Shared Utilities Pattern](#11-shared-utilities-pattern)
12. [Error Handling & Logging](#12-error-handling--logging)
13. [Performance Optimization](#13-performance-optimization)
14. [Testing Functions Locally](#14-testing-functions-locally)
15. [Deployment & Monitoring](#15-deployment--monitoring)
16. [Complete Example: Notification System](#16-complete-example-notification-system)

---

## 1. Overview

Netlify Functions are serverless functions that run on AWS Lambda under the hood. Key features:

- **Netlify Functions v2 (2025)**: Uses modern ES modules, Web standard Request/Response APIs
- **Scheduled Functions**: Built-in cron job support
- **Edge Functions**: Run at the edge for low latency (separate topic)
- **Automatic HTTPS**: All functions have HTTPS endpoints
- **Free Tier**: 125,000 invocations/month on free plan

### When to Use Netlify Functions

| Use Case | Function Type | Example |
|----------|---------------|---------|
| API endpoints | On-demand | `/api/users`, `/api/subscribe` |
| Background jobs | Scheduled | Check for appointments every 5 min |
| Webhooks | On-demand | Process incoming webhook payloads |
| Data processing | On-demand/Scheduled | Send notifications, generate reports |

---

## 2. Project Structure

```
project-root/
├── netlify/
│   └── functions/
│       ├── auto-check.mjs              # Scheduled function
│       ├── notification-processor.mjs  # On-demand + exportable
│       ├── expiry-reminder.mjs         # Scheduled function
│       ├── weekly-digest.mjs           # Scheduled function
│       └── shared/                     # Shared utilities
│           ├── date-utils.mjs
│           ├── email-service.mjs
│           ├── error-logger.mjs
│           └── push-payload-builder.mjs
├── netlify.toml                        # Netlify configuration
├── .env.local                          # Local environment variables
└── package.json
```

### File Naming Conventions

| Extension | Usage |
|-----------|-------|
| `.mjs` | ES Modules (recommended) |
| `.ts` | TypeScript (requires build step) |
| `.js` | CommonJS (legacy) |

> **Best Practice**: Use `.mjs` for pure ES module support without configuration complexity.

---

## 3. netlify.toml Configuration

The `netlify.toml` file is the heart of your Netlify configuration:

```toml
# ============================================
# Build Configuration
# ============================================
[build]
  command = "npm install && npm run build"
  functions = "netlify/functions"          # Functions directory
  publish = ".next"                         # Publish directory (for Next.js)
  environment = { 
    NEXT_TELEMETRY_DISABLED = "1", 
    CI = "true" 
  }

# ============================================
# Functions Configuration
# ============================================
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"                 # Fastest bundler
  included_files = ["netlify/functions/**"]
  
  # External modules that shouldn't be bundled
  # (for large dependencies or native modules)
  external_node_modules = [
    "@supabase/supabase-js", 
    "cheerio", 
    "axios",
    "web-push",
    "nodemailer"
  ]

# ============================================
# Function-Specific Settings
# ============================================

# Increase timeout for long-running operations (max 26 seconds)
[functions."auto-check"]
  timeout = 26

[functions."notification-processor"]
  timeout = 26

[functions."weekly-digest"]
  timeout = 26

# ============================================
# Development Settings
# ============================================
[dev]
  command = "npm run dev"
  port = 3000
  targetPort = 3000
  autoLaunch = true
  framework = "next"                       # Auto-detect framework

# ============================================
# Environment by Context
# ============================================
[context.production.environment]
  NEXT_PUBLIC_BASE_URL = "https://your-app.netlify.app"
  NODE_VERSION = "20"

[context.deploy-preview.environment]
  NEXT_PUBLIC_BASE_URL = "deploy-preview"
  NODE_VERSION = "20"

# ============================================
# Headers Configuration
# ============================================

# API routes - no caching, CORS enabled
[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-store, max-age=0"
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Authorization"

# Netlify Functions - same headers
[[headers]]
  for = "/.netlify/functions/*"
  [headers.values]
    Cache-Control = "no-store"
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Authorization"

# ============================================
# Redirects for Scheduled Functions
# ============================================

# Map custom paths to Netlify functions (optional)
[[redirects]]
  from = "/__scheduled/auto-check"
  to = "/.netlify/functions/auto-check"
  status = 200
  force = true

[[redirects]]
  from = "/__scheduled/notification-processor"
  to = "/.netlify/functions/notification-processor"
  status = 200
  force = true
```

### Key Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `node_bundler` | Bundler to use: `esbuild` (fastest), `nft` (Node File Trace) | `nft` |
| `external_node_modules` | Don't bundle these (for large/native modules) | `[]` |
| `timeout` | Max execution time in seconds | `10` (max `26`) |
| `included_files` | Additional files to include in function bundle | `[]` |

---

## 4. Required Packages

### Core Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "axios": "^1.7.0",
    "cheerio": "^1.0.0",
    "nodemailer": "^6.9.0",
    "web-push": "^3.6.0"
  }
}
```

### Install Command

```bash
npm install @supabase/supabase-js axios cheerio nodemailer web-push
```

### Package Purposes

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` | PostgreSQL database client |
| `axios` | HTTP requests with connection pooling |
| `cheerio` | Server-side HTML parsing (jQuery-like) |
| `nodemailer` | Email sending via SMTP |
| `web-push` | Web Push notifications (VAPID) |

---

## 5. Environment Variables

### Required Variables

```env
# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BPu8EoHq...
VAPID_PRIVATE_KEY=abc123...
VAPID_EMAIL=mailto:admin@example.com

# Email (Gmail example)
EMAIL_SENDER=your-email@gmail.com
EMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# App Configuration
NEXT_PUBLIC_BASE_URL=https://your-app.netlify.app
NODE_ENV=production
```

### Generate VAPID Keys

Create `scripts/generate-vapid-keys.js`:

```javascript
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('🔑 Generating VAPID keys for push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('\n📝 Add these to your .env.local file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:your-email@example.com\n`);

// Save to file
const envPath = path.join(__dirname, '..', '.env.vapid');
const envContent = `# Generated VAPID keys for push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_EMAIL=mailto:your-email@example.com
`;

fs.writeFileSync(envPath, envContent);
console.log(`💾 Keys saved to: ${envPath}`);
console.log('\n⚠️  IMPORTANT: Add these to .env.local and NEVER commit them to git!');
```

Run with:
```bash
node scripts/generate-vapid-keys.js
```

---

## 6. Basic Function Anatomy

### Netlify Functions v2 Format (Recommended)

```javascript
// netlify/functions/hello.mjs

/**
 * Basic Netlify Function v2
 * Uses Web Standard Request/Response APIs
 */
export default async (req) => {
  const functionStart = Date.now();
  
  try {
    // Parse URL and query params
    const url = new URL(req.url);
    const name = url.searchParams.get('name') || 'World';
    
    // Parse JSON body (for POST requests)
    let body = null;
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch {
        // Not JSON or empty body
      }
    }
    
    // Your business logic here
    const result = {
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
      method: req.method,
      body
    };
    
    const executionTime = Date.now() - functionStart;
    
    // Return Web standard Response
    return new Response(JSON.stringify({
      success: true,
      executionTime: `${executionTime}ms`,
      data: result
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
```

### Function URL Patterns

| Function Location | URL |
|-------------------|-----|
| `netlify/functions/hello.mjs` | `/.netlify/functions/hello` |
| `netlify/functions/api/users.mjs` | `/.netlify/functions/api-users` |

---

## 7. Scheduled Functions (Cron Jobs)

### Defining a Schedule

Add `config` export with `schedule` property:

```javascript
// netlify/functions/auto-check.mjs

import { createClient } from '@supabase/supabase-js';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Main handler
export default async (req) => {
  const functionStart = Date.now();
  
  try {
    console.log('🚀 AUTO-CHECK: Starting scheduled execution');
    
    // Check if this is a scheduled invocation
    let isScheduled = false;
    let nextRun = null;
    
    try {
      const body = await req.json();
      if (body && body.next_run) {
        isScheduled = true;
        nextRun = body.next_run;
        console.log(`⏰ Scheduled invocation - Next run: ${nextRun}`);
      }
    } catch {
      console.log('🔧 Manual invocation');
    }
    
    // Your scheduled task logic
    const result = await performScheduledTask();
    
    const totalTime = Math.round((Date.now() - functionStart) / 1000);
    console.log(`⚡ FUNCTION COMPLETED in ${totalTime}s`);
    
    return new Response(JSON.stringify({
      success: true,
      executionTime: totalTime,
      isScheduled,
      nextRun,
      timestamp: new Date().toISOString(),
      data: result
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    const totalTime = Math.round((Date.now() - functionStart) / 1000);
    console.error(`❌ FUNCTION FAILED in ${totalTime}s:`, error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      executionTime: totalTime,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

// ============================================
// SCHEDULE CONFIGURATION
// ============================================

/**
 * Schedule uses standard cron syntax:
 * ┌───────────── minute (0-59)
 * │ ┌───────────── hour (0-23)
 * │ │ ┌───────────── day of month (1-31)
 * │ │ │ ┌───────────── month (1-12)
 * │ │ │ │ ┌───────────── day of week (0-6) (Sunday=0)
 * │ │ │ │ │
 * * * * * *
 */
export const config = {
  schedule: "*/5 * * * *"  // Every 5 minutes
};

// Business logic
async function performScheduledTask() {
  // Query database
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'pending');
  
  if (error) throw error;
  
  // Process tasks...
  return { tasksProcessed: data?.length || 0 };
}
```

### Common Cron Patterns

| Pattern | Description |
|---------|-------------|
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 7 * * *` | Daily at 07:00 UTC |
| `0 6 * * 0` | Every Sunday at 06:00 UTC |
| `0 9,17 * * 1-5` | 9 AM and 5 PM, Monday-Friday |

### Free Tier Considerations

- Free plan: 125,000 invocations/month
- `*/5 * * * *` = ~8,640 invocations/month (within limit)
- Scheduled function minimum interval: 1 minute

---

## 8. Database Integration (Supabase)

### Initialize Client

```javascript
// netlify/functions/shared/database.mjs

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key (full access)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper for error handling
export function handleSupabaseError(error, operation) {
  if (error) {
    console.error(`❌ Supabase error in ${operation}:`, error);
    throw new Error(`Database error: ${error.message}`);
  }
}
```

### Common Database Operations

```javascript
// netlify/functions/data-operations.mjs

import { supabase, handleSupabaseError } from './shared/database.mjs';

// ============================================
// SELECT Operations
// ============================================

// Get all records
async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true);
  
  handleSupabaseError(error, 'getAllUsers');
  return data;
}

// Get with relations (JOIN)
async function getSubscriptionsWithUsers() {
  const { data, error } = await supabase
    .from('notification_subscriptions')
    .select(`
      *,
      users!notification_subscriptions_user_id_fkey(id, email)
    `)
    .eq('is_active', true)
    .eq('subscription_status', 'active');
  
  handleSupabaseError(error, 'getSubscriptionsWithUsers');
  return data;
}

// Get with filtering and ordering
async function getRecentNotifications(userId, limit = 10) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  handleSupabaseError(error, 'getRecentNotifications');
  return data;
}

// Count records
async function countPendingItems() {
  const { count, error } = await supabase
    .from('notification_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  handleSupabaseError(error, 'countPendingItems');
  return count || 0;
}

// ============================================
// INSERT Operations
// ============================================

// Single insert
async function createNotification(notification) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: notification.userId,
      title: notification.title,
      body: notification.body,
      notification_type: notification.type,
      data: notification.data || {},
      is_read: false
    })
    .select()
    .single();
  
  handleSupabaseError(error, 'createNotification');
  return data;
}

// Bulk insert
async function createMultipleRecords(records) {
  const { data, error } = await supabase
    .from('records')
    .insert(records)
    .select();
  
  handleSupabaseError(error, 'createMultipleRecords');
  return data;
}

// ============================================
// UPDATE Operations
// ============================================

// Update by ID
async function updateSubscriptionStatus(subscriptionId, status) {
  const { data, error } = await supabase
    .from('notification_subscriptions')
    .update({ 
      subscription_status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', subscriptionId)
    .select()
    .single();
  
  handleSupabaseError(error, 'updateSubscriptionStatus');
  return data;
}

// UPSERT (insert or update)
async function upsertUserPreferences(userId, preferences) {
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'user_id' 
    })
    .select()
    .single();
  
  handleSupabaseError(error, 'upsertUserPreferences');
  return data;
}

// ============================================
// DELETE Operations
// ============================================

// Delete by ID
async function deleteNotification(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  
  handleSupabaseError(error, 'deleteNotification');
}

// Bulk delete with condition
async function deleteOldNotifications(olderThanDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const { error } = await supabase
    .from('notifications')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .eq('is_read', true);
  
  handleSupabaseError(error, 'deleteOldNotifications');
}

// ============================================
// TRANSACTION-LIKE Operations
// ============================================

// Process queue item (read → process → update)
async function processQueueItem(itemId) {
  // 1. Mark as processing
  const { data: item, error: fetchError } = await supabase
    .from('notification_queue')
    .update({ status: 'processing' })
    .eq('id', itemId)
    .eq('status', 'pending')  // Only if still pending
    .select()
    .single();
  
  if (fetchError || !item) {
    console.log('Item already processed or not found');
    return null;
  }
  
  try {
    // 2. Process the item
    await sendNotification(item);
    
    // 3. Mark as completed
    await supabase
      .from('notification_queue')
      .update({ 
        status: 'sent',
        processed_at: new Date().toISOString()
      })
      .eq('id', itemId);
    
    return { success: true };
    
  } catch (error) {
    // 4. Mark as failed
    await supabase
      .from('notification_queue')
      .update({ 
        status: 'failed',
        error_message: error.message,
        processed_at: new Date().toISOString()
      })
      .eq('id', itemId);
    
    return { success: false, error: error.message };
  }
}
```

---

## 9. Push Notifications from Functions

### Web-Push Setup

```javascript
// netlify/functions/shared/push-service.mjs

import webpush from 'web-push';
import { supabase } from './database.mjs';

// ============================================
// VAPID Configuration
// ============================================

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

// Initialize web-push
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    console.log('✅ VAPID keys configured successfully');
  } catch (error) {
    console.error('❌ Failed to configure VAPID keys:', error);
  }
} else {
  console.warn('⚠️ VAPID keys missing - push notifications will not work');
}

// ============================================
// Error Handling Constants
// ============================================

// Permanent errors that should deactivate subscription
const PERMANENT_ERROR_CODES = [410, 404, 401];

// Max failures before auto-disable
const MAX_CONSECUTIVE_FAILURES = 5;

// ============================================
// Push Notification Functions
// ============================================

/**
 * Get active push subscriptions for user(s)
 */
export async function getActivePushSubscriptions(userIds = null) {
  let query = supabase
    .from('push_subscriptions')
    .select('*')
    .eq('is_active', true);
  
  if (userIds && userIds.length > 0) {
    query = query.in('user_id', userIds);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching push subscriptions:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Send push notification to a user
 * Payload structure matches service worker expectations
 */
export async function sendPushToUser(userId, title, body, data = {}) {
  try {
    const subscriptions = await getActivePushSubscriptions([userId]);
    
    if (subscriptions.length === 0) {
      console.log(`⚠️ No active push subscriptions for user ${userId}`);
      return { sent: 0, failed: 0 };
    }
    
    // Build payload matching service worker structure
    const payload = JSON.stringify({
      notification: {
        title,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction !== false,
        data: {
          ...data,
          url: data.url || '/',
          timestamp: new Date().toISOString()
        }
      },
      badgeCount: data.badgeCount || 1
    });
    
    let sent = 0;
    let failed = 0;
    
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload);
        
        sent++;
        console.log(`✅ Push sent to ${sub.username || sub.user_id} (${sub.device_type})`);
        
        // Update success status
        await supabase
          .from('push_subscriptions')
          .update({ 
            last_used: new Date().toISOString(),
            last_delivery_status: 'success',
            consecutive_failures: 0,
            last_failure_reason: null
          })
          .eq('id', sub.id);
        
      } catch (pushError) {
        failed++;
        console.error(`❌ Push failed for ${sub.username}:`, pushError.message);
        
        const statusCode = pushError.statusCode || 0;
        const currentFailures = sub.consecutive_failures || 0;
        const newFailureCount = currentFailures + 1;
        
        // Check if should deactivate
        if (PERMANENT_ERROR_CODES.includes(statusCode) || 
            newFailureCount >= MAX_CONSECUTIVE_FAILURES) {
          
          console.log(`🗑️ Deactivating subscription for ${sub.username} ` +
                      `(status: ${statusCode}, failures: ${newFailureCount})`);
          
          await supabase
            .from('push_subscriptions')
            .update({ 
              is_active: false,
              last_delivery_status: 'failed',
              consecutive_failures: newFailureCount,
              last_failure_reason: `Deactivated: ${pushError.message} (status ${statusCode})`
            })
            .eq('id', sub.id);
        } else {
          // Just update failure count
          await supabase
            .from('push_subscriptions')
            .update({ 
              last_delivery_status: 'failed',
              consecutive_failures: newFailureCount,
              last_failure_reason: pushError.message
            })
            .eq('id', sub.id);
        }
      }
    }
    
    console.log(`📊 Push results: ${sent} sent, ${failed} failed`);
    return { sent, failed };
    
  } catch (error) {
    console.error('Error in sendPushToUser:', error);
    return { sent: 0, failed: 1 };
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(userIds, title, body, data = {}) {
  const results = {
    totalSent: 0,
    totalFailed: 0,
    byUser: {}
  };
  
  for (const userId of userIds) {
    const result = await sendPushToUser(userId, title, body, data);
    results.byUser[userId] = result;
    results.totalSent += result.sent;
    results.totalFailed += result.failed;
  }
  
  return results;
}

export default {
  sendPushToUser,
  sendPushToUsers,
  getActivePushSubscriptions
};
```

### Push Payload Builder (Apple 4KB Limit)

```javascript
// netlify/functions/shared/push-payload-builder.mjs

/**
 * Centralized Push Notification Payload Builder
 * 
 * CRITICAL: Apple APNS has a hard 4KB limit. HTTP 413 errors occur when exceeded.
 * We target 3.5KB (3584 bytes) to leave safety margin for encryption overhead.
 */

const MAX_PAYLOAD_SIZE = 3584;
const ABSOLUTE_MAX_SIZE = 4096;

/**
 * Build notification payload for appointments
 */
export function buildAppointmentPayload({ 
  appointments, 
  subscriptionId,
  bookingUrl,
  dataId = null
}) {
  const count = appointments?.length || 0;
  
  // Build concise title
  let title;
  if (count === 1) {
    const apt = appointments[0];
    title = `🆕 תור פנוי ${formatDateShort(apt.date)}`;
  } else {
    title = `🎉 נמצאו ${count} תורים פנויים`;
  }
  
  // Build concise body
  let body;
  if (count === 1) {
    const timesCount = appointments[0].times?.length || 0;
    body = `📅 ${timesCount} שעות זמינות`;
  } else {
    const previewDates = appointments.slice(0, 3)
      .map(apt => formatDateShort(apt.date)).join(', ');
    body = `📅 ${previewDates}${count > 3 ? ' ועוד...' : ''}`;
  }
  
  // Build lightweight data
  const data = {
    type: 'appointment',
    url: `/notification-action?subscription=${subscriptionId}`,
    subscription_id: subscriptionId,
    cnt: count
  };
  
  if (dataId) data.data_id = dataId;
  if (bookingUrl) data.booking_url = bookingUrl;
  
  return buildPayload({ 
    title, 
    body, 
    tag: 'appointment', 
    data,
    requireInteraction: true
  });
}

/**
 * Core payload builder with size optimization
 */
function buildPayload({ 
  title, 
  body, 
  tag, 
  actions = [], 
  data = {},
  requireInteraction = true,
  icon = '/icons/icon-192x192.png',
  badge = '/icons/icon-72x72.png'
}) {
  // Build notification object
  const notification = {
    title: truncate(title, 50),
    body: truncate(body, 100),
    icon,
    badge,
    tag,
    requireInteraction,
    data: {
      ...data,
      ts: Date.now()
    }
  };
  
  if (actions.length > 0) {
    notification.actions = actions;
  }
  
  const payload = {
    notification,
    badgeCount: 1
  };
  
  // Check and reduce size if needed
  let payloadStr = JSON.stringify(payload);
  let payloadSize = Buffer.byteLength(payloadStr, 'utf8');
  
  console.log(`[PushPayload] Size: ${payloadSize} bytes (max: ${MAX_PAYLOAD_SIZE})`);
  
  // Progressive reduction if too large
  if (payloadSize > MAX_PAYLOAD_SIZE) {
    console.warn(`[PushPayload] Reducing payload from ${payloadSize} bytes...`);
    
    // Step 1: Remove extra actions
    if (notification.actions?.length > 1) {
      notification.actions = [notification.actions[0]];
      payloadStr = JSON.stringify(payload);
      payloadSize = Buffer.byteLength(payloadStr, 'utf8');
    }
    
    // Step 2: Remove all actions
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      delete notification.actions;
      payloadStr = JSON.stringify(payload);
      payloadSize = Buffer.byteLength(payloadStr, 'utf8');
    }
    
    // Step 3: Shorten body
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      notification.body = truncate(notification.body, 50);
      payloadStr = JSON.stringify(payload);
      payloadSize = Buffer.byteLength(payloadStr, 'utf8');
    }
    
    // Step 4: Minimize data
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      notification.data = { url: '/', ts: Date.now() };
      payloadStr = JSON.stringify(payload);
    }
  }
  
  return payloadStr;
}

function truncate(str, maxLen) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + '…';
}

function formatDateShort(dateStr) {
  const [_year, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

export default { buildAppointmentPayload };
```

---

## 10. Email Service Integration

### Nodemailer Setup

```javascript
// netlify/functions/shared/email-service.mjs

import nodemailer from 'nodemailer';

// ============================================
// EMAIL CONFIGURATION
// ============================================

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',  // or 'smtp.mailgun.org', 'smtp.sendgrid.net', etc.
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

const getBaseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://your-app.netlify.app';

// ============================================
// EMAIL TEMPLATES
// ============================================

function getBaseEmailStyles() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: #000000;
      background-color: #ffffff;
      direction: rtl;  /* For RTL languages like Hebrew */
    }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e5e5e5; }
    h1 { font-size: 24px; font-weight: 600; color: #000000; margin-bottom: 8px; }
    .button {
      display: block; width: 100%; padding: 16px 32px;
      margin-bottom: 12px; text-align: center; text-decoration: none;
      font-size: 16px; font-weight: 500; border-radius: 8px;
    }
    .button-primary { background-color: #000000; color: #ffffff !important; }
    .button-secondary { background-color: #ffffff; color: #000000 !important; border: 2px solid #000000; }
    .footer { text-align: center; font-size: 14px; color: #999999; padding-top: 24px; border-top: 1px solid #e5e5e5; }
  `;
}

function wrapEmailHtml(title, content) {
  const baseUrl = getBaseUrl();
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${getBaseEmailStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${baseUrl}/icons/icon-128x128.png" alt="Logo" width="48" height="48" style="border-radius: 12px;">
    </div>
    ${content}
    <div class="footer">
      <a href="${baseUrl}/settings">Settings</a> • <a href="${baseUrl}">Visit App</a>
      <div style="margin-top: 16px;">© ${new Date().getFullYear()} Your App</div>
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================
// EMAIL SENDING FUNCTIONS
// ============================================

/**
 * Send an email
 */
export async function sendEmail(to, subject, html) {
  try {
    if (!process.env.EMAIL_SENDER || !process.env.EMAIL_APP_PASSWORD) {
      console.error('❌ Email credentials not configured');
      return false;
    }
    
    const mailOptions = {
      from: `"Your App" <${process.env.EMAIL_SENDER}>`,
      to,
      subject,
      html
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error.message);
    return false;
  }
}

/**
 * Send notification email
 */
export async function sendNotificationEmail(to, data) {
  const { title, body, actionUrl, actionText = 'View Details' } = data;
  const baseUrl = getBaseUrl();
  
  const content = `
    <h1>${title}</h1>
    <p style="font-size: 16px; color: #666; margin-bottom: 24px;">${body}</p>
    <a href="${actionUrl || baseUrl}" class="button button-primary">${actionText}</a>
  `;
  
  const html = wrapEmailHtml(title, content);
  return sendEmail(to, title, html);
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(to, userName) {
  const baseUrl = getBaseUrl();
  
  const content = `
    <h1>Welcome, ${userName}! 🎉</h1>
    <p style="font-size: 16px; color: #666; margin-bottom: 24px;">
      Your account has been created successfully. You'll now receive notifications 
      when new opportunities are available.
    </p>
    <a href="${baseUrl}/dashboard" class="button button-primary">Go to Dashboard</a>
    <a href="${baseUrl}/settings" class="button button-secondary">Configure Settings</a>
  `;
  
  const html = wrapEmailHtml('Welcome to Our App', content);
  return sendEmail(to, 'Welcome to Our App! 🎉', html);
}

/**
 * Send weekly digest email
 */
export async function sendWeeklyDigestEmail(to, data) {
  const { items, totalCount, closestItem } = data;
  const baseUrl = getBaseUrl();
  
  const itemsList = items.slice(0, 5).map(item => `
    <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <strong>${item.title}</strong>
      <div style="font-size: 14px; color: #666;">${item.description}</div>
    </div>
  `).join('');
  
  const content = `
    <h1>📅 Weekly Summary</h1>
    <p style="font-size: 16px; color: #666; margin-bottom: 24px;">
      ${totalCount} items available this week
    </p>
    ${closestItem ? `
      <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <div style="font-size: 14px; color: #666;">Next up</div>
        <strong style="font-size: 18px;">${closestItem.title}</strong>
      </div>
    ` : ''}
    ${itemsList}
    <a href="${baseUrl}/search" class="button button-primary">View All Items</a>
  `;
  
  const html = wrapEmailHtml('Weekly Summary', content);
  return sendEmail(to, `📅 Weekly Summary: ${totalCount} items available`, html);
}

export default {
  sendEmail,
  sendNotificationEmail,
  sendWelcomeEmail,
  sendWeeklyDigestEmail
};
```

### Gmail App Password Setup

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication
3. Go to App Passwords
4. Select "Mail" and "Other (Custom name)"
5. Generate password
6. Use this password in `EMAIL_APP_PASSWORD`

---

## 11. Shared Utilities Pattern

### Date Utilities

```javascript
// netlify/functions/shared/date-utils.mjs

export const TIMEZONE = 'Asia/Jerusalem';  // Your preferred timezone

/**
 * Format date to YYYY-MM-DD in local timezone
 */
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

/**
 * Get current date at midnight in local timezone
 */
export const getCurrentDate = () => {
  return new Date(formatDate(new Date()) + 'T00:00:00');
};

/**
 * Get day name in locale
 */
export const getDayName = (dateStr, locale = 'he-IL') => {
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat(locale, {
    timeZone: TIMEZONE,
    weekday: 'long'
  }).format(date);
};

/**
 * Add days to a date
 */
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Calculate days until a date
 */
export const getDaysUntil = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(dateStr + 'T00:00:00');
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if within quiet hours
 */
export function isWithinQuietHours(quietStart, quietEnd) {
  if (!quietStart || !quietEnd) return false;
  
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', { 
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (quietStart > quietEnd) {
    return currentTime >= quietStart || currentTime <= quietEnd;
  }
  
  return currentTime >= quietStart && currentTime <= quietEnd;
}
```

### HTTP Client with Connection Pooling

```javascript
// netlify/functions/shared/http-client.mjs

import axios from 'axios';
import http from 'http';
import https from 'https';

// Create optimized HTTP agents with connection pooling
const httpAgent = new http.Agent({ 
  keepAlive: true, 
  maxSockets: 15,
  maxFreeSockets: 8,
  timeout: 5000,
  keepAliveMsecs: 3000,
  scheduling: 'lifo'
});

const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 15,
  maxFreeSockets: 8,
  rejectUnauthorized: true,
  timeout: 5000,
  keepAliveMsecs: 3000,
  scheduling: 'lifo'
});

/**
 * Create optimized axios instance
 */
export const createHttpClient = (config = {}) => {
  return axios.create({
    httpAgent,
    httpsAgent,
    timeout: config.timeout || 5000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; YourApp/1.0)',
      'Accept': 'application/json',
      ...config.headers
    },
    ...config
  });
};

export default createHttpClient;
```

---

## 12. Error Handling & Logging

### Centralized Error Logger

```javascript
// netlify/functions/shared/error-logger.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Sanitize sensitive data from objects
 */
function sanitizeData(data, sensitiveKeys = ['password', 'token', 'secret', 'auth', 'key']) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, sensitiveKeys);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Log error to database
 */
export async function logError({
  error_type,
  message,
  source,
  error = null,
  operation = null,
  user_id = null,
  metadata = {}
}) {
  try {
    const errorMessage = error instanceof Error ? error.message : (message || String(error));
    const stackTrace = error instanceof Error ? error.stack?.substring(0, 2000) : undefined;
    
    const logEntry = {
      error_type: error_type || 'unknown_error',
      message: errorMessage.substring(0, 5000),
      stack_trace: stackTrace,
      source,
      operation,
      user_id,
      metadata: sanitizeData(metadata),
      environment: process.env.NODE_ENV || 'production'
    };
    
    const { error: dbError } = await supabase
      .from('error_logs')
      .insert(logEntry);
    
    if (dbError) {
      console.error('[ErrorLogger] Failed to write to database:', dbError);
      console.error('[ErrorLogger] Original error:', logEntry);
    } else {
      console.log(`[ErrorLogger] ❌ Logged ${error_type}: ${errorMessage.substring(0, 100)}`);
    }
  } catch (err) {
    console.error('[ErrorLogger] Exception while logging:', err);
  }
}

/**
 * Log function error
 */
export async function logFunctionError(error, functionName, options = {}) {
  await logError({
    error_type: 'function_error',
    message: error instanceof Error ? error.message : String(error),
    source: `netlify/functions/${functionName}`,
    error,
    operation: options.operation,
    user_id: options.user_id,
    metadata: options.metadata || {}
  });
}

/**
 * Log push notification error
 */
export async function logPushError(error, options = {}) {
  await logError({
    error_type: 'push_error',
    message: error instanceof Error ? error.message : String(error),
    source: options.source || 'push-service',
    error,
    operation: options.operation || 'send_push',
    user_id: options.user_id,
    metadata: {
      endpoint: options.endpoint?.substring(0, 100),
      status_code: options.status_code,
      device_type: options.device_type,
      ...options.metadata
    }
  });
}

/**
 * Log email error
 */
export async function logEmailError(error, options = {}) {
  await logError({
    error_type: 'email_error',
    message: error instanceof Error ? error.message : String(error),
    source: 'email-service',
    error,
    operation: options.email_type || 'send_email',
    user_id: options.user_id,
    metadata: options.metadata || {}
  });
}

export default {
  logError,
  logFunctionError,
  logPushError,
  logEmailError
};
```

### Error Logs Table Schema (Supabase)

```sql
-- Create error_logs table
CREATE TABLE error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  source VARCHAR(255),
  operation VARCHAR(255),
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  subscription_id UUID,
  notification_id UUID,
  push_subscription_id UUID,
  metadata JSONB DEFAULT '{}',
  environment VARCHAR(50) DEFAULT 'production',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_source ON error_logs(source);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
```

---

## 13. Performance Optimization

### Best Practices

```javascript
// netlify/functions/optimized-function.mjs

import { createClient } from '@supabase/supabase-js';

// 1. Initialize clients OUTSIDE handler (reused across invocations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 2. Lazy initialization for heavy dependencies
let webpush = null;
const getWebPush = async () => {
  if (!webpush) {
    const module = await import('web-push');
    webpush = module.default;
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
  return webpush;
};

export default async (req) => {
  const startTime = Date.now();
  
  try {
    // 3. Early termination for health checks
    const url = new URL(req.url);
    if (url.pathname.endsWith('/health')) {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 4. Parallel operations where possible
    const [users, settings] = await Promise.all([
      supabase.from('users').select('*').eq('is_active', true),
      supabase.from('settings').select('*').single()
    ]);
    
    // 5. Process in batches for large datasets
    const BATCH_SIZE = 10;
    const items = users.data || [];
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      
      // Process batch concurrently
      await Promise.all(batch.map(item => processItem(item)));
      
      // Check time limit (leave 2s buffer)
      if (Date.now() - startTime > 24000) {
        console.log('⏰ Approaching timeout, stopping');
        break;
      }
    }
    
    // 6. Return early, don't wait for non-critical operations
    const response = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Fire-and-forget for analytics/logging
    logAnalytics(Date.now() - startTime).catch(console.error);
    
    return response;
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function processItem(item) {
  // Process individual item
}

async function logAnalytics(duration) {
  // Non-critical logging
}
```

### Adaptive Batch Processing

```javascript
/**
 * Adaptive batch processing with time limits
 */
export class AdaptiveBatchProcessor {
  constructor(options = {}) {
    this.maxTimeMs = options.maxTimeMs || 24000;  // 24s (2s buffer from 26s limit)
    this.minBatchSize = options.minBatchSize || 3;
    this.maxBatchSize = options.maxBatchSize || 10;
    this.stats = { processed: 0, avgTime: 0, times: [] };
  }
  
  /**
   * Get optimal batch size based on performance
   */
  getOptimalBatchSize(elapsed, remaining) {
    const timeRemaining = this.maxTimeMs - elapsed;
    
    // Calculate average processing time
    const avgTime = this.stats.times.length > 0
      ? this.stats.times.reduce((a, b) => a + b, 0) / this.stats.times.length
      : 500;  // Default estimate
    
    // Estimate how many we can process
    const estimatedBatchSize = Math.floor(timeRemaining / avgTime);
    
    // Clamp to min/max
    return Math.min(
      this.maxBatchSize,
      Math.max(this.minBatchSize, estimatedBatchSize, Math.min(remaining, 5))
    );
  }
  
  /**
   * Record processing time for adaptation
   */
  recordTime(duration) {
    this.stats.times.push(duration);
    // Keep last 20 samples
    if (this.stats.times.length > 20) {
      this.stats.times.shift();
    }
    this.stats.avgTime = this.stats.times.reduce((a, b) => a + b, 0) / this.stats.times.length;
  }
  
  /**
   * Process items in adaptive batches
   */
  async process(items, processor) {
    const startTime = Date.now();
    const results = [];
    
    for (let i = 0; i < items.length;) {
      const elapsed = Date.now() - startTime;
      const remaining = items.length - i;
      
      // Check if we should stop
      if (elapsed > this.maxTimeMs) {
        console.log(`⏰ Time limit reached at ${elapsed}ms`);
        break;
      }
      
      // Get optimal batch size
      const batchSize = this.getOptimalBatchSize(elapsed, remaining);
      const batch = items.slice(i, i + batchSize);
      
      const batchStart = Date.now();
      
      // Process batch
      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item))
      );
      
      // Record timing
      this.recordTime(Date.now() - batchStart);
      
      // Collect results
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          this.stats.processed++;
        } else {
          results.push({ error: result.reason?.message, item: batch[idx] });
        }
      });
      
      i += batchSize;
    }
    
    return {
      results,
      stats: {
        processed: this.stats.processed,
        avgTime: Math.round(this.stats.avgTime),
        totalTime: Date.now() - startTime
      }
    };
  }
}
```

---

## 14. Testing Functions Locally

### Using Netlify Dev

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to your site
netlify link

# Start local development
netlify dev
```

### Environment Variables for Local Dev

Create `.env.local`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BPu8EoHq...
VAPID_PRIVATE_KEY=abc123...
VAPID_EMAIL=mailto:admin@example.com
EMAIL_SENDER=your-email@gmail.com
EMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Testing Scheduled Functions

```bash
# Invoke function manually
netlify functions:invoke auto-check

# With custom payload
netlify functions:invoke auto-check --payload '{"test": true}'

# View function logs
netlify functions:list
```

### Testing with cURL

```bash
# Test local function
curl http://localhost:8888/.netlify/functions/hello

# Test with POST body
curl -X POST http://localhost:8888/.netlify/functions/hello \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

---

## 15. Deployment & Monitoring

### Deployment

```bash
# Deploy to production
netlify deploy --prod

# Deploy preview
netlify deploy

# Build and deploy
netlify deploy --build --prod
```

### Environment Variables in Netlify UI

1. Go to Site Settings → Environment Variables
2. Add all required variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_EMAIL`
   - `EMAIL_SENDER`
   - `EMAIL_APP_PASSWORD`
   - `NEXT_PUBLIC_BASE_URL`

### Monitoring Functions

1. **Netlify Dashboard**: Site → Functions → View logs
2. **Real-time logs**: `netlify logs:function auto-check`
3. **Custom monitoring**: Use error logger to database

### Function Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| Execution time | >20s | >25s |
| Memory usage | >800MB | >1GB |
| Error rate | >5% | >10% |
| Cold start time | >2s | >5s |

---

## 16. Complete Example: Notification System

Here's a complete, production-ready scheduled notification function:

```javascript
// netlify/functions/notification-processor.mjs

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import nodemailer from 'nodemailer';
import { logFunctionError, logPushError, logEmailError } from './shared/error-logger.mjs';
import { isWithinQuietHours } from './shared/date-utils.mjs';

// ============================================
// INITIALIZATION (outside handler for reuse)
// ============================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  console.log('✅ VAPID keys configured');
}

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// ============================================
// NOTIFICATION PROCESSING
// ============================================

async function processNotificationQueue(limit = 10) {
  const startTime = Date.now();
  
  console.log('🔔 Processing notification queue...');
  
  // Get pending notifications
  const { data: queueItems, error: queueError } = await supabase
    .from('notification_queue')
    .select(`
      *,
      user:users!inner(id, email)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  
  if (queueError) {
    console.error('Error fetching queue:', queueError);
    throw new Error('Failed to fetch notification queue');
  }
  
  if (!queueItems || queueItems.length === 0) {
    console.log('No pending notifications');
    return { processed: 0, failed: 0, total: 0 };
  }
  
  console.log(`Found ${queueItems.length} pending notifications`);
  
  let processed = 0;
  let failed = 0;
  
  for (const item of queueItems) {
    try {
      // Mark as processing
      await supabase
        .from('notification_queue')
        .update({ status: 'processing' })
        .eq('id', item.id);
      
      // Get user preferences
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', item.user.id)
        .single();
      
      // Check quiet hours
      if (isWithinQuietHours(prefs?.quiet_hours_start, prefs?.quiet_hours_end)) {
        console.log(`User ${item.user.id} in quiet hours, deferring`);
        await supabase
          .from('notification_queue')
          .update({ status: 'deferred' })
          .eq('id', item.id);
        continue;
      }
      
      // Determine notification method
      const method = prefs?.default_notification_method || 'email';
      let emailSent = false;
      let pushSent = false;
      
      // Send email
      if (method === 'email' || method === 'both') {
        try {
          await transporter.sendMail({
            from: `"Your App" <${process.env.EMAIL_SENDER}>`,
            to: item.user.email,
            subject: item.title,
            html: generateEmailHtml(item)
          });
          emailSent = true;
          console.log(`✅ Email sent to ${item.user.email}`);
        } catch (error) {
          console.error('Email failed:', error.message);
          await logEmailError(error, { user_id: item.user.id });
        }
      }
      
      // Send push
      if (method === 'push' || method === 'both') {
        const pushResult = await sendPushNotification(item.user.id, item);
        pushSent = pushResult.sent > 0;
      }
      
      // Check if successful
      const success = (method === 'email' && emailSent) ||
                      (method === 'push' && pushSent) ||
                      (method === 'both' && (emailSent || pushSent));
      
      if (success) {
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'sent',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);
        processed++;
      } else {
        throw new Error('All notification methods failed');
      }
      
    } catch (error) {
      console.error(`Failed to process ${item.id}:`, error.message);
      
      await supabase
        .from('notification_queue')
        .update({ 
          status: 'failed',
          error_message: error.message
        })
        .eq('id', item.id);
      
      await logFunctionError(error, 'notification-processor', {
        operation: 'process_item',
        metadata: { queue_id: item.id }
      });
      
      failed++;
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`✅ Processed ${processed}, failed ${failed} in ${duration}ms`);
  
  return { processed, failed, total: queueItems.length };
}

async function sendPushNotification(userId, item) {
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  if (!subscriptions?.length) {
    return { sent: 0, failed: 0 };
  }
  
  const payload = JSON.stringify({
    notification: {
      title: item.title,
      body: item.body,
      icon: '/icons/icon-192x192.png',
      data: { url: item.url || '/' }
    },
    badgeCount: 1
  });
  
  let sent = 0;
  let failed = 0;
  
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, payload);
      sent++;
      
      await supabase
        .from('push_subscriptions')
        .update({ last_used: new Date().toISOString(), consecutive_failures: 0 })
        .eq('id', sub.id);
        
    } catch (error) {
      failed++;
      console.error('Push failed:', error.message);
      
      // Deactivate if permanent error
      if ([410, 404].includes(error.statusCode)) {
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', sub.id);
      }
    }
  }
  
  return { sent, failed };
}

function generateEmailHtml(item) {
  return `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <h1>${item.title}</h1>
      <p>${item.body}</p>
      ${item.url ? `<a href="${item.url}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 8px;">View Details</a>` : ''}
    </div>
  `;
}

// ============================================
// EXPORTED FUNCTION & HANDLER
// ============================================

export { processNotificationQueue };

export default async (req) => {
  const functionStart = Date.now();
  
  try {
    console.log('📧 NOTIFICATION-PROCESSOR: Starting');
    
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    const result = await processNotificationQueue(limit);
    
    const totalTime = Math.round((Date.now() - functionStart) / 1000);
    
    return new Response(JSON.stringify({
      success: true,
      executionTime: totalTime,
      timestamp: new Date().toISOString(),
      data: result
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    const totalTime = Math.round((Date.now() - functionStart) / 1000);
    console.error(`❌ FUNCTION FAILED in ${totalTime}s:`, error.message);
    
    await logFunctionError(error, 'notification-processor');
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      executionTime: totalTime,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
```

---

## Quick Reference

### Function Timeout Limits

| Plan | Max Timeout |
|------|-------------|
| Free | 10 seconds |
| Pro | 26 seconds |
| Enterprise | Custom |

### Free Tier Limits (2025)

| Resource | Limit |
|----------|-------|
| Function invocations | 125,000/month |
| Scheduled functions | Yes |
| Build minutes | 300/month |
| Bandwidth | 100GB/month |

### Useful Commands

```bash
# Development
netlify dev                    # Start local dev server
netlify functions:list         # List all functions
netlify functions:invoke NAME  # Invoke function

# Deployment
netlify deploy                 # Preview deploy
netlify deploy --prod         # Production deploy
netlify deploy --build        # Build then deploy

# Logs & Debugging
netlify logs:function NAME     # View function logs
netlify status                 # Check link status
```

---

## Conclusion

This guide covers the essential patterns for building production-ready Netlify Functions with:

- ✅ Proper project structure
- ✅ Scheduled functions (cron jobs)
- ✅ Database integration (Supabase)
- ✅ Push notifications (web-push)
- ✅ Email services (nodemailer)
- ✅ Error handling & logging
- ✅ Performance optimization
- ✅ Local development & testing
- ✅ Deployment & monitoring

For the latest Netlify Functions documentation, visit: [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)

