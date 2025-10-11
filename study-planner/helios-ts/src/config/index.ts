import { Config } from '../engine/engine-types';

/**
 * Default configuration for the Helios engine
 * This mirrors the Haskell Config module functionality
 */
export const DEFAULT_CONFIG: Config = {
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
    test: 0.05
  }
};

