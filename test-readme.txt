TOR-RAMEL NOTIFICATION SYSTEM E2E TEST
======================================

This comprehensive test suite validates the entire notification system end-to-end.

FEATURES TESTED:
- Auto-check function execution
- Real appointment availability checking
- Single date subscriptions
- Date range subscriptions
- Notification queue processing
- Email sending (to daniellofficial@gmail.com)
- Approve action (marks subscription as inactive)
- Decline action (stores ignored times)
- Database state verification

PREREQUISITES:
1. Ensure .env.local contains all required environment variables
2. The auto-check function should be deployed to Netlify
3. You should have access to the test email (daniellofficial@gmail.com)

HOW TO RUN:

1. Install dependencies:
   npm install --no-save @supabase/supabase-js chalk dotenv node-fetch

2. Run the test:
   node test-notification-e2e.mjs

3. The test will:
   - Clean up any previous test data
   - Check current available appointments
   - Create test subscriptions based on real data
   - Trigger the auto-check function
   - Wait for email processing
   - Display the email action links
   - Wait for you to check your email
   - Test approve/decline actions via API
   - Verify database state
   - Generate a comprehensive report

WHAT TO EXPECT:
- You will receive 2-3 notification emails at daniellofficial@gmail.com
- Each email will contain appointment times and action buttons
- The test will pause and wait for you to check the emails
- You can either click the links in the email OR press Enter to test via API
- The test will verify all database updates are correct

DEBUGGING:
- All steps are logged with colored output
- Database queries show real-time state
- Errors are collected and reported at the end
- The test performs cleanup before and after execution

DURATION: ~2-3 minutes 