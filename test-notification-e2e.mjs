import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import chalk from 'chalk'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Test configuration
const TEST_EMAIL = 'daniellofficial@gmail.com'
const TEST_USER_ID = '4c2a740b-f703-45e8-a54a-a7957acd9c9f'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'
const FUNCTION_URL = 'https://tor-ramel.netlify.app/.netlify/functions/auto-check'

// Test state tracking
const testState = {
  subscriptions: [],
  notifications: [],
  currentStep: 0,
  errors: [],
  startTime: Date.now()
}

// Helper functions
const log = {
  step: (msg) => console.log(chalk.blue.bold(`\n[STEP ${++testState.currentStep}] ${msg}`)),
  info: (msg) => console.log(chalk.cyan(`  ℹ ${msg}`)),
  success: (msg) => console.log(chalk.green(`  ✓ ${msg}`)),
  error: (msg) => {
    console.log(chalk.red(`  ✗ ${msg}`))
    testState.errors.push(msg)
  },
  debug: (msg) => console.log(chalk.gray(`  🔍 ${msg}`)),
  data: (label, data) => console.log(chalk.yellow(`  📊 ${label}:`), JSON.stringify(data, null, 2)),
  table: (data) => console.table(data)
}

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Test Steps

async function step1_cleanupPreviousTests() {
  log.step('Cleaning up previous test data')
  
  try {
    // First get existing test subscriptions
    const { data: existingSubs } = await supabase
      .from('notification_subscriptions')
      .select('id')
      .eq('user_id', TEST_USER_ID)
    
    if (existingSubs && existingSubs.length > 0) {
      // Delete related data first
      await supabase
        .from('notification_queue')
        .delete()
        .in('subscription_id', existingSubs.map(s => s.id))
      
      await supabase
        .from('notified_appointments')
        .delete()
        .in('subscription_id', existingSubs.map(s => s.id))
    }
    
    // Delete test subscriptions
    await supabase
      .from('notification_subscriptions')
      .delete()
      .eq('user_id', TEST_USER_ID)
    
    // Clear ignored times for test user
    await supabase
      .from('ignored_appointment_times')
      .delete()
      .eq('user_id', TEST_USER_ID)
    
    log.success('Cleanup completed')
  } catch (error) {
    log.error(`Cleanup failed: ${error.message}`)
  }
}

async function step2_checkAvailableAppointments() {
  log.step('Checking current available appointments')
  
  const { data: appointments, error } = await supabase
    .from('appointment_checks')
    .select('*')
    .eq('available', true)
    .gte('check_date', new Date().toISOString().split('T')[0])
    .order('check_date')
    .limit(10)
  
  if (error) {
    log.error(`Failed to fetch appointments: ${error.message}`)
    return null
  }
  
  log.success(`Found ${appointments.length} available appointments`)
  
  // Display appointments in a nice table format
  const tableData = appointments.map(apt => ({
    Date: apt.check_date,
    Day: apt.day_name,
    'Available Slots': apt.times.length,
    'Sample Times': apt.times.slice(0, 3).join(', ') + (apt.times.length > 3 ? '...' : '')
  }))
  
  log.table(tableData)
  
  return appointments
}

async function step3_createTestSubscriptions(appointments) {
  log.step('Creating test subscriptions')
  
  if (!appointments || appointments.length < 4) {
    log.error('Not enough appointments to create test subscriptions')
    return false
  }
  
  // Test Case 1: Single date subscription (first available date)
  const singleDateSub = {
    user_id: TEST_USER_ID,
    subscription_date: appointments[0].check_date,
    date_range_start: null,
    date_range_end: null,
    is_active: true,
    created_at: new Date().toISOString()
  }
  
  // Test Case 2: Date range subscription (next 3 available dates)
  const rangeSub = {
    user_id: TEST_USER_ID,
    subscription_date: null,
    date_range_start: appointments[1].check_date,
    date_range_end: appointments[3].check_date,
    is_active: true,
    created_at: new Date().toISOString()
  }
  
  try {
    // Create single date subscription
    const { data: sub1, error: error1 } = await supabase
      .from('notification_subscriptions')
      .insert(singleDateSub)
      .select()
      .single()
    
    if (error1) throw error1
    testState.subscriptions.push(sub1)
    log.success(`Created single date subscription for ${singleDateSub.subscription_date}`)
    log.debug(`Subscription ID: ${sub1.id}`)
    
    // Create range subscription
    const { data: sub2, error: error2 } = await supabase
      .from('notification_subscriptions')
      .insert(rangeSub)
      .select()
      .single()
    
    if (error2) throw error2
    testState.subscriptions.push(sub2)
    log.success(`Created range subscription from ${rangeSub.date_range_start} to ${rangeSub.date_range_end}`)
    log.debug(`Subscription ID: ${sub2.id}`)
    
    return true
  } catch (error) {
    log.error(`Failed to create subscriptions: ${error.message}`)
    return false
  }
}

