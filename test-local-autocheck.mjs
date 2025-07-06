import dotenv from 'dotenv'
import chalk from 'chalk'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Import the auto-check module
console.log(chalk.bold.green('Running Local Auto-Check Test\n'))

try {
  console.log(chalk.cyan('Importing auto-check module...'))
  const autoCheckModule = await import('./netlify/functions/auto-check.mjs')
  
  console.log(chalk.cyan('Creating mock request...'))
  const mockRequest = {
    json: async () => ({ 
      next_run: new Date(Date.now() + 5 * 60 * 1000).toISOString() 
    })
  }
  
  console.log(chalk.cyan('Executing auto-check function...\n'))
  const response = await autoCheckModule.default(mockRequest)
  
  const result = await response.json()
  
  console.log(chalk.green('\n✅ Auto-check completed successfully!'))
  console.log(chalk.yellow('\nResults:'))
  console.log(JSON.stringify(result, null, 2))
  
  if (result.data && result.data.appointments) {
    console.log(chalk.bold.cyan('\n📅 Available Appointments:'))
    result.data.appointments.forEach(apt => {
      console.log(chalk.white(`  ${apt.date}: ${apt.times.length} slots - ${apt.times.slice(0, 3).join(', ')}...`))
    })
  }
  
} catch (error) {
  console.error(chalk.red('\n❌ Error running auto-check:'), error.message)
  console.error(error.stack)
} 