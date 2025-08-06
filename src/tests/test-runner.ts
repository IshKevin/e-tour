#!/usr/bin/env ts-node

/**
 * Test Runner Script
 * Runs all tests and provides comprehensive reporting
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const testCategories = [
  {
    name: 'Payment System Tests',
    file: 'src/tests/integration/payment.test.ts',
    description: 'Tests for payment processing, refunds, invoices, and payment history'
  },
  {
    name: 'Review System Tests',
    file: 'src/tests/integration/review.test.ts',
    description: 'Tests for trip reviews, agent reviews, ratings, and moderation'
  },
  {
    name: 'Wishlist Tests',
    file: 'src/tests/integration/wishlist.test.ts',
    description: 'Tests for wishlist management, add/remove items, and statistics'
  },
  {
    name: 'Communication Tests',
    file: 'src/tests/integration/messaging.test.ts',
    description: 'Tests for messaging system, conversations, and notifications'
  },
  {
    name: 'Promotional Tests',
    file: 'src/tests/integration/promotional.test.ts',
    description: 'Tests for discount codes, campaigns, and promotional features'
  },
  {
    name: 'Content Management Tests',
    file: 'src/tests/integration/content.test.ts',
    description: 'Tests for blog, FAQ, legal documents, and content search'
  },
  {
    name: 'System Services Tests',
    file: 'src/tests/integration/system.test.ts',
    description: 'Tests for utilities, analytics, notifications, and system monitoring'
  }
];

async function runTests() {
  console.log('🧪 E-Tour API Test Suite');
  console.log('========================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const results: Array<{ category: string; status: 'PASS' | 'FAIL'; details?: string }> = [];

  for (const category of testCategories) {
    console.log(`📋 Running: ${category.name}`);
    console.log(`   ${category.description}`);
    
    if (!existsSync(category.file)) {
      console.log(`   ❌ Test file not found: ${category.file}\n`);
      results.push({ category: category.name, status: 'FAIL', details: 'Test file not found' });
      failedTests++;
      continue;
    }

    try {
      const output = execSync(`npx jest ${category.file} --verbose --no-cache`, {
        encoding: 'utf8',
        timeout: 60000
      });

      // Parse Jest output to count tests
      const testMatches = output.match(/✓|×/g);
      const categoryTests = testMatches ? testMatches.length : 0;
      const categoryPassed = (output.match(/✓/g) || []).length;
      const categoryFailed = (output.match(/×/g) || []).length;

      totalTests += categoryTests;
      passedTests += categoryPassed;
      failedTests += categoryFailed;

      if (categoryFailed === 0) {
        console.log(`   ✅ PASSED (${categoryPassed}/${categoryTests} tests)\n`);
        results.push({ category: category.name, status: 'PASS' });
      } else {
        console.log(`   ❌ FAILED (${categoryPassed}/${categoryTests} tests passed)\n`);
        results.push({ category: category.name, status: 'FAIL', details: `${categoryFailed} tests failed` });
      }
    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}\n`);
      results.push({ category: category.name, status: 'FAIL', details: error.message });
      failedTests++;
    }
  }

  // Print summary
  console.log('📊 Test Results Summary');
  console.log('=======================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%\n`);

  // Print detailed results
  console.log('📋 Detailed Results');
  console.log('===================');
  results.forEach(result => {
    const status = result.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.category}`);
    if (result.details) {
      console.log(`        ${result.details}`);
    }
  });

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('E-Tour API Test Runner');
  console.log('Usage: npm run test:all');
  console.log('       npm run test:integration');
  console.log('       ts-node src/tests/test-runner.ts');
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
