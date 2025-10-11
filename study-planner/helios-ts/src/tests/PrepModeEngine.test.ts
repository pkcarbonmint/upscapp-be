import { describe, it, expect } from 'vitest';
import { PrepMode, SubjectApproach } from '../types/Types';
import { Archetype as ArchetypeModel } from '../types/models';
import * as archetypes from '../config/archetypes.json';
import dayjs from 'dayjs';

// This will be the home for the ported PrepModeEngine logic

import { getPrepModeProgression } from '../engine/PrepModeEngine';

describe('PrepModeEngine', () => {

  // Helper to find an archetype from the imported JSON
  const getTestArchetype = (name: string): ArchetypeModel => {
    const arch = archetypes.archetypes.find(a => a.name === name);
    if (!arch) {
      throw new Error(`Test archetype not found: ${name}`);
    }
    // This is a bit of a hack to match the Haskell types
    // We assume the JSON values are valid enum keys
    return arch as unknown as ArchetypeModel;
  };

  interface TestCase {
    testId: string;
    planDate: dayjs.Dayjs;
    targetYear?: string;
    studentArchetype: ArchetypeModel;
    expectedPrepModes: PrepMode[];
    expectedBlockDurations: number[];
    expectedSubjectApproach: SubjectApproach;
    expectedDailyHours: [number, number];
    shouldReject: boolean;
    rejectionReason?: string;
  }

  const fullTimeProfessional = getTestArchetype("The Full-Time Professional");
  const workingProfessional = getTestArchetype("The Working Professional");

  const oct2025FullTime: TestCase = {
    testId: "Oct2025_FullTime",
    planDate: dayjs("2025-09-15"), // Month is 0-indexed in JS
    targetYear: "2026",
    studentArchetype: fullTimeProfessional,
    expectedPrepModes: ["MediumtermFoundation", "StandardPrelims", "StandardMains", "InterviewPrep"],
    expectedBlockDurations: [10, 8, 8, 8],
    expectedSubjectApproach: "DualSubject",
    expectedDailyHours: [6, 7],
    shouldReject: false,
  };

  const oct2025Working: TestCase = {
    testId: "Oct2025_Working",
    planDate: dayjs("2025-09-15"),
    targetYear: "2026",
    studentArchetype: workingProfessional,
    expectedPrepModes: ["MediumtermFoundation", "AcceleratedPrelims", "AcceleratedMains", "InterviewPrep"],
    expectedBlockDurations: [12, 8, 7, 10],
    expectedSubjectApproach: "SingleSubject",
    expectedDailyHours: [3, 4],
    shouldReject: false,
  };

  it('generates correct PrepMode progression for Oct 2025 Full-Time Professional', () => {
    const weeklyHours = 40;
    console.log(`FULL-TIME-TEST: weeklyHours=${weeklyHours}`);
    const actualModes = getPrepModeProgression(
      oct2025FullTime.planDate,
      oct2025FullTime.targetYear,
      oct2025FullTime.studentArchetype,
      weeklyHours
    );
    expect(actualModes).toEqual(oct2025FullTime.expectedPrepModes);
  });

  it('generates correct PrepMode progression for Oct 2025 Working Professional', () => {
    const weeklyHours = 25;
    const actualModes = getPrepModeProgression(
      oct2025Working.planDate,
      oct2025Working.targetYear,
      oct2025Working.studentArchetype,
      weeklyHours
    );
    expect(actualModes).toEqual(oct2025Working.expectedPrepModes);
  });

});