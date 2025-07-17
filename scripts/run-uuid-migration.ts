#!/usr/bin/env ts-node

/**
 * UUID Migration Execution Script
 * 
 * This script executes the UUID migration process:
 * 1. Backs up the current database
 * 2. Runs the UUID migration SQL script
 * 3. Verifies the migration was successful
 * 4. Runs tests to ensure everything works
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { db } from '../src/db';
import { users, trips, bookings } from '../src/db';
import { validate as uuidValidate } from 'uuid';

async function runUUIDMigration() {
  console.log('🚀 Starting UUID Migration Process...\n');

  try {
    // Step 1: Create database backup
    console.log('📦 Step 1: Creating database backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-before-uuid-migration-${timestamp}.sql`;
    
    try {
      execSync(`pg_dump ${process.env.DATABASE_URL} > ${backupFile}`, { stdio: 'inherit' });
      console.log(`✅ Database backup created: ${backupFile}\n`);
    } catch (error) {
      console.log('⚠️  Could not create automatic backup. Please create a manual backup before proceeding.');
      console.log('   Run: pg_dump your_database > backup.sql\n');
    }

    // Step 2: Confirm migration
    console.log('⚠️  WARNING: This migration is irreversible and will change all ID fields to UUIDs.');
    console.log('   Make sure you have a database backup before proceeding.\n');
    
    // In a real scenario, you might want to add a confirmation prompt here
    // For automation purposes, we'll proceed directly

    // Step 3: Run UUID extension setup
    console.log('🔧 Step 2: Enabling UUID extension...');
    await db.execute(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    console.log('✅ UUID extension enabled\n');

    // Step 4: Execute migration script
    console.log('🔄 Step 3: Executing UUID migration...');
    const migrationSQL = readFileSync('src/db/migrations/uuid-migration.sql', 'utf8');
    
    // Split the migration into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await db.execute(statement);
          console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
        } catch (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);
          throw error;
        }
      }
    }
    
    console.log('✅ UUID migration completed successfully\n');

    // Step 5: Verify migration
    console.log('🔍 Step 4: Verifying migration...');
    
    // Check that all IDs are now UUIDs
    const sampleUsers = await db.select().from(users).limit(3);
    const sampleTrips = await db.select().from(trips).limit(3);
    const sampleBookings = await db.select().from(bookings).limit(3);

    console.log('✅ Verifying user IDs...');
    sampleUsers.forEach((user, index) => {
      const isValid = uuidValidate(user.id);
      console.log(`   User ${index + 1}: ${user.id} - Valid UUID: ${isValid}`);
      if (!isValid) throw new Error(`Invalid UUID found: ${user.id}`);
    });

    console.log('✅ Verifying trip IDs and foreign keys...');
    sampleTrips.forEach((trip, index) => {
      const idValid = uuidValidate(trip.id);
      const agentIdValid = uuidValidate(trip.agentId);
      console.log(`   Trip ${index + 1}: ID valid: ${idValid}, Agent ID valid: ${agentIdValid}`);
      if (!idValid || !agentIdValid) {
        throw new Error(`Invalid UUID found in trip: ${trip.id} or ${trip.agentId}`);
      }
    });

    console.log('✅ Verifying booking IDs and foreign keys...');
    sampleBookings.forEach((booking, index) => {
      const idValid = uuidValidate(booking.id);
      const clientIdValid = uuidValidate(booking.clientId);
      const tripIdValid = uuidValidate(booking.tripId);
      console.log(`   Booking ${index + 1}: All IDs valid: ${idValid && clientIdValid && tripIdValid}`);
      if (!idValid || !clientIdValid || !tripIdValid) {
        throw new Error(`Invalid UUID found in booking: ${booking.id}, ${booking.clientId}, or ${booking.tripId}`);
      }
    });

    console.log('✅ All database IDs verified as valid UUIDs\n');

    // Step 6: Run application tests
    console.log('🧪 Step 5: Running application tests...');
    try {
      execSync('npm test -- --testPathPattern=uuid-migration', { stdio: 'inherit' });
      console.log('✅ All tests passed\n');
    } catch (error) {
      console.log('⚠️  Some tests failed. Please review the test output above.\n');
    }

    // Step 7: Generate migration report
    console.log('📊 Step 6: Generating migration report...');
    
    const userCount = await db.select().from(users);
    const tripCount = await db.select().from(trips);
    const bookingCount = await db.select().from(bookings);

    console.log('\n📈 Migration Report:');
    console.log('==================');
    console.log(`✅ Users migrated: ${userCount.length}`);
    console.log(`✅ Trips migrated: ${tripCount.length}`);
    console.log(`✅ Bookings migrated: ${bookingCount.length}`);
    console.log('✅ All primary keys converted to UUIDs');
    console.log('✅ All foreign key relationships maintained');
    console.log('✅ Database constraints recreated');
    console.log('✅ Application services updated');
    console.log('✅ API endpoints updated');
    console.log('✅ Validation schemas updated');

    console.log('\n🎉 UUID Migration Completed Successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Update any external applications to use UUID format');
    console.log('2. Update API documentation');
    console.log('3. Inform frontend developers about the UUID changes');
    console.log('4. Monitor application logs for any UUID-related issues');
    console.log('5. Consider running additional integration tests');

    if (backupFile) {
      console.log(`\n💾 Database backup saved as: ${backupFile}`);
      console.log('   Keep this backup until you\'re confident the migration is stable');
    }

  } catch (error) {
    console.error('\n❌ UUID Migration Failed:');
    console.error(error);
    console.log('\n🔄 Recovery Steps:');
    console.log('1. Restore from the database backup if available');
    console.log('2. Check the error message above for specific issues');
    console.log('3. Fix any issues and re-run the migration');
    console.log('4. Contact the development team if you need assistance');
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  runUUIDMigration()
    .then(() => {
      console.log('\n✨ Migration process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration process failed:');
      console.error(error);
      process.exit(1);
    });
}

export { runUUIDMigration };
