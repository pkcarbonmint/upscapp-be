#!/usr/bin/env node

/**
 * Docker Deployment Test Script
 * 
 * Tests the following:
 * 1. Frontend service serves the onboarding app page
 * 2. Student creation API endpoint works via frontend proxy
 * 
 * Usage: node test_docker_deployment.js [host] [port]
 * Example: node test_docker_deployment.js localhost 3000
 */

const http = require('http');
const https = require('https');

// Configuration
const HOST = process.argv[2] || 'localhost';
const PORT = process.argv[3] || '3000';
const BASE_URL = `http://${HOST}:${PORT}`;

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

/**
 * Make an HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Set timeout for request
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Log test result
 */
function logTest(testName, passed, message = '') {
  const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  console.log(`${status} ${testName}`);
  if (message) {
    console.log(`  ${colors.blue}→${colors.reset} ${message}`);
  }
  
  results.tests.push({ name: testName, passed, message });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

/**
 * Test 1: Verify onboarding app page is served
 */
async function testOnboardingPageServed() {
  const testName = 'Onboarding page is served on frontend port';
  console.log(`\n${colors.bright}Running: ${testName}${colors.reset}`);
  
  try {
    const response = await makeRequest(`${BASE_URL}/onboarding`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html'
      }
    });
    
    // Check status code
    if (response.statusCode !== 200) {
      logTest(testName, false, `Expected status 200, got ${response.statusCode}`);
      return false;
    }
    
    // Check content type
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      logTest(testName, false, `Expected HTML content, got ${contentType}`);
      return false;
    }
    
    // Check if response contains HTML
    if (!response.body.includes('<html') && !response.body.includes('<!DOCTYPE')) {
      logTest(testName, false, 'Response does not contain valid HTML');
      return false;
    }
    
    // Check for common onboarding app indicators
    const hasReactRoot = response.body.includes('id="root"') || 
                         response.body.includes('id="app"') ||
                         response.body.includes('<script');
    
    if (!hasReactRoot) {
      logTest(testName, false, 'HTML does not contain expected app structure');
      return false;
    }
    
    logTest(testName, true, `Page served successfully (${response.body.length} bytes)`);
    return true;
    
  } catch (error) {
    logTest(testName, false, `Request failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Verify root path also serves onboarding
 */
async function testRootPathServed() {
  const testName = 'Root path serves onboarding app';
  console.log(`\n${colors.bright}Running: ${testName}${colors.reset}`);
  
  try {
    const response = await makeRequest(`${BASE_URL}/`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html'
      }
    });
    
    if (response.statusCode !== 200) {
      logTest(testName, false, `Expected status 200, got ${response.statusCode}`);
      return false;
    }
    
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      logTest(testName, false, `Expected HTML content, got ${contentType}`);
      return false;
    }
    
    logTest(testName, true, 'Root path accessible');
    return true;
    
  } catch (error) {
    logTest(testName, false, `Request failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Verify student creation API endpoint
 */
async function testStudentCreationAPI() {
  const testName = 'Student creation API via frontend proxy';
  console.log(`\n${colors.bright}Running: ${testName}${colors.reset}`);
  
  try {
    // Sample student data based on BackgroundInput schema
    const studentData = {
      name: 'Test Student',
      phone: '+1234567890',
      email: 'test.student@example.com',
      city: 'Test City',
      state: 'Test State',
      graduation_stream: 'Computer Science',
      college: 'Test University',
      graduation_year: 2024,
      about: 'Test student for deployment verification'
    };
    
    const requestBody = JSON.stringify(studentData);
    
    const response = await makeRequest(`${BASE_URL}/api/studyplanner/onboarding/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      },
      body: requestBody
    });
    
    // Check status code (should be 200 for success)
    if (response.statusCode !== 200) {
      logTest(testName, false, `Expected status 200, got ${response.statusCode}. Response: ${response.body}`);
      return false;
    }
    
    // Parse response
    let responseData;
    try {
      responseData = JSON.parse(response.body);
    } catch (e) {
      logTest(testName, false, `Invalid JSON response: ${response.body}`);
      return false;
    }
    
    // Verify response structure (should match CreateStudentResponse)
    if (!responseData.student_id) {
      logTest(testName, false, `Response missing student_id: ${JSON.stringify(responseData)}`);
      return false;
    }
    
    if (responseData.created !== true) {
      logTest(testName, false, `Expected created=true, got ${responseData.created}`);
      return false;
    }
    
    logTest(testName, true, `Student created successfully with ID: ${responseData.student_id}`);
    return true;
    
  } catch (error) {
    logTest(testName, false, `Request failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Verify backend health via frontend proxy
 */
async function testBackendHealth() {
  const testName = 'Backend API accessible via frontend proxy';
  console.log(`\n${colors.bright}Running: ${testName}${colors.reset}`);
  
  try {
    // Try to access any API endpoint to verify proxy is working
    const response = await makeRequest(`${BASE_URL}/api/studyplanner/onboarding/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Health Check',
        phone: '1234567890',
        email: 'health@test.com',
        city: 'City',
        state: 'State',
        graduation_stream: 'Stream',
        college: 'College',
        graduation_year: 2024,
        about: 'Health check'
      })
    });
    
    // Any response (even 400 bad request) means the proxy is working
    // 503 would indicate backend is down
    if (response.statusCode === 503) {
      logTest(testName, false, 'Backend service unavailable (503)');
      return false;
    }
    
    logTest(testName, true, `Backend responding via proxy (status: ${response.statusCode})`);
    return true;
    
  } catch (error) {
    logTest(testName, false, `Proxy connection failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Verify nginx health endpoint
 */
async function testNginxHealth() {
  const testName = 'Nginx health endpoint';
  console.log(`\n${colors.bright}Running: ${testName}${colors.reset}`);
  
  try {
    const response = await makeRequest(`${BASE_URL}/health`, {
      method: 'GET'
    });
    
    if (response.statusCode !== 200) {
      logTest(testName, false, `Expected status 200, got ${response.statusCode}`);
      return false;
    }
    
    if (!response.body.includes('healthy')) {
      logTest(testName, false, `Unexpected health response: ${response.body}`);
      return false;
    }
    
    logTest(testName, true, 'Nginx health check passed');
    return true;
    
  } catch (error) {
    logTest(testName, false, `Request failed: ${error.message}`);
    return false;
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}Test Summary${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Total:  ${results.tests.length}`);
  console.log('='.repeat(60));
  
  if (results.failed > 0) {
    console.log(`\n${colors.red}${colors.bright}Some tests failed!${colors.reset}`);
    console.log('\nFailed tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
        if (t.message) {
          console.log(`    ${t.message}`);
        }
      });
  } else {
    console.log(`\n${colors.green}${colors.bright}All tests passed! ✓${colors.reset}`);
  }
  
  console.log('');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.bright}${colors.blue}Docker Deployment Test Suite${colors.reset}`);
  console.log(`Testing deployment at: ${colors.yellow}${BASE_URL}${colors.reset}\n`);
  
  try {
    // Run all tests
    await testNginxHealth();
    await testRootPathServed();
    await testOnboardingPageServed();
    await testBackendHealth();
    await testStudentCreationAPI();
    
  } catch (error) {
    console.error(`\n${colors.red}Unexpected error during test execution:${colors.reset}`, error);
  } finally {
    printSummary();
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

// Run tests
runTests();
