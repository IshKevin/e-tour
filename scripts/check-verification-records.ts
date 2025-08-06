/**
 * Script to check email verification records in the database
 * This helps debug verification issues by showing all records
 */

import { db } from '../src/db';
import { emailVerifications } from '../src/db/schema/emailVerifications.schema';
import { users } from '../src/db/schema/user.schema';
import { eq, desc } from 'drizzle-orm';

async function checkVerificationRecords() {
  console.log('🔍 Checking email verification records...\n');

  try {
    // Get all verification records with user info
    const records = await db
      .select({
        verificationId: emailVerifications.id,
        userId: emailVerifications.userId,
        userEmail: users.email,
        userName: users.name,
        verificationCode: emailVerifications.verificationCode,
        verified: emailVerifications.verified,
        expiresAt: emailVerifications.expiresAt,
        createdAt: emailVerifications.createdAt,
        verifiedAt: emailVerifications.verifiedAt,
        emailVerified: users.emailVerified
      })
      .from(emailVerifications)
      .leftJoin(users, eq(emailVerifications.userId, users.id))
      .orderBy(desc(emailVerifications.createdAt))
      .limit(20);

    if (records.length === 0) {
      console.log('📭 No verification records found');
      return;
    }

    console.log(`📋 Found ${records.length} verification records:\n`);

    records.forEach((record, index) => {
      const isExpired = new Date() > new Date(record.expiresAt);
      const status = record.verified ? '✅ VERIFIED' : 
                    isExpired ? '⏰ EXPIRED' : '⏳ PENDING';

      console.log(`${index + 1}. ${status}`);
      console.log(`   User: ${record.userName} (${record.userEmail})`);
      console.log(`   User ID: ${record.userId}`);
      console.log(`   Code: ${record.verificationCode}`);
      console.log(`   Created: ${record.createdAt}`);
      console.log(`   Expires: ${record.expiresAt}`);
      console.log(`   Email Verified in User Table: ${record.emailVerified ? '✅' : '❌'}`);
      if (record.verifiedAt) {
        console.log(`   Verified At: ${record.verifiedAt}`);
      }
      console.log('');
    });

    // Show summary
    const pendingCount = records.filter(r => !r.verified && new Date() <= new Date(r.expiresAt)).length;
    const expiredCount = records.filter(r => !r.verified && new Date() > new Date(r.expiresAt)).length;
    const verifiedCount = records.filter(r => r.verified).length;

    console.log('📊 Summary:');
    console.log(`   ⏳ Pending: ${pendingCount}`);
    console.log(`   ⏰ Expired: ${expiredCount}`);
    console.log(`   ✅ Verified: ${verifiedCount}`);

  } catch (error) {
    console.error('❌ Error checking verification records:', error);
  }
}

async function checkSpecificUser() {
  const args = process.argv.slice(2);
  const email = args.find(arg => arg.includes('@'));
  
  if (!email) {
    console.log('❌ Please provide an email address as argument');
    console.log('Usage: npx ts-node check-verification-records.ts user@example.com');
    return;
  }

  console.log(`🔍 Checking verification records for: ${email}\n`);

  try {
    // Get user info
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User Info:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Verified: ${user.emailVerified ? '✅' : '❌'}`);
    console.log('');

    // Get verification records for this user
    const verifications = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.userId, user.id))
      .orderBy(desc(emailVerifications.createdAt));

    if (verifications.length === 0) {
      console.log('📭 No verification records found for this user');
      return;
    }

    console.log(`📋 Verification Records (${verifications.length}):\n`);

    verifications.forEach((record, index) => {
      const isExpired = new Date() > new Date(record.expiresAt);
      const status = record.verified ? '✅ VERIFIED' : 
                    isExpired ? '⏰ EXPIRED' : '⏳ PENDING';

      console.log(`${index + 1}. ${status}`);
      console.log(`   Code: ${record.verificationCode}`);
      console.log(`   Created: ${record.createdAt}`);
      console.log(`   Expires: ${record.expiresAt}`);
      if (record.verifiedAt) {
        console.log(`   Verified At: ${record.verifiedAt}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking user verification records:', error);
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.length > 0 && args[0].includes('@')) {
  checkSpecificUser();
} else {
  checkVerificationRecords();
}