async function step4_triggerAutoCheck() {
  log.step('Triggering auto-check function')
  
  try {
    log.info('Calling Netlify function...')
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })
    
    const responseText = await response.text()
    
    // Check if response is JSON
    let result
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      // If not JSON, it's likely an error page
      log.error(`Function returned non-JSON response: ${responseText.substring(0, 100)}...`)
      log.info('This might be due to the function being scheduled-only. Continuing with test...')
      return true // Continue anyway for demo
    }
    
    if (!response.ok) {
      throw new Error(`Function returned ${response.status}: ${result.error || responseText}`)
    }
    
    log.success(`Auto-check completed in ${result.executionTime}s`)
    log.info(`Checked ${result.data.totalChecked} dates, found ${result.data.appointmentCount} with availability`)
    
    return result.success
  } catch (error) {
    log.error(`Auto-check failed: ${error.message}`)
    log.info('Note: The function might be restricted to scheduled runs only')
    log.info('Continuing with test to demonstrate the notification flow...')
    return true // Continue anyway for demo
  }
}

async function step5_verifyNotificationQueue() {
  log.step('Verifying notification queue')
  
  await delay(2000) // Wait for database updates
  
  const { data: queueItems, error } = await supabase
    .from('notification_queue')
    .select(`
      *,
      subscription:notification_subscriptions(*)
    `)
    .in('subscription_id', testState.subscriptions.map(s => s.id))
    .order('created_at')
  
  if (error) {
    log.error(`Failed to fetch queue: ${error.message}`)
    return false
  }
  
  log.success(`Found ${queueItems.length} notifications in queue`)
  
  queueItems.forEach(item => {
    log.info(`📅 ${item.appointment_date}: ${item.new_times.length} times available`)
    log.debug(`Status: ${item.status}, Subscription type: ${item.subscription.subscription_date ? 'Single' : 'Range'}`)
    testState.notifications.push(item)
  })
  
  // Check if notifications are processed
  const pendingCount = queueItems.filter(n => n.status === 'pending').length
  const sentCount = queueItems.filter(n => n.status === 'sent').length
  
  log.info(`Queue status: ${pendingCount} pending, ${sentCount} sent`)
  
  return queueItems.length > 0
}

async function step6_waitForEmailProcessing() {
  log.step('Waiting for email processing')
  
  log.info('Notifications should be processed by the auto-check function...')
  
  // Poll for sent notifications
  let attempts = 0;
  let sentNotifications = [];
  
  while (attempts < 6 && sentNotifications.length === 0) {
    await delay(5000) // Wait 5 seconds between checks
    
    const { data, error } = await supabase
      .from('notified_appointments')
      .select('*')
      .in('subscription_id', testState.subscriptions.map(s => s.id))
      .order('notification_sent_at', { ascending: false })
    
    if (!error && data) {
      sentNotifications = data
    }
    
    attempts++
    log.debug(`Check ${attempts}: ${sentNotifications.length} emails sent`)
  }
  
  if (sentNotifications.length > 0) {
    log.success(`${sentNotifications.length} notification emails sent!`)
    sentNotifications.forEach(notif => {
      log.info(`📧 Sent for ${notif.appointment_date} at ${new Date(notif.notification_sent_at).toLocaleTimeString('he-IL')}`)
      log.debug(`Times notified: ${notif.notified_times.slice(0, 5).join(', ')}${notif.notified_times.length > 5 ? '...' : ''}`)
    })
    
    log.info(chalk.bold.magenta(`\n  📧 Check your email (${TEST_EMAIL}) for notification emails!`))
    return true
  } else {
    log.error('No emails were sent within 30 seconds')
    return false
  }
}

async function step7_displayEmailLinks() {
  log.step('Displaying test links from emails')
  
  if (testState.notifications.length === 0) {
    log.error('No notifications to display links for')
    return false
  }
  
  log.info('You should have received emails with the following action links:\n')
  
  testState.notifications.forEach((notif, index) => {
    const times = notif.new_times.join(',')
    const date = notif.appointment_date
    const subId = notif.subscription_id
    
    console.log(chalk.bold.white(`  Email ${index + 1} - Date: ${date}`))
    console.log(chalk.green(`  ✅ Approve: ${BASE_URL}/notification-action?action=approve&subscription=${subId}&times=${encodeURIComponent(times)}&date=${date}`))
    console.log(chalk.yellow(`  ❌ Decline: ${BASE_URL}/notification-action?action=decline&subscription=${subId}&times=${encodeURIComponent(times)}&date=${date}`))
    console.log('')
  })
  
  return true
}

