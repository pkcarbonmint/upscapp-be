#!/usr/bin/env node

/**
 * Onboarding Wizard API Test Script (Node.js)
 * Tests core API functionality step by step
 */

const http = require('http');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

const BASE_URL = 'http://localhost:3000/api/studyplanner/onboarding';
let STUDENT_ID = '';

// Colors for console output
const colors = {
    GREEN: '\x1b[32m',
    RED: '\x1b[31m',
    BLUE: '\x1b[34m',
    YELLOW: '\x1b[33m',
    RESET: '\x1b[0m'
};

// Helper function to make HTTP requests
async function makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        const fullPath = `/api/studyplanner/onboarding${endpoint}`;
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: fullPath,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        console.log(`Making ${method} request to: ${fullPath}`);

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({ statusCode: res.statusCode, body: jsonBody, rawBody: body });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, body: {}, rawBody: body });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Helper function to print colored messages
function printStep(step, message) {
    console.log(`${colors.YELLOW}[${step}]${colors.RESET} ${message}`);
}

function printSuccess(message) {
    console.log(`${colors.GREEN}✅ ${message}${colors.RESET}`);
}

function printError(message) {
    console.log(`${colors.RED}❌ ${message}${colors.RESET}`);
}

function printInfo(message) {
    console.log(`${colors.BLUE}${message}${colors.RESET}`);
}

// Test data
const testData = {
    background: {
        name: "Test Student JS",
        phone: "+919876543210",
        email: "testjs@example.com",
        city: "Mumbai",
        state: "Maharashtra",
        graduation_stream: "Engineering",
        college: "IIT Bombay",
        graduation_year: 2023,
        about: "Test student for Node.js API validation"
    },
    target: {
        target_year: 2025,
        attempt_number: 1,
        optional_subjects: ["Geography", "Public Administration"],
        study_approach: "comprehensive"
    },
    commitment: {
        weekly_hours: 45,
        available_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        constraints: "Evening study preferred, flexible weekends"
    },
    confidence: {
        confidence: 75,
        areas_of_concern: ["Current Affairs", "Essay Writing", "Interview Skills"]
    }
};

