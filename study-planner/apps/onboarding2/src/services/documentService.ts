import { DocumentService, createStudentIntake, type StudentIntake, type StudyPlan } from 'helios-ts';
import { OnboardingFormData } from '@/types';
import dayjs from 'dayjs';

/**
 * Transform onboarding form data to StudentIntake format
 */
function transformToStudentIntake(formData: OnboardingFormData): StudentIntake {
  const { personalInfo, targetYear, commitment, confidenceLevel } = formData;
  
  // Map confidence levels from onboarding format to helios format
  const subjectConfidence: Record<string, any> = {};
  Object.entries(confidenceLevel).forEach(([subject, level]) => {
    // Map numeric confidence (1-5) to ConfidenceLevel enum
    const confidenceMap: Record<number, string> = {
      5: 'VeryStrong',
      4: 'Strong',
      3: 'Moderate',
      2: 'Weak',
      1: 'VeryWeak',
      0: 'NotStarted'
    };
    subjectConfidence[subject] = confidenceMap[level] || 'Moderate';
  });

  // Create student intake data
  const intakeData = {
    subject_confidence: subjectConfidence,
    study_strategy: {
      study_focus_combo: 'GSOptional' as any,
      weekly_study_hours: String(commitment.timeCommitment * 7), // Convert daily to weekly
      time_distribution: commitment.studyPreference || 'Balanced',
      study_approach: 'Balanced' as any,
      revision_strategy: 'Regular',
      test_frequency: 'Weekly',
      seasonal_windows: [],
      catch_up_day_preference: commitment.catchupDayPreference || '6',
      optional_first_preference: commitment.optionalFirst || false,
      upsc_optional_subject: commitment.upscOptionalSubject || '',
      weekly_test_day_preference: commitment.weeklyTestDayPreference || '0'
    },
    subject_approach: commitment.subjectApproach as any || 'Balanced',
    target_year: targetYear.targetYear,
    start_date: targetYear.startDate 
      ? dayjs(targetYear.startDate).format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD'),
    personal_details: {
      full_name: personalInfo.fullName,
      email: personalInfo.email,
      phone_number: personalInfo.phoneNumber,
      present_location: personalInfo.presentLocation,
      student_archetype: 'Standard', // Default archetype
      graduation_stream: personalInfo.graduationStream,
      college_university: personalInfo.collegeUniversity,
      year_of_passing: personalInfo.yearOfPassing
    },
    preparation_background: {
      preparing_since: 'Recent', // Default value
      number_of_attempts: '0', // Default for new students
      highest_stage_per_attempt: 'N/A' // Default for freshers
    },
    optional_subject: commitment.upscOptionalSubject ? {
      optional_subject_name: commitment.upscOptionalSubject,
      optional_status: 'NotStarted',
      optional_taken_from: 'Fresh'
    } : undefined
  };

  return createStudentIntake(intakeData);
}

/**
 * Transform helios scheduler data to StudyPlan format
 */
function transformToStudyPlan(formData: OnboardingFormData): StudyPlan {
  const { preview, targetYear } = formData;
  const rawData = preview.raw_helios_data;
  
  // Create a minimal StudyPlan structure
  // Note: This is a simplified version since we don't have full cycle data yet
  const studyPlan: StudyPlan = {
    study_plan_id: preview.studyPlanId || `plan_${Date.now()}`,
    user_id: `student_${Date.now()}`,
    plan_title: `Study Plan ${targetYear.targetYear}`,
    targeted_year: parseInt(targetYear.targetYear),
    start_date: targetYear.startDate 
      ? new Date(targetYear.startDate)
      : new Date(),
    cycles: rawData?.cycles && Array.isArray(rawData.cycles) ? rawData.cycles : [],
    curated_resources: {
      essential_resources: [],
      recommended_timeline: {
        immediate_needs: [],
        mid_term_needs: [],
        long_term_needs: []
      },
      budget_summary: {
        total_cost: 0,
        essential_cost: 0,
        optional_cost: 0,
        free_alternatives: 0,
        subscription_cost: 0
      },
      alternative_options: []
    },
    timelineAnalysis: {
      currentYear: new Date().getFullYear(),
      targetYear: parseInt(targetYear.targetYear),
      weeksAvailable: Math.floor(dayjs(`${targetYear.targetYear}-08-20`).diff(
        targetYear.startDate || new Date(), 'day'
      ) / 7),
      cycleCount: rawData?.cycles && Array.isArray(rawData.cycles) ? rawData.cycles.length : 0,
      cycleDistribution: []
    },
    milestones: {
      foundationToPrelimsDate: preview.milestones.foundationToPrelimsDate?.toISOString(),
      prelimsToMainsDate: preview.milestones.prelimsToMainsDate?.toISOString()
    },
    scenario: 'S1'
  };

  return studyPlan;
}

/**
 * Generate and download Word document for study plan
 */
export async function downloadStudyPlanDocument(formData: OnboardingFormData): Promise<void> {
  try {
    console.log('📄 Generating study plan Word document...');
    
    // Transform form data to required formats
    const studentIntake = transformToStudentIntake(formData);
    const studyPlan = transformToStudyPlan(formData);
    
    // Generate filename
    const filename = `study-plan-${formData.personalInfo.fullName.replace(/\s+/g, '-')}-${Date.now()}.docx`;
    
    // Generate and download document using helios-ts DocumentService
    await DocumentService.generateAndDownloadDocument(studyPlan, studentIntake, filename);
    
    console.log('✅ Study plan document generated successfully!');
  } catch (error) {
    console.error('❌ Failed to generate study plan document:', error);
    throw new Error('Failed to generate document. Please try again.');
  }
}

/**
 * Check if document generation is available
 * (Returns true if we have enough data to generate a document)
 */
export function canGenerateDocument(formData: OnboardingFormData): boolean {
  return !!(
    formData.personalInfo?.fullName &&
    formData.targetYear?.targetYear &&
    formData.commitment?.timeCommitment &&
    formData.preview?.raw_helios_data
  );
}