async function step8_testApproveAction() {
  log.step('Testing APPROVE action via API')
  
  if (testState.notifications.length === 0) {
    log.error('No notifications to test')
    return false
  }
  
  const notification = testState.notifications[0]
  const subscription = testState.subscriptions.find(s => s.id === notification.subscription_id)
  
  try {
    log.info(`Testing approve for subscription ${subscription.id}`)
    
    // Call the API endpoint directly
    const response = await fetch(`${BASE_URL}/api/notifications/action`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `auth-email=${TEST_EMAIL}; auth-userId=${TEST_USER_ID}`
      },
      body: JSON.stringify({
        action: 'approve',
        subscriptionId: subscription.id
      })
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || `API returned ${response.status}`)
    }
    
    log.success('Approve action completed')
    log.data('API Response', result)
    
    // Verify subscription is marked as inactive
    const { data: updatedSub, error } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('id', subscription.id)
      .single()
    
    if (error) throw error
    
    log.success(`Subscription is now inactive: ${!updatedSub.is_active}`)
    
    return !updatedSub.is_active
  } catch (error) {
    log.error(`Approve action failed: ${error.message}`)
    return false
  }
}

async function step9_testDeclineAction() {
  log.step('Testing DECLINE action via API')
  
  // Use second subscription for decline test
  if (testState.subscriptions.length < 2) {
    log.error('Need at least 2 subscriptions for decline test')
    return false
  }
  
  const subscription = testState.subscriptions[1]
  const notification = testState.notifications.find(n => n.subscription_id === subscription.id)
  
  if (!notification) {
    log.error('No notification found for second subscription')
    return false
  }
  
  try {
    // First, reactivate the subscription for testing
    await supabase
      .from('notification_subscriptions')
      .update({ is_active: true })
      .eq('id', subscription.id)
    
    log.info(`Testing decline for subscription ${subscription.id}`)
    log.debug(`Declining times: ${notification.new_times.slice(0, 3).join(', ')}`)
    
    // Call the API endpoint
    const response = await fetch(`${BASE_URL}/api/notifications/action`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `auth-email=${TEST_EMAIL}; auth-userId=${TEST_USER_ID}`
      },
      body: JSON.stringify({
        action: 'decline',
        subscriptionId: subscription.id,
        times: notification.new_times.slice(0, 3), // Decline first 3 times
        date: notification.appointment_date
      })
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || `API returned ${response.status}`)
    }
    
    log.success('Decline action completed')
    log.data('API Response', result)
    
    // Verify ignored times were saved
    const { data: ignoredTimes, error } = await supabase
      .from('ignored_appointment_times')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .eq('appointment_date', notification.appointment_date)
    
    if (error) throw error
    
    log.success(`Ignored times saved: ${ignoredTimes.length > 0}`)
    if (ignoredTimes.length > 0) {
      log.info(`Times marked as ignored: ${ignoredTimes[0].ignored_times.join(', ')}`)
    }
    
    return ignoredTimes.length > 0
  } catch (error) {
    log.error(`Decline action failed: ${error.message}`)
    return false
  }
}

async function step10_verifyDatabaseState() {
  log.step('Verifying final database state')
  
  log.info('Checking all database tables for consistency...')
  
  // Check subscriptions
  const { data: subs } = await supabase
    .from('notification_subscriptions')
    .select('*')
    .in('id', testState.subscriptions.map(s => s.id))
  
  log.info('Subscriptions:')
  subs.forEach(sub => {
    log.debug(`  ${sub.id}: Active=${sub.is_active}, Type=${sub.subscription_date ? 'Single' : 'Range'}`)
  })
  
  // Check notification queue
  const { data: queue } = await supabase
    .from('notification_queue')
    .select('*')
    .in('subscription_id', testState.subscriptions.map(s => s.id))
  
  log.info(`Notification queue: ${queue.length} items`)
  
  // Check sent notifications
  const { data: sent } = await supabase
    .from('notified_appointments')
    .select('*')
    .in('subscription_id', testState.subscriptions.map(s => s.id))
  
  log.info(`Sent notifications: ${sent.length} items`)
  
  // Check ignored times
  const { data: ignored } = await supabase
    .from('ignored_appointment_times')
    .select('*')
    .eq('user_id', TEST_USER_ID)
  
  log.info(`Ignored times: ${ignored.length} entries`)
  
  return true
}