async function runTests() {
    console.log(`${colors.BLUE}🧪 Testing Onboarding Wizard API (Node.js)${colors.RESET}\n`);

    try {
        // Test 1: Create Student
        printStep('1/5', 'Creating student...');
        const createResponse = await makeRequest('POST', '/students', testData.background);
        
        if (createResponse.statusCode === 200 && createResponse.body.student_id) {
            STUDENT_ID = createResponse.body.student_id;
            printSuccess(`Student created: ${STUDENT_ID}`);
        } else {
            printError('Failed to create student');
            console.log('Response:', createResponse.rawBody);
            process.exit(1);
        }

        // Test 2: Update Target
        printStep('2/5', 'Updating target information...');
        const targetResponse = await makeRequest('PATCH', `/students/${STUDENT_ID}/target`, testData.target);
        
        if (targetResponse.statusCode === 200 && targetResponse.body.updated) {
            printSuccess('Target updated');
        } else {
            printError('Failed to update target');
            console.log('Response:', targetResponse.rawBody);
        }

        // Test 3: Update Commitment
        printStep('3/5', 'Updating commitment information...');
        const commitmentResponse = await makeRequest('PATCH', `/students/${STUDENT_ID}/commitment`, testData.commitment);
        
        if (commitmentResponse.statusCode === 200 && commitmentResponse.body.updated) {
            printSuccess('Commitment updated');
        } else {
            printError('Failed to update commitment');
            console.log('Response:', commitmentResponse.rawBody);
        }

        // Test 4: Update Confidence
        printStep('4/5', 'Updating confidence information...');
        const confidenceResponse = await makeRequest('PATCH', `/students/${STUDENT_ID}/confidence`, testData.confidence);
        
        if (confidenceResponse.statusCode === 200 && confidenceResponse.body.updated) {
            printSuccess('Confidence updated');
        } else {
            printError('Failed to update confidence');
            console.log('Response:', confidenceResponse.rawBody);
        }

        // Test 5: Get Preview and Summary
        printStep('5/5', 'Generating study plan preview...');
        const previewResponse = await makeRequest('GET', `/students/${STUDENT_ID}/preview`);
        
        if (previewResponse.statusCode === 200 && previewResponse.body.preview) {
            printSuccess('Study plan preview generated');
            
            // Print raw JSON response from Helios
            console.log(`\n${colors.BLUE}📋 Raw JSON Response from Helios Server:${colors.RESET}`);
            console.log(`${colors.BLUE}========================================${colors.RESET}`);
            console.log(JSON.stringify(previewResponse.body, null, 2));
            
            // Display block summary
            const preview = previewResponse.body.preview;
            console.log(`\n${colors.BLUE}📊 Study Plan Summary${colors.RESET}`);
            console.log(`${colors.BLUE}===================${colors.RESET}`);
            
            if (preview.blocks && preview.blocks.length > 0) {
                console.log(`\n${colors.YELLOW}Study Blocks (${preview.blocks.length} total):${colors.RESET}`);
                
                let totalWeeks = 0;
                let totalHours = 0;
                
                preview.blocks.forEach((block, index) => {
                    console.log(`\n${colors.GREEN}Block ${index + 1}: ${block.title}${colors.RESET}`);
                    console.log(`  Category: ${block.category}`);
                    console.log(`  Duration: ${block.durationWeeks} weeks`);
                    console.log(`  Subjects: ${block.subjects.join(', ')}`);
                    
                    if (block.hours) {
                        const blockTotal = block.hours.studyHours + block.hours.revisionHours + 
                                         block.hours.practiceHours + block.hours.testHours;
                        console.log(`  Total Hours: ${blockTotal} (Study: ${block.hours.studyHours}, Revision: ${block.hours.revisionHours}, Practice: ${block.hours.practiceHours}, Test: ${block.hours.testHours})`);
                        totalHours += blockTotal;
                    }
                    
                    if (block.resources) {
                        console.log(`  Resources: ${block.resources.oneLine}`);
                    }
                    
                    totalWeeks += block.durationWeeks;
                });
                
                console.log(`\n${colors.YELLOW}Overall Summary:${colors.RESET}`);
                console.log(`  Total Duration: ${totalWeeks} weeks`);
                console.log(`  Total Study Hours: ${totalHours}`);
                console.log(`  Average Hours/Week: ${(totalHours / totalWeeks).toFixed(1)}`);
            }
            
            if (preview.milestones) {
                console.log(`\n${colors.YELLOW}Key Milestones:${colors.RESET}`);
                if (preview.milestones.foundationToPrelimsDate) {
                    console.log(`  Foundation → Prelims: ${preview.milestones.foundationToPrelimsDate}`);
                }
                if (preview.milestones.prelimsToMainsDate) {
                    console.log(`  Prelims → Mains: ${preview.milestones.prelimsToMainsDate}`);
                }
            }
        } else {
            printError('Failed to generate preview');
            console.log('Response:', previewResponse.rawBody);
        }

        // Database Verification
        console.log(`\n${colors.BLUE}📊 Database Verification${colors.RESET}`);
        try {
            const { stdout } = await execAsync(`docker-compose exec -T app_db psql -U app -d app -c "
                SELECT 
                    id,
                    background->>'name' as name,
                    background->>'email' as email,
                    target->>'target_year' as target_year,
                    commitment->>'weekly_hours' as weekly_hours,
                    confidence->>'confidence' as confidence_level
                FROM onboarding_students 
                WHERE id = '${STUDENT_ID}';" 2>/dev/null`);
            console.log(stdout);
        } catch (error) {
            printError('Database verification failed');
            console.log(error.message);
        }

        console.log(`\n${colors.GREEN}🎉 Wizard API test completed!${colors.RESET}`);
        console.log(`${colors.BLUE}Student ID:${colors.RESET} ${STUDENT_ID}`);

    } catch (error) {
        printError(`Test failed: ${error.message}`);
        process.exit(1);
    }
}

// Run the tests
if (require.main === module) {
    runTests();
}

module.exports = { runTests, makeRequest };
