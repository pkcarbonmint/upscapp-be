import { UIWizardData, StudentIntake, StudyStrategy, createStudentIntake } from '../types/models';
import { ConfidenceLevel, SubjectCode } from '../types/Types';

/**
 * Transform UI wizard data to StudentIntake format
 * This mirrors the Haskell DataTransform module functionality
 */
export function transformUIToStudentIntake(wizardData: UIWizardData): StudentIntake {
    const { 
        study_strategy: strategy,
        subject_confidence: assessment,
        start_date, 
        personal_and_academic_details: bg,
        preparation_background: prep,
        coaching_and_mentorship: coaching,
        syllabus_and_pyq_awareness: awareness
    } = wizardData;
  // Transform study strategy
  const studyStrategy: StudyStrategy = {
    study_focus_combo: mapStudyFocusCombo(strategy.study_focus_combo) as any,
    weekly_study_hours: strategy.weekly_study_hours,
    time_distribution: strategy.time_distribution,
    study_approach: mapStudyApproach(strategy.study_approach) as any,
    revision_strategy: strategy.revision_strategy,
    test_frequency: strategy.test_frequency,
    seasonal_windows: strategy.seasonal_windows,
    catch_up_day_preference: strategy.catch_up_day_preference,
    optional_first_preference: strategy.optional_first_preference,
  };
  if (!start_date) {
    throw new Error("start_date is required");
  }
  // Transform subject confidence
  const subjectConfidence = mapSubjectConfidence(assessment);


  // Build StudentIntake using createStudentIntake helper
  const intake: StudentIntake = createStudentIntake({
    subject_approach: 'DualSubject',
    subject_confidence: subjectConfidence,
    study_strategy: studyStrategy,
    target_year: prep?.target_year,
    start_date: start_date,
    personal_details: bg ? {
      full_name: bg.full_name,
      email: bg.email,
      phone_number: bg.phone_number,
      present_location: bg.present_location,
      student_archetype: bg.current_status || 'Unknown',
      graduation_stream: bg.graduation_stream,
      college_university: bg.college_university,
      year_of_passing: bg.year_of_passing
    } : {
      full_name: 'Unknown Student',
      email: 'unknown@example.com',
      phone_number: '+911234567890',
      present_location: 'Unknown Location',
      student_archetype: 'General',
      graduation_stream: 'Unknown',
      college_university: 'Unknown College',
      year_of_passing: new Date().getFullYear()
    },
    preparation_background: prep ? {
      preparing_since: prep.preparing_since,
      number_of_attempts: prep.number_of_attempts,
      highest_stage_per_attempt: prep.highest_stage_per_attempt,
      last_attempt_gs_prelims_score: prep.last_attempt_gs_prelims_score,
      last_attempt_csat_score: prep.last_attempt_csat_score,
      wrote_mains_in_last_attempt: prep.wrote_mains_in_last_attempt,
      mains_paper_marks: prep.mains_paper_marks
    } : {
      preparing_since: 'Just Starting',
      number_of_attempts: '0',
      highest_stage_per_attempt: 'N/A'
    },
    coaching_details: coaching ? {
      prior_coaching: coaching.prior_coaching,
      coaching_institute_name: coaching.coaching_institute_name || 'None',
      prior_mentorship: coaching.prior_mentorship || 'No',
      programme_mentor_name: coaching.programme_mentor_name || 'None',
      place_of_preparation: coaching.place_of_preparation || 'Home'
    } : undefined,
    syllabus_awareness: awareness ? {
      gs_syllabus_understanding: awareness.gs_syllabus_understanding,
      optional_syllabus_understanding: awareness.optional_syllabus_understanding,
      pyq_awareness_and_use: awareness.pyq_awareness_and_use
    } : undefined
  });

  return intake;
}

/**
 * Map UI subject confidence to backend format
 */
function mapSubjectConfidence(uiConfidence: any): Record<SubjectCode, ConfidenceLevel> {
  const confidenceMap: Record<string, ConfidenceLevel> = {};
  
  // Map UI field names to subject codes
  const subjectMapping: Record<string, SubjectCode> = {
    'current_events': 'CA',
    'history': 'H01',
    'geography': 'G01',
    'polity': 'P01',
    'economy': 'E01',
    'science_technology': 'S01',
    'environment': 'EN01',
    'ethics': 'ET01',
    'public_administration': 'PA01',
    'sociology': 'SO01',
    'psychology': 'PS01',
    'philosophy': 'PH01',
    'literature': 'LI01',
    'agriculture': 'AG01',
    'anthropology': 'AN01',
    'commerce_accountancy': 'CO01',
    'management': 'MG01',
    'mathematics': 'MA01',
    'statistics': 'ST01',
    'political_science': 'PS01',
    'international_relations': 'IR01'
  };

  // Transform confidence levels
  const confidenceMapping: Record<string, ConfidenceLevel> = {
    'not_started': 'NotStarted',
    'beginner': 'Weak',
    'intermediate': 'Moderate',
    'advanced': 'Strong',
    'expert': 'Strong'
  };

  // Process each subject
  for (const [uiField, confidence] of Object.entries(uiConfidence)) {
    const subjectCode = subjectMapping[uiField];
    if (subjectCode && confidence && typeof confidence === 'string') {
      confidenceMap[subjectCode] = confidenceMapping[confidence] || 'Moderate';
    }
  }

  return confidenceMap as Record<SubjectCode, ConfidenceLevel>;
}

/**
 * Map study focus combo
 */
function mapStudyFocusCombo(uiCombo: string): string {
  const comboMapping: Record<string, string> = {
    'one_gs_plus_optional': 'OneGSPlusOptional',
    'one_gs': 'OneGS',
    'two_gs': 'TwoGS',
    'three_gs': 'ThreeGS',
    'comprehensive': 'Comprehensive'
  };
  
  return comboMapping[uiCombo] || 'OneGSPlusOptional';
}

/**
 * Map study approach
 */
function mapStudyApproach(uiApproach: string): string {
  const approachMapping: Record<string, string> = {
    'weak_subjects_first': 'WeakFirst',
    'strong_subjects_first': 'StrongFirst',
    'balanced_approach': 'Balanced',
    'mixed_approach': 'Balanced'
  };
  
  return approachMapping[uiApproach] || 'Balanced';
}
