import type { Subject, Topic, TopicPriority } from '../types/Subjects';
import { getTopicEstimatedHours } from '../types/Subjects';
import type { ConfidenceLevel, PrepMode, SubjectApproach } from '../types/Types';
import type { Logger } from '../types/Types';
import type { StudentIntake, Block, BlockResources, Archetype } from '../types/models';
import type { ExperienceProfile, CoachingProfile, TopicConfidenceMap, ConfidenceProfile } from '../types/HourCalculationTypes';
import { calculateRequiredHours, calculateRequiredHoursWithTopicConfidence } from './HourCalculation';
import { ConfigService } from '../services/ConfigService';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

// Configuration interface (simplified)
export interface Config {
  block_duration_clamp: {
    min_weeks: number;
    max_weeks: number;
  };
}

// Feedback types
export type SubjectiveFeeling = 'FellBehind' | 'OnTrack' | 'GotAhead';

export interface MonthlyFeedback {
  subjectiveFeeling: SubjectiveFeeling;
  // Add other feedback fields as needed
}

/**
 * Core Block Planning Function
 * 
 * This function implements the main block planning logic that groups sequenced subjects
 * into multi-week study blocks. It's the second step in the Helios engine pipeline.
 */
export async function planBlocks(
  config: Config,
  logger: Logger,
  studentIntake: StudentIntake,
  archetypeDetails: Archetype,
  sortedSubjects: Subject[]
): Promise<Block[]> {
  console.log('BlockPlanner: Starting block planning process');
  
  // Transform StudentIntake into explicit calculation profiles
  const currentDate = dayjs();
  const experienceProfile = extractExperienceProfile(studentIntake);
  const coachingProfile = extractCoachingProfile(studentIntake);
  const confidenceMap = studentIntake.subject_confidence;
  const strategy = studentIntake.study_strategy;
  
  logger.logDebug('BlockPlanner', `Extracted profiles - Experience: ${experienceProfile.attempts} attempts, Coaching: ${coachingProfile.hasPriorCoaching}`);
  
  // Get PrepMode with student's actual weekly hours
  const studentWeeklyHours = safeReadHours(strategy.weekly_study_hours);
  const prepModeProgression = await ConfigService.getPrepModeProgression(
    currentDate,
    studentIntake.target_year,
    archetypeDetails,
    studentWeeklyHours
  );
  const prepMode = prepModeProgression[0]; // Use first mode in progression
  logger.logInfo('BlockPlanner', `Determined PrepMode: ${prepMode}`);
  
  // Call internal function with explicit parameters including PrepMode
  return planBlocksInternal(
    experienceProfile,
    coachingProfile,
    confidenceMap,
    strategy,
    prepMode,
    config,
    logger,
    archetypeDetails,
    sortedSubjects,
    studentIntake
  );
}

/**
 * Internal planning function with explicit calculation profiles and PrepMode
 */
async function planBlocksInternal(
  expProfile: ExperienceProfile,
  coachProfile: CoachingProfile,
  confidenceMap: Record<string, ConfidenceLevel>,
  strategy: any, // StudyStrategy type
  prepMode: PrepMode,
  config: Config,
  logger: Logger,
  archetypeDetails: any,
  sortedSubjects: Subject[],
  studentIntake?: StudentIntake
): Promise<Block[]> {
  // Determine the subject approach (number of subjects at once)
  const subjectApproach = getSubjectApproachForMode(prepMode, archetypeDetails, studentIntake);
  const baseChunkSize = subjectApproachToChunkSize(subjectApproach);

  logger.logDebug('BlockPlanner', `Subject approach determined: ${subjectApproach} (base chunk size: ${baseChunkSize})`);

  // Adjust chunk size based on PrepMode
  const finalChunkSize = adjustChunkSizeForPrepMode(prepMode, baseChunkSize);
  
  logger.logDebug('BlockPlanner', `Final chunk size after PrepMode adjustment: ${finalChunkSize}`);
  
  // Apply archetype pacing to sorted subjects before chunking
  const pacingAdjustedSubjects = applyArchetypePacingToSubjects(archetypeDetails, sortedSubjects, confidenceMap);
  const subjectChunks = chunkList(finalChunkSize, pacingAdjustedSubjects);
  
  logger.logInfo('BlockPlanner', `Applied archetype pacing and created ${subjectChunks.length} subject chunks`);
  
  // Process each chunk with explicit profiles including PrepMode
  const blocks = await Promise.all(
    subjectChunks.map(chunk =>
      createFinalBlockFromProfiles(
        expProfile,
        coachProfile,
        confidenceMap,
        strategy,
        prepMode,
        config,
        logger,
        archetypeDetails,
        chunk
      )
    )
  );

  return blocks;
}

