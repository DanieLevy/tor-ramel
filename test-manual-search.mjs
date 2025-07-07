import dotenv from 'dotenv'
import axios from 'axios'
import chalk from 'chalk'

// Load environment variables
dotenv.config({ path: '.env.local' })

console.log(chalk.bold.green('Testing Manual Search Endpoints\n'))

// Create axios instance with auth cookie
const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
})

// First, we need to login to get auth cookie
async function login() {
  try {
    console.log(chalk.cyan('Logging in...'))
    const response = await axiosInstance.post('/api/auth/login', {
      email: 'daniellofficial@gmail.com',
      password: process.env.TEST_USER_PASSWORD || 'password'
    })
    
    // Extract cookie from response headers
    const cookies = response.headers['set-cookie']
    if (cookies) {
      const authToken = cookies.find(cookie => cookie.includes('auth-token'))
      if (authToken) {
        // Add cookie to axios instance
        axiosInstance.defaults.headers.Cookie = authToken.split(';')[0]
        console.log(chalk.green('✅ Login successful\n'))
        return true
      }
    }
    console.error(chalk.red('❌ No auth token received'))
    return false
  } catch (error) {
    console.error(chalk.red('❌ Login failed:'), error.response?.data || error.message)
    return false
  }
}

// Test single date endpoint
async function testSingleDate(date) {
  console.log(chalk.cyan(`Testing single date: ${date}`))
  
  const startTime = Date.now()
  try {
    const response = await axiosInstance.post('/api/check-appointment', {
      date
    })
    
    const elapsed = Date.now() - startTime
    const { available, times } = response.data
    
    if (available) {
      console.log(chalk.green(`✅ Available: ${times.length} slots in ${elapsed}ms`))
      console.log(chalk.gray(`   Times: ${times.slice(0, 5).join(', ')}${times.length > 5 ? '...' : ''}`))
    } else {
      console.log(chalk.yellow(`❌ No appointments available (${elapsed}ms)`))
    }
    
    return response.data
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error(chalk.red(`❌ Error (${elapsed}ms):`), error.response?.data || error.message)
    return null
  }
}

// Test batch endpoint
async function testBatchEndpoint(dates) {
  console.log(chalk.cyan(`\nTesting batch endpoint with ${dates.length} dates...`))
  
  const startTime = Date.now()
  try {
    const response = await axiosInstance.post('/api/check-appointment/batch', {
      dates
    })
    
    const elapsed = Date.now() - startTime
    const { results } = response.data
    
    console.log(chalk.green(`✅ Batch completed in ${elapsed}ms\n`))
    
    // Summary
    const available = results.filter(r => r.available)
    const errors = results.filter(r => r.error)
    
    console.log(chalk.bold('Summary:'))
    console.log(`  Total dates: ${results.length}`)
    console.log(`  Available: ${available.length}`)
    console.log(`  No appointments: ${results.length - available.length - errors.length}`)
    console.log(`  Errors: ${errors.length}`)
    
    // Show available dates
    if (available.length > 0) {
      console.log(chalk.green('\nAvailable dates:'))
      available.forEach(r => {
        console.log(`  📅 ${r.date}: ${r.times.length} slots`)
      })
    }
    
    // Show errors
    if (errors.length > 0) {
      console.log(chalk.red('\nErrors:'))
      errors.forEach(r => {
        console.log(`  ❌ ${r.date}: ${r.error}`)
      })
    }
    
    return results
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error(chalk.red(`❌ Batch error (${elapsed}ms):`), error.response?.data || error.message)
    return null
  }
}

// Generate dates for testing
function generateTestDates(days) {
  const dates = []
  const today = new Date()
  
  for (let i = 0; i < days * 2; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    
    // Skip Mondays and Saturdays
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 1 && dayOfWeek !== 6) {
      // Format as YYYY-MM-DD
      const dateStr = date.toISOString().split('T')[0]
      dates.push(dateStr)
      
      if (dates.length >= days) break
    }
  }
  
  return dates
}

// Main test function
async function runTests() {
  // Login first
  const loggedIn = await login()
  if (!loggedIn) {
    console.error(chalk.red('Cannot proceed without authentication'))
    process.exit(1)
  }
  
  // Test single dates
  console.log(chalk.bold.blue('\n=== Testing Single Date Endpoint ===\n'))
  const testDates = generateTestDates(3)
  
  for (const date of testDates) {
    await testSingleDate(date)
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Test batch endpoint
  console.log(chalk.bold.blue('\n=== Testing Batch Endpoint ===\n'))
  const batchDates = generateTestDates(14) // Two weeks
  await testBatchEndpoint(batchDates)
  
  console.log(chalk.bold.green('\n✅ All tests completed!'))
}

// Run tests
runTests().catch(error => {
  console.error(chalk.red('Test failed:'), error)
  process.exit(1)
}) 