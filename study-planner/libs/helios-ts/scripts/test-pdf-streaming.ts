#!/usr/bin/env node

/**
 * Test script to verify PDF streaming works without TargetCloseError
 */

import { createWriteStream } from 'fs';
import * as path from 'path';
import * as fs from 'fs';

async function testPDFStreaming() {
  console.log('🧪 Testing PDF Streaming Implementation');
  console.log('=====================================');
  
  try {
    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'generated-docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    
    // Test the streaming PDF generation
    console.log('📄 Testing streaming PDF generation...');
    const startTime = Date.now();
    
    // Import the CalendarPDFService using dynamic import with proper path
    const { CalendarPDFService } = await import('../src/services/CalendarPDFService.ts');
    
    // Create a mock study plan and student intake for testing
    const mockStudyPlan = {
      study_plan_id: 'test-streaming',
      plan_title: 'Test Streaming PDF',
      targeted_year: 2027,
      start_date: new Date('2025-01-01'),
      cycles: [],
      user_id: 'test-user',
      curated_resources: {
        essential_resources: [],
        alternative_options: [],
        budget_summary: {
          total_cost: 0,
          essential_cost: 0,
          optional_cost: 0,
          free_alternatives: 0,
          subscription_cost: 0
        },
        recommended_timeline: {
          immediate_needs: [],
          mid_term_needs: [],
          long_term_needs: []
        }
      }
    };
    
    const mockStudentIntake = {
      personal_details: {
        full_name: 'Test Student',
        email: 'test@example.com'
      },
      target_year: '2027',
      start_date: '2025-01-01'
    };
    
    // Create output file path
    const outputPath = path.join(outputDir, 'test-streaming.pdf');
    const writeStream = createWriteStream(outputPath);
    
    // Generate PDF using streaming method
    await CalendarPDFService.generateStudyPlanPDFToStream(
      mockStudyPlan as any,
      mockStudentIntake as any,
      writeStream,
      { filename: 'test-streaming.pdf' }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ PDF streaming completed in ${duration}ms`);
    
    // Verify the file was created
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`📁 PDF file created: ${path.resolve(outputPath)}`);
      console.log(`📊 File size: ${(stats.size / 1024).toFixed(1)} KB`);
      console.log('🎉 Streaming test completed successfully!');
    } else {
      console.error('❌ PDF file was not created');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ PDF streaming test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPDFStreaming().catch(console.error);
