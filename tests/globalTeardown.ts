export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up any global resources here
  // Close database connections, etc.
  
  console.log('✅ Test environment cleanup complete');
}
