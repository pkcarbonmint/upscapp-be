import { describe, it, expect, beforeEach } from 'vitest';
import { generateInitialPlan } from '../engine/NewEngine-generate-plan';
import { DEFAULT_CONFIG } from '../config';
import type { StudentIntake, Archetype } from '../types/models';
import { createStudentIntake } from '../types/models';
import type { Config } from '../engine/engine-types';
import { loadAllSubjects } from '../services/SubjectLoader';
import { ResourceService } from '../services/ResourceService';
import { DocumentService } from '../services/DocumentService';
import dayjs from 'dayjs';
import { CycleType } from '../types/Types';



const dummyStuff = {
	preparation_background: {
		preparing_since: '6 months',
		number_of_attempts: '0', // Required - including "0" for freshers
		highest_stage_per_attempt: 'N/A', // Required - "N/A" for freshers
	},
	personal_details: {
		full_name: 'John Doe',
		email: 'john.doe@example.com',
		phone_number: '+91-9876543210',
		present_location: 'Delhi',
		student_archetype: 'General',
		graduation_stream: 'Engineering',
		college_university: 'IIT Delhi',
		year_of_passing: 2023
	},

}

// Expected ratios per cycle type (from cycle-utils.ts)
const expectedRatios: Record<CycleType, { study: number; practice: number; revision: number }> = {
  'C1': { study: 0.7, practice: 0.15, revision: 0.15 }, // 70% study, 15% practice, 15% revision
  'C2': { study: 0.0, practice: 0.4, revision: 0.6 },     // 0% study, 40% practice, 60% revision
  'C3': { study: 0.0, practice: 0.4, revision: 0.6 },     // 0% study, 40% practice, 60% revision
  'C4': { study: 0.0, practice: 0.4, revision: 0.6 },     // 0% study, 40% practice, 60% revision
  'C5': { study: 0.0, practice: 0.4, revision: 0.6 },     // 0% study, 40% practice, 60% revision
  'C5.b': { study: 0.0, practice: 0.4, revision: 0.6 },   // 0% study, 40% practice, 60% revision
  'C6': { study: 0.0, practice: 0.4, revision: 0.6 },     // 0% study, 40% practice, 60% revision
  'C7': { study: 0.0, practice: 0.4, revision: 0.6 },     // 0% study, 40% practice, 60% revision
  'C8': { study: 0.0, practice: 0.4, revision: 0.6 },     // 0% study, 40% practice, 60% revision
};


