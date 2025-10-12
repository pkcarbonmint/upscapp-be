/**
 * Demo script showing how to use the improved PDF generation
 * 
 * This demonstrates the new structured PDF generation that matches 
 * the Word document format with proper tables and formatting.
 */

import { ImprovedPDFService, EnhancedPDFService } from '../src/index';
import type { StudyPlan, StudentIntake } from '../src/types/models';

// Sample study plan data
const sampleStudyPlan: StudyPlan = {
  study_plan_id: 'demo-plan-2025',
  plan_title: 'UPSC 2025 Comprehensive Study Plan',
  targeted_year: 2025,
  cycles: [
    {
      cycleId: 'cycle-1',
      cycleName: 'NCERT Foundation Phase',
      cycleType: 'C1',
      cycleDuration: 16,
      cycleStartDate: '2024-01-01',
      cycleEndDate: '2024-04-21',
      cycleBlocks: [
        {
          block_id: 'block-1',
          block_title: 'NCERT Mathematics & Science Foundation',
          subjects: ['MAT', 'PHY', 'CHE', 'BIO'],
          duration_weeks: 8,
          block_start_date: '2024-01-01',
          block_end_date: '2024-02-26',
          block_resources: {
            primary_books: [
              {
                resource_title: 'NCERT Mathematics Class XI & XII',
                resource_priority: 'High',
                resource_cost: { type: 'Free' }
              }
            ],
            supplementary_materials: [],
            video_content: [],
            practice_resources: [],
            current_affairs_sources: [],
            revision_materials: [],
            expert_recommendations: []
          }
        },
        {
          block_id: 'block-2',
          block_title: 'NCERT Social Sciences Foundation',
          subjects: ['HIS', 'GEO', 'POL', 'ECO'],
          duration_weeks: 8,
          block_start_date: '2024-02-27',
          block_end_date: '2024-04-21',
          block_resources: {
            primary_books: [
              {
                resource_title: 'NCERT History Class XI & XII',
                resource_priority: 'High',
                resource_cost: { type: 'Free' }
              }
            ],
            supplementary_materials: [],
            video_content: [],
            practice_resources: [],
            current_affairs_sources: [],
            revision_materials: [],
            expert_recommendations: []
          }
        }
      ]
    },
    {
      cycleId: 'cycle-2',
      cycleName: 'Prelims Revision Intensive',
      cycleType: 'C4',
      cycleDuration: 8,
      cycleStartDate: '2024-04-22',
      cycleEndDate: '2024-06-17',
      cycleBlocks: [
        {
          block_id: 'block-3',
          block_title: 'Prelims Intensive Revision',
          subjects: ['GS1', 'GS2', 'CSAT'],
          duration_weeks: 6,
          block_start_date: '2024-04-22',
          block_end_date: '2024-06-03',
          block_resources: {
            primary_books: [],
            supplementary_materials: [],
            video_content: [],
            practice_resources: [
              {
                resource_title: 'UPSC Prelims Previous Years Papers',
                resource_priority: 'High',
                resource_cost: { type: 'Paid', amount: 1500 }
              }
            ],
            current_affairs_sources: [],
            revision_materials: [],
            expert_recommendations: []
          }
        },
        {
          block_id: 'block-4',
          block_title: 'Mock Test Series',
          subjects: ['GS1', 'GS2', 'CSAT'],
          duration_weeks: 2,
          block_start_date: '2024-06-04',
          block_end_date: '2024-06-17',
          block_resources: {
            primary_books: [],
            supplementary_materials: [],
            video_content: [],
            practice_resources: [
              {
                resource_title: 'Comprehensive Mock Test Series',
                resource_priority: 'High',
                resource_cost: { type: 'Paid', amount: 3000 }
              }
            ],
            current_affairs_sources: [],
            revision_materials: [],
            expert_recommendations: []
          }
        }
      ]
    }
  ]
};

