import { config } from 'dotenv';

export default async function globalSetup() {
  // Load test environment variables
  config({ path: '.env.test' });
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  console.log('🧪 Setting up test environment...');
  
  // You can add database setup here if needed
  // For now, we'll use the existing database with test data
  
  console.log('✅ Test environment setup complete');
}
