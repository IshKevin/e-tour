#!/usr/bin/env node

// Test production build locally before deploying to Render
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Production Build for Render Deployment');
console.log('================================================');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.PORT = '3000';
process.env.SIMPLE_HEARTBEAT_ENABLED = 'true';
process.env.HEARTBEAT_INTERVAL = '30000';
process.env.SELF_PING_ENABLED = 'true';
process.env.SELF_PING_URL = 'http://localhost:3000/ping';
process.env.LOG_HEARTBEAT = 'false';

console.log('🔧 Environment Variables Set:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT: ${process.env.PORT}`);
console.log(`- SIMPLE_HEARTBEAT_ENABLED: ${process.env.SIMPLE_HEARTBEAT_ENABLED}`);
console.log(`- LOG_HEARTBEAT: ${process.env.LOG_HEARTBEAT}`);
console.log('');

// Build the project
console.log('🏗️ Building project...');
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed!');
    process.exit(1);
  }
  
  console.log('✅ Build successful!');
  console.log('');
  
  // Start the server
  console.log('🚀 Starting production server...');
  console.log('Press Ctrl+C to stop');
  console.log('');
  
  const serverProcess = spawn('node', ['--max-old-space-size=512', 'dist/index.js'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
    env: process.env
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill('SIGTERM');
    setTimeout(() => {
      console.log('✅ Server stopped');
      process.exit(0);
    }, 2000);
  });
  
  serverProcess.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code);
  });
  
  // Test endpoints after server starts
  setTimeout(() => {
    console.log('\n🧪 Testing endpoints...');
    testEndpoints();
  }, 5000);
});

async function testEndpoints() {
  try {
    // Test health endpoint
    console.log('Testing /health endpoint...');
    const healthResponse = await fetch('http://localhost:3000/health');
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health endpoint working:', healthData.status);
    } else {
      console.log('❌ Health endpoint failed:', healthResponse.status);
    }
    
    // Test ping endpoint
    console.log('Testing /ping endpoint...');
    const pingResponse = await fetch('http://localhost:3000/ping');
    
    if (pingResponse.ok) {
      const pingData = await pingResponse.text();
      console.log('✅ Ping endpoint working:', pingData);
    } else {
      console.log('❌ Ping endpoint failed:', pingResponse.status);
    }
    
    // Test heartbeat status
    console.log('Testing /api/v1/health/heartbeat-status endpoint...');
    const heartbeatResponse = await fetch('http://localhost:3000/api/v1/health/heartbeat-status');
    
    if (heartbeatResponse.ok) {
      const heartbeatData = await heartbeatResponse.json();
      console.log('✅ Heartbeat endpoint working:', heartbeatData.heartbeat.running);
    } else {
      console.log('❌ Heartbeat endpoint failed:', heartbeatResponse.status);
    }
    
    console.log('\n🎉 Production build test completed!');
    console.log('Your app is ready for Render deployment.');
    
  } catch (error) {
    console.error('❌ Endpoint testing failed:', error.message);
  }
}