/**
 * NEW: Rebalancing-Aware Block Planning Function
 * 
 * PURPOSE: Plan blocks with rebalancing logic that adjusts duration clamps based on
 * student feedback and uses topic-level confidence for precise calculations.
 */
export async function planBlocksWithRebalancing(
  config: Config,
  logger: Logger,
  studentIntake: StudentIntake,
  archetypeDetails: any,
  sortedSubjects: Subject[],
  feedback: MonthlyFeedback,
  topicConfidenceMap: TopicConfidenceMap
): Promise<Block[]> {
  logger.logInfo('BlockPlanner', 'Starting rebalancing-aware block planning process');
  
  // Transform StudentIntake into explicit calculation profiles
  const currentDate = dayjs();
  const experienceProfile = extractExperienceProfile(studentIntake);
  const coachingProfile = extractCoachingProfile(studentIntake);
  const strategy = studentIntake.study_strategy;
  
  logger.logInfo('BlockPlanner', `Rebalancing based on subjective feeling: ${feedback.subjectiveFeeling}`);
  
  // Get PrepMode with student's actual weekly hours
  const studentWeeklyHours = safeReadHours(strategy.weekly_study_hours);
  const prepModeProgression = await ConfigService.getPrepModeProgression(
    currentDate,
    studentIntake.target_year,
    archetypeDetails,
    studentWeeklyHours
  );
  const prepMode = prepModeProgression[0];
  logger.logInfo('BlockPlanner', `Determined PrepMode for rebalancing: ${prepMode}`);
  
  // Call internal rebalancing function with feedback and topic confidence
  return planBlocksWithRebalancingInternal(
    experienceProfile,
    coachingProfile,
    strategy,
    prepMode,
    config,
    logger,
    archetypeDetails,
    sortedSubjects,
    feedback,
    topicConfidenceMap,
    studentIntake
  );
}

/**
 * Internal rebalancing planning function with feedback-adjusted parameters
 */
async function planBlocksWithRebalancingInternal(
  expProfile: ExperienceProfile,
  coachProfile: CoachingProfile,
  strategy: any,
  prepMode: PrepMode,
  config: Config,
  logger: Logger,
  archetypeDetails: any,
  sortedSubjects: Subject[],
  feedback: MonthlyFeedback,
  topicConfidenceMap: TopicConfidenceMap,
  studentIntake?: StudentIntake
): Promise<Block[]> {
  // Determine subject approach and chunk size
  const subjectApproach = getSubjectApproachForMode(prepMode, archetypeDetails, studentIntake);
  const baseChunkSize = subjectApproachToChunkSize(subjectApproach);
  const finalChunkSize = adjustChunkSizeForPrepMode(prepMode, baseChunkSize);
      
  logger.logDebug('BlockPlanner', `Rebalancing chunk configuration - approach: ${subjectApproach}, final size: ${finalChunkSize}`);
      
  // Apply archetype pacing using traditional confidence map
  const traditionalConfidenceMap = extractTraditionalConfidenceMap(topicConfidenceMap, sortedSubjects);
  const pacingAdjustedSubjects = applyArchetypePacingToSubjects(archetypeDetails, sortedSubjects, traditionalConfidenceMap);
  const subjectChunks = chunkList(finalChunkSize, pacingAdjustedSubjects);
  
  logger.logInfo('BlockPlanner', `Extracted traditional confidence map and created ${subjectChunks.length} chunks for rebalancing`);
  
  // Process each chunk with rebalancing-aware logic
  const blocks = await Promise.all(
    subjectChunks.map(chunk =>
      createFinalBlockWithRebalancing(
        expProfile,
        coachProfile,
        strategy,
        prepMode,
        config,
        logger,
        archetypeDetails,
        feedback,
        topicConfidenceMap,
        chunk
      )
    )
  );

  return blocks;
}

/**
 * Extract ExperienceProfile from StudentIntake
 */
function extractExperienceProfile(studentIntake: StudentIntake): ExperienceProfile {
  const bg = studentIntake.preparation_background;
  if (!bg) {
    return { attempts: 0, lastPrelimScore: 0, lastCSATScore: 0 };
  }
  
  return {
    attempts: safeReadInt(bg.number_of_attempts, 0),
    lastPrelimScore: bg.last_attempt_gs_prelims_score,
    lastCSATScore: bg.last_attempt_csat_score
  };
}

/**
 * Extract CoachingProfile from StudentIntake
 */
function extractCoachingProfile(studentIntake: StudentIntake): CoachingProfile {
  const coaching = studentIntake.coaching_details;
  const syllabus = studentIntake.syllabus_awareness;
  
  return {
    hasPriorCoaching: coaching?.prior_coaching?.includes('Yes') || false,
    hasSyllabusUnderstanding: syllabus?.gs_syllabus_understanding?.includes('Good') || false
  };
}

/**
 * Map ConfidenceLevel to ConfidenceProfile
 */
function mapConfidenceToProfile(confidence: ConfidenceLevel): ConfidenceProfile {
  switch (confidence) {
    case 'VeryWeak':
      return 'VeryWeakConfidence';
    case 'Weak':
      return 'WeakConfidence';
    case 'Moderate':
      return 'ModerateConfidence';
    case 'Strong':
      return 'StrongConfidence';
    case 'VeryStrong':
      return 'VeryStrongConfidence';
    case 'NotStarted':
      return 'ModerateConfidence'; // Default
    default:
      return 'ModerateConfidence';
  }
}

/**
 * Safely read integer from string with fallback
 */
function safeReadInt(text: string, fallback: number): number {
  const parsed = parseInt(text, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Get subject approach based on student preferences, weekly hours, prep mode, and archetype
 */
function getSubjectApproachForMode(prepMode: PrepMode, archetype: Archetype, studentIntake?: StudentIntake): SubjectApproach {
  // 1. Crash modes override everything for maximum coverage
  switch (prepMode) {
    case 'CrashPrelims':
    case 'CrashMains':
      return 'DualSubject'; // Force higher coverage for crash modes
  }
  
  // 2. If we have student intake data, consider their preferences and weekly hours
  if (studentIntake) {
    const weeklyHours = safeReadHours(studentIntake.study_strategy.weekly_study_hours);
    const studyFocusCombo = studentIntake.study_strategy.study_focus_combo;
    
    // 3. Map study focus combo to subject approach (student preference)
    let studentPreferredApproach: SubjectApproach;
    switch (studyFocusCombo) {
      case 'OneGS':
        studentPreferredApproach = 'SingleSubject';
        break;
      case 'OneGSPlusOptional':
        studentPreferredApproach = 'DualSubject';
        break;
      case 'GSPlusOptionalPlusCSAT':
        studentPreferredApproach = 'TripleSubject';
        break;
      default:
        studentPreferredApproach = 'DualSubject'; // Default fallback
    }
    
    // 4. Adjust based on weekly hours (time constraint)
    let timeBasedApproach: SubjectApproach;
    if (weeklyHours < 25) {
      timeBasedApproach = 'SingleSubject'; // Low hours → focus on one subject
    } else if (weeklyHours < 40) {
      timeBasedApproach = 'DualSubject';   // Medium hours → two subjects
    } else {
      timeBasedApproach = 'TripleSubject'; // High hours → can handle three subjects
    }
    
    // 5. Find the intersection of student preference and time constraints
    // If student wants more subjects than time allows, respect time constraint
    // If student wants fewer subjects than time allows, respect student preference
    const approachHierarchy: SubjectApproach[] = ['SingleSubject', 'DualSubject', 'TripleSubject'];
    const studentIndex = approachHierarchy.indexOf(studentPreferredApproach);
    const timeIndex = approachHierarchy.indexOf(timeBasedApproach);
    
    // Use the more conservative (fewer subjects) approach
    const finalApproach = approachHierarchy[Math.min(studentIndex, timeIndex)];
    
    return finalApproach;
  }
  
  // 6. Fallback to archetype default if no student intake data
  return archetype.defaultApproach || 'DualSubject';
}

/**
 * Apply archetype pacing strategy to subject ordering within blocks
 */
function applyArchetypePacingToSubjects(
  archetype: any,
  subjects: Subject[],
  confidenceMap: Record<string, ConfidenceLevel>
): Subject[] {
  const pacing = archetype.defaultPacing || 'Balanced';
  
  switch (pacing) {
    case 'WeakFirst':
      return [...subjects].sort((a, b) => 
        compareConfidenceLevels(
          confidenceMap[a.subjectCode] || 'Moderate',
          confidenceMap[b.subjectCode] || 'Moderate'
        )
      );
    case 'StrongFirst':
      return [...subjects].sort((a, b) => 
        compareConfidenceLevels(
          confidenceMap[b.subjectCode] || 'Moderate',
          confidenceMap[a.subjectCode] || 'Moderate'
        )
      );
    case 'Balanced':
      return subjects; // Keep existing order
    default:
      return subjects;
  }
}

/**
 * Compare confidence levels for sorting
 */
function compareConfidenceLevels(c1: ConfidenceLevel, c2: ConfidenceLevel): number {
  const order: ConfidenceLevel[] = ['VeryWeak', 'Weak', 'Moderate', 'Strong', 'VeryStrong', 'NotStarted'];
  return order.indexOf(c1) - order.indexOf(c2);
}

/**
 * Convert SubjectApproach enum to a chunk size integer
 */
function subjectApproachToChunkSize(approach: SubjectApproach): number {
  switch (approach) {
    case 'SingleSubject':
      return 1;
    case 'DualSubject':
      return 2;
    case 'TripleSubject':
      return 3;
    default:
      return 2;
  }
}

/**
 * Adjust chunk size based on PrepMode intensity
 */
function adjustChunkSizeForPrepMode(_prepMode: PrepMode, baseSize: number): number {
  // Trust PrepModeEngine's subject approach decisions
  return baseSize;
}

/**
 * Adjust duration limits based on PrepMode constraints
 */
function adjustDurationLimitsForPrepMode(prepMode: PrepMode, baseMin: number, baseMax: number): [number, number] {
  switch (prepMode) {
    case 'CrashPrelims':
    case 'CrashMains':
      return [1, 3]; // Very short blocks for crash preparation
    case 'AcceleratedPrelims':
    case 'AcceleratedMains':
      return [2, Math.min(baseMax, 6)]; // Shorter blocks for accelerated prep
    case 'StandardPrelims':
    case 'StandardMains':
      return [baseMin, baseMax]; // Use standard limits
    case 'LongtermFoundation':
      return [Math.max(baseMin, 8), Math.max(baseMax, 16)]; // Longer blocks for foundation
    case 'MediumtermFoundation':
      return [Math.max(baseMin, 6), Math.max(baseMax, 12)];
    default:
      return [baseMin, baseMax]; // Default to base limits
  }
}

/**
 * Split a list into chunks of specified size
 */
function chunkList<T>(size: number, list: T[]): T[][] {
  if (size <= 0) return [list];
  
  const chunks: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

/**
 * Create a finalized block with rebalancing logic and topic-level confidence
 */
async function createFinalBlockWithRebalancing(
  expProfile: ExperienceProfile,
  coachProfile: CoachingProfile,
  strategy: any,
  _prepMode: PrepMode,
  config: Config,
  logger: Logger,
  _archetypeDetails: any,
  feedback: MonthlyFeedback,
  topicConfidenceMap: TopicConfidenceMap,
  subjectChunk: Subject[]
): Promise<Block> {
  logger.logDebug('BlockPlanner', `Creating rebalanced block from ${subjectChunk.length} subjects with feedback: ${feedback.subjectiveFeeling}`);
  
  const studentWeeklyHours = safeReadHours(strategy.weekly_study_hours);
  const baseMinWeeks = config.block_duration_clamp.min_weeks;
  const baseMaxWeeks = config.block_duration_clamp.max_weeks;
      
  // REBALANCING LOGIC: Adjust duration limits based on subjective feeling
  const [minWeeks, maxWeeks] = adjustDurationLimitsForRebalancing(feedback.subjectiveFeeling, baseMinWeeks, baseMaxWeeks);
      
  logger.logDebug('BlockPlanner', `Rebalancing duration limits: ${baseMinWeeks}-${baseMaxWeeks} → ${minWeeks}-${maxWeeks} weeks`);
      
  // Use topic-level confidence for precise hour calculations
  const initialTotalHours = calculateBlockHoursWithTopicConfidence(expProfile, coachProfile, topicConfidenceMap, subjectChunk);
  const calculatedWeeks = initialTotalHours / studentWeeklyHours;
          
  logger.logDebug('BlockPlanner', `Topic-level calculation: ${initialTotalHours} hours = ${calculatedWeeks} weeks`);
  
  let finalSubjectsInChunk: Subject[];
  let finalCalculatedWeeks: number;
  
  if (calculatedWeeks > maxWeeks) {
    const hoursToCut = (calculatedWeeks - maxWeeks) * studentWeeklyHours;
    console.warn(`BlockPlanner: Block exceeds max duration (${calculatedWeeks} > ${maxWeeks}), dropping ${Math.round(hoursToCut)} hours of topics`);
    
    const { subjects: subjectsAfterDropping, hoursCut: hoursActuallyCut, droppedCodes: droppedTopicCodes } = dropTopicsByPriorityWithPrepMode(
      _prepMode,
      subjectChunk,
      Math.round(hoursToCut)
    );
    
    logger.logInfo('BlockPlanner', `Successfully dropped ${hoursActuallyCut} hours of topics using PrepMode strategy. Dropped codes: ${JSON.stringify(droppedTopicCodes)}`);
    
    const finalTotalHours = initialTotalHours - hoursActuallyCut;
    finalCalculatedWeeks = finalTotalHours / studentWeeklyHours;
    finalSubjectsInChunk = subjectsAfterDropping;
  } else {
    logger.logDebug('BlockPlanner', 'No topic dropping needed - block duration within limits');
    finalSubjectsInChunk = subjectChunk;
    finalCalculatedWeeks = calculatedWeeks;
  }
      
  // Clamp the final duration
  const finalDurationWeeks = clamp(Math.ceil(finalCalculatedWeeks), minWeeks, maxWeeks);
      
  // Generate block title
  const blockTitle = generateBlockTitle(finalSubjectsInChunk);
  
  const blockId = `block-${uuidv4()}`;
  
  // Create block resources (simplified for now)
  const blockResources: BlockResources = {
    primary_books: [],
    supplementary_materials: [],
    practice_resources: [],
    video_content: [],
    current_affairs_sources: [],
    revision_materials: [],
    expert_recommendations: []
  };
  
  return {
    block_id: blockId,
    block_title: blockTitle,
    subjects: finalSubjectsInChunk.map(s => s.subjectCode),
    duration_weeks: finalDurationWeeks,
    weekly_plan: [{ week: 0, daily_plans: [] }], // Will be filled by WeeklyScheduler
    block_resources: blockResources,
    cycle_id: undefined, // Will be populated later when assigned to cycles
    cycle_type: undefined,
    cycle_order: undefined,
    cycle_name: undefined,
    block_start_date: undefined, // Will be populated by Engine
    block_end_date: undefined    // Will be populated by Engine
  };
}

/**
 * Create a finalized block from a chunk of subjects with explicit profiles and PrepMode
 */
async function createFinalBlockFromProfiles(
  expProfile: ExperienceProfile,
  coachProfile: CoachingProfile,
  confidenceMap: Record<string, ConfidenceLevel>,
  strategy: any,
  prepMode: PrepMode,
  config: Config,
  logger: Logger,
  _archetypeDetails: any,
  subjectChunk: Subject[]
): Promise<Block> {
  logger.logDebug('BlockPlanner', `Creating block from ${subjectChunk.length} subjects: ${subjectChunk.map(s => s.subjectName).join(', ')}`);
  
  const studentWeeklyHours = safeReadHours(strategy.weekly_study_hours);
  const baseMinWeeks = config.block_duration_clamp.min_weeks;
  const baseMaxWeeks = config.block_duration_clamp.max_weeks;
      
  logger.logDebug('BlockPlanner', `Base duration limits: ${baseMinWeeks}-${baseMaxWeeks} weeks, ${studentWeeklyHours} hours/week`);
      
  // Adjust duration limits based on PrepMode
  const [minWeeks, maxWeeks] = adjustDurationLimitsForPrepMode(prepMode, baseMinWeeks, baseMaxWeeks);
      
  logger.logDebug('BlockPlanner', `PrepMode-adjusted duration limits: ${minWeeks}-${maxWeeks} weeks`);
      
  // Calculate initial time required using enhanced calculation
  const initialTotalHours = calculateBlockHoursEnhanced(expProfile, coachProfile, confidenceMap, subjectChunk);
  const calculatedWeeks = initialTotalHours / studentWeeklyHours;
          
  logger.logDebug('BlockPlanner', `Initial calculation: ${initialTotalHours} hours = ${calculatedWeeks} weeks`);
  
  let finalSubjectsInChunk: Subject[];
  let finalCalculatedWeeks: number;
  
  if (calculatedWeeks > maxWeeks) {
    const hoursToCut = (calculatedWeeks - maxWeeks) * studentWeeklyHours;
    console.warn(`BlockPlanner: Block exceeds max duration (${calculatedWeeks} > ${maxWeeks}), dropping ${Math.round(hoursToCut)} hours of topics`);
    
    const { subjects: subjectsAfterDropping, hoursCut: hoursActuallyCut, droppedCodes: droppedTopicCodes } = dropTopicsByPriorityWithPrepMode(
      prepMode,
      subjectChunk,
      Math.round(hoursToCut)
    );
    
    logger.logInfo('BlockPlanner', `Successfully dropped ${hoursActuallyCut} hours of topics using PrepMode strategy. Dropped codes: ${JSON.stringify(droppedTopicCodes)}`);
    
    const finalTotalHours = initialTotalHours - hoursActuallyCut;
    finalCalculatedWeeks = finalTotalHours / studentWeeklyHours;
    finalSubjectsInChunk = subjectsAfterDropping;
  } else {
    logger.logDebug('BlockPlanner', 'No topic dropping needed - block duration within limits');
    finalSubjectsInChunk = subjectChunk;
    finalCalculatedWeeks = calculatedWeeks;
  }

  // Clamp the final duration
  const finalDurationWeeks = clamp(Math.ceil(finalCalculatedWeeks), minWeeks, maxWeeks);
      
  // Generate block title
  const blockTitle = generateBlockTitle(finalSubjectsInChunk);
  
  logger.logInfo('BlockPlanner', `Final block configuration: ${blockTitle} (${finalDurationWeeks} weeks)`);
  
  const blockId = `block-${uuidv4()}`;
  
  // Create block resources (simplified for now)
  const blockResources: BlockResources = {
    primary_books: [],
    supplementary_materials: [],
    practice_resources: [],
    video_content: [],
    current_affairs_sources: [],
    revision_materials: [],
    expert_recommendations: []
  };
  
  return {
    block_id: blockId,
    block_title: blockTitle,
    subjects: finalSubjectsInChunk.map(s => s.subjectCode),
    duration_weeks: finalDurationWeeks,
    weekly_plan: [{ week: 0, daily_plans: [] }], // Will be filled by WeeklyScheduler
    block_resources: blockResources,
    cycle_id: undefined, // Will be populated later when assigned to cycles
    cycle_type: undefined,
    cycle_order: undefined,
    cycle_name: undefined,
    block_start_date: undefined, // Will be populated by Engine
    block_end_date: undefined    // Will be populated by Engine
  };
}

/**
 * Adjust duration limits based on subjective feeling from rebalancing feedback
 */
function adjustDurationLimitsForRebalancing(feeling: SubjectiveFeeling, baseMin: number, baseMax: number): [number, number] {
  switch (feeling) {
    case 'FellBehind':
      // Create shorter, more manageable blocks to help catch up
      const adjustedMin = Math.max(1, baseMin - 2);
      const adjustedMax = Math.max(adjustedMin, baseMax - 3);
      return [adjustedMin, adjustedMax];
    case 'OnTrack':
      // Use standard block durations
      return [baseMin, baseMax];
    case 'GotAhead':
      // Create slightly denser blocks to maintain momentum
      return [baseMin, baseMax + 2];
    default:
      return [baseMin, baseMax];
  }
}

/**
 * Calculate total hours for a block using topic-level confidence
 */
function calculateBlockHoursWithTopicConfidence(
  expProfile: ExperienceProfile,
  coachProfile: CoachingProfile,
  topicConfidenceMap: TopicConfidenceMap,
  subjList: Subject[]
): number {
  return subjList.reduce((sum, subject) => 
    sum + calculateSubjectHoursWithTopicConfidence(expProfile, coachProfile, topicConfidenceMap, subject), 0
  );
}

/**
 * Calculate hours for a single subject using topic-level confidence
 */
function calculateSubjectHoursWithTopicConfidence(
  expProfile: ExperienceProfile,
  coachProfile: CoachingProfile,
  topicConfidenceMap: TopicConfidenceMap,
  subject: Subject
): number {
  const specialization = undefined; // TODO: Extract from subject/optional details if needed
  const calculatedHours = calculateRequiredHoursWithTopicConfidence(
    subject,
    expProfile,
    coachProfile,
    topicConfidenceMap,
    specialization
  );
  return Math.round(calculatedHours);
}

/**
 * Calculate total hours for a block of subjects using enhanced calculation
 */
function calculateBlockHoursEnhanced(
  expProfile: ExperienceProfile,
  coachProfile: CoachingProfile,
  confidenceMap: Record<string, ConfidenceLevel>,
  subjList: Subject[]
): number {
  return subjList.reduce((sum, subject) => 
    sum + calculateSubjectHoursEnhanced(expProfile, coachProfile, confidenceMap, subject), 0
  );
}

/**
 * Calculate hours for a single subject using enhanced HourCalculation formulas
 */
function calculateSubjectHoursEnhanced(
  expProfile: ExperienceProfile,
  coachProfile: CoachingProfile,
  confidenceMap: Record<string, ConfidenceLevel>,
  subject: Subject
): number {
  const confidence = confidenceMap[subject.subjectCode] || 'Moderate';
  const confProfile = mapConfidenceToProfile(confidence);
  const specialization = undefined; // TODO: Extract from subject/optional details if needed
  const calculatedHours = calculateRequiredHours(
    subject.baselineHours,
    expProfile,
    confProfile,
    coachProfile,
    specialization
  );
  return Math.round(calculatedHours);
}

/**
 * Drop topics by priority with PrepMode-aware strategy
 */
function dropTopicsByPriorityWithPrepMode(
  prepMode: PrepMode,
  subjectsChunk: Subject[],
  hoursToCut: number
): { subjects: Subject[]; hoursCut: number; droppedCodes: string[] } {
  const priorityLevelsToDrop = getPriorityDropOrderForPrepMode(prepMode);
  return dropTopicsRecursive(subjectsChunk, priorityLevelsToDrop, hoursToCut, 0, []);
}

/**
 * Get priority drop order based on PrepMode (crash modes are more aggressive)
 */
function getPriorityDropOrderForPrepMode(prepMode: PrepMode): TopicPriority[] {
  switch (prepMode) {
    case 'CrashPrelims':
    case 'CrashMains':
      return ['PeripheralTopic', 'SupplementaryTopic', 'PriorityTopic']; // Very aggressive
    case 'AcceleratedPrelims':
    case 'AcceleratedMains':
      return ['PeripheralTopic', 'SupplementaryTopic']; // Moderately aggressive
    default:
      return ['PeripheralTopic']; // Conservative for standard and foundation modes
  }
}

/**
 * Recursively drop topics by priority level
 */
function dropTopicsRecursive(
  subjList: Subject[],
  priorityLevels: TopicPriority[],
  hoursToCut: number,
  hoursCutSoFar: number,
  droppedAcc: string[]
): { subjects: Subject[]; hoursCut: number; droppedCodes: string[] } {
  if (priorityLevels.length === 0 || hoursCutSoFar >= hoursToCut) {
    return { subjects: subjList, hoursCut: hoursCutSoFar, droppedCodes: droppedAcc };
  }
  
  const [priorityLevel, ...remainingLevels] = priorityLevels;
  const { subjects: updatedSubjects, hoursCut: newHoursCut, droppedCodes: newDroppedCodes } = 
    dropTopicsOfPriority(subjList, priorityLevel, hoursToCut - hoursCutSoFar);
  
  return dropTopicsRecursive(
    updatedSubjects,
    remainingLevels,
    hoursToCut,
    hoursCutSoFar + newHoursCut,
    [...newDroppedCodes, ...droppedAcc]
  );
}

/**
 * Drop topics of a specific priority level
 */
function dropTopicsOfPriority(
  subjList: Subject[],
  targetPriority: TopicPriority,
  hoursToCut: number
): { subjects: Subject[]; hoursCut: number; droppedCodes: string[] } {
  // Find all topics of the target priority across all subjects
  const allTopicsWithSubject: Array<{ subject: Subject; topic: Topic }> = [];
  subjList.forEach(subject => {
    subject.topics.forEach(topic => {
      allTopicsWithSubject.push({ subject, topic });
    });
  });
  
  const droppableTopics = allTopicsWithSubject.filter(({ topic }) => topic.priority === targetPriority);
  
  // Sort by estimated hours (longest first for efficiency)
  const sortedDroppableTopics = droppableTopics.sort((a, b) => 
    getTopicEstimatedHours(b.topic) - getTopicEstimatedHours(a.topic)
  );
  
  // Drop topics until we've cut enough hours
  return dropTopicsUntilCut(subjList, sortedDroppableTopics, hoursToCut, 0, []);
}

/**
 * Drop topics until we've cut the required hours
 */
function dropTopicsUntilCut(
  subjList: Subject[],
  remainingTopics: Array<{ subject: Subject; topic: Topic }>,
  hoursToCut: number,
  hoursCutSoFar: number,
  droppedAcc: string[]
): { subjects: Subject[]; hoursCut: number; droppedCodes: string[] } {
  if (remainingTopics.length === 0 || hoursCutSoFar >= hoursToCut) {
    return { subjects: subjList, hoursCut: hoursCutSoFar, droppedCodes: droppedAcc };
  }
  
  const [{ subject, topic }, ...rest] = remainingTopics;
  const topicHours = getTopicEstimatedHours(topic);
  const updatedSubjects = removeTopicFromSubject(subjList, subject, topic);
  const newHoursCut = hoursCutSoFar + topicHours;
  const newDroppedAcc = [topic.topicCode, ...droppedAcc];
  
  return dropTopicsUntilCut(updatedSubjects, rest, hoursToCut, newHoursCut, newDroppedAcc);
}

/**
 * Remove a specific topic from a subject
 */
function removeTopicFromSubject(subjList: Subject[], targetSubject: Subject, targetTopic: Topic): Subject[] {
  return subjList.map(subject => {
    if (subject.subjectCode === targetSubject.subjectCode) {
      return {
        ...subject,
        topics: subject.topics.filter(topic => topic.topicCode !== targetTopic.topicCode)
      };
    }
    return subject;
  });
}

/**
 * Extract a traditional SubjectConfidenceMap from TopicConfidenceMap for compatibility
 */
function extractTraditionalConfidenceMap(topicConfidenceMap: TopicConfidenceMap, subjects: Subject[]): Record<string, ConfidenceLevel> {
  const result: Record<string, ConfidenceLevel> = {};
  
  subjects.forEach(subject => {
    const subjectCode = subject.subjectCode;
    // Get average confidence of all topics in this subject
    const subjectTopics = subject.topics;
    const topicConfidences = subjectTopics.map(topic => {
      const confidence = topicConfidenceMap[topic.topicCode];
      return confidence ? mapConfidenceProfileToLevel(confidence) : 'Moderate';
    });
    
    const avgConfidence = averageConfidenceLevel(topicConfidences);
    result[subjectCode] = avgConfidence;
  });
  
  return result;
}

/**
 * Map ConfidenceProfile to ConfidenceLevel
 */
function mapConfidenceProfileToLevel(profile: string): ConfidenceLevel {
  switch (profile) {
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

/**
 * Calculate average confidence level from a list of confidence levels
 */
function averageConfidenceLevel(confidences: ConfidenceLevel[]): ConfidenceLevel {
  if (confidences.length === 0) return 'Moderate';
  
  const confidenceValues = confidences.map(confidenceToNumeric);
  const avgValue = confidenceValues.reduce((sum, val) => sum + val, 0) / confidences.length;
  
  return numericToConfidence(Math.round(avgValue));
}

/**
 * Convert confidence level to numeric value
 */
function confidenceToNumeric(confidence: ConfidenceLevel): number {
  switch (confidence) {
    case 'NotStarted':
      return 0;
    case 'VeryWeak':
      return 1;
    case 'Weak':
      return 2;
    case 'Moderate':
      return 3;
    case 'Strong':
      return 4;
    case 'VeryStrong':
      return 5;
    default:
      return 3;
  }
}

/**
 * Convert numeric value to confidence level
 */
function numericToConfidence(value: number): ConfidenceLevel {
  switch (value) {
    case 0:
      return 'NotStarted';
    case 1:
      return 'VeryWeak';
    case 2:
      return 'Weak';
    case 3:
      return 'Moderate';
    case 4:
      return 'Strong';
    case 5:
      return 'VeryStrong';
    default:
      return 'Moderate';
  }
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, minVal: number, maxVal: number): number {
  return Math.max(minVal, Math.min(maxVal, value));
}

/**
 * Generate a title for a block based on its subjects
 */
function generateBlockTitle(subjList: Subject[]): string {
  const subjectNames = subjList.map(s => s.subjectName);
  return subjectNames.join(' & ');
}

/**
 * Safely read hours from text, with fallback
 */
function safeReadHours(text: string): number {
  const parsed = parseInt(text, 10);
  return isNaN(parsed) ? 40 : parsed; // Default fallback
}