#!/usr/bin/env node

/**
 * Docker Deployment Test Script
 * 
 * This script tests the Docker deployment of the onboarding app by:
 * 1. Verifying that the onboarding app page is correctly served on the frontend service port
 * 2. Verifying that the new student creation route works via the frontend port
 * 
 * Usage: node test_docker_deployment.js [--frontend-port=3000] [--backend-port=8000] [--timeout=30000]
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const config = {
  frontendPort: 3000,
  backendPort: 8000,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 2000
};

// Parse command line arguments
process.argv.forEach(arg => {
  if (arg.startsWith('--frontend-port=')) {
    config.frontendPort = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--backend-port=')) {
    config.backendPort = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--timeout=')) {
    config.timeout = parseInt(arg.split('=')[1]);
  }
});

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Docker-Deployment-Test/1.0',
        ...options.headers
      },
      timeout: config.timeout
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          url: url
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${config.timeout}ms`));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function retryRequest(url, options = {}, attempt = 1) {
  try {
    return await makeRequest(url, options);
  } catch (error) {
    if (attempt < config.retryAttempts) {
      log(`Request failed (attempt ${attempt}/${config.retryAttempts}), retrying in ${config.retryDelay}ms...`, 'warning');
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      return retryRequest(url, options, attempt + 1);
    }
    throw error;
  }
}

function recordTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`PASS: ${name}`, 'success');
  } else {
    testResults.failed++;
    log(`FAIL: ${name} - ${details}`, 'error');
  }
  testResults.details.push({ name, passed, details });
}

// Test functions
async function testFrontendService() {
  log('Testing frontend service availability...');
  
  try {
    const response = await retryRequest(`http://localhost:${config.frontendPort}/`);
    
    const passed = response.statusCode === 200;
    recordTest(
      'Frontend Service Available',
      passed,
      passed ? `Status: ${response.statusCode}` : `Expected 200, got ${response.statusCode}`
    );
    
    return passed;
  } catch (error) {
    recordTest(
      'Frontend Service Available',
      false,
      `Connection failed: ${error.message}`
    );
    return false;
  }
}

async function testOnboardingPage() {
  log('Testing onboarding page content...');
  
  try {
    const response = await retryRequest(`http://localhost:${config.frontendPort}/`);
    
    // Check if the response contains onboarding-related content
    const body = response.body.toLowerCase();
    const hasOnboardingContent = body.includes('onboarding') || 
                                body.includes('study plan') || 
                                body.includes('la mentora') ||
                                body.includes('upsc') ||
                                body.includes('welcome');
    
    const passed = response.statusCode === 200 && hasOnboardingContent;
    recordTest(
      'Onboarding Page Content',
      passed,
      passed ? 'Page contains onboarding content' : `Status: ${response.statusCode}, Content check: ${hasOnboardingContent}`
    );
    
    return passed;
  } catch (error) {
    recordTest(
      'Onboarding Page Content',
      false,
      `Failed to load page: ${error.message}`
    );
    return false;
  }
}

async function testBackendService() {
  log('Testing backend service availability...');
  
  try {
    const response = await retryRequest(`http://localhost:${config.backendPort}/healthcheck`);
    
    const passed = response.statusCode === 200;
    recordTest(
      'Backend Service Available',
      passed,
      passed ? `Status: ${response.statusCode}` : `Expected 200, got ${response.statusCode}`
    );
    
    return passed;
  } catch (error) {
    recordTest(
      'Backend Service Available',
      false,
      `Connection failed: ${error.message}`
    );
    return false;
  }
}

async function testStudentCreationEndpoint() {
  log('Testing student creation endpoint...');
  
  const testStudentData = {
    name: "Test User",
    email: "test@example.com",
    phone: "+911234567890",
    city: "Test City",
    state: "Test State",
    graduation_stream: "Engineering",
    college: "Test University",
    graduation_year: 2024,
    about: "Test student for Docker deployment verification"
  };
  
  try {
    const response = await retryRequest(
      `http://localhost:${config.backendPort}/api/studyplanner/onboarding/students`,
      {
        method: 'POST',
        body: testStudentData
      }
    );
    
    let responseData;
    try {
      responseData = JSON.parse(response.body);
    } catch (parseError) {
      recordTest(
        'Student Creation Endpoint',
        false,
        `Invalid JSON response: ${response.body}`
      );
      return false;
    }
    
    const passed = response.statusCode === 200 && 
                  responseData.student_id && 
                  responseData.created === true;
    
    recordTest(
      'Student Creation Endpoint',
      passed,
      passed ? 
        `Student created successfully with ID: ${responseData.student_id}` : 
        `Status: ${response.statusCode}, Response: ${JSON.stringify(responseData)}`
    );
    
    return { passed, studentId: responseData.student_id };
  } catch (error) {
    recordTest(
      'Student Creation Endpoint',
      false,
      `Request failed: ${error.message}`
    );
    return { passed: false };
  }
}

async function testStudentUpdateEndpoints(studentId) {
  if (!studentId) {
    log('Skipping student update tests - no student ID available', 'warning');
    return;
  }
  
  log('Testing student update endpoints...');
  
  // Test target year update
  try {
    const targetResponse = await retryRequest(
      `http://localhost:${config.backendPort}/api/studyplanner/onboarding/students/${studentId}/target`,
      {
        method: 'PATCH',
        body: {
          target_year: 2026,
          start_date: "2024-01-01",
          attempt_number: 1,
          optional_subjects: null,
          study_approach: null
        }
      }
    );
    
    const targetPassed = targetResponse.statusCode === 200;
    recordTest(
      'Student Target Update',
      targetPassed,
      targetPassed ? 'Target updated successfully' : `Status: ${targetResponse.statusCode}`
    );
  } catch (error) {
    recordTest(
      'Student Target Update',
      false,
      `Request failed: ${error.message}`
    );
  }
  
  // Test commitment update
  try {
    const commitmentResponse = await retryRequest(
      `http://localhost:${config.backendPort}/api/studyplanner/onboarding/students/${studentId}/commitment`,
      {
        method: 'PATCH',
        body: {
          weekly_hours: 40,
          available_days: null,
          constraints: "Study Preference: WeakSubjectsFirst; Subject Approach: DualSubject"
        }
      }
    );
    
    const commitmentPassed = commitmentResponse.statusCode === 200;
    recordTest(
      'Student Commitment Update',
      commitmentPassed,
      commitmentPassed ? 'Commitment updated successfully' : `Status: ${commitmentResponse.statusCode}`
    );
  } catch (error) {
    recordTest(
      'Student Commitment Update',
      false,
      `Request failed: ${error.message}`
    );
  }
}

async function testCORSConfiguration() {
  log('Testing CORS configuration...');
  
  try {
    const response = await retryRequest(
      `http://localhost:${config.backendPort}/api/studyplanner/onboarding/students`,
      {
        method: 'OPTIONS',
        headers: {
          'Origin': `http://localhost:${config.frontendPort}`,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      }
    );
    
    const hasCORSHeaders = response.headers['access-control-allow-origin'] || 
                          response.headers['Access-Control-Allow-Origin'];
    
    const passed = response.statusCode === 200 && hasCORSHeaders;
    recordTest(
      'CORS Configuration',
      passed,
      passed ? 'CORS headers present' : `Status: ${response.statusCode}, CORS headers: ${hasCORSHeaders}`
    );
    
    return passed;
  } catch (error) {
    recordTest(
      'CORS Configuration',
      false,
      `Request failed: ${error.message}`
    );
    return false;
  }
}

async function testServiceHealth() {
  log('Testing service health endpoints...');
  
  // Test backend health
  try {
    const backendHealth = await retryRequest(`http://localhost:${config.backendPort}/healthcheck`);
    const backendHealthy = backendHealth.statusCode === 200;
    recordTest(
      'Backend Health Check',
      backendHealthy,
      backendHealthy ? 'Backend is healthy' : `Status: ${backendHealth.statusCode}`
    );
  } catch (error) {
    recordTest(
      'Backend Health Check',
      false,
      `Health check failed: ${error.message}`
    );
  }
  
  // Test root endpoint
  try {
    const rootResponse = await retryRequest(`http://localhost:${config.backendPort}/`);
    const rootHealthy = rootResponse.statusCode === 200 && rootResponse.body.includes('running good');
    recordTest(
      'Backend Root Endpoint',
      rootHealthy,
      rootHealthy ? 'Root endpoint responding' : `Status: ${rootResponse.statusCode}`
    );
  } catch (error) {
    recordTest(
      'Backend Root Endpoint',
      false,
      `Root endpoint failed: ${error.message}`
    );
  }
}

// Main test execution
async function runTests() {
  log('Starting Docker deployment tests...');
  log(`Configuration: Frontend=${config.frontendPort}, Backend=${config.backendPort}, Timeout=${config.timeout}ms`);
  
  console.log('\n' + '='.repeat(60));
  console.log('DOCKER DEPLOYMENT TEST SUITE');
  console.log('='.repeat(60) + '\n');
  
  // Test 1: Frontend service availability
  const frontendAvailable = await testFrontendService();
  
  // Test 2: Onboarding page content
  const onboardingPageOK = await testOnboardingPage();
  
  // Test 3: Backend service availability
  const backendAvailable = await testBackendService();
  
  // Test 4: Service health checks
  await testServiceHealth();
  
  // Test 5: CORS configuration
  await testCORSConfiguration();
  
  // Test 6: Student creation endpoint
  const studentCreationResult = await testStudentCreationEndpoint();
  
  // Test 7: Student update endpoints (if student creation succeeded)
  if (studentCreationResult.passed) {
    await testStudentUpdateEndpoints(studentCreationResult.studentId);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\nFAILED TESTS:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => console.log(`  - ${test.name}: ${test.details}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Exit with appropriate code
  const allTestsPassed = testResults.failed === 0;
  if (allTestsPassed) {
    log('All tests passed! Docker deployment is working correctly.', 'success');
    process.exit(0);
  } else {
    log(`${testResults.failed} test(s) failed. Please check the deployment.`, 'error');
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'error');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'error');
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    log(`Test execution failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testFrontendService,
  testOnboardingPage,
  testBackendService,
  testStudentCreationEndpoint,
  testCORSConfiguration,
  testServiceHealth
};