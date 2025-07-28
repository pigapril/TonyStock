#!/usr/bin/env node

/**
 * E2E Test Runner Script
 * 
 * This script helps run E2E tests with proper setup and validation.
 * It checks prerequisites and provides helpful error messages.
 */

const { spawn } = require('child_process');
const http = require('http');

// Configuration
const CONFIG = {
  BACKEND_URL: 'http://localhost:8080',
  FRONTEND_URL: 'http://localhost:3000',
  TIMEOUT: 5000
};

/**
 * Check if a server is running on the given URL
 */
function checkServer(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/',
      method: 'GET',
      timeout: CONFIG.TIMEOUT
    };

    const req = http.request(options, (res) => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      resolve(false);
    });

    req.end();
  });
}

/**
 * Main function to run E2E tests
 */
async function runE2ETests() {
  console.log('🚀 Starting E2E Test Runner...\n');

  // Check prerequisites
  console.log('📋 Checking prerequisites...');
  
  const backendRunning = await checkServer(CONFIG.BACKEND_URL);
  const frontendRunning = await checkServer(CONFIG.FRONTEND_URL);

  if (!backendRunning) {
    console.error(`❌ Backend server is not running on ${CONFIG.BACKEND_URL}`);
    console.log('   Please start the backend server first:');
    console.log('   cd backend && npm run dev\n');
    process.exit(1);
  }

  if (!frontendRunning) {
    console.error(`❌ Frontend server is not running on ${CONFIG.FRONTEND_URL}`);
    console.log('   Please start the frontend server first:');
    console.log('   cd frontend && npm start\n');
    process.exit(1);
  }

  console.log('✅ Backend server is running');
  console.log('✅ Frontend server is running\n');

  // Run Playwright tests
  console.log('🎭 Running Playwright E2E tests...\n');

  const args = process.argv.slice(2);
  const playwrightArgs = ['test', ...args];

  const playwright = spawn('npx', ['playwright', ...playwrightArgs], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  playwright.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ All E2E tests passed!');
    } else {
      console.log('\n❌ Some E2E tests failed.');
      console.log('   Check the test report for details:');
      console.log('   npx playwright show-report');
    }
    process.exit(code);
  });

  playwright.on('error', (error) => {
    console.error('❌ Failed to run Playwright tests:', error.message);
    process.exit(1);
  });
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n⏹️  E2E test runner interrupted');
  process.exit(0);
});

// Run the tests
runE2ETests().catch((error) => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});