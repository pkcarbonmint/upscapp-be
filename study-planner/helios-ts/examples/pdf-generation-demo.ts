/**
 * Demo script showing how to use both PDF generation services
 * 
 * This demonstrates:
 * 1. The original PDFService (jsPDF-based)
 * 2. The new HighFidelityPDFService (Puppeteer-based) 
 * 
 * Both services have identical interfaces for easy swapping
 */

import { PDFService } from '../src/index';
// Dynamic import for HighFidelityPDFService to avoid bundling issues
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
 * Demo function showing different PDF generation options for both services
 */
async function demonstratePDFGeneration() {
  console.log('🚀 Helios PDF Generation Services Comparison Demo');
  console.log('================================================');
  
  try {
    // ===== ORIGINAL JSPDF-BASED SERVICE =====
    console.log('\n📄 Testing Original PDFService (jsPDF-based)...');
    
    console.log('📋 Generating structured PDF with original service...');
    await PDFService.generateStructuredPDF(
      sampleStudyPlan, 
      sampleStudentIntake, 
      'original-structured-study-plan.pdf'
    );
    console.log('✅ Original structured PDF generated successfully!');
    
    console.log('📊 Generating visual PDF with original service...');
    await PDFService.generateVisualPDF(
      sampleStudyPlan,
      sampleStudentIntake,
      'original-visual-study-plan.pdf'
    );
    console.log('✅ Original visual PDF generated successfully!');
    
    // ===== NEW HIGH-FIDELITY PUPPETEER-BASED SERVICE =====
    console.log('\n🎨 Testing HighFidelityPDFService (Puppeteer-based)...');
    
    // Dynamically import HighFidelityPDFService to avoid bundling issues
    const { HighFidelityPDFService } = await import('../src/services/HighFidelityPDFService');
    
    console.log('📋 Generating high-fidelity structured PDF...');
    await HighFidelityPDFService.generateStructuredPDF(
      sampleStudyPlan, 
      sampleStudentIntake, 
      'high-fidelity-structured-study-plan.pdf'
    );
    console.log('✅ High-fidelity structured PDF generated successfully!');
    
    console.log('📊 Generating high-fidelity visual PDF...');
    await HighFidelityPDFService.generateVisualPDF(
      sampleStudyPlan,
      sampleStudentIntake,
      'high-fidelity-visual-study-plan.pdf'
    );
    console.log('✅ High-fidelity visual PDF generated successfully!');
    
    // ===== UNIFIED API COMPARISON =====
    console.log('\n🎯 Testing unified APIs (both services have identical interfaces)...');
    
    // Original service with unified API
    await PDFService.generateStudyPlanPDF(sampleStudyPlan, sampleStudentIntake, {
      type: 'structured',
      filename: 'original-unified-structured.pdf'
    });
    console.log('✅ Original service unified API - structured');
    
    await PDFService.generateStudyPlanPDF(sampleStudyPlan, sampleStudentIntake, {
      type: 'visual',
      filename: 'original-unified-visual.pdf'
    });
    console.log('✅ Original service unified API - visual');
    
    // High-fidelity service with unified API  
    await HighFidelityPDFService.generateStudyPlanPDF(sampleStudyPlan, sampleStudentIntake, {
      type: 'structured',
      filename: 'high-fidelity-unified-structured.pdf'
    });
    console.log('✅ High-fidelity service unified API - structured');
    
    await HighFidelityPDFService.generateStudyPlanPDF(sampleStudyPlan, sampleStudentIntake, {
      type: 'visual', 
      filename: 'high-fidelity-unified-visual.pdf'
    });
    console.log('✅ High-fidelity service unified API - visual');
    
    console.log('\n🎉 All PDF generation tests completed successfully!');
    console.log('📂 Check your generated-docs folder for all the PDFs');
    
    console.log('\n📊 Summary:');
    console.log('- Original PDFService: 4 PDFs generated (good for quick generation)');
    console.log('- HighFidelityPDFService: 4 PDFs generated (superior quality, modern aesthetics)');
    console.log('- Both services have identical interfaces for easy swapping');
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
  }
}