// Sample student intake data
const sampleStudentIntake: StudentIntake = {
  start_date: '2024-01-01',
  target_year: '2025',
  personal_details: {
    full_name: 'Rajesh Kumar Singh',
    email: 'rajesh.singh@example.com',
    phone_number: '+91-9876543210',
    present_location: 'New Delhi',
    student_archetype: 'Dedicated Achiever',
    graduation_stream: 'Engineering',
    college_university: 'IIT Delhi',
    year_of_passing: 2022
  },
  preparation_background: {
    preparing_since: '2023',
    number_of_attempts: 'First Attempt',
    highest_stage_per_attempt: 'Fresh Start',
    last_attempt_gs_prelims_score: 0,
    last_attempt_csat_score: 0
  },
  coaching_details: {
    prior_coaching: 'Yes',
    coaching_institute_name: 'Drishti IAS',
    prior_mentorship: 'No',
    place_of_preparation: 'New Delhi'
  },
  study_strategy: {
    weekly_study_hours: '60+ hours',
    study_approach: 'Systematic & Comprehensive',
    time_distribution: '60% Study, 25% Practice, 15% Current Affairs',
    revision_strategy: 'Spaced Repetition',
    test_frequency: 'Daily practice + Weekly full tests',
    catch_up_day_preference: 'Sunday'
  }
};

/**
 * Demo function showing different PDF generation options
 */
async function demonstratePDFGeneration() {
  console.log('🚀 Helios PDF Generation Demo');
  console.log('=====================================');
  
  try {
    // Option 1: Generate structured PDF (NEW - matches Word document format)
    console.log('📋 Generating structured PDF (matches Word document)...');
    await ImprovedPDFService.generateStudyPlanPDF(
      sampleStudyPlan, 
      sampleStudentIntake, 
      'demo-structured-study-plan.pdf'
    );
    console.log('✅ Structured PDF generated successfully!');
    
    // Option 2: Generate enhanced PDF via wrapper method
    console.log('📋 Generating structured PDF via EnhancedPDFService wrapper...');
    await EnhancedPDFService.generateStructuredStudyPlanPDF(
      sampleStudyPlan,
      sampleStudentIntake,
      'demo-enhanced-structured-plan.pdf'
    );
    console.log('✅ Enhanced structured PDF generated successfully!');
    
    // Option 3: Generate visual/chart-based PDF (EXISTING - for comparison)
    console.log('📊 Generating visual PDF with charts (existing method)...');
    await EnhancedPDFService.generateEnhancedStudyPlanPDF(
      sampleStudyPlan,
      sampleStudentIntake,
      'demo-visual-study-plan.pdf'
    );
    console.log('✅ Visual PDF generated successfully!');
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
  }
}

/**
 * Usage examples for different scenarios
 */
export const PDFGenerationExamples = {
  
  /**
   * Generate PDF for browser download
   * Use this in web applications
   */
  async generateForBrowser(studyPlan: StudyPlan, studentIntake: StudentIntake) {
    // This automatically triggers browser download
    await ImprovedPDFService.generateStudyPlanPDF(studyPlan, studentIntake);
  },
  
  /**
   * Generate PDF with custom filename
   */
  async generateWithCustomName(studyPlan: StudyPlan, studentIntake: StudentIntake, filename: string) {
    await ImprovedPDFService.generateStudyPlanPDF(studyPlan, studentIntake, filename);
  },
  
  /**
   * Generate structured PDF (recommended for matching Word documents)
   */
  async generateStructuredPDF(studyPlan: StudyPlan, studentIntake: StudentIntake) {
    // This creates a PDF with:
    // - Title and subtitle
    // - Student profile table
    // - Study blocks tables for each cycle
    // - Resources section
    // - Professional formatting matching Word documents
    await ImprovedPDFService.generateStudyPlanPDF(studyPlan, studentIntake);
  },
  
  /**
   * Generate visual PDF (existing method with charts)
   */
  async generateVisualPDF(studyPlan: StudyPlan, studentIntake: StudentIntake) {
    // This creates a PDF with:
    // - Beautiful HTML/CSS design
    // - Interactive charts converted to images
    // - Modern visual design
    await EnhancedPDFService.generateEnhancedStudyPlanPDF(studyPlan, studentIntake);
  }
};

// Export the demo data for use in tests or other demos
export { sampleStudyPlan, sampleStudentIntake };

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstratePDFGeneration()
    .then(() => {
      console.log('🎉 Demo completed successfully!');
      console.log('📂 Check your downloads folder for the generated PDFs');
    })
    .catch((error) => {
      console.error('💥 Demo failed:', error);
      process.exit(1);
    });
}