import type { ExperienceProfile, ConfidenceProfile, CoachingProfile, TopicConfidenceMap } from '../types/HourCalculationTypes';
import type { ConfidenceLevel } from '../types/Types';

// Subject and Topic interfaces (simplified for hour calculation)
export interface Topic {
  topicCode: string;
  priority: 'EssentialTopic' | 'PriorityTopic' | 'SupplementaryTopic' | 'PeripheralTopic';
}

export interface Subject {
  subjectCode: string;
  topics: Topic[];
}

/**
 * Calculate dynamic required hours based on student profile.
 * This is the canonical implementation consolidated from the test suites.
 */
export function calculateRequiredHours(
  baselineHours: number,
  experience: ExperienceProfile,
  confidence: ConfidenceProfile,
  coaching: CoachingProfile,
  specialization?: string
): number {
  const baseline = baselineHours;
  const expMultiplier = getExperienceMultiplier(
    experience.attempts,
    experience.lastPrelimScore,
    experience.lastCSATScore
  );
  const confMultiplier = getConfidenceMultiplier(confidence);
  const coachMultiplier = getCoachingMultiplier(
    coaching.hasPriorCoaching,
    coaching.hasSyllabusUnderstanding
  );
  const specMultiplier = getSpecializationMultiplier(specialization);

  return baseline * expMultiplier * confMultiplier * coachMultiplier * specMultiplier;
}

/**
 * NEW: Topic-Level Confidence Calculation
 * 
 * PURPOSE: Calculate required hours for a subject using topic-specific confidence levels
 * for surgical precision in rebalancing logic.
 * 
 * ALGORITHM:
 * 1. Iterate through all topics in the subject
 * 2. Look up each topic's confidence level in the TopicConfidenceMap
 * 3. Calculate hours for each individual topic based on its specific confidence
 * 4. Sum all topic hours to get the total subject hours
 * 
 * BUSINESS VALUE:
 * - Provides granular control over hour calculations during rebalancing
 * - Allows for precise adjustments based on topic-specific student performance
 * - Enables more accurate time allocation in dynamic plan adjustments
 */
export function calculateRequiredHoursWithTopicConfidence(
  subject: Subject,
  experience: ExperienceProfile,
  coaching: CoachingProfile,
  topicConfidenceMap: TopicConfidenceMap,
  specialization?: string
): number {
  // Calculate hours for each topic individually
  const topicHours = subject.topics.map(topic =>
    calculateTopicHours(experience, coaching, topicConfidenceMap, specialization, topic)
  );
  
  // Sum all topic hours to get total subject hours
  return topicHours.reduce((sum, hours) => sum + hours, 0);
}

/**
 * Calculate hours for a single topic based on its confidence level
 */
function calculateTopicHours(
  experience: ExperienceProfile,
  coaching: CoachingProfile,
  topicConfidenceMap: TopicConfidenceMap,
  specialization: string | undefined,
  topic: Topic
): number {
  // Look up topic-specific confidence level
  const topicCode = topic.topicCode;
  const confidenceLevel = topicConfidenceMap[topicCode] || 'ModerateConfidence';
  const confidenceProfile = mapConfidenceLevelToProfile(confidenceLevel);
  
  // Use a base hour estimate for the topic
  const baseTopicHours = getEstimatedTopicHours(topic);
  
  // Apply the same multipliers as the main calculation
  const expMultiplier = getExperienceMultiplier(
    experience.attempts,
    experience.lastPrelimScore,
    experience.lastCSATScore
  );
  const confMultiplier = getConfidenceMultiplier(confidenceProfile);
  const coachMultiplier = getCoachingMultiplier(
    coaching.hasPriorCoaching,
    coaching.hasSyllabusUnderstanding
  );
  const specMultiplier = getSpecializationMultiplier(specialization);
  
  return baseTopicHours * expMultiplier * confMultiplier * coachMultiplier * specMultiplier;
}

/**
 * Map ConfidenceLevel to ConfidenceProfile for compatibility
 */
function mapConfidenceLevelToProfile(confidenceLevel: ConfidenceLevel | ConfidenceProfile): ConfidenceProfile {
  switch (confidenceLevel) {
    case 'VeryWeak':
    case 'VeryWeakConfidence':
      return 'VeryWeakConfidence';
    case 'Weak':
    case 'WeakConfidence':
      return 'WeakConfidence';
    case 'Moderate':
    case 'ModerateConfidence':
      return 'ModerateConfidence';
    case 'Strong':
    case 'StrongConfidence':
      return 'StrongConfidence';
    case 'VeryStrong':
    case 'VeryStrongConfidence':
      return 'VeryStrongConfidence';
    case 'NotStarted':
      return 'ModerateConfidence'; // Default for unstarted topics
    default:
      return 'ModerateConfidence';
  }
}

/**
 * Get estimated hours for a topic (placeholder - could be enhanced with topic-specific data)
 */
function getEstimatedTopicHours(topic: Topic): number {
  switch (topic.priority) {
    case 'EssentialTopic':
      return 10;
    case 'PriorityTopic':
      return 6;
    case 'SupplementaryTopic':
      return 3;
    case 'PeripheralTopic':
      return 1;
    default:
      return 3;
  }
}

/**
 * Get experience multiplier based on attempt history.
 * Logic is from TestMatrixValidationSpec.hs.
 */
export function getExperienceMultiplier(attempts: number, prelimScore: number, csatScore: number): number {
  if (attempts === 0) return 1.0;
  
  if (attempts === 1) {
    if (prelimScore >= 115 && csatScore >= 125) return 0.75; // Good returner
    if (prelimScore >= 108 && csatScore >= 140) return 0.8;  // Experienced with gaps
    return 0.9;
  }
  
  if (attempts === 2) {
    if (prelimScore >= 95) return 0.7; // Multiple attempts with some success
    return 0.85;
  }
  
  return 0.7; // Default for 3+ attempts
}

/**
 * Get confidence multiplier for test profiles.
 */
export function getConfidenceMultiplier(confidence: ConfidenceProfile): number {
  switch (confidence) {
    case 'VeryWeakConfidence':
      return 1.4;
    case 'WeakConfidence':
      return 1.2;
    case 'ModerateConfidence':
      return 1.0;
    case 'StrongConfidence':
      return 0.8;
    case 'VeryStrongConfidence':
      return 0.7;
    default:
      return 1.0;
  }
}

/**
 * Get coaching multiplier.
 */
export function getCoachingMultiplier(hasCoaching: boolean, hasSyllabus: boolean): number {
  const coachingFactor = hasCoaching ? 0.9 : 1.1;
  const syllabusFactor = hasSyllabus ? 1.0 : 1.1;
  return coachingFactor * syllabusFactor;
}

/**
 * Get specialization multiplier.
 * Logic is from TestMatrixValidationSpec.hs.
 */
export function getSpecializationMultiplier(specialization?: string): number {
  if (!specialization) return 1.0;
  
  const spec = specialization.toLowerCase();
  if (spec.includes('weakness')) return 0.936; // (1.3 * 0.8 * 0.9)
  if (spec.includes('focus')) return 0.935;    // (1.1 * 0.85)
  
  return 1.0;
}

