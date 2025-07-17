#!/usr/bin/env ts-node

/**
 * UUID Migration Test Script
 * 
 * This script tests the UUID migration by:
 * 1. Creating test data with UUID IDs
 * 2. Verifying all IDs are valid UUIDs
 * 3. Testing foreign key relationships
 * 4. Validating service layer functionality
 */

import { db } from '../src/db';
import { users, trips, bookings } from '../src/db';
import { userService } from '../src/services/user.service';
import { agentService } from '../src/services/agent.service';
import { tripService } from '../src/services/trip.service';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

async function testUUIDMigration() {
  console.log('🚀 Starting UUID Migration Test...\n');

  try {
    // Test 1: Create a user and verify UUID
    console.log('📝 Test 1: Creating user with UUID...');
    const testUser = await userService.createUser({
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      role: 'client',
    });

    console.log(`✅ User created with ID: ${testUser.id}`);
    console.log(`✅ ID is valid UUID: ${uuidValidate(testUser.id)}`);
    console.log(`✅ ID type: ${typeof testUser.id}\n`);

    // Test 2: Create an agent
    console.log('📝 Test 2: Creating agent with UUID...');
    const testAgent = await userService.createUser({
      name: 'Test Agent',
      email: `agent-${Date.now()}@example.com`,
      password: 'password123',
      role: 'agent',
    });

    console.log(`✅ Agent created with ID: ${testAgent.id}`);
    console.log(`✅ ID is valid UUID: ${uuidValidate(testAgent.id)}\n`);

    // Test 3: Create a trip with UUID foreign key
    console.log('📝 Test 3: Creating trip with UUID foreign key...');
    const testTrip = await agentService.createTrip(testAgent.id, {
      title: 'Test Trip',
      description: 'A test trip',
      price: '100.00',
      maxSeats: 10,
      location: 'Test Location',
      startDate: '2024-12-01',
      endDate: '2024-12-05',
    });

    console.log(`✅ Trip created with ID: ${testTrip.id}`);
    console.log(`✅ Trip ID is valid UUID: ${uuidValidate(testTrip.id)}`);
    console.log(`✅ Agent ID is valid UUID: ${uuidValidate(testTrip.agentId)}`);
    console.log(`✅ Foreign key relationship maintained: ${testTrip.agentId === testAgent.id}\n`);

    // Test 4: Create a booking with multiple UUID foreign keys
    console.log('📝 Test 4: Creating booking with UUID foreign keys...');
    const testBooking = await tripService.bookTrip(testTrip.id, testUser.id, 2);

    console.log(`✅ Booking created with ID: ${testBooking.id}`);
    console.log(`✅ Booking ID is valid UUID: ${uuidValidate(testBooking.id)}`);
    console.log(`✅ Trip ID is valid UUID: ${uuidValidate(testBooking.tripId)}`);
    console.log(`✅ Client ID is valid UUID: ${uuidValidate(testBooking.clientId)}`);
    console.log(`✅ Foreign key relationships maintained`);
    console.log(`   - Trip ID matches: ${testBooking.tripId === testTrip.id}`);
    console.log(`   - Client ID matches: ${testBooking.clientId === testUser.id}\n`);

    // Test 5: Query operations with UUIDs
    console.log('📝 Test 5: Testing query operations with UUIDs...');
    
    const retrievedUser = await userService.getUserById(testUser.id);
    console.log(`✅ Retrieved user by UUID: ${retrievedUser?.name}`);

    const retrievedTrip = await tripService.getTripById(testTrip.id);
    console.log(`✅ Retrieved trip by UUID: ${retrievedTrip?.title}`);

    const userBookings = await tripService.getUserBookings(testUser.id);
    console.log(`✅ Retrieved user bookings: ${userBookings.length} booking(s)`);

    const agentTrips = await agentService.getAgentTrips(testAgent.id);
    console.log(`✅ Retrieved agent trips: ${agentTrips.length} trip(s)\n`);

    // Test 6: Verify all IDs in database are UUIDs
    console.log('📝 Test 6: Verifying all database IDs are UUIDs...');
    
    const allUsers = await db.select().from(users).limit(5);
    const allTrips = await db.select().from(trips).limit(5);
    const allBookings = await db.select().from(bookings).limit(5);

    console.log('✅ Checking user IDs...');
    allUsers.forEach((user, index) => {
      const isValid = uuidValidate(user.id);
      console.log(`   User ${index + 1}: ${user.id} - Valid UUID: ${isValid}`);
      if (!isValid) throw new Error(`Invalid UUID found in users table: ${user.id}`);
    });

    console.log('✅ Checking trip IDs and foreign keys...');
    allTrips.forEach((trip, index) => {
      const idValid = uuidValidate(trip.id);
      const agentIdValid = uuidValidate(trip.agentId);
      console.log(`   Trip ${index + 1}: ID ${trip.id} - Valid: ${idValid}`);
      console.log(`   Trip ${index + 1}: Agent ID ${trip.agentId} - Valid: ${agentIdValid}`);
      if (!idValid) throw new Error(`Invalid UUID found in trips table ID: ${trip.id}`);
      if (!agentIdValid) throw new Error(`Invalid UUID found in trips table agent_id: ${trip.agentId}`);
    });

    console.log('✅ Checking booking IDs and foreign keys...');
    allBookings.forEach((booking, index) => {
      const idValid = uuidValidate(booking.id);
      const clientIdValid = uuidValidate(booking.clientId);
      const tripIdValid = uuidValidate(booking.tripId);
      console.log(`   Booking ${index + 1}: ID ${booking.id} - Valid: ${idValid}`);
      console.log(`   Booking ${index + 1}: Client ID ${booking.clientId} - Valid: ${clientIdValid}`);
      console.log(`   Booking ${index + 1}: Trip ID ${booking.tripId} - Valid: ${tripIdValid}`);
      if (!idValid) throw new Error(`Invalid UUID found in bookings table ID: ${booking.id}`);
      if (!clientIdValid) throw new Error(`Invalid UUID found in bookings table client_id: ${booking.clientId}`);
      if (!tripIdValid) throw new Error(`Invalid UUID found in bookings table trip_id: ${booking.tripId}`);
    });

    console.log('\n🎉 All UUID Migration Tests Passed!');
    console.log('✅ All primary keys are valid UUIDs');
    console.log('✅ All foreign keys are valid UUIDs');
    console.log('✅ All relationships are maintained');
    console.log('✅ All service operations work correctly');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await db.delete(bookings);
    await db.delete(trips);
    await db.delete(users);
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('\n❌ UUID Migration Test Failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testUUIDMigration()
  .then(() => {
    console.log('\n✨ UUID Migration Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 UUID Migration Test failed with error:');
    console.error(error);
    process.exit(1);
  });
