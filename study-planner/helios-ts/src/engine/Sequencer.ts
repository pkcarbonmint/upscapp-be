import type { Subject, Topic, } from '../types/Subjects';
import type { ConfidenceLevel, StudyPacing, EffectiveStudySeason } from '../types/Types';
import type { StudentIntake } from '../types/models';
import type { TopicConfidenceMap } from '../types/HourCalculationTypes';

// Study season types for filtering subjects (test-compatible)
export type StudySeason = 'PrelimsSeason' | 'MainsSeason' | 'BalancedSeason';

// Augmented subject record that includes student confidence
export interface AugmentedSubject {
  subjectDetails: Subject;
  studentConfidence: ConfidenceLevel;
}

/**
 * Target year aware subject sequencing
 */
export async function sequenceSubjectsWithTargetYear(
  studentIntake: StudentIntake,
  allSubjects: Subject[]
): Promise<{ subjects: Subject[]; warnings: string[] }> {
  console.log('Sequencer: Starting subject sequencing...');
  
  console.log(`Sequencer: Loaded ${allSubjects.length} total subjects from source.`);

  // Get effective study season considering target year
  const effectiveSeason = getEffectiveStudySeason(studentIntake.target_year);
  
  // Apply the target year aware sequencing logic
  const { subjects: sequencedSubjects, warnings } = sequenceSubjectsLogicWithTargetYear(
    studentIntake, 
    allSubjects, 
    effectiveSeason
  );
      
  // Log dropped topics
  const sequencedSubjectCodes = sequencedSubjects.map(s => s.subjectCode);
  const droppedSubjects = allSubjects.filter(s => !sequencedSubjectCodes.includes(s.subjectCode));
  const droppedTopics = droppedSubjects.flatMap(s => s.topics);
  const droppedTopicCodes = droppedTopics.map(t => t.topicCode);
  
  if (droppedTopicCodes.length > 0) {
    console.log(`Sequencer: Dropped topic codes: ${JSON.stringify(droppedTopicCodes)}`);
  }
  
  console.log(`Sequencer: Sequencing completed: ${sequencedSubjects.length} subjects selected from ${allSubjects.length} total`);
  
  // Log any warnings about missing confidence levels
  if (warnings.length > 0) {
    console.warn(`Sequencer: Found ${warnings.length} sequencing warnings`);
    warnings.forEach(warning => console.warn(`Sequencer: ${warning}`));
  }
  
  console.log('Sequencer: Subject sequencing completed successfully.');
  console.log(`Sequencer: Final sequence: ${sequencedSubjects.map(s => s.subjectName).join(', ')}`);
  
  return { subjects: sequencedSubjects, warnings };
}

/**
 * Get effective study season considering target year
 */
function getEffectiveStudySeason(targetYear?: string): EffectiveStudySeason {
  if (!targetYear) return 'ComprehensiveStudy';
  
  const currentYear = new Date().getFullYear();
  const targetYearNum = parseInt(targetYear, 10);
  
  if (targetYearNum === currentYear) {
    // Target year - determine based on current date
    const currentMonth = new Date().getMonth() + 1; // 1-12
    if (currentMonth <= 6) return 'ExclusivePrelims'; // Jan-Jun: Prelims focus
    return 'ExclusiveMains'; // Jul-Dec: Mains focus
  }
  
  return 'ComprehensiveStudy'; // Non-target year
}

/**
 * Filter subjects based on the current study season
 */
export function filterBySeason(subjects: Subject[], currentSeason: StudySeason): Subject[] {
  switch (currentSeason) {
    case 'PrelimsSeason':
      return subjects.filter(s => s.examFocus !== 'MainsOnly');
    case 'MainsSeason':
      return subjects.filter(s => s.examFocus !== 'PrelimsOnly');
    case 'BalancedSeason':
      return subjects; // Include all subjects with student confidence data
    default:
      return subjects;
  }
}

/**
 * Augment subjects with student confidence data and return warnings
 */
function augmentWithConfidenceWithWarnings(
  studentIntake: StudentIntake, 
  subjects: Subject[]
): { augmentedSubjects: AugmentedSubject[]; warnings: string[] } {
  const confidenceMap = studentIntake.subject_confidence;
  const results = subjects.map(subject => augmentSubjectWithWarning(confidenceMap, subject));
  
  const augmentedSubjects = results.map(r => r.augmentedSubject);
  const warnings = results.flatMap(r => r.warnings);
  
  return { augmentedSubjects, warnings };
}

