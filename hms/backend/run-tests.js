#!/usr/bin/env node

/**
 * Comprehensive Test Execution Script for Healthcare Management System
 * This script runs all Jest tests with proper configuration and reporting
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set test environment
process.env.NODE_ENV = 'test';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function checkEnvironment() {
  logSection('Checking Environment');
  
  const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET'
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    log('Warning: Missing environment variables:', 'yellow');
    missing.forEach(varName => log(`  - ${varName}`, 'yellow'));
    log('Using default test values...', 'yellow');
  } else {
    log('✓ All required environment variables set', 'green');
  }
}

function runJest(testPattern = '', options = {}) {
  const {
    coverage = false,
    verbose = false,
    watch = false
  } = options;
  
  let command = 'npx jest';
  
  if (testPattern) {
    command += ` ${testPattern}`;
  } else {
    command += ' tests/';
  }
  
  if (coverage) {
    command += ' --coverage';
  }
  
  command += ' --passWithNoTests';
  
  try {
    log(`Running: ${command}`, 'blue');
    execSync(command, { 
      stdio: 'inherit',
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    return true;
  } catch (error) {
    log('Tests failed!', 'red');
    return false;
  }
}

function generateTestReport() {
  logSection('Generating Test Report');
  
  const reportPath = path.join(__dirname, 'test-results.json');
  
  if (!fs.existsSync(reportPath)) {
    log('No test results found. Run tests first.', 'yellow');
    return;
  }
  
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    log('Test Report Summary:', 'bright');
    log(`Total Tests: ${report.numTotalTests || 'N/A'}`, 'green');
    log(`Passed: ${report.numPassedTests || 'N/A'}`, 'green');
    log(`Failed: ${report.numFailedTests || 'N/A'}`, report.numFailedTests > 0 ? 'red' : 'green');
    log(`Coverage: ${report.coverage || 'N/A'}`, 'cyan');
  } catch (error) {
    log('Error reading test report:', 'red');
    log(error.message, 'red');
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  log('🧪 Healthcare Management System - Test Suite', 'bright');
  log('===============================================', 'cyan');
  
  checkEnvironment();
  
  let success = true;
  
  switch (command) {
    case 'auth':
      logSection('Running Authentication Tests');
      success = runJest('tests/auth.test.js', { verbose: true });
      break;
      
    case 'patients':
      logSection('Running Patient Tests');
      success = runJest('tests/patients.test.js', { verbose: true });
      break;
      
    case 'appointments':
      logSection('Running Appointment Tests');
      success = runJest('tests/appointments.test.js', { verbose: true });
      break;
      
    case 'billing':
      logSection('Running Billing Tests');
      success = runJest('tests/billing.test.js', { verbose: true });
      break;
      
    case 'middleware':
      logSection('Running Middleware Tests');
      success = runJest('tests/middleware.test.js', { verbose: true });
      break;
      
    case 'database':
      logSection('Running Database Integration Tests');
      success = runJest('tests/database.test.js', { verbose: true });
      break;
      
    case 'coverage':
      logSection('Running All Tests with Coverage');
      success = runJest('', { coverage: true, verbose: true });
      break;
      
    case 'watch':
      logSection('Running Tests in Watch Mode');
      runJest('', { watch: true });
      return;
      
    case 'report':
      generateTestReport();
      return;
      
    case 'all':
    default:
      logSection('Running All Tests');
      success = runJest('', { verbose: true });
      break;
  }
  
  logSection('Test Execution Complete');
  
  if (success) {
    log('✓ All tests passed successfully!', 'green');
    process.exit(0);
  } else {
    log('✗ Some tests failed. Please review the output above.', 'red');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log('Uncaught Exception:', 'red');
  log(error.message, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection:', 'red');
  log(reason, 'red');
  process.exit(1);
});

main();
