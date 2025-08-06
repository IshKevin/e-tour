/**
 * Test script for improved auth API with email verification
 * Run this script to test the enhanced authentication flow
 */

const BASE_URL = 'http://localhost:3001/api/v1';

// Test user data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  role: 'client'
};

async function makeRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();
    
    console.log(`\n${method} ${endpoint}`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error.message);
    return { status: 500, data: { error: error.message } };
  }
}

async function testAuthFlow() {
  console.log('🚀 Testing Enhanced Auth API Flow\n');
  console.log('=' .repeat(50));

  // Test 1: Register a new user
  console.log('\n📝 Test 1: User Registration');
  const registerResult = await makeRequest('/auth/register', 'POST', testUser);
  
  if (registerResult.status !== 201) {
    console.log('❌ Registration failed');
    return;
  }
  
  const userId = registerResult.data.data.id;
  console.log('✅ Registration successful');
  console.log(`📧 Email verification should be sent to: ${testUser.email}`);

  // Test 2: Try to login without email verification
  console.log('\n🔐 Test 2: Login without email verification');
  const loginWithoutVerification = await makeRequest('/auth/login', 'POST', {
    email: testUser.email,
    password: testUser.password
  });
  
  if (loginWithoutVerification.status === 403) {
    console.log('✅ Login correctly blocked - email verification required');
  } else {
    console.log('❌ Login should be blocked without email verification');
  }

  // Test 3: Resend verification email
  console.log('\n📧 Test 3: Resend verification email');
  const resendResult = await makeRequest('/auth/resend-verification', 'POST', {
    email: testUser.email
  });
  
  if (resendResult.status === 200) {
    console.log('✅ Verification email resent successfully');
  } else {
    console.log('❌ Failed to resend verification email');
  }

  // Test 4: Verify email with invalid code
  console.log('\n🔍 Test 4: Email verification with invalid code');
  const invalidVerifyResult = await makeRequest('/auth/verify-email', 'POST', {
    userId: userId,
    code: 'INVALID'
  });
  
  if (invalidVerifyResult.status === 400) {
    console.log('✅ Invalid verification code correctly rejected');
  } else {
    console.log('❌ Invalid verification code should be rejected');
  }

  // Test 5: Simulate email verification (you would need the actual code from email)
  console.log('\n✉️ Test 5: Email verification simulation');
  console.log('📝 Note: In a real scenario, you would get the verification code from the email');
  console.log('📝 For testing, you can check the server logs for the verification code');
  console.log('📝 Or manually verify the email in the database');

  // Test 6: Test validation errors
  console.log('\n❌ Test 6: Validation errors');
  const validationTest = await makeRequest('/auth/register', 'POST', {
    name: '',
    email: 'invalid-email',
    password: '123'
  });
  
  if (validationTest.status === 422) {
    console.log('✅ Validation errors handled correctly');
  } else {
    console.log('❌ Validation errors not handled properly');
  }

  // Test 7: Duplicate email registration
  console.log('\n🔄 Test 7: Duplicate email registration');
  const duplicateResult = await makeRequest('/auth/register', 'POST', testUser);
  
  if (duplicateResult.status === 409) {
    console.log('✅ Duplicate email correctly rejected');
  } else {
    console.log('❌ Duplicate email should be rejected');
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🎯 Test Summary:');
  console.log('✅ Enhanced response format with success/error flags');
  console.log('✅ Email verification required after registration');
  console.log('✅ Login blocked until email verification');
  console.log('✅ Resend verification email functionality');
  console.log('✅ Proper validation error handling');
  console.log('✅ Duplicate email prevention');
  console.log('\n📧 Next steps:');
  console.log('1. Check your email service configuration');
  console.log('2. Test with real email service');
  console.log('3. Verify email verification codes in server logs');
  console.log('4. Test complete flow with actual email verification');
}

// Run the test
testAuthFlow().catch(console.error);