function augmentSubjectWithWarning(
  confidenceMap: Record<string, ConfidenceLevel>, 
  subject: Subject
): { augmentedSubject: AugmentedSubject; warnings: string[] } {
  const subjectCode = subject.subjectCode;
  const confidence = confidenceMap[subjectCode] || 'Moderate';
  const warning = !(subjectCode in confidenceMap) 
    ? [`Warning: No confidence level found for subject ${subjectCode}. Defaulting to Moderate.`]
    : [];
    
  return {
    augmentedSubject: {
      subjectDetails: subject,
      studentConfidence: confidence
    },
    warnings: warning
  };
}

/**
 * Perform multi-level sorting based on category and pacing preference
 */
export function performMultiLevelSort(
  studentIntake: StudentIntake, 
  augmentedSubjects: AugmentedSubject[]
): AugmentedSubject[] {
  const strategy = studentIntake.study_strategy;
  const pacing = strategy.study_approach;
  
  // Multi-level sort: Confidence first, then category within same confidence
  return [...augmentedSubjects].sort((a, b) => {
    // Primary sort: Apply pacing-based sorting
    let confidenceComparison: number;
    switch (pacing) {
      case 'WeakFirst':
        confidenceComparison = compareConfidenceLevels(a.studentConfidence, b.studentConfidence);
        break;
      case 'StrongFirst':
        confidenceComparison = compareConfidenceLevels(b.studentConfidence, a.studentConfidence);
        break;
      case 'Balanced':
        confidenceComparison = 0; // Keep original order for balanced approach
        break;
      default:
        confidenceComparison = 0;
    }
    
    if (confidenceComparison !== 0) {
      return confidenceComparison;
    }
    
    // Secondary sort: Category (Macro before Micro) within same confidence level
    return categorySort(a.subjectDetails, b.subjectDetails);
  });
}

/**
 * Target year aware sequencing logic using effective seasons
 */
function sequenceSubjectsLogicWithTargetYear(
  studentIntake: StudentIntake, 
  allSubjects: Subject[], 
  effectiveSeason: EffectiveStudySeason
): { subjects: Subject[]; warnings: string[] } {
  // Step 1: Prepare the master subject list
  const masterSubjectList = allSubjects;
  
  // Step 2: Filter by effective season (target year aware)
  const seasonFilteredSubjects = filterByEffectiveSeason(masterSubjectList, effectiveSeason);
  const seasonFilterWarning = seasonFilteredSubjects.length < masterSubjectList.length
    ? [`Filtered ${masterSubjectList.length - seasonFilteredSubjects.length} subjects based on effective season: ${effectiveSeason}`]
    : [];
  
  // Step 3: Augment with confidence and collect warnings
  const { augmentedSubjects, warnings: confidenceWarnings } = augmentWithConfidenceWithWarnings(
    studentIntake, 
    seasonFilteredSubjects
  );
  
  // Step 4: Apply multi-level sorting
  const sortedAugmentedSubjects = performMultiLevelSort(studentIntake, augmentedSubjects);
  
  // Step 5: Extract the final subject list
  const result = sortedAugmentedSubjects.map(aug => aug.subjectDetails);
  
  // Combine all warnings
  const allWarnings = [...seasonFilterWarning, ...confidenceWarnings];
  
  return { subjects: result, warnings: allWarnings };
}

/**
 * Filter subjects by effective study season
 */
function filterByEffectiveSeason(subjects: Subject[], effectiveSeason: EffectiveStudySeason): Subject[] {
  switch (effectiveSeason) {
    case 'ExclusivePrelims':
      return subjects.filter(s => s.examFocus !== 'MainsOnly');
    case 'ExclusiveMains':
      return subjects.filter(s => s.examFocus !== 'PrelimsOnly');
    case 'ComprehensiveStudy':
      return subjects; // Include all subjects
    default:
      return subjects;
  }
}

/**
 * Custom comparison for category sorting (Macro comes before Micro)
 */
function categorySort(s1: Subject, s2: Subject): number {
  if (s1.category === 'Macro' && s2.category === 'Micro') return -1; // Macro comes first
  if (s1.category === 'Micro' && s2.category === 'Macro') return 1;  // Micro comes second
  return 0; // Same category, maintain order
}

/**
 * Compare confidence levels for sorting
 */