async function step11_generateTestReport() {
  log.step('Generating test report')
  
  const endTime = Date.now()
  const duration = Math.round((endTime - testState.startTime) / 1000)
  
  const report = {
    timestamp: new Date().toISOString(),
    duration: `${duration} seconds`,
    email: TEST_EMAIL,
    totalSteps: testState.currentStep,
    subscriptionsCreated: testState.subscriptions.length,
    notificationsProcessed: testState.notifications.length,
    errors: testState.errors.length,
    errorDetails: testState.errors
  }
  
  console.log(chalk.bold.yellow('\n╔════════════════════════════════════════════════╗'))
  console.log(chalk.bold.yellow('║              📋 TEST SUMMARY                   ║'))
  console.log(chalk.bold.yellow('╚════════════════════════════════════════════════╝'))
  
  console.log(chalk.white(`  Duration: ${report.duration}`))
  console.log(chalk.white(`  Total Steps: ${report.totalSteps}`))
  console.log(chalk.white(`  Subscriptions Created: ${report.subscriptionsCreated}`))
  console.log(chalk.white(`  Notifications Processed: ${report.notificationsProcessed}`))
  console.log(chalk.white(`  Errors: ${report.errors}`))
  
  if (report.errors > 0) {
    console.log(chalk.red('\n  ❌ Errors encountered:'))
    report.errorDetails.forEach(err => console.log(chalk.red(`    - ${err}`)))
  } else {
    console.log(chalk.green('\n  ✅ All tests passed successfully!'))
  }
  
  return report
}

// Main test runner
async function runEndToEndTest() {
  console.log(chalk.bold.green(`
╔════════════════════════════════════════════════════════════╗
║       TOR-RAMEL NOTIFICATION SYSTEM E2E TEST               ║
║                                                            ║
║  Email: ${TEST_EMAIL.padEnd(42)} ║
║  Time: ${new Date().toLocaleString('he-IL').padEnd(43)} ║
╚════════════════════════════════════════════════════════════╝
  `))
  
  try {
    // Run all test steps
    await step1_cleanupPreviousTests()
    
    const appointments = await step2_checkAvailableAppointments()
    if (!appointments || appointments.length === 0) {
      throw new Error('No appointments available for testing')
    }
    
    const subsCreated = await step3_createTestSubscriptions(appointments)
    if (!subsCreated) throw new Error('Failed to create test subscriptions')
    
    const autoCheckSuccess = await step4_triggerAutoCheck()
    if (!autoCheckSuccess) throw new Error('Auto-check failed')
    
    const queueVerified = await step5_verifyNotificationQueue()
    if (!queueVerified) throw new Error('No notifications queued')
    
    const emailsSent = await step6_waitForEmailProcessing()
    if (!emailsSent) {
      log.error('Warning: Emails may not have been sent')
    }
    
    await step7_displayEmailLinks()
    
    // Wait for user input
    console.log(chalk.bold.yellow(`\n⏸️  Please check your email and click on the links to test`))
    console.log(chalk.yellow('   Or press Enter to test the actions via API...'))
    
    // Simple readline to wait for Enter
    await new Promise(resolve => {
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.once('data', () => {
        process.stdin.setRawMode(false)
        process.stdin.pause()
        resolve()
      })
    })
    
    const approveSuccess = await step8_testApproveAction()
    if (!approveSuccess) log.error('Approve action test failed')
    
    await delay(2000)
    
    const declineSuccess = await step9_testDeclineAction()
    if (!declineSuccess) log.error('Decline action test failed')
    
    await step10_verifyDatabaseState()
    
    const report = await step11_generateTestReport()
    
    if (testState.errors.length === 0) {
      console.log(chalk.bold.green(`\n✅ E2E TEST COMPLETED SUCCESSFULLY!`))
    } else {
      console.log(chalk.bold.red(`\n❌ E2E TEST COMPLETED WITH ERRORS`))
    }
    
  } catch (error) {
    console.log(chalk.bold.red(`\n❌ E2E TEST FAILED!`))
    log.error(`Fatal error: ${error.message}`)
    console.error(error.stack)
  } finally {
    // Cleanup
    console.log(chalk.gray('\n🧹 Cleaning up test data...'))
    await step1_cleanupPreviousTests()
    process.exit(testState.errors.length > 0 ? 1 : 0)
  }
}

// Check if we have required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(chalk.red('Missing required environment variables!'))
  console.error(chalk.red('Please ensure .env.local contains SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'))
  process.exit(1)
}

// Run the test
console.log(chalk.gray('Starting test suite...'))
runEndToEndTest().catch(console.error) 