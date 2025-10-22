// Service for integrating with helios-ts library
import type { ConfidenceLevel, StudentIntake, StudyPlan, Config } from 'helios-ts';
import { createStudentIntake } from 'helios-ts';
import type { IntakeWizardFormData } from '../types';

// Dynamic imports for heavy helios-ts functions to reduce initial bundle size
async function loadHeliosPlanGenerator() {
  const { generateInitialPlan } = await import('helios-ts');
  return generateInitialPlan;
}

async function loadSubjects() {
  const { loadAllSubjects } = await import('helios-ts');
  return loadAllSubjects();
}

async function loadOptionalSubjects() {
  const { getAllOptionalSubjects } = await import('helios-ts');
  return getAllOptionalSubjects();
}

const getConfig = (): Config => ({
  block_duration_clamp: {
    min_weeks: 2,
    max_weeks: 8
  },
  daily_hour_limits: {
    regular_day: 8,
    catch_up_day: 10,
    test_day: 6
  },
  task_effort_split: {
    study: 0.6,
    revision: 0.2,
    practice: 0.15,
    gs_optional_ratio: 1
  }
});

/**
 * Simple archetype selection based on student profile
 * This is a simplified version of the helios-ts ArchetypeSelector
 */
function selectBestArchetype(intake: StudentIntake): any {
  const weeklyHours = parseInt(intake.study_strategy.weekly_study_hours) || 0;
  const currentStatus = intake.personal_details?.student_archetype?.toLowerCase() || '';
  
  // Determine time commitment
  let timeCommitment: 'PartTime' | 'FullTime';
  if (weeklyHours >= 40 || currentStatus.includes('student') || currentStatus.includes('unemployed')) {
    timeCommitment = 'FullTime';
  } else {
    timeCommitment = 'PartTime';
  }
  
  // Determine study pacing based on confidence levels
  const confidenceLevels = Object.values(intake.subject_confidence);
  const weakSubjects = confidenceLevels.filter(level => level === 'Weak' || level === 'NotStarted').length;
  const strongSubjects = confidenceLevels.filter(level => level === 'Strong').length;
  
  let studyPacing: 'WeakFirst' | 'StrongFirst' | 'Balanced';
  if (weakSubjects > strongSubjects) {
    studyPacing = 'WeakFirst';
  } else if (strongSubjects > weakSubjects) {
    studyPacing = 'StrongFirst';
  } else {
    studyPacing = 'Balanced';
  }
  
  // Create archetype
  return {
    archetype: timeCommitment === 'FullTime' ? 'The Full-Time Student' : 'The Working Professional',
    timeCommitment,
    weeklyHoursMin: timeCommitment === 'FullTime' ? 35 : 15,
    weeklyHoursMax: timeCommitment === 'FullTime' ? 60 : 35,
    description: timeCommitment === 'FullTime' 
      ? 'Full-time student with 35+ hours per week available for study'
      : 'Working professional with limited study time (15-35 hours per week)',
    defaultPacing: studyPacing,
    defaultApproach: 'DualSubject' as any,
    specialFocus: []
  };
}

/**
 * Ensure all subjects have a default confidence level
 * The confidence data now comes directly from the UI using helios-ts subject codes
 */
async function ensureDefaultConfidenceLevels(confidenceLevel: IntakeWizardFormData['confidenceLevel']): Promise<Record<string, ConfidenceLevel>> {
  const subjects = await loadSubjects();
  const subjectConfidence = { ...confidenceLevel };
  
  // Ensure all subjects have a default confidence level
  subjects.forEach((subject: any) => {
    if (!(subject.subjectCode in subjectConfidence)) {
      subjectConfidence[subject.subjectCode] = 'Moderate';
    }
  });

  return subjectConfidence;
}

/**
 * Transform onboarding-ui form data to helios-ts StudentIntake format
 */
export async function transformToStudentIntake(formData: IntakeWizardFormData): Promise<StudentIntake> {
  const { background, targetYear, commitment, confidenceLevel } = formData;

  // Map study preference to helios format
  const mapStudyPreference = (preference: string): 'WeakFirst' | 'StrongFirst' | 'Balanced' => {
    switch (preference) {
      case 'WeakSubjectsFirst': return 'WeakFirst';
      case 'StrongSubjectsFirst': return 'StrongFirst';
      case 'Balanced': return 'Balanced';
      default: return 'Balanced';
    }
  };

  // Use confidence data directly from UI (now using helios-ts subject codes)
  const subjectConfidence = await ensureDefaultConfidenceLevels(confidenceLevel);

  // Create study strategy
  const studyStrategy = {
    study_focus_combo: 'TwoGS' as any, // Default to TwoGS for now
    weekly_study_hours: (commitment.timeCommitment ? commitment.timeCommitment * 7 : 35).toString(),
    time_distribution: 'balanced',
    study_approach: mapStudyPreference(commitment.studyPreference),
    revision_strategy: 'weekly',
    test_frequency: 'monthly',
    seasonal_windows: ['morning', 'evening'],
    catch_up_day_preference: 'sunday',
    upsc_optional_subject: commitment.upscOptionalSubject
  };

  // Create student intake with all required fields
  const studentIntake: StudentIntake = createStudentIntake({
    subject_confidence: subjectConfidence,
    study_strategy: studyStrategy,
    subject_approach: commitment.subjectApproach as any,
    target_year: targetYear.targetYear,
    start_date: targetYear.startDate || new Date().toISOString().split('T')[0], // Fallback to today if not set
    personal_details: {
      full_name: background.fullName,
      email: background.email,
      phone_number: background.phoneNumber,
      present_location: background.presentLocation,
      student_archetype: background.graduationStream, // Use graduation stream as archetype hint
      graduation_stream: background.graduationStream,
      college_university: background.collegeUniversity,
      year_of_passing: background.yearOfPassing
    },
    // Add missing optional fields with sensible defaults
    preparation_background: {
      preparing_since: '0',
      number_of_attempts: '0',
      highest_stage_per_attempt: 'None',
      last_attempt_gs_prelims_score: 0,
      last_attempt_csat_score: 0,
      wrote_mains_in_last_attempt: 'No',
      mains_paper_marks: '0'
    },
    coaching_details: {
      prior_coaching: 'No',
      coaching_institute_name: 'None',
      prior_mentorship: 'No',
      programme_mentor_name: 'None',
      place_of_preparation: 'Home'
    },
    syllabus_awareness: {
      gs_syllabus_understanding: 'Basic',
      optional_syllabus_understanding: 'Basic',
      pyq_awareness_and_use: 'Basic'
    }
  });

  return studentIntake;
}

/**
 * Generate study plan preview using helios-ts library
 */
export async function generateStudyPlanPreview(formData: IntakeWizardFormData): Promise<{
  studyPlanId: string;
  raw_helios_data: StudyPlan;
  milestones: {
    foundationToPrelimsDate: string | null;
    prelimsToMainsDate: string | null;
  };
}> {
  try {
    // Transform form data to student intake
    const studentIntake = await transformToStudentIntake(formData);
    
    // Select best archetype for the student
    const archetype = await selectBestArchetype(studentIntake);
    
    // Generate study plan using helios-ts
    const userId = `preview-${Date.now()}`;
    
    console.log('About to call generateInitialPlan', { userId, archetype, studentIntake });
    const generateInitialPlan = await loadHeliosPlanGenerator();
    const result = await generateInitialPlan(userId, getConfig(), archetype, studentIntake);
    
    // Extract milestones from the plan
    const milestones = {
      foundationToPrelimsDate: result.plan.milestones?.foundationToPrelimsDate || null,
      prelimsToMainsDate: result.plan.milestones?.prelimsToMainsDate || null
    };

    return {
      studyPlanId: result.plan.study_plan_id,
      raw_helios_data: result.plan,
      milestones
    };
  } catch (error) {
    console.error('Error generating study plan preview:', error);
    throw new Error('Failed to generate study plan preview');
  }
}

/**
 * Get preview data for the onboarding wizard
 * This replaces the server call with helios-ts library calls
 */
export async function getPreviewData(formData: IntakeWizardFormData): Promise<{
  preview: {
    studyPlanId: string;
    raw_helios_data: StudyPlan;
    milestones: {
      foundationToPrelimsDate: string | null;
      prelimsToMainsDate: string | null;
    };
  };
}> {
  const previewData = await generateStudyPlanPreview(formData);
  
  return {
    preview: previewData
  };
}

// Export the loadOptionalSubjects function
export { loadOptionalSubjects };
