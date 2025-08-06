/**
 * Debug script for email verification issues
 * Run this script to test the email verification flow
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function debugEmailVerification() {
  console.log('🔍 Starting email verification debug...\n');

  try {
    // Step 1: Register a new user
    console.log('📝 Step 1: Registering a new user...');
    const userData = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      role: 'client'
    };

    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, userData);
    console.log('✅ Registration successful');
    console.log('User ID:', registerResponse.data.data.id);
    console.log('Email sent:', registerResponse.data.data.emailSent);
    
    const userId = registerResponse.data.data.id;
    
    // Step 2: Check server logs for the verification code
    console.log('\n🔑 Step 2: Check your server console logs for the verification code');
    console.log('Look for a log message like: "Generated verification code: XXXXXX"');
    
    // Prompt user to enter the code
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const verificationCode = await new Promise((resolve) => {
      rl.question('Enter the verification code from server logs: ', (answer) => {
        resolve(answer.trim().toUpperCase());
      });
    });
    rl.close();

    // Step 3: Verify the email
    console.log('\n📧 Step 3: Verifying email...');
    const verifyData = {
      userId: userId,
      code: verificationCode
    };

    console.log('Sending verification request with:', verifyData);

    const verifyResponse = await axios.post(`${BASE_URL}/auth/verify-email`, verifyData);
    console.log('✅ Email verification successful!');
    console.log('Response:', verifyResponse.data);

  } catch (error) {
    console.error('❌ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Alternative function to test with existing user
async function testExistingUser() {
  console.log('🔍 Testing with existing user...\n');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const email = await new Promise((resolve) => {
      rl.question('Enter user email: ', (answer) => {
        resolve(answer.trim());
      });
    });

    // Resend verification email
    console.log('\n📧 Resending verification email...');
    const resendResponse = await axios.post(`${BASE_URL}/auth/resend-verification`, { email });
    console.log('✅ Verification email sent');
    console.log('Response:', resendResponse.data);

    const userId = await new Promise((resolve) => {
      rl.question('Enter user ID: ', (answer) => {
        resolve(answer.trim());
      });
    });

    const verificationCode = await new Promise((resolve) => {
      rl.question('Enter verification code from server logs: ', (answer) => {
        resolve(answer.trim().toUpperCase());
      });
    });

    // Verify email
    console.log('\n🔍 Verifying email...');
    const verifyData = {
      userId: userId,
      code: verificationCode
    };

    console.log('Sending verification request with:', verifyData);

    const verifyResponse = await axios.post(`${BASE_URL}/auth/verify-email`, verifyData);
    console.log('✅ Email verification successful!');
    console.log('Response:', verifyResponse.data);

  } catch (error) {
    console.error('❌ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    rl.close();
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.includes('--existing')) {
  testExistingUser();
} else {
  debugEmailVerification();
}
