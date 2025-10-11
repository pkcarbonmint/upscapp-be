import { StudentIntake, Archetype } from '../types/models';
import { TimeCommitment, SubjectApproach, StudyPacing } from '../types/Types';

/**
 * Select the best archetype for a student based on their intake data
 * This mirrors the Haskell SelectArchetype module functionality
 */
export async function selectBestArchetype(intake: StudentIntake): Promise<Archetype> {
  // Analyze the student's profile to determine the best archetype
  const timeCommitment = determineTimeCommitment(intake);
  const subjectApproach = determineSubjectApproach(intake);
  const studyPacing = determineStudyPacing(intake);
  
  // Create archetype based on analysis
  const archetype: Archetype = {
    archetype: getArchetypeName(timeCommitment, intake),
    timeCommitment,
    weeklyHoursMin: getMinHours(timeCommitment),
    weeklyHoursMax: getMaxHours(timeCommitment),
    description: getArchetypeDescription(timeCommitment, intake),
    defaultPacing: studyPacing,
    defaultApproach: subjectApproach,
    specialFocus: getSpecialFocus(intake)
  };

  return archetype;
}

/**
 * Determine time commitment based on student profile
 */
function determineTimeCommitment(intake: StudentIntake): TimeCommitment {
  const weeklyHours = parseInt(intake.study_strategy.weekly_study_hours) || 0;
  const currentStatus = (intake.personal_details as any)?.current_status?.toLowerCase() || '';
  
  // Full-time students or those with high hours
  if (weeklyHours >= 40 || currentStatus.includes('student') || currentStatus.includes('unemployed')) {
    return 'FullTime';
  }
  
  // Part-time for working professionals
  if (currentStatus.includes('working') || currentStatus.includes('employed') || weeklyHours < 30) {
    return 'PartTime';
  }
  
  // Default to part-time for safety
  return 'PartTime';
}

/**
 * Determine subject approach based on student preferences
 */
function determineSubjectApproach(intake: StudentIntake): SubjectApproach {
  const focusCombo = intake.study_strategy.study_focus_combo;
  
  switch (focusCombo) {
    case 'OneGS':
      return 'SingleSubject';
    case 'TwoGS' as any:
      return 'DualSubject';
    case 'ThreeGS' as any:
    case 'Comprehensive' as any:
      return 'TripleSubject';
    default:
      return 'DualSubject';
  }
}

/**
 * Determine study pacing based on student confidence and timeline
 */
function determineStudyPacing(intake: StudentIntake): StudyPacing {
  const confidenceLevels = Object.values(intake.subject_confidence);
  const weakSubjects = confidenceLevels.filter(level => level === 'Weak' || level === 'NotStarted').length;
  const strongSubjects = confidenceLevels.filter(level => level === 'Strong').length;
  
  // If more weak subjects, start with weak first
  if (weakSubjects > strongSubjects) {
    return 'WeakFirst';
  }
  
  // If more strong subjects, start with strong first
  if (strongSubjects > weakSubjects) {
    return 'StrongFirst';
  }
  
  // Default to balanced
  return 'Balanced';
}

/**
 * Get archetype name based on time commitment and profile
 */
function getArchetypeName(timeCommitment: TimeCommitment, intake: StudentIntake): string {
  const currentStatus = (intake.personal_details as any)?.current_status?.toLowerCase() || '';
  
  if (timeCommitment === 'FullTime') {
    if (currentStatus.includes('student')) {
      return 'The Full-Time Student';
    }
    return 'The Full-Time Professional';
  } else {
    if (currentStatus.includes('working') || currentStatus.includes('employed')) {
      return 'The Working Professional';
    }
    return 'The Part-Time Aspirant';
  }
}

/**
 * Get minimum hours for archetype
 */
function getMinHours(timeCommitment: TimeCommitment): number {
  return timeCommitment === 'FullTime' ? 35 : 15;
}

/**
 * Get maximum hours for archetype
 */
function getMaxHours(timeCommitment: TimeCommitment): number {
  return timeCommitment === 'FullTime' ? 60 : 35;
}

/**
 * Get archetype description
 */
function getArchetypeDescription(timeCommitment: TimeCommitment, intake: StudentIntake): string {
  const name = getArchetypeName(timeCommitment, intake);
  
  switch (name) {
    case 'The Full-Time Student':
      return 'Full-time student with 35+ hours per week available for study';
    case 'The Full-Time Professional':
      return 'Full-time aspirant with 35+ hours per week available for study';
    case 'The Working Professional':
      return 'Working professional with limited study time (15-35 hours per week)';
    case 'The Part-Time Aspirant':
      return 'Part-time aspirant with flexible study schedule (15-35 hours per week)';
    default:
      return 'Study plan optimized for your schedule and commitments';
  }
}

/**
 * Get special focus areas based on student profile
 */
function getSpecialFocus(intake: StudentIntake): string[] {
  const focus: string[] = [];
  
  // Add focus based on strong subjects
  const strongSubjects = Object.entries(intake.subject_confidence)
    .filter(([_, level]) => level === 'Strong')
    .map(([subject, _]) => subject);
  
  if (strongSubjects.length > 0) {
    focus.push('Leverage strong subject knowledge');
  }
  
  // Add focus based on weak subjects
  const weakSubjects = Object.entries(intake.subject_confidence)
    .filter(([_, level]) => level === 'Weak' || level === 'NotStarted')
    .map(([subject, _]) => subject);
  
  if (weakSubjects.length > 0) {
    focus.push('Strengthen foundation in weak areas');
  }
  
  // Add focus based on preparation background
  if (intake.preparation_background?.number_of_attempts && parseInt(intake.preparation_background.number_of_attempts) > 0) {
    focus.push('Targeted improvement based on previous attempts');
  }
  
  return focus;
}