function compareConfidenceLevels(c1: ConfidenceLevel, c2: ConfidenceLevel): number {
  const order: ConfidenceLevel[] = ['VeryWeak', 'Weak', 'Moderate', 'Strong', 'VeryStrong', 'NotStarted'];
  return order.indexOf(c1) - order.indexOf(c2);
}

/**
 * Enhanced: Topic-Level Multi-Level Sorting
 * 
 * PURPOSE: Provide more granular sorting using TopicConfidenceMap for surgical precision
 * in rebalancing scenarios.
 * 
 * ALGORITHM:
 * 1. Primary sort: Category (Macro subjects first)
 * 2. Secondary sort: Subject-level pacing preference (WeakFirst/StrongFirst/Balanced)
 * 3. Tertiary sort: Topic-level confidence within each subject (micro-level optimization)
 */
export function performMultiLevelSortWithTopicConfidence(
  studentIntake: StudentIntake, 
  augmentedSubjects: AugmentedSubject[], 
  topicConfidenceMap: TopicConfidenceMap
): AugmentedSubject[] {
  const strategy = studentIntake.study_strategy;
  const pacing = strategy.study_approach;
  
  // Multi-level sort: Confidence first, then category within same confidence
  const sortedSubjects = [...augmentedSubjects].sort((a, b) => {
    // Primary sort: Apply pacing-based sorting
    let confidenceComparison: number;
    switch (pacing) {
      case 'WeakFirst':
        confidenceComparison = compareConfidenceLevels(a.studentConfidence, b.studentConfidence);
        break;
      case 'StrongFirst':
        confidenceComparison = compareConfidenceLevels(b.studentConfidence, a.studentConfidence);
        break;
      case 'Balanced':
        confidenceComparison = 0; // Keep original order for balanced approach
        break;
      default:
        confidenceComparison = 0;
    }
    
    if (confidenceComparison !== 0) {
      return confidenceComparison;
    }
    
    // Secondary sort: Category (Macro before Micro) within same confidence level
    return categorySort(a.subjectDetails, b.subjectDetails);
  });
  
  // Tertiary sort: Apply topic-level sorting within each subject
  const finalSortedList = sortedSubjects.map(aug => 
    sortTopicsWithinSubject(pacing, topicConfidenceMap, aug)
  );
  
  return finalSortedList;
}

/**
 * Sort topics within a subject based on pacing preference and topic confidence
 */
export function sortTopicsWithinSubject(
  pacing: StudyPacing, 
  topicConfidenceMap: TopicConfidenceMap, 
  augmentedSubject: AugmentedSubject
): AugmentedSubject {
  const subject = augmentedSubject.subjectDetails;
  const originalTopics = subject.topics;
  
  // Sort topics based on their confidence levels and pacing preference
  let sortedTopics: Topic[];
  switch (pacing) {
    case 'WeakFirst':
      sortedTopics = [...originalTopics].sort((a, b) => 
        compareConfidenceLevels(
          getTopicConfidence(topicConfidenceMap, a), 
          getTopicConfidence(topicConfidenceMap, b)
        )
      );
      break;
    case 'StrongFirst':
      sortedTopics = [...originalTopics].sort((a, b) => 
        compareConfidenceLevels(
          getTopicConfidence(topicConfidenceMap, b), 
          getTopicConfidence(topicConfidenceMap, a)
        )
      );
      break;
    case 'Balanced':
      sortedTopics = originalTopics; // Keep original order for balanced approach
      break;
    default:
      sortedTopics = originalTopics;
  }
  
  // Update the subject with sorted topics
  const updatedSubject = { ...subject, topics: sortedTopics };
  
  return { ...augmentedSubject, subjectDetails: updatedSubject };
}

/**
 * Get confidence level for a topic from TopicConfidenceMap
 */
function getTopicConfidence(topicConfidenceMap: TopicConfidenceMap, topic: Topic): ConfidenceLevel {
  const confidence = topicConfidenceMap[topic.topicCode];
  if (!confidence) return 'Moderate';
  
  // Convert ConfidenceProfile to ConfidenceLevel
  switch (confidence) {
    case 'VeryWeakConfidence':
      return 'VeryWeak';
    case 'WeakConfidence':
      return 'Weak';
    case 'ModerateConfidence':
      return 'Moderate';
    case 'StrongConfidence':
      return 'Strong';
    case 'VeryStrongConfidence':
      return 'VeryStrong';
    default:
      return 'Moderate';
  }
}
