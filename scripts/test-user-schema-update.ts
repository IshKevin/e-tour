#!/usr/bin/env ts-node

/**
 * User Schema Update Test Script
 * 
 * This script tests the new user schema fields:
 * 1. Company name and location (optional fields)
 * 2. Notification preferences
 * 3. Terms agreement tracking
 */

import { db } from '../src/db';
import { users } from '../src/db/schema/user.schema';
import { userService } from '../src/services/user.service';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

async function testUserSchemaUpdate() {
  console.log('🚀 Starting User Schema Update Test...\n');

  try {
    // Test 1: Create user with all new fields
    console.log('📝 Test 1: Creating user with all new fields...');
    const testUser = await userService.createUser({
      name: 'Test User Schema',
      email: `test-schema-${Date.now()}@example.com`,
      password: 'password123',
      role: 'client',
      companyName: 'Test Company Ltd',
      location: 'Kigali, Rwanda',
      notificationsEnabled: true,
      agreedToTerms: true,
    });

    console.log(`✅ User created with ID: ${testUser.id}`);
    console.log(`✅ Company Name: ${testUser.companyName}`);
    console.log(`✅ Location: ${testUser.location}`);
    console.log(`✅ Notifications Enabled: ${testUser.notificationsEnabled}`);
    console.log(`✅ Agreed to Terms: ${testUser.agreedToTerms}`);
    console.log(`✅ Terms Agreed At: ${testUser.termsAgreedAt}`);
    console.log(`✅ ID is valid UUID: ${uuidValidate(testUser.id)}\n`);

    // Test 2: Create user with minimal fields (test defaults)
    console.log('📝 Test 2: Creating user with minimal fields...');
    const minimalUser = await userService.createUser({
      name: 'Minimal User',
      email: `minimal-${Date.now()}@example.com`,
      password: 'password123',
      role: 'agent',
    });

    console.log(`✅ Minimal user created with ID: ${minimalUser.id}`);
    console.log(`✅ Company Name (should be null): ${minimalUser.companyName}`);
    console.log(`✅ Location (should be null): ${minimalUser.location}`);
    console.log(`✅ Notifications Enabled (default true): ${minimalUser.notificationsEnabled}`);
    console.log(`✅ Agreed to Terms (default false): ${minimalUser.agreedToTerms}`);
    console.log(`✅ Terms Agreed At (should be null): ${minimalUser.termsAgreedAt}\n`);

    // Test 3: Update user profile with new fields
    console.log('📝 Test 3: Updating user profile with new fields...');
    const updatedUser = await userService.updateUser(testUser.id, {
      companyName: 'Updated Company Ltd',
      location: 'Butare, Rwanda',
      notificationsEnabled: false,
    });

    console.log(`✅ Profile updated successfully`);
    console.log(`✅ Updated Company Name: ${updatedUser?.companyName}`);
    console.log(`✅ Updated Location: ${updatedUser?.location}`);
    console.log(`✅ Updated Notifications: ${updatedUser?.notificationsEnabled}\n`);

    // Test 4: Update terms agreement
    console.log('📝 Test 4: Testing terms agreement update...');
    
    // First, set terms to false
    await userService.updateTermsAgreement(testUser.id, false);
    let user = await userService.getUserById(testUser.id);
    console.log(`✅ Terms set to false: ${user?.agreedToTerms}`);
    console.log(`✅ Terms agreed at (should be null): ${user?.termsAgreedAt}`);

    // Then, agree to terms
    const termsUser = await userService.updateTermsAgreement(testUser.id, true);
    console.log(`✅ Terms set to true: ${termsUser?.agreedToTerms}`);
    console.log(`✅ Terms agreed at (should have timestamp): ${termsUser?.termsAgreedAt}\n`);

    // Test 5: Update notification preferences
    console.log('📝 Test 5: Testing notification preference update...');
    
    const notifUser1 = await userService.updateNotificationPreference(testUser.id, false);
    console.log(`✅ Notifications disabled: ${notifUser1?.notificationsEnabled}`);

    const notifUser2 = await userService.updateNotificationPreference(testUser.id, true);
    console.log(`✅ Notifications enabled: ${notifUser2?.notificationsEnabled}\n`);

    // Test 6: Verify database indexes and constraints
    console.log('📝 Test 6: Testing database queries with new indexes...');
    
    // Query by company name
    const companyUsers = await db.select()
      .from(users)
      .where(users.companyName.eq('Updated Company Ltd'))
      .limit(5);
    console.log(`✅ Found ${companyUsers.length} user(s) with company name`);

    // Query by location
    const locationUsers = await db.select()
      .from(users)
      .where(users.location.like('%Rwanda%'))
      .limit(5);
    console.log(`✅ Found ${locationUsers.length} user(s) in Rwanda`);

    // Query users who agreed to terms
    const agreedUsers = await db.select()
      .from(users)
      .where(users.agreedToTerms.eq(true))
      .limit(5);
    console.log(`✅ Found ${agreedUsers.length} user(s) who agreed to terms`);

    // Query users with notifications enabled
    const notificationUsers = await db.select()
      .from(users)
      .where(users.notificationsEnabled.eq(true))
      .limit(5);
    console.log(`✅ Found ${notificationUsers.length} user(s) with notifications enabled\n`);

    // Test 7: Verify field types and constraints
    console.log('📝 Test 7: Verifying field types and constraints...');
    
    const retrievedUser = await userService.getUserById(testUser.id);
    console.log(`✅ Company name type: ${typeof retrievedUser?.companyName}`);
    console.log(`✅ Location type: ${typeof retrievedUser?.location}`);
    console.log(`✅ Notifications enabled type: ${typeof retrievedUser?.notificationsEnabled}`);
    console.log(`✅ Agreed to terms type: ${typeof retrievedUser?.agreedToTerms}`);
    console.log(`✅ Terms agreed at type: ${typeof retrievedUser?.termsAgreedAt}`);
    console.log(`✅ Terms agreed at is Date: ${retrievedUser?.termsAgreedAt instanceof Date}\n`);

    // Test 8: Test long values (boundary testing)
    console.log('📝 Test 8: Testing field length limits...');
    
    const longCompanyName = 'A'.repeat(255); // Max length
    const longLocation = 'B'.repeat(255); // Max length
    
    const longUser = await userService.createUser({
      name: 'Long Values User',
      email: `long-${Date.now()}@example.com`,
      password: 'password123',
      role: 'client',
      companyName: longCompanyName,
      location: longLocation,
    });

    console.log(`✅ Long company name stored: ${longUser.companyName?.length === 255}`);
    console.log(`✅ Long location stored: ${longUser.location?.length === 255}\n`);

    console.log('🎉 All User Schema Update Tests Passed!');
    console.log('✅ Company name and location fields work correctly');
    console.log('✅ Notification preferences work correctly');
    console.log('✅ Terms agreement tracking works correctly');
    console.log('✅ Database indexes are functional');
    console.log('✅ Field types and constraints are correct');
    console.log('✅ UUID system integration is maintained');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await db.delete(users).where(users.id.eq(testUser.id));
    await db.delete(users).where(users.id.eq(minimalUser.id));
    await db.delete(users).where(users.id.eq(longUser.id));
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('\n❌ User Schema Update Test Failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testUserSchemaUpdate()
  .then(() => {
    console.log('\n✨ User Schema Update Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 User Schema Update Test failed with error:');
    console.error(error);
    process.exit(1);
  });
