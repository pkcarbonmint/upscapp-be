#!/usr/bin/env node

/**
 * Test script to simulate the complete onboarding flow and analyze preview response
 * This will help identify if there's a difference between API behavior and browser behavior
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:8000'; // Direct Python app on port 8000
const API_BASE = `${BASE_URL}/api/studyplanner/onboarding`;

// Test data for each step
const testData = {
    background: {
        name: "Test User",
        phone: "9876543210", 
        email: "test@example.com",
        city: "Delhi",
        state: "Delhi",
        graduation_stream: "Engineering",
        college: "Test College",
        graduation_year: 2020,
        about: "Test user for onboarding flow"
    },
    target: {
        target_year: 2026,
        attempt_number: 1,
        optional_subjects: ["Public Administration"],
        study_approach: "systematic"
    },
    commitment: {
        weekly_hours: 40,
        available_days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
        constraints: "work, family"
    },
    confidence: {
        confidence: 75,
        areas_of_concern: ["current_affairs", "essay_writing"]
    }
};

// HTTP request helper
function makeRequest(method, url, data = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const client = urlObj.protocol === 'https:' ? https : http;
        const req = client.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(body);
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: jsonData
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: body
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Step execution functions
async function step1_createStudent() {
    console.log('\n🚀 STEP 1: Creating student with background data...');
    console.log('Data:', JSON.stringify(testData.background, null, 2));
    
    const response = await makeRequest('POST', `${API_BASE}/students`, testData.background);
    
    console.log(`Status: ${response.status}`);
    if (response.status === 200 || response.status === 201) {
        console.log('✅ Student created successfully');
        console.log('Student ID:', response.data.student_id);
        return response.data.student_id;
    } else {
        console.log('❌ Failed to create student');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        throw new Error('Student creation failed');
    }
}

async function step2_updateTarget(studentId) {
    console.log('\n🎯 STEP 2: Updating target year...');
    console.log('Data:', JSON.stringify(testData.target, null, 2));
    
    const response = await makeRequest('PATCH', `${API_BASE}/students/${studentId}/target`, testData.target);
    
    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
        console.log('✅ Target updated successfully');
        return true;
    } else {
        console.log('❌ Failed to update target');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return false;
    }
}

async function step3_updateCommitment(studentId) {
    console.log('\n💪 STEP 3: Updating commitment...');
    console.log('Data:', JSON.stringify(testData.commitment, null, 2));
    
    const response = await makeRequest('PATCH', `${API_BASE}/students/${studentId}/commitment`, testData.commitment);
    
    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
        console.log('✅ Commitment updated successfully');
        return true;
    } else {
        console.log('❌ Failed to update commitment');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return false;
    }
}

async function step4_updateConfidence(studentId) {
    console.log('\n🎯 STEP 4: Updating confidence level...');
    console.log('Data:', JSON.stringify(testData.confidence, null, 2));
    
    const response = await makeRequest('PATCH', `${API_BASE}/students/${studentId}/confidence`, testData.confidence);
    
    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
        console.log('✅ Confidence updated successfully');
        return true;
    } else {
        console.log('❌ Failed to update confidence');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return false;
    }
}

async function step5_getPreview(studentId) {
    console.log('\n📋 STEP 5: Getting preview (THE CRITICAL STEP)...');
    console.log(`Requesting: GET ${API_BASE}/students/${studentId}/preview`);
    
    const response = await makeRequest('GET', `${API_BASE}/students/${studentId}/preview`);
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
        console.log('✅ Preview retrieved successfully');
        
        // Detailed analysis of the preview response
        const preview = response.data.preview;
        
        console.log('\n🔍 DETAILED PREVIEW ANALYSIS:');
        console.log('=====================================');
        console.log(`Student ID: ${response.data.student_id}`);
        
        // Extract blocks from raw Helios data (new structure)
        const rawHelios = preview.raw_helios_data;
        const cycles = rawHelios.cycles || [];
        
        // Count total blocks from all cycles
        let totalBlocks = 0;
        const allBlocks = [];
        
        cycles.forEach(cycle => {
            const cycleBlocks = cycle.cycleBlocks || [];
            totalBlocks += cycleBlocks.length;
            allBlocks.push(...cycleBlocks);
        });
        
        console.log(`Number of cycles: ${cycles.length}`);
        console.log(`Total blocks across cycles: ${totalBlocks}`);
        
        // Analyze each cycle and its blocks
        cycles.forEach((cycle, cycleIndex) => {
            console.log(`\n🔄 CYCLE ${cycleIndex + 1}:`);
            console.log(`  ID: ${cycle.cycleId}`);
            console.log(`  Name: ${cycle.cycleName}`);
            console.log(`  Type: ${cycle.cycleType}`);
            console.log(`  Duration: ${cycle.cycleDuration} weeks`);
            console.log(`  Start Week: ${cycle.cycleStartWeek}`);
            console.log(`  Blocks: ${cycle.cycleBlocks.length}`);
            
            // Analyze blocks within this cycle
            cycle.cycleBlocks.forEach((block, blockIndex) => {
                console.log(`\n  📦 BLOCK ${blockIndex + 1} (in ${cycle.cycleName}):`);
                console.log(`    ID: ${block.block_id}`);
                console.log(`    Title: ${block.block_title}`);
                console.log(`    Subjects: [${block.subjects.join(', ')}]`);
                console.log(`    Duration: ${block.duration_weeks} weeks`);
                
                // Show weekly plan summary if available
                if (block.weekly_plan && block.weekly_plan.length > 0) {
                    console.log(`    Weekly Plans: ${block.weekly_plan.length} weeks planned`);
                }
                
                // Show block resources summary
                if (block.block_resources) {
                    const resources = block.block_resources;
                    const resourceCount = (resources.primary_books?.length || 0) + 
                                        (resources.practice_resources?.length || 0) + 
                                        (resources.video_content?.length || 0);
                    console.log(`    Resources: ${resourceCount} total resources`);
                }
            });
        });
        
        // Analyze milestones
        console.log('\n🎯 MILESTONES:');
        console.log(`  Foundation → Prelims: ${preview.milestones.foundationToPrelimsDate || 'Not set'}`);
        console.log(`  Prelims → Mains: ${preview.milestones.prelimsToMainsDate || 'Not set'}`);
        
        // Check for signs of fallback data
        console.log('\n🚨 FALLBACK DETECTION:');
        const isUsingFallback = allBlocks.some(block => 
            block.block_title === "Study Plan" && 
            block.cycle_id === "default-cycle-1" &&
            block.subjects.includes("General Studies") &&
            block.subjects.includes("Current Affairs") &&
            block.subjects.includes("Optional Subject")
        );
        
        if (isUsingFallback) {
            console.log('❌ FALLBACK DATA DETECTED!');
            console.log('   This means Helios did not return proper cycles data');
            console.log('   The response is using the default/fallback block generation');
            console.log('   Possible reasons:');
            console.log('   1. Helios service is not running');
            console.log('   2. Helios returned empty cycles array');
            console.log('   3. Helios returned invalid cycle format');
            console.log('   4. Network issue between Python backend and Helios');
        } else {
            console.log('✅ Real Helios data detected');
            console.log('   The response appears to contain actual generated study plan data');
        }
        
        // Note: Full JSON response available for debugging if needed
        console.log('\n💡 Detailed analysis complete. Check final results below.');
        
        return preview;
    } else if (response.status === 503) {
        console.log('❌ Service Unavailable (503)');
        console.log('   This means Helios backend service is not reachable');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return null; // Don't throw error, continue analysis
    } else {
        console.log('❌ Failed to get preview');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return null; // Don't throw error, continue analysis
    }
}

// Main execution
async function runTest() {
    try {
        console.log('🧪 ONBOARDING FLOW TEST SCRIPT');
        console.log('==============================');
        console.log(`Testing against: ${BASE_URL}`);
        console.log(`Time: ${new Date().toISOString()}`);
        
        // Execute all steps
        const studentId = await step1_createStudent();
        await step2_updateTarget(studentId);
        await step3_updateCommitment(studentId);
        await step4_updateConfidence(studentId);
        const preview = await step5_getPreview(studentId);
        
        console.log('\n🎉 TEST COMPLETED!');
        console.log('==================');
        
        if (preview) {
            // Extract data for final analysis
            const rawHelios = preview.raw_helios_data;
            const cycles = rawHelios.cycles || [];
            
            let totalBlocks = 0;
            const allBlocks = [];
            cycles.forEach(cycle => {
                const cycleBlocks = cycle.cycleBlocks || [];
                totalBlocks += cycleBlocks.length;
                allBlocks.push(...cycleBlocks);
            });
            
            // Final validation results
            console.log('\n📊 FINAL TEST RESULTS:');
            console.log('======================');
            
            // Test 1: Data structure validation
            if (cycles.length > 0 && totalBlocks > 0) {
                console.log('✅ Test 1: Data structure - PASSED');
                console.log(`   Found ${cycles.length} cycles with ${totalBlocks} total blocks`);
            } else {
                console.log('❌ Test 1: Data structure - FAILED');
                console.log(`   Only ${cycles.length} cycles with ${totalBlocks} blocks found`);
            }
            
            // Test 2: Real vs fallback data
            const isUsingFallback = allBlocks.some(block => 
                block.block_title === "Study Plan" && 
                block.subjects.includes("General Studies") &&
                block.subjects.includes("Current Affairs")
            );
            
            if (!isUsingFallback && totalBlocks > 0) {
                console.log('✅ Test 2: Real Helios data - PASSED');
                console.log('   Data appears to be generated by Helios engine');
            } else {
                console.log('❌ Test 2: Real Helios data - FAILED');
                console.log('   Using fallback data - Helios may not be working');
            }
            
            // Test 3: Cycle information
            const hasRealCycles = cycles.some(cycle => 
                cycle.cycleName && 
                cycle.cycleName !== "default-cycle-1" &&
                cycle.cycleType && 
                cycle.cycleType !== "default"
            );
            
            if (hasRealCycles) {
                console.log('✅ Test 3: Cycle information - PASSED');
                console.log('   Cycles have proper names and types');
            } else {
                console.log('❌ Test 3: Cycle information - FAILED');
                console.log('   Cycles appear to be using default/fallback values');
            }
            
            // Test 4: Subject specificity
            const hasSpecificSubjects = allBlocks.some(block => 
                block.subjects.length > 0 && 
                !block.subjects.every(subject => 
                    ["General Studies", "Current Affairs", "Optional Subject"].includes(subject)
                )
            );
            
            if (hasSpecificSubjects) {
                console.log('✅ Test 4: Subject specificity - PASSED');
                console.log('   Blocks contain specific subject information');
            } else {
                console.log('❌ Test 4: Subject specificity - FAILED');
                console.log('   Only generic subjects found');
            }
            
            // Overall result
            const passedTests = [
                cycles.length > 0 && totalBlocks > 0,
                !isUsingFallback && totalBlocks > 0,
                hasRealCycles,
                hasSpecificSubjects
            ].filter(Boolean).length;
            
            console.log('\n🏆 OVERALL RESULT:');
            console.log(`   ${passedTests}/4 tests passed`);
            
            if (passedTests === 4) {
                console.log('🎉 ALL TESTS PASSED - Helios integration working perfectly!');
            } else if (passedTests >= 2) {
                console.log('⚠️  PARTIAL SUCCESS - Some issues detected, check failed tests above');
            } else {
                console.log('❌ MAJOR ISSUES - Helios integration may not be working properly');
            }
            
            // Compact summary like Haskell test script
            console.log('\n📊 COMPACT SUMMARY:');
            console.log('===================');
            const timeline = rawHelios.timelineAnalysis || {};
            const milestones = preview.milestones || {};
            
            console.log(`✅ Onboarding Flow: Background → Target → Commitment → Confidence → Preview`);
            console.log(`📋 Study Plan: ${timeline.currentYear || 'N/A'} → ${timeline.targetYear || 'N/A'} ` +
                       `(${timeline.weeksAvailable || 'N/A'}w, ${cycles.length}c, ${totalBlocks}b)`);
            console.log(`🎯 Milestones: Foundation→Prelims: ${milestones.foundationToPrelimsDate || 'N/A'}, ` +
                       `Prelims→Mains: ${milestones.prelimsToMainsDate || 'N/A'}`);
            console.log(`⚙️  Engine Status: ${!isUsingFallback && totalBlocks > 0 ? 'Helios Active' : 'Using Fallback'}`);
            console.log(`📈 Test Score: ${passedTests}/4 (${Math.round(passedTests/4*100)}%)`);
            console.log(`\nLegend: w=weeks, c=cycles, b=blocks`);
            
        } else {
            console.log('❌ Preview data retrieval failed - cannot perform analysis');
            console.log('This indicates a service issue that needs to be resolved');
        }
        
    } catch (error) {
        console.error('\n❌ TEST FAILED:');
        console.error(error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
runTest();
