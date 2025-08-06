#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 Testing Render Commands Locally');
console.log('==================================');

try {
  // Test Build Command: npm install && npm run build
  console.log('1. Testing Build Command: npm install && npm run build');
  console.log('   Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('   Building TypeScript...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Verify build output
  if (fs.existsSync('dist/index.js')) {
    console.log('   ✅ Build successful - dist/index.js created');
  } else {
    console.log('   ❌ Build failed - dist/index.js not found');
    process.exit(1);
  }
  
  // Test Start Command: npm start
  console.log('\n2. Testing Start Command: npm start');
  console.log('   Command: node --max-old-space-size=512 dist/index.js');
  
  // Set production environment for test
  process.env.NODE_ENV = 'production';
  process.env.PORT = '3001';
  process.env.SIMPLE_HEARTBEAT_ENABLED = 'true';
  process.env.LOG_HEARTBEAT = 'false';
  
  console.log('   Starting server (will stop after 5 seconds)...');
  
  const { spawn } = require('child_process');
  const serverProcess = spawn('npm', ['start'], {
    env: process.env,
    stdio: 'pipe'
  });
  
  let output = '';
  serverProcess.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  serverProcess.stderr.on('data', (data) => {
    output += data.toString();
  });
  
  // Stop server after 5 seconds
  setTimeout(() => {
    serverProcess.kill('SIGTERM');
    
    console.log('   Server output:');
    console.log('   ' + output.split('\n').join('\n   '));
    
    if (output.includes('E-Tour Backend Server started')) {
      console.log('   ✅ Start command successful - server started');
    } else {
      console.log('   ❌ Start command failed - server did not start');
      process.exit(1);
    }
    
    console.log('\n🎉 All Render commands work correctly!');
    console.log('=====================================');
    console.log('✅ Build Command: npm install && npm run build');
    console.log('✅ Start Command: npm start');
    console.log('✅ Your project is ready for Render deployment');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Go to Render Dashboard');
    console.log('2. Update Build Command: npm install && npm run build');
    console.log('3. Update Start Command: npm start');
    console.log('4. Add environment variables');
    console.log('5. Deploy!');
    
  }, 5000);
  
} catch (error) {
  console.error('\n❌ Command test failed!');
  console.error('========================');
  console.error('Error:', error.message);
  console.error('');
  console.error('🔧 Fix the issues above before deploying to Render');
  process.exit(1);
}