/**
 * Usage examples for different scenarios showing both services
 */
export const PDFGenerationExamples = {
  
  /**
   * Generate structured PDF using original service (jsPDF-based)
   */
  async generateOriginalStructuredPDF(studyPlan: StudyPlan, studentIntake: StudentIntake, filename?: string) {
    // Uses jsPDF with autoTable for structured layout
    // Good for: Quick generation, smaller file sizes, broad compatibility
    await PDFService.generateStructuredPDF(studyPlan, studentIntake, filename);
  },
  
  /**
   * Generate structured PDF using high-fidelity service (Puppeteer-based)
   */
  async generateHighFidelityStructuredPDF(studyPlan: StudyPlan, studentIntake: StudentIntake, filename?: string) {
    // Dynamically import HighFidelityPDFService to avoid bundling issues
    const { HighFidelityPDFService } = await import('../src/services/HighFidelityPDFService');
    // Uses Puppeteer with high-quality HTML/CSS rendering
    // Good for: Superior aesthetics, modern design, precise typography
    await HighFidelityPDFService.generateStructuredPDF(studyPlan, studentIntake, filename);
  },
  
  /**
   * Generate visual PDF with charts using original service
   */
  async generateOriginalVisualPDF(studyPlan: StudyPlan, studentIntake: StudentIntake, filename?: string) {
    // Uses jsPDF with html2canvas for chart rendering
    // Good for: Interactive charts, moderate visual quality
    await PDFService.generateVisualPDF(studyPlan, studentIntake, filename);
  },
  
  /**
   * Generate visual PDF with charts using high-fidelity service
   */
  async generateHighFidelityVisualPDF(studyPlan: StudyPlan, studentIntake: StudentIntake, filename?: string) {
    // Dynamically import HighFidelityPDFService to avoid bundling issues
    const { HighFidelityPDFService } = await import('../src/services/HighFidelityPDFService');
    // Uses Puppeteer with native browser chart rendering
    // Good for: Crisp charts, advanced CSS effects, premium presentation
    await HighFidelityPDFService.generateVisualPDF(studyPlan, studentIntake, filename);
  },
  
  /**
   * Easy swapping between services - both have identical interfaces
   */
  async generateWithEasySwapping(studyPlan: StudyPlan, studentIntake: StudentIntake, useHighFidelity = true) {
    // Dynamically import HighFidelityPDFService to avoid bundling issues
    const { HighFidelityPDFService } = await import('../src/services/HighFidelityPDFService');
    // Choose service based on requirements
    const pdfService = useHighFidelity ? HighFidelityPDFService : PDFService;
    
    // Generate structured PDF (recommended for professional documents)
    await pdfService.generateStructuredPDF(studyPlan, studentIntake, 'professional-plan.pdf');
    
    // Generate visual PDF (recommended for presentations)
    await pdfService.generateVisualPDF(studyPlan, studentIntake, 'presentation-plan.pdf');
    
    // Use unified API
    await pdfService.generateStudyPlanPDF(studyPlan, studentIntake, {
      type: 'structured',
      filename: 'unified-plan.pdf'
    });
  },
  
  /**
   * Performance comparison - choose based on your needs
   */
  async performanceComparison(studyPlan: StudyPlan, studentIntake: StudentIntake) {
    console.log('⚡ Performance Comparison:');
    
    // Original service - faster, smaller files
    console.time('Original PDFService');
    await PDFService.generateStructuredPDF(studyPlan, studentIntake, 'fast-generation.pdf');
    console.timeEnd('Original PDFService');
    
    // High-fidelity service - slower, higher quality
    console.time('HighFidelityPDFService');
    const { HighFidelityPDFService } = await import('../src/services/HighFidelityPDFService');
    await HighFidelityPDFService.generateStructuredPDF(studyPlan, studentIntake, 'premium-quality.pdf');
    console.timeEnd('HighFidelityPDFService');
    
    console.log('📊 Choose based on your priorities:');
    console.log('- Original: Speed, compatibility, smaller files');
    console.log('- HighFidelity: Quality, aesthetics, modern design');
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