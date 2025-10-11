// Hour calculation types ported from Haskell Types.HourCalculationTypes

export interface ExperienceProfile {
  attempts: number;
  lastPrelimScore: number;
  lastCSATScore: number;
}

export type ConfidenceProfile =
  | "VeryWeakConfidence"
  | "WeakConfidence"
  | "ModerateConfidence"
  | "StrongConfidence"
  | "VeryStrongConfidence";

export interface CoachingProfile {
  hasPriorCoaching: boolean;
  hasSyllabusUnderstanding: boolean;
}

// Topic confidence map for granular hour calculations
export type TopicConfidenceMap = Record<string, ConfidenceProfile>;