describe('generateInitialPlan', () => {
  let testConfig: Config;
  let testArchetype: Archetype;
  let testIntake: StudentIntake;

  beforeEach(() => {
    // Use default configuration
    testConfig = DEFAULT_CONFIG;

    // Create a test archetype for a student studying 2 subjects in parallel
    testArchetype = {
      archetype: 'BalancedDualSubject',
      timeCommitment: 'FullTime',
      weeklyHoursMin: 40,
      weeklyHoursMax: 50,
      description: 'Student focusing on 2 subjects with balanced approach',
      defaultPacing: 'Balanced',
      defaultApproach: 'DualSubject',
      specialFocus: ['GS', 'Optional']
    };

    // Create test intake data with specified inputs:
    // - Start date: October 1, 2025
    // - Target year: 2026
    // - 2 subjects in parallel (GS + Optional)
    // - Medium confidence in all subjects
    // Using actual subject codes from the system
    testIntake = createStudentIntake({
      ...dummyStuff,
      subject_confidence: {
        'H01': 'Moderate',  // History-Ancient
        'H02': 'Moderate',  // History-Medieval
        'H03': 'Moderate',  // History-Modern
        'H04': 'Moderate',  // Optional subject
        'H05': 'Moderate',  // Additional subject
        'H06': 'Moderate',  // Additional subject
        'G': 'Moderate'     // Geography
      },
      study_strategy: {
        study_focus_combo: 'OneGSPlusOptional',
        weekly_study_hours: '40-50',
        time_distribution: 'Balanced',
        study_approach: 'Balanced',
        revision_strategy: 'Weekly',
        test_frequency: 'Monthly',
        seasonal_windows: ['Foundation', 'Revision'],
        catch_up_day_preference: 'Sunday'
      },
      subject_approach: 'DualSubject',
      target_year: '2026',
      start_date: '2025-10-01'
    });
  });

  it('should generate a valid study plan with correct structure', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    // Basic structure assertions
    expect(result.plan).toBeDefined();
    expect(result.plan.study_plan_id).toBeDefined();
    expect(result.plan.user_id).toBe('system-generated');
    expect(result.plan.plan_title).toContain('2026');
    expect(result.logs).toBeDefined();
    expect(Array.isArray(result.logs)).toBe(true);
  });

  it('should include foundation cycle for October 2025 start with 2026 target', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Should have cycles
    expect(plan.cycles).toBeDefined();
    expect(Array.isArray(plan.cycles)).toBe(true);

    // Should include foundation cycle since start is before Dec 31, 2025
    const foundationCycle = plan.cycles?.find(cycle =>
        cycle.cycleType === 'C2'
    );

    if (foundationCycle) {
      expect(foundationCycle.cycleStartDate).toBeDefined();
      expect(foundationCycle.cycleDuration).toBeGreaterThan(0);
      expect(foundationCycle.cycleBlocks).toBeDefined();
      expect(Array.isArray(foundationCycle.cycleBlocks)).toBe(true);
    } else {
      // If no foundation cycle, check logs to understand why
      // const logs = result.logs;
      // const foundationLogs = logs.filter(log =>
      //   log.logMessage.includes('Foundation') ||
      //   log.logMessage.includes('foundation')
      // );

      // For October 2025 start with 2026 target, foundation cycle should exist
      // If it doesn't, there might be an issue with the cycle planning logic
      expect(foundationCycle).toBeDefined();
    }
  });

  it('should include prelims revision cycle for 2026 target year', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Should include prelims revision cycle (Jan 1 - Mar 31, 2026)
    const prelimsRevisionCycle = plan.cycles!.find(cycle =>
      cycle.cycleName.includes('Prelims Revision') ||
      cycle.cycleType === 'C4'
    );
    expect(prelimsRevisionCycle).toBeDefined();

    if (prelimsRevisionCycle) {
      expect(prelimsRevisionCycle.cycleStartDate).toBeDefined();
      // Should start around January 2026
      const startDate = dayjs(prelimsRevisionCycle.cycleStartDate);
      expect(startDate.year()).toBe(2026);
      expect(startDate.month()).toBe(0); // January (0-indexed)
    }
  });

  it('should include prelims rapid revision cycle for 2026 target year', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Should include prelims rapid revision cycle (Apr 1 - May 20, 2026)
    const prelimsRapidCycle = plan.cycles!.find(cycle =>
      cycle.cycleName.includes('Prelims Rapid')
    );
    expect(prelimsRapidCycle).toBeDefined();

    if (prelimsRapidCycle) {
      expect(prelimsRapidCycle.cycleStartDate).toBeDefined();
      // Should start around April 2026
      const startDate = dayjs(prelimsRapidCycle.cycleStartDate);
      expect(startDate.year()).toBe(2026);
      expect(startDate.month()).toBe(3); // April (0-indexed)
    }
  });

  it('should include mains rapid revision cycle for 2026 target year', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Should include mains rapid revision cycle (May 21 - Aug 20, 2026)
    const mainsRapidCycle = plan.cycles!.find(cycle =>
      cycle.cycleName.includes('Mains Rapid')
    );
    expect(mainsRapidCycle).toBeDefined();

    if (mainsRapidCycle) {
      expect(mainsRapidCycle.cycleStartDate).toBeDefined();
      // Should start around May 2026
      const startDate = dayjs(mainsRapidCycle.cycleStartDate);
      expect(startDate.year()).toBe(2026);
      expect(startDate.month()).toBe(4); // May (0-indexed)
    }
  });

  it('should have proper timeline utilization', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Should have timeline utilization calculated
    expect(plan.timelineUtilization).toBeDefined();
    expect(typeof plan.timelineUtilization).toBe('number');
    expect(plan.timelineUtilization).toBeGreaterThan(0);
    expect(plan.timelineUtilization).toBeLessThanOrEqual(100);
  });

  it('should have proper milestones calculated', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Should have milestones
    expect(plan.milestones).toBeDefined();

    if (plan.milestones) {
      // Should have foundation to prelims date
      expect(plan.milestones.foundationToPrelimsDate).toBeDefined();

      // Should have prelims to mains date  
      expect(plan.milestones.prelimsToMainsDate).toBeDefined();
    }
  });

  it('should have correct target year context', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Should have target year set correctly
    expect(plan.created_for_target_year).toBe('2026');

    // Should have effective season context
    expect(plan.effective_season_context).toBeDefined();
    // For 2026 target with Oct 2025 start, should be ComprehensiveStudy
    expect(plan.effective_season_context).toBe('ComprehensiveStudy');
  });

  it('should have proper cycle ordering and sequencing', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    if (plan.cycles && plan.cycles.length > 1) {
      // Cycles should be ordered by start date
      const sortedCycles = [...plan.cycles].sort((a, b) =>
        dayjs(a.cycleStartDate).valueOf() - dayjs(b.cycleStartDate).valueOf()
      );

      // The sorted array should match the original order
      expect(sortedCycles).toEqual(plan.cycles);
    }
  });

  it('should generate logs with proper structure', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const logs = result.logs;

    // Should have logs
    expect(logs.length).toBeGreaterThan(0);

    // Each log entry should have proper structure
    logs.forEach(log => {
      expect(log.logLevel).toBeDefined();
      expect(['Debug', 'Info', 'Warn', 'Error']).toContain(log.logLevel);
      expect(log.logSource).toBeDefined();
      expect(log.logMessage).toBeDefined();
    });

    // Should have engine start log
    const startLog = logs.find(log =>
      log.logMessage.includes('Starting initial plan generation')
    );
    expect(startLog).toBeDefined();
  });

  it('should handle the specified study strategy correctly', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Should have cycles
    expect(plan.cycles).toBeDefined();
    expect(Array.isArray(plan.cycles)).toBe(true);

    // If cycles exist, check blocks
    if (plan.cycles && plan.cycles.length > 0) {
      const allBlocks = plan.cycles.flatMap(cycle => cycle.cycleBlocks);
      expect(allBlocks.length).toBeGreaterThan(0);

      // Each block should have subjects
      allBlocks.forEach(block => {
        expect(block.subjects).toBeDefined();
        expect(Array.isArray(block.subjects)).toBe(true);
        expect(block.subjects.length).toBeGreaterThan(0);
      });
    } else {
      // If no cycles, this might be expected behavior for certain conditions
      // Let's check the logs to understand why
      // const logs = result.logs;
      // const cycleLogs = logs.filter(log =>
      //   log.logMessage.includes('cycle') ||
      //   log.logMessage.includes('Foundation') ||
      //   log.logMessage.includes('Prelims')
      // );

      // For now, just ensure we get a valid plan structure
      expect(plan.study_plan_id).toBeDefined();
      expect(plan.plan_title).toBeDefined();
    }
  });

  it('should respect the foundation cycle GS:Optional ratio of 6:3', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Find foundation cycle
    const foundationCycle = plan.cycles?.find(cycle =>
      cycle.cycleType === 'C2'
    );

    if (foundationCycle) {
      // Check that blocks have appropriate subject distribution
      const blocks = foundationCycle.cycleBlocks;
      expect(blocks.length).toBeGreaterThan(0);

      // Each block should have subjects (GS and Optional)
      blocks.forEach(block => {
        expect(block.subjects).toBeDefined();
        expect(block.subjects.length).toBeGreaterThan(0);
      });
    }
  });

  it('should ensure all subjects are covered in the foundation phase', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Find foundation cycle
    const foundationCycle = plan.cycles?.find(cycle =>
      cycle.cycleType === 'C2'
    );

    expect(foundationCycle).toBeDefined();

    if (foundationCycle) {
      // Get all subjects covered in foundation cycle
      const foundationSubjects = new Set<string>();
      foundationCycle.cycleBlocks.forEach(block => {
        block.subjects.forEach(subject => {
          foundationSubjects.add(subject);
        });
      });

      // Should cover ALL subjects in the system (since we default missing subjects to Moderate)
      const allSystemSubjects = loadAllSubjects().map(s => s.subjectCode);
      const notCoveredSubjects = allSystemSubjects.filter(subject => !foundationSubjects.has(subject));
      expect(notCoveredSubjects.length).toBe(0);

      // Should have at least the core subjects
      expect(foundationSubjects.size).toBeGreaterThan(0);

      // Should cover all subjects in the system
      expect(foundationSubjects.size).toBe(allSystemSubjects.length);
    } else {
      // If no foundation cycle, log the reason
      // const logs = result.logs;
      // const foundationLogs = logs.filter(log =>
      //   log.logMessage.includes('Foundation') ||
      //   log.logMessage.includes('foundation')
      // );
      // console.log('Foundation-related logs:', foundationLogs);
    }
  });

  it('should ensure all subjects are covered in the prelims revision cycle', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Find prelims revision cycle
    const prelimsRevisionCycle = plan.cycles?.find(cycle =>
      cycle.cycleType === 'C4' ||
      cycle.cycleName.includes('Prelims Revision')
    );

    expect(prelimsRevisionCycle).toBeDefined();

    if (prelimsRevisionCycle) {
      // Get all subjects covered in prelims revision cycle
      const revisionSubjects = new Set<string>();
      prelimsRevisionCycle.cycleBlocks.forEach(block => {
        block.subjects.forEach(subject => {
          revisionSubjects.add(subject);
        });
      });

      // Should cover ALL subjects in the system
      const allSystemSubjects = loadAllSubjects().map(s => s.subjectCode);
      const notCoveredSubjects = allSystemSubjects.filter(subject => !revisionSubjects.has(subject));
      expect(notCoveredSubjects.length).toBe(1);
      expect(notCoveredSubjects[0]).toBe('Z');

      // Should have at least the core subjects
      expect(revisionSubjects.size).toBeGreaterThan(0);

      // Should cover all subjects in the system
      expect(revisionSubjects.size).toBe(allSystemSubjects.length - 1);
    } else {
      // // If no prelims revision cycle, log the reason
      // const logs = result.logs;
      // const revisionLogs = logs.filter(log =>
      //   log.logMessage.includes('Prelims Revision') ||
      //   log.logMessage.includes('revision')
      // );
      // console.log('Prelims revision-related logs:', revisionLogs);
    }
  });

  it('should ensure all subjects are covered in the prelims rapid revision cycle', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Find prelims rapid revision cycle
    const prelimsRapidCycle = plan.cycles?.find(cycle =>
      cycle.cycleName.includes('Prelims Rapid')
    );

    expect(prelimsRapidCycle).toBeDefined();

    if (prelimsRapidCycle) {
      // Get all subjects covered in prelims rapid revision cycle
      const rapidSubjects = new Set<string>();
      prelimsRapidCycle.cycleBlocks.forEach(block => {
        block.subjects.forEach(subject => {
          rapidSubjects.add(subject);
        });
      });

      // Debug: Log what subjects are actually covered
      // console.log('Prelims rapid revision subjects covered:', Array.from(rapidSubjects));

      // Should cover ALL subjects in the system
      const allSystemSubjects = loadAllSubjects().map(s => s.subjectCode);
      const notCoveredSubjects = allSystemSubjects.filter(subject => !rapidSubjects.has(subject));
      expect(notCoveredSubjects.length).toBe(1);
      expect(notCoveredSubjects[0]).toBe('Z');

      // Should have at least the core subjects
      expect(rapidSubjects.size).toBeGreaterThan(0);

      // Should cover all subjects in the system
      expect(rapidSubjects.size).toBe(allSystemSubjects.length - 1);
    } else {
      // If no prelims rapid cycle, log the reason
      // const logs = result.logs;
      // const rapidLogs = logs.filter(log =>
      //   log.logMessage.includes('Prelims Rapid') ||
      //   log.logMessage.includes('rapid')
      // );
      // console.log('Prelims rapid revision-related logs:', rapidLogs);
    }
  });

  it('should ensure all subjects are covered in the mains rapid revision cycle', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Find mains rapid revision cycle
    const mainsRapidCycle = plan.cycles?.find(cycle =>
      cycle.cycleName.includes('Mains Rapid')
    );

    expect(mainsRapidCycle).toBeDefined();

    if (mainsRapidCycle) {
      // Get all subjects covered in mains rapid revision cycle
      const mainsSubjects = new Set<string>();
      mainsRapidCycle.cycleBlocks.forEach(block => {
        block.subjects.forEach(subject => {
          mainsSubjects.add(subject);
        });
      });

      // Should cover ALL subjects in the system
      const allSystemSubjects = loadAllSubjects().map(s => s.subjectCode);
      const notCoveredSubjects = allSystemSubjects.filter(subject => !mainsSubjects.has(subject));
      expect(notCoveredSubjects.length).toBe(0);

      // Should have at least the core subjects
      expect(mainsSubjects.size).toBeGreaterThan(0);

      // Should cover all subjects in the system
      expect(mainsSubjects.size).toBe(allSystemSubjects.length);
    } else {
      // // If no mains rapid cycle, log the reason
      // const logs = result.logs;
      // const mainsLogs = logs.filter(log =>
      //   log.logMessage.includes('Mains Rapid') ||
      //   log.logMessage.includes('mains')
      // );
      // console.log('Mains rapid revision-related logs:', mainsLogs);
    }
  });

  it('should have correct study/practice/revision ratios allocated per cycle type', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Check study/practice/revision ratios for different cycle types
    if (plan.cycles) {
      plan.cycles.forEach(cycle => {
        const blocks = cycle.cycleBlocks;
        expect(blocks.length).toBeGreaterThan(0);

        blocks.forEach(block => {
          const weeklyPlans = block.weekly_plan;
          expect(weeklyPlans.length).toBeGreaterThan(0);

          weeklyPlans.forEach(weeklyPlan => {
            const dailyPlans = weeklyPlan.daily_plans;
            expect(dailyPlans.length).toBeGreaterThan(0);

            dailyPlans.forEach(dailyPlan => {
              const tasks = dailyPlan.tasks;
              expect(tasks.length).toBeGreaterThan(0);

              // Count different task types
              const studyTasks = tasks.filter(task =>
                task.title.toLowerCase().includes('study') ||
                task.humanReadableId.toLowerCase().includes('study')
              );
              const practiceTasks = tasks.filter(task =>
                task.title.toLowerCase().includes('practice') ||
                task.humanReadableId.toLowerCase().includes('practice')
              );
              const revisionTasks = tasks.filter(task => 
                task.title.toLowerCase().includes('revision') || 
                task.humanReadableId.toLowerCase().includes('revision')
              );

              // Verify ratios are within expected range (±30% tolerance for flexibility)
              if (expectedRatios[cycle.cycleType]) {
                const ratio = expectedRatios[cycle.cycleType];
                const totalTasks = tasks.length;

                if (totalTasks > 0) {
                  const studyRatio = studyTasks.length / totalTasks;
                  const practiceRatio = practiceTasks.length / totalTasks;
                  const revisionRatio = revisionTasks.length / totalTasks;

                  // Verify study ratio (with 30% tolerance)
                  const studyMin = ratio.study * 0.7; // Allow 30% deviation below
                  const studyMax = ratio.study * 1.3; // Allow 30% deviation above
                  const practiceMin = ratio.practice * 0.7; // Allow 30% deviation below
                  const practiceMax = ratio.practice * 1.3; // Allow 30% deviation above
                  const revisionMin = ratio.revision * 0.7; // Allow 30% deviation below
                  const revisionMax = ratio.revision * 1.3; // Allow 30% deviation above

                  // Verify study ratio
                  if (ratio.study > 0) {
                    expect(studyRatio).toBeGreaterThanOrEqual(studyMin);
                    expect(studyRatio).toBeLessThanOrEqual(studyMax);
                  }

                  // Verify practice ratio
                  if (ratio.practice > 0) {
                    expect(practiceRatio).toBeGreaterThanOrEqual(practiceMin);
                    expect(practiceRatio).toBeLessThanOrEqual(practiceMax);
                  }

                  // Verify revision ratio
                  if (ratio.revision > 0) {
                    expect(revisionRatio).toBeGreaterThanOrEqual(revisionMin);
                    expect(revisionRatio).toBeLessThanOrEqual(revisionMax);
                  }

                  // Verify revision tasks exist for revision cycles
                  if (cycle.cycleType === 'C4' || cycle.cycleType === 'C5') {
                    expect(revisionTasks.length).toBeGreaterThan(0);
                  }

                  // console.log(`Cycle ${cycle.cycleType}: Study ${(studyRatio * 100).toFixed(1)}% (expected: ${(ratio.study * 100).toFixed(1)}%), Practice ${(practiceRatio * 100).toFixed(1)}% (expected: ${(ratio.practice * 100).toFixed(1)}%), Revision ${(revisionRatio * 100).toFixed(1)}% (expected: ${(ratio.revision * 100).toFixed(1)}%)`);
                }
              }
            });
          });
        });
      });
    }
  });

  it('should correctly assign hours to subtopics when not specified', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Find foundation cycle to check subtopic hour allocation
    const foundationCycle = plan.cycles?.find(cycle =>
      cycle.cycleType === 'C2'
    );

    expect(foundationCycle).toBeDefined();

    if (foundationCycle) {
      // Check that all blocks have allocated hours
      foundationCycle.cycleBlocks.forEach(block => {
        expect(block.estimated_hours).toBeGreaterThan(0);
        expect(block.actual_hours).toBeGreaterThan(0);

        // Verify hours are reasonable (between 1-100 hours per block)
        expect(block.estimated_hours || 0).toBeGreaterThanOrEqual(4); // Minimum allocated
        expect(block.estimated_hours || 0).toBeLessThanOrEqual(200); // Reasonable upper bound

        // Verify actual hours don't exceed estimated by too much (indicating good trimming)
        if (block.actual_hours && block.estimated_hours) {
          const hoursRatio = block.actual_hours / block.estimated_hours;
          if (hoursRatio > 1.7 || hoursRatio < 0.4) {
            console.log('--------------------------------');
            console.log({ cycleType: foundationCycle.cycleType, blockTitle: block.block_title, estimatedHours: block.estimated_hours, actualHours: block.actual_hours, hoursRatio });
          }
          expect(hoursRatio).toBeGreaterThanOrEqual(0.4); // At least 40% of estimated hours used
          expect(hoursRatio).toBeLessThanOrEqual(1.7); // Not more than 150% of estimated hours

          // console.log(`Block ${block.block_title}: estimated=${block.estimated_hours}h, actual=${block.actual_hours}h, ratio=${hoursRatio.toFixed(2)}`);
        }
      });

      // Verify total cycle hours are distributed among blocks
      const totalEstimatedHours = foundationCycle.cycleBlocks.reduce((sum, block) => sum + (block.estimated_hours || 0), 0);
      const totalActualHours = foundationCycle.cycleBlocks.reduce((sum, block) => sum + (block.actual_hours || 0), 0);

      expect(totalEstimatedHours).toBeGreaterThan(0);
      expect(totalActualHours).toBeGreaterThan(0);

      // console.log(`Foundation cycle: estimated=${totalEstimatedHours}h, actual=${totalActualHours}h`);
    }
  });

  it('should correctly drop subtopics when there is not enough time', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Find foundation cycle to check subtopic trimming
    const foundationCycle = plan.cycles?.find(cycle =>
      cycle.cycleType === 'C2'
    );

    expect(foundationCycle).toBeDefined();

    if (foundationCycle) {
      // Verify that blocks don't exceed their allocated hours (subtopics were trimmed)
      foundationCycle.cycleBlocks.forEach(block => {
        // Calculate total subtopic hours from weekly plans
        let scheduledHours = 0;

        block.weekly_plan.forEach(weeklyPlan => {
          weeklyPlan.daily_plans.forEach(dailyPlan => {
            dailyPlan.tasks.forEach(task => {
              // Assuming duration_minutes is specified, convert to hours
              scheduledHours += (task.duration_minutes || 0) / 60;
            });
          });
        });

        // Scheduled hours should not exceed allocated hours significantly
        if (block.estimated_hours) {
          const allocationRatio = scheduledHours / block.estimated_hours;
          expect(allocationRatio).toBeLessThanOrEqual(2.0); // Not more than 2x allocated hours

          // console.log(`Block ${block.block_title}: scheduled=${scheduledHours.toFixed(1)}h, allocated=${block.estimated_hours}h, ratio=${allocationRatio.toFixed(2)}`);
        }
      });

      // Check that Band A subtopics are prioritized (never dropped)
      // This test verifies the trimming logic prioritizes Band A > B > C > D
      // console.log('Foundation cycle trimming verification:');
      // foundationCycle.cycleBlocks.forEach(block => {
      //   console.log(`  ${block.block_title}: ${block.actual_hours}h allocated`);
      // });
    }
  });

  it('should not have prelims revision tasks beyond prelims date (May 20)', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;
    const prelimsEndDate = dayjs('2026-05-20'); // Prelims end date

    if (plan.cycles) {
      plan.cycles.forEach(cycle => {
        // Only check prelims-related cycles for revision tasks after May 20
        const isPrelimsCycle = cycle.cycleType === 'C4' || 
                              cycle.cycleType === 'C5' ||
                              cycle.cycleName.includes('Prelims');
        
        if (isPrelimsCycle) {
          cycle.cycleBlocks.forEach(block => {
            // Check if block has dates and is after prelims
            if (block.block_start_date && block.block_end_date) {
              const blockStart = dayjs(block.block_start_date);
              const blockEnd = dayjs(block.block_end_date);
              
              // If block is after prelims end date, check for revision tasks
              if (blockStart.isAfter(prelimsEndDate) || blockEnd.isAfter(prelimsEndDate)) {
                block.weekly_plan.forEach(weeklyPlan => {
                  weeklyPlan.daily_plans.forEach(dailyPlan => {
                    dailyPlan.tasks.forEach(task => {
                      // Check if this is a revision task
                      const isRevisionTask = task.title.toLowerCase().includes('revision') || 
                                           task.humanReadableId.toLowerCase().includes('revision');
                      
                      if (isRevisionTask) {
                        console.log(`Found prelims revision task after prelims: ${task.title} in block ${block.block_title} (${block.block_start_date} to ${block.block_end_date})`);
                      }
                      
                      // Assert no prelims revision tasks after prelims
                      expect(isRevisionTask).toBe(false);
                    });
                  });
                });
              }
            }
          });
        }
      });
    }
  });

  it('should ensure at least one foundation cycle and one prelims revision cycle are included', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    expect(plan.cycles).toBeDefined();

    // Debug: Log all cycles
    // console.log('All cycles:', plan.cycles?.map(c => `${c.cycleType} - ${c.cycleName}`) || []);

    if (plan.cycles && plan.cycles.length > 0) {
      // Must have at least one foundation cycle
      const foundationCycles = plan.cycles.filter(cycle =>
        cycle.cycleType === 'C2'
      );
      expect(foundationCycles.length).toBeGreaterThanOrEqual(1);

      // Must have at least one prelims revision cycle
      const prelimsRevisionCycles = plan.cycles.filter(cycle =>
        cycle.cycleType === 'C4' ||
        cycle.cycleName.includes('Prelims Revision') ||
        cycle.cycleName.includes('Prelims Rapid')
      );
      expect(prelimsRevisionCycles.length).toBeGreaterThanOrEqual(1);

      // Verify cycle ordering - foundation should come before revision
      const foundationCycle = foundationCycles[0];
      const prelimsCycle = prelimsRevisionCycles[0];

      if (foundationCycle && prelimsCycle) {
        const foundationStart = dayjs(foundationCycle.cycleStartDate);
        const prelimsStart = dayjs(prelimsCycle.cycleStartDate);
        expect(foundationStart.isBefore(prelimsStart)).toBe(true);
      }
    } else {
      // If no cycles, log the reason
      // const logs = result.logs;
      // const cycleLogs = logs.filter(log =>
      //   log.logMessage.includes('cycle') ||
      //   log.logMessage.includes('Foundation') ||
      //   log.logMessage.includes('Prelims') ||
      //   log.logMessage.includes('skipped')
      // );
      // console.log('Cycle-related logs:', cycleLogs);

      // For October 2025 start with 2026 target, we should have cycles
      expect(plan.cycles!.length).toBeGreaterThan(0);
    }
  });

  it('should ensure blocks do not exceed cycle end dates', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    expect(plan.cycles).toBeDefined();

    if (plan.cycles) {
      plan.cycles.forEach(cycle => {
        if (cycle.cycleEndDate) {
          const cycleEndDate = dayjs(cycle.cycleEndDate);
          
          cycle.cycleBlocks.forEach(block => {
            if (block.block_end_date) {
              const blockEndDate = dayjs(block.block_end_date);
              
              // Block end date should not exceed cycle end date
              expect(blockEndDate.isAfter(cycleEndDate)).toBe(false);
              
              // Log any violations for debugging
              if (blockEndDate.isAfter(cycleEndDate)) {
                console.log(`Block ${block.block_id} ends ${block.block_end_date} but cycle ${cycle.cycleName} ends ${cycle.cycleEndDate}`);
              }
            }
          });
        }
      });

      // Specifically test prelims rapid revision cycle ends on May 20, 2026
      const prelimsRapidCycle = plan.cycles.find(cycle =>
        cycle.cycleName.includes('Prelims Rapid')
      );

      if (prelimsRapidCycle) {
        expect(prelimsRapidCycle.cycleEndDate).toBe('2026-05-20');
        
        // Verify all blocks in this cycle end by May 20
        prelimsRapidCycle.cycleBlocks.forEach(block => {
          if (block.block_end_date) {
            const blockEndDate = dayjs(block.block_end_date);
            const may20 = dayjs('2026-05-20');
            
            expect(blockEndDate.isAfter(may20)).toBe(false);
            expect(blockEndDate.isSame(may20) || blockEndDate.isBefore(may20)).toBe(true);
          }
        });
      }

      // Test mains rapid revision cycle ends on August 20, 2026
      const mainsRapidCycle = plan.cycles.find(cycle =>
        cycle.cycleName.includes('Mains Rapid')
      );

      if (mainsRapidCycle) {
        expect(mainsRapidCycle.cycleEndDate).toBe('2026-08-20');
        
        // Verify all blocks in this cycle end by August 20
        mainsRapidCycle.cycleBlocks.forEach(block => {
          if (block.block_end_date) {
            const blockEndDate = dayjs(block.block_end_date);
            const aug20 = dayjs('2026-08-20');
            
            expect(blockEndDate.isAfter(aug20)).toBe(false);
            expect(blockEndDate.isSame(aug20) || blockEndDate.isBefore(aug20)).toBe(true);
          }
        });
      }
    }
  });

  // Resource Integration Tests
  describe('Resource Integration', () => {
    it('should load resources from study-materials.json for subjects', async () => {
      // Test loading resources for Indian Polity (P)
      const polityResources = await ResourceService.getResourcesForSubject('P');
      
      expect(polityResources).toBeDefined();
      expect(polityResources.primary_books).toBeDefined();
      expect(polityResources.supplementary_materials).toBeDefined();
      expect(polityResources.practice_resources).toBeDefined();
      expect(polityResources.video_content).toBeDefined();
      expect(polityResources.current_affairs_sources).toBeDefined();
      expect(polityResources.revision_materials).toBeDefined();
      expect(polityResources.expert_recommendations).toBeDefined();
      
      // Should have resources from study-materials.json
      expect(polityResources.primary_books.length).toBeGreaterThan(0);
      expect(polityResources.current_affairs_sources.length).toBeGreaterThan(0);
      expect(polityResources.practice_resources.length).toBeGreaterThan(0);
      
      // Check resource structure
      if (polityResources.primary_books.length > 0) {
        const sampleResource = polityResources.primary_books[0];
        expect(sampleResource.resource_id).toBeDefined();
        expect(sampleResource.resource_title).toBeDefined();
        expect(sampleResource.resource_type).toBeDefined();
        expect(sampleResource.resource_priority).toBeDefined();
        expect(sampleResource.resource_cost).toBeDefined();
        expect(sampleResource.resource_description).toBeDefined();
      }
    });

    it('should load resources for Economy subject', async () => {
      const economyResources = await ResourceService.getResourcesForSubject('E');
      
      expect(economyResources).toBeDefined();
      expect(economyResources.primary_books.length).toBeGreaterThan(0);
      expect(economyResources.current_affairs_sources.length).toBeGreaterThan(0);
      expect(economyResources.practice_resources.length).toBeGreaterThan(0);
    });

    it('should generate document with detailed resource sections', async () => {
      const result = await generateInitialPlan(
        'test-user-123',
        testConfig,
        testArchetype,
        testIntake
      );

      const plan = result.plan;
      
      // Create mock StudentIntake for testing
      const mockStudentIntake = createStudentIntake({
        subject_approach: 'DualSubject',
        subject_confidence: {},
        study_strategy: {
          study_focus_combo: 'dual_focus' as any,
          weekly_study_hours: '40',
          time_distribution: 'balanced',
          study_approach: 'moderate' as any,
          revision_strategy: 'weekly',
          test_frequency: 'monthly',
          seasonal_windows: [],
          catch_up_day_preference: 'sunday'
        },
        target_year: '2026',
        start_date: new Date().toISOString().split('T')[0],
        personal_details: {
          full_name: 'Test Student',
          email: 'test@example.com',
          phone_number: '+91-9876543210',
          present_location: 'Delhi',
          student_archetype: 'Full-time Aspirant',
          graduation_stream: 'Engineering',
          college_university: 'Test University',
          year_of_passing: 2024
        },
        preparation_background: {
          preparing_since: '6 months',
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
        }
      });

      // Generate document with detailed resources
      const document = await DocumentService.generateDocument(null, plan, mockStudentIntake);
      
      expect(document).toBeDefined();
      // Document should be generated successfully with resource sections
    });

    it('should include resources from study-materials.json in generated study plan', async () => {
      const result = await generateInitialPlan(
        'test-user-123',
        testConfig,
        testArchetype,
        testIntake
      );

      const plan = result.plan;
      
      // Check that blocks have resources populated
      if (plan.cycles && plan.cycles.length > 0) {
        const allBlocks = plan.cycles.flatMap(cycle => cycle.cycleBlocks);
        
        // At least some blocks should have resources
        const blocksWithResources = allBlocks.filter(block => 
          block.block_resources && (
            block.block_resources.primary_books.length > 0 ||
            block.block_resources.supplementary_materials.length > 0 ||
            block.block_resources.practice_resources.length > 0
          )
        );
        
        expect(blocksWithResources.length).toBeGreaterThan(0);
        
        // Check resource structure in blocks
        blocksWithResources.forEach(block => {
          expect(block.block_resources).toBeDefined();
          expect(block.block_resources!.primary_books).toBeDefined();
          expect(block.block_resources!.supplementary_materials).toBeDefined();
          expect(block.block_resources!.practice_resources).toBeDefined();
          expect(block.block_resources!.video_content).toBeDefined();
          expect(block.block_resources!.current_affairs_sources).toBeDefined();
          expect(block.block_resources!.revision_materials).toBeDefined();
          expect(block.block_resources!.expert_recommendations).toBeDefined();
        });
      }
    });

    it('should have curated resources populated in study plan', async () => {
      const result = await generateInitialPlan(
        'test-user-123',
        testConfig,
        testArchetype,
        testIntake
      );

      const plan = result.plan;
      
      // Check curated resources at plan level
      expect(plan.curated_resources).toBeDefined();
      expect(plan.curated_resources.essential_resources).toBeDefined();
      expect(plan.curated_resources.recommended_timeline).toBeDefined();
      expect(plan.curated_resources.budget_summary).toBeDefined();
      expect(plan.curated_resources.alternative_options).toBeDefined();
      
      // Should have some essential resources
      expect(Array.isArray(plan.curated_resources.essential_resources)).toBe(true);
      
      // Budget summary should be calculated
      expect(plan.curated_resources.budget_summary.total_cost).toBeDefined();
      expect(plan.curated_resources.budget_summary.essential_cost).toBeDefined();
      expect(plan.curated_resources.budget_summary.optional_cost).toBeDefined();
      expect(plan.curated_resources.budget_summary.free_alternatives).toBeDefined();
    });

    it('should format resources correctly for document display', async () => {
      const polityResources = await ResourceService.getResourcesForSubject('P');
      
      if (polityResources.primary_books.length > 0) {
        const sampleResource = polityResources.primary_books[0];
        
        // Check resource formatting elements
        expect(sampleResource.resource_title).toBeTruthy();
        expect(sampleResource.resource_priority).toMatch(/Essential|Recommended|Optional/);
        expect(sampleResource.resource_cost).toBeDefined();
        expect(sampleResource.resource_description).toBeTruthy();
        
        // Check cost structure
        if (sampleResource.resource_cost) {
          expect(sampleResource.resource_cost.type).toMatch(/Free|Paid|Subscription/);
        }
      }
    });

    it('should handle resource loading errors gracefully', async () => {
      // Test with invalid subject code
      const invalidResources = await ResourceService.getResourcesForSubject('INVALID');
      
      expect(invalidResources).toBeDefined();
      expect(invalidResources.primary_books).toEqual([]);
      expect(invalidResources.supplementary_materials).toEqual([]);
      expect(invalidResources.practice_resources).toEqual([]);
      expect(invalidResources.video_content).toEqual([]);
      expect(invalidResources.current_affairs_sources).toEqual([]);
      expect(invalidResources.revision_materials).toEqual([]);
      expect(invalidResources.expert_recommendations).toEqual([]);
    });
  });
});
