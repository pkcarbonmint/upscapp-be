import { describe, it, expect, beforeEach } from 'vitest';
import { determineCycleSchedule } from '../engine/cycle-scheduler';
import { makeLogger } from '../services/Log';
import { generateInitialPlan } from '../engine/NewEngine-generate-plan';
import { loadAllSubjects } from '../services/SubjectLoader';
import dayjs from 'dayjs';
import { Block, DailyPlan, StudentIntake, StudyPlan, Task, WeeklyPlan, createStudentIntake } from '../types/models';
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

function makeIntake(testCase: { startDate: Date, targetYear: number }) {
	const intake: StudentIntake = createStudentIntake({
		...dummyStuff,
		subject_approach: 'DualSubject',
		start_date: testCase.startDate.toISOString().split('T')[0],
		target_year: testCase.targetYear.toString(),
		study_strategy: {
			study_focus_combo: 'GSPlusOptionalPlusCSAT',
			weekly_study_hours: '50',
			time_distribution: 'balanced',
			study_approach: 'Balanced',
			revision_strategy: 'weekly',
			test_frequency: 'biweekly',
			seasonal_windows: ['morning', 'evening'],
			catch_up_day_preference: 'weekend'
		},
		subject_confidence: {
			'H01': 'Moderate',
			'H02': 'Moderate',
			'H03': 'Moderate',
			'H04': 'Moderate',
			'H05': 'Moderate',
			'H06': 'Moderate',
			'G': 'Moderate',
			'B': 'Moderate',
			'T': 'Moderate',
			'P': 'Moderate',
			'E': 'Moderate',
			'O': 'Moderate',
			'I': 'Moderate',
			'C': 'Moderate',
			'S': 'Moderate'
		}
	})
	return intake;
}

describe('CycleSchedulerScenarios', () => {
	const logger = makeLogger([]);

	beforeEach(() => {
	});

	describe('Scenario S1: Long Preparation (≥20 months)', () => {
		const testCases = [
			{
				name: 'S1 - Start Oct 2025, Target 2028 (21+ months)',
				startDate: new Date('2025-10-01'),
				targetYear: 2028,
				prelimsExamDate: new Date('2028-05-20')
			},
			{
				name: 'S1 - Start Jan 2025, Target 2027 (22+ months)',
				startDate: new Date('2025-01-01'),
				targetYear: 2027,
				prelimsExamDate: new Date('2027-05-20')
			}
		];

		testCases.forEach(testCase => {
			it(`should generate S1 schedule for ${testCase.name}`, () => {
				const result = determineCycleSchedule(
					logger,
					testCase.startDate,
					testCase.targetYear,
					testCase.prelimsExamDate
				);

				// Should be S1 scenario
				expect(result.scenario).toBe('S1');
				expect(result.totalTimeAvailable).toBeGreaterThanOrEqual(20);

				// Should have all cycles: C1, C2, C3, C4, C5, C6, C7
				expect(result.schedules).toHaveLength(7);

				const cycleTypes = result.schedules.map(s => s.cycleType);
				expect(cycleTypes).toEqual([CycleType.C1, CycleType.C2, CycleType.C3, CycleType.C4, CycleType.C5, CycleType.C6, CycleType.C7]);

				// Verify cycle dates and durations
				const c1 = result.schedules[0]; // C1: Start → +3 months
				expect(c1.cycleType).toBe(CycleType.C1);
				expect(c1.durationMonths).toBe(3);
				expect(c1.startDate).toBe(dayjs(testCase.startDate).format('YYYY-MM-DD'));
				expect(c1.endDate).toBe(dayjs(testCase.startDate).add(3, 'month').subtract(1, 'day').format('YYYY-MM-DD'));

				const c2 = result.schedules[1]; // C2: After C1 → +10 months (should end before C3)
				expect(c2.cycleType).toBe(CycleType.C2);
				expect(c2.startDate).toBe(dayjs(testCase.startDate).add(3, 'month').format('YYYY-MM-DD')); // Day after C1 ends
				// C2 ends before C3 (which ends Dec 31 before target year)

				const c3 = result.schedules[2]; // C3: After C2 → max 2 months
				expect(c3.cycleType).toBe(CycleType.C3);
				// C3 starts the day after C2 ends
				expect(c3.durationMonths).toBeLessThanOrEqual(2);
				expect(c3.endDate).toBe(`${testCase.targetYear - 1}-12-31`); // C3 ends Dec 31 before target year

				const c4 = result.schedules[3]; // C4: Jan 1 target year → Mar 31 target year
				expect(c4.cycleType).toBe(CycleType.C4);
				expect(c4.startDate).toBe(`${testCase.targetYear}-01-01`);
				expect(c4.endDate).toBe(`${testCase.targetYear}-03-31`);

				const c5 = result.schedules[4]; // C5: Apr 1 target year → prelims exam date
				expect(c5.cycleType).toBe(CycleType.C5);
				expect(c5.startDate).toBe(`${testCase.targetYear}-04-01`);
				expect(c5.endDate).toBe(`${testCase.targetYear}-05-19`);

				const c6 = result.schedules[5]; // C6: May 21 target year → Jul 31 target year
				expect(c6.cycleType).toBe(CycleType.C6);
				expect(c6.startDate).toBe(`${testCase.targetYear}-05-21`);
				expect(c6.endDate).toBe(`${testCase.targetYear}-07-31`);

				const c7 = result.schedules[6]; // C7: Aug 1 target year → mains exam date
				expect(c7.cycleType).toBe(CycleType.C7);
				expect(c7.startDate).toBe(`${testCase.targetYear}-08-01`);
				expect(c7.endDate).toBe(`${testCase.targetYear}-08-20`);
			});
		});
	});

	describe('S1 Integration Tests: Full Plan Generation', () => {
		const testCase = {
			name: 'S1 - Full integration test Oct 2025 → Target 2028',
			startDate: new Date('2025-10-01'),
			targetYear: 2028,
			prelimsExamDate: new Date('2028-05-20')
		};

		it('should generate complete study plan with all required cycles', async () => {
			const result = await generateInitialPlan(
				'test-user-s1',
				{} as any,
				{} as any,
				createStudentIntake({
					...dummyStuff,
					subject_approach: 'DualSubject',
					start_date: testCase.startDate.toISOString().split('T')[0],
					target_year: `${testCase.targetYear}`,
					study_strategy: {
						study_focus_combo: 'GSPlusOptionalPlusCSAT',
						weekly_study_hours: '50',
						time_distribution: 'balanced',
						study_approach: 'Balanced',
						revision_strategy: 'weekly',
						test_frequency: 'biweekly',
						seasonal_windows: ['morning', 'evening'],
						catch_up_day_preference: 'weekend'
					},
					subject_confidence: {
						'H01': 'Weak',
						'H02': 'Weak',
						'H03': 'Weak',
						'H04': 'Weak',
						'H05': 'Weak',
						'H06': 'Weak',
						'G': 'Weak',
						'B': 'Weak',
						'T': 'Weak',
						'P': 'Weak',
						'E': 'Weak',
						'O': 'Weak',
						'I': 'Weak',
						'C': 'Weak',
						'S': 'Weak'
					}
				})
			);

			// Basic plan structure validation
			expect(result.plan).toBeDefined();
			expect(result.plan.study_plan_id).toBeDefined();
			expect(result.plan.user_id).toBe('system-generated');
			expect(result.plan.plan_title).toBeDefined();
			expect(result.plan.curated_resources).toBeDefined();
			expect(result.plan.effective_season_context).toBe('Comprehensive Study');

			// Should be S1 scenario (≥20 months)
			expect(result.plan.targeted_year).toBe(testCase.targetYear);

			// Validate study cycles are present
			expect(result.plan.cycles).toBeDefined();
			expect(result.plan.cycles?.length).toBeGreaterThan(6); // S1 should have 7 cycles: C1, C2, C3, C4, C5, C6, C7

			// Validate cycle types are correct for S1
			const cycleTypes = result.plan.cycles?.map(cycle => cycle.cycleType);
			expect(cycleTypes).toContain(CycleType.C1); // NCERT Foundation
			expect(cycleTypes).toContain(CycleType.C2); // Comprehensive Foundation
			expect(cycleTypes).toContain(CycleType.C3); // Mains Revision Pre-Prelims
			expect(cycleTypes).toContain(CycleType.C4); // Prelims Revision
			expect(cycleTypes).toContain(CycleType.C5); // Prelims Rapid Revision
			expect(cycleTypes).toContain(CycleType.C6); // Mains Revision
			expect(cycleTypes).toContain(CycleType.C7); // Mains Rapid Revision
			expect(cycleTypes?.length).toBe(7); // Exactly 7 cycles for S1

			// Timeline analysis should be present
			expect(result.plan.timelineAnalysis).toBeDefined();
			expect(result.plan.timelineAnalysis?.targetYear).toBe(testCase.targetYear);
			expect(result.plan.timelineAnalysis?.cycleCount).toBe(7);
		}, 30000);

		it('should ensure comprehensive subject coverage across all cycles', async () => {
			const intake: StudentIntake = makeIntake(testCase);

			const result = await generateInitialPlan(
				'test-user-s1-subjects',
				{} as any,
				{} as any,
				intake
			);

			// Get all subjects
			const allSystemSubjects = loadAllSubjects().map(s => s.subjectCode);

			// Collect all subjects covered across cycles
			const coveredSubjects = new Set<string>();

			result.plan.cycles?.forEach(cycle => {
				cycle.cycleBlocks?.forEach(block => {
					block.subjects?.forEach(subject => {
						coveredSubjects.add(subject);
					});
				});
			});

			// Should cover major subject categories
			const coreSubjects = ['GS_Prelims', 'History', 'Geography', 'Polity', 'Economy', 'Environment'];
			coreSubjects.forEach(subject => {
				expect(coveredSubjects.has(subject)).toBe(true);
			});

			// Should have significant subject coverage (at least 80%)
			const coverageRatio = coveredSubjects.size / allSystemSubjects.length;
			expect(coverageRatio).toBeGreaterThan(0.8);
		}, 30000);

		it('should have correct task ratios (study/practice/revision) for each cycle type', async () => {
			const result = await generateInitialPlan(
				'test-user-s1-ratios',
				{} as any,
				{} as any,
				makeIntake(testCase),
			);

			// Task ratios according to design document
			const expectedRatios: Record<CycleType, { study: number; practice: number; revision: number }> = {
				[CycleType.C1]: { study: 1.0, practice: 0, revision: 0 },         // NCERT Foundation
				[CycleType.C2]: { study: 0.7, practice: 0.15, revision: 0.15 },  // Comprehensive Foundation
				[CycleType.C3]: { study: 1.0, practice: 0, revision: 0 },       // Mains Revision Pre-Prelims Cycle
				[CycleType.C4]: { study: 0.0, practice: 0.4, revision: 0.6 },   // Prelims Reading
				[CycleType.C5]: { study: 0.0, practice: 0.4, revision: 0.6 },   // Prelims Revision
				[CycleType.C5B]: { study: 0.0, practice: 0.4, revision: 0.6 }, // Prelims Rapid Revision
				[CycleType.C6]: { study: 0.0, practice: 0.4, revision: 0.6 },   // Mains Revision
				[CycleType.C7]: { study: 0.0, practice: 0.4, revision: 0.6 },   // Mains Rapid Revision
				[CycleType.C8]: { study: 0.8, practice: 0.1, revision: 0.1 },   // Mains Foundation
			};

			result.plan.cycles?.forEach(cycle => {
				const expectedRatio = expectedRatios[cycle.cycleType];
				if (!expectedRatio) return; // Skip cycle types not in our mapping

				let totalStudy = 0, totalPractice = 0, totalRevision = 0, totalTasks = 0;

				// Calculate actual ratios across all blocks and daily plans
				cycle.cycleBlocks?.forEach((block: Block) => {
					block.weekly_plan?.forEach((wp: WeeklyPlan) => {
						wp.daily_plans.forEach((dailyPlan: DailyPlan) => {
							dailyPlan.tasks?.forEach((task: Task) => {
								if (task.taskType === 'study') totalStudy += task.duration_minutes;
								else if (task.taskType === 'practice') totalPractice += task.duration_minutes;
								else if (task.taskType === 'revision') totalRevision += task.duration_minutes;
								totalTasks += task.duration_minutes;
							});
						});
					});
				});

				if (totalTasks > 0) {
					const studyRatio = totalStudy / totalTasks;
					const practiceRatio = totalPractice / totalTasks;
					const revisionRatio = totalRevision / totalTasks;

					// Verify ratios with 20% tolerance for complex calculations
					expect(studyRatio).toBeCloseTo(expectedRatio.study, 1);
					expect(practiceRatio).toBeCloseTo(expectedRatio.practice, 1);
					expect(revisionRatio).toBeCloseTo(expectedRatio.revision, 1);
				}
			});
		}, 30000);

		it('should ensure proper cycle sequencing with no overlaps', async () => {
			const result = await generateInitialPlan(
				'test-user-s1-sequencing',
				{} as any,
				{} as any,
				makeIntake(testCase),
			);

			const cycles = result.plan.cycles || [];

			// Sort cycles by start date to ensure proper sequence
			const sortedCycles = cycles.sort((a, b) => dayjs(a.cycleStartDate).valueOf() - dayjs(b.cycleStartDate).valueOf());

			// Check that each cycle ends before the next one starts
			for (let i = 0; i < sortedCycles.length - 1; i++) {
				const currentCycle = sortedCycles[i];
				const nextCycle = sortedCycles[i + 1];

				const currentEndDate = dayjs(currentCycle.cycleEndDate);
				const nextStartDate = dayjs(nextCycle.cycleStartDate);

				// Next cycle should start on or after current cycle ends
				expect(nextStartDate.isSame(currentEndDate, 'day') || nextStartDate.isAfter(currentEndDate)).toBe(true);
			}

			// Validate specific S1 sequence: C1 → C2 → C3 → C4 → C5 → C6 → C7
			const cycleSequence = sortedCycles.map(cycle => cycle.cycleType);
			const expectedSequence = [CycleType.C1, CycleType.C2, CycleType.C3, CycleType.C4, CycleType.C5, CycleType.C6, CycleType.C7];

			expect(cycleSequence).toEqual(expectedSequence);
		}, 30000);

		it('should include timeline milestones and metadata', async () => {

			const result: { plan: StudyPlan } = await generateInitialPlan(
				'test-user-s1-milestones',
				{} as any,
				{} as any,
				makeIntake(testCase),
			);

			// Timeline analysis should include key milestones
			expect(result.plan.timelineAnalysis).toBeDefined();
			expect(result.plan.timelineAnalysis?.targetYear).toBe(testCase.targetYear);
			expect(result.plan.timelineAnalysis?.cycleCount).toBe(7);

			// Plan title should reflect the target year
			expect(result.plan.plan_title).toContain(`${testCase.targetYear}`);
			expect(result.plan.plan_title).toContain('Preparation');

			// Curated resources should be populated
			expect(result.plan.curated_resources).toBeDefined();
		}, 30000);
	});

	describe('Scenario S2: Medium-Long Preparation (18-20 months)', () => {
		const testCases = [
			{
				name: 'S2 - Start Oct 2026, Target 2028 (19 months)',
				startDate: new Date('2026-10-01'),
				targetYear: 2028,
				prelimsExamDate: new Date('2028-05-20')
			},
			{
				name: 'S2 - Start Nov 2025, Target 2027 (19 months)',
				startDate: new Date('2025-11-11'),
				targetYear: 2027,
				prelimsExamDate: new Date('2027-05-20')
			}
		];

		testCases.forEach(testCase => {
			it(`should generate S2 schedule for ${testCase.name}`, () => {
				const result = determineCycleSchedule(
					logger,
					testCase.startDate,
					testCase.targetYear,
					testCase.prelimsExamDate
				);

				// Should be S2 scenario (identical to S1)
				expect(result.scenario).toBe('S2');
				expect(result.totalTimeAvailable).toBeGreaterThanOrEqual(18);
				expect(result.totalTimeAvailable).toBeLessThan(20);

				// Should have same cycles as S1
				expect(result.schedules).toHaveLength(7);
				const cycleTypes = result.schedules.map(s => s.cycleType);
				expect(cycleTypes).toEqual([CycleType.C1, CycleType.C2, CycleType.C3, CycleType.C4, CycleType.C5, CycleType.C6, CycleType.C7]);
			});
		});
	});

	describe('Scenario S3: Medium Preparation (15-18 months)', () => {
		const testCases = [
			{
				name: 'S3 - Start Dec 2026, Target 2028 (17 months)',
				startDate: new Date('2026-12-13'),
				targetYear: 2028,
				prelimsExamDate: new Date('2028-05-20')
			},
			{
				name: 'S3 - Start Jan 2026, Target 2027 (16 months)',
				startDate: new Date('2026-01-11'),
				targetYear: 2027,
				prelimsExamDate: new Date('2027-05-20')
			}
		];

		testCases.forEach(testCase => {
			it(`should generate S3 schedule for ${testCase.name}`, () => {
				const result = determineCycleSchedule(
					logger,
					testCase.startDate,
					testCase.targetYear,
					testCase.prelimsExamDate
				);

				// Should be S3 scenario
				expect(result.scenario).toBe('S3');
				expect(result.totalTimeAvailable).toBeGreaterThanOrEqual(15);
				expect(result.totalTimeAvailable).toBeLessThan(18);

				// Should have cycles: C1, C2, C4, C5, C6, C7 (NO C3)
				expect(result.schedules).toHaveLength(6);
				const cycleTypes = result.schedules.map(s => s.cycleType);
				expect(cycleTypes).toEqual([CycleType.C1, CycleType.C2, CycleType.C4, CycleType.C5, CycleType.C6, CycleType.C7]);

				// Verify C2 shrinks from 10 months to available time until Dec 31 (minimum 7 months)
				const c2 = result.schedules.find(s => s.cycleType === CycleType.C2)!;
				expect(c2.durationMonths).toBeGreaterThanOrEqual(7);
				expect(c2.durationMonths).toBeLessThan(10);
				expect(c2.endDate).toBe(`${testCase.targetYear - 1}-12-31`);
			});
		});
	});

	describe('Scenario S4: Medium-Short Preparation (12-15 months)', () => {
		const testCases = [
			{
				name: 'S4 - Start Mar 2027, Target 2028 (14 months)',
				startDate: new Date('2027-03-14'),
				targetYear: 2028,
				prelimsExamDate: new Date('2028-05-20')
			},
			{
				name: 'S4 - Start Apr 2026, Target 2027 (13 months)',
				startDate: new Date('2026-04-13'),
				targetYear: 2027,
				prelimsExamDate: new Date('2027-05-20')
			}
		];

		testCases.forEach(testCase => {
			it(`should generate S4 schedule for ${testCase.name}`, () => {
				const result = determineCycleSchedule(
					logger,
					testCase.startDate,
					testCase.targetYear,
					testCase.prelimsExamDate
				);

				// Should be S4 scenario
				expect(result.scenario).toBe('S4');
				expect(result.totalTimeAvailable).toBeGreaterThanOrEqual(12);
				expect(result.totalTimeAvailable).toBeLessThan(15);

				// Should have cycles: C2, C4, C5, C6, C7 (NO C1, NO C3)
				expect(result.schedules).toHaveLength(5);
				const cycleTypes = result.schedules.map(s => s.cycleType);
				expect(cycleTypes).toEqual([CycleType.C2, CycleType.C4, CycleType.C5, CycleType.C6, CycleType.C7]);

				// C2 should start from start date and end Dec 31 (minimum 7 months)
				const c2 = result.schedules[0];
				expect(c2.cycleType).toBe(CycleType.C2);
				expect(c2.startDate).toBe(dayjs(testCase.startDate).format('YYYY-MM-DD'));
				expect(c2.endDate).toBe(`${testCase.targetYear - 1}-12-31`);
				expect(c2.durationMonths).toBeGreaterThanOrEqual(7);
			});
		});
	});

	describe('Scenario S5: Very Short Late Start (>15 days before Dec 31)', () => {
		const testCases = [
			{
				name: 'S5 - Start Nov 2027, Target 2028',
				startDate: new Date('2027-11-15'),
				targetYear: 2028,
				prelimsExamDate: new Date('2028-05-20')
			},
			{
				name: 'S5 - Start Jan 2028, Target 2028',
				startDate: new Date('2028-01-20'),
				targetYear: 2028,
				prelimsExamDate: new Date('2028-05-20')
			}
		];

		testCases.forEach(testCase => {
			it(`should generate S5 schedule for ${testCase.name}`, () => {
				const result = determineCycleSchedule(
					logger,
					testCase.startDate,
					testCase.targetYear,
					testCase.prelimsExamDate
				);

				// Should be S5 scenario
				expect(result.scenario).toBe('S5');
				expect(result.totalTimeAvailable).toBeLessThan(12);

				// Should have cycles: C8, C4, C5, C6, C7 (NO C1, C2, C3)
				expect(result.schedules).toHaveLength(5);
				const cycleTypes = result.schedules.map(s => s.cycleType);
				expect(cycleTypes).toEqual([CycleType.C8, CycleType.C4, CycleType.C5, CycleType.C6, CycleType.C7]);

				// C8 should start from start date and end Dec 31
				const c8 = result.schedules[0];
				expect(c8.cycleType).toBe(CycleType.C8);
				expect(c8.startDate).toBe(dayjs(testCase.startDate).format('YYYY-MM-DD'));
				expect(c8.endDate).toBe(`${testCase.targetYear - 1}-12-31`);
			});
		});
	});

	describe('Scenario S6: Ultra-Short Preparation (Dec 16 - Jan 15)', () => {
		const testCases = [
			{
				name: 'S6 - Start Dec 20, 2027, Target 2028',
				startDate: new Date('2027-12-20'),
				targetYear: 2028,
				prelimsExamDate: new Date('2028-05-20')
			},
			{
				name: 'S6 - Start Jan 10, 2027, Target 2027',
				startDate: new Date('2027-01-10'),
				targetYear: 2027,
				prelimsExamDate: new Date('2027-05-20')
			}
		];

		testCases.forEach(testCase => {
			it(`should generate S6 schedule for ${testCase.name}`, () => {
				const result = determineCycleSchedule(
					logger,
					testCase.startDate,
					testCase.targetYear,
					testCase.prelimsExamDate
				);

				// Should be S6 scenario
				expect(result.scenario).toBe('S6');

				// Should have cycles: C4, C5, C6, C7 (NO C1, C2, C3, C8)
				expect(result.schedules).toHaveLength(4);
				const cycleTypes = result.schedules.map(s => s.cycleType);
				expect(cycleTypes).toEqual([CycleType.C4, CycleType.C5, CycleType.C6, CycleType.C7]);

				// C4 should start from start date
				const c4 = result.schedules[0];
				expect(c4.cycleType).toBe(CycleType.C4);
				expect(c4.startDate).toBe(dayjs(testCase.startDate).format('YYYY-MM-DD'));
			});
		});
	});

	describe('Scenario S7: Crash Course Early (Mar 1 - Apr 15)', () => {
		const testCases = [
			{
				name: 'S7 - Start Mar 15, 2027, Target 2027',
				startDate: new Date('2027-03-15'),
				targetYear: 2027,
				prelimsExamDate: new Date('2027-05-20')
			},
			{
				name: 'S7 - Start Apr 10, 2028, Target 2028',
				startDate: new Date('2028-04-10'),
				targetYear: 2028,
				prelimsExamDate: new Date('2028-05-20')
			}
		];

		testCases.forEach(testCase => {
			it(`should generate S7 schedule for ${testCase.name}`, () => {
				const result = determineCycleSchedule(
					logger,
					testCase.startDate,
					testCase.targetYear,
					testCase.prelimsExamDate
				);

				// Should be S7 scenario
				expect(result.scenario).toBe('S7');

				// Should have cycles: C5, C6, C7 (ONLY revision cycles)
				expect(result.schedules).toHaveLength(3);
				const cycleTypes = result.schedules.map(s => s.cycleType);
				expect(cycleTypes).toEqual([CycleType.C5, CycleType.C6, CycleType.C7]);

				// C5 should start from start date
				const c5 = result.schedules[0];
				expect(c5.cycleType).toBe(CycleType.C5);
				expect(c5.startDate).toBe(dayjs(testCase.startDate).format('YYYY-MM-DD'));
			});
		});
	});

	describe('Scenario S8: Rejection Case (Apr 16 - May 15)', () => {
		const testCases = [
			{
				name: 'S8 - Start Apr 20, 2027, Target 2027',
				startDate: new Date('2027-04-20'),
				targetYear: 2027,
				prelimsExamDate: new Date('2027-05-20')
			},
			{
				name: 'S8 - Start May 10, 2028, Target 2028',
				startDate: new Date('2028-05-10'),
				targetYear: 2028,
				prelimsExamDate: new Date('2028-05-20')
			}
		];

		testCases.forEach(testCase => {
			it(`should reject ${testCase.name}`, () => {
				expect(() => {
					determineCycleSchedule(
						logger,
						testCase.startDate,
						testCase.targetYear,
						testCase.prelimsExamDate
					);
				}).toThrow('Plan generation rejected: insufficient time');
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle exact boundary dates correctly', () => {
			// Test exact 20-month boundary for S1/S2
			const startDate = new Date('2025-09-01'); // Clearly more than 20 months before exam
			const result = determineCycleSchedule(
				logger,
				startDate,
				2027,
				new Date('2027-05-20')
			);

			expect(result.scenario).toBe('S1'); // At least 20 months should be S1
			expect(result.totalTimeAvailable).toBeCloseTo(20, 1);
		});

		it('should handle exact 18-month boundary for S2/S3', () => {
			const startDate = new Date('2025-11-01'); // Clearly more than 18 months before exam
			const result = determineCycleSchedule(
				logger,
				startDate,
				2027,
				new Date('2027-05-20')
			);

			expect(result.scenario).toBe('S2'); // At least 18 months should be S2
			expect(result.totalTimeAvailable).toBeCloseTo(18, 1);
		});

		it('should handle exact 15-month boundary for S3/S4', () => {
			const startDate = new Date('2026-02-01'); // Clearly more than 15 months before exam
			const result = determineCycleSchedule(
				logger,
				startDate,
				2027,
				new Date('2027-05-20')
			);

			expect(result.scenario).toBe('S3'); // At least 15 months should be S3
			expect(result.totalTimeAvailable).toBeCloseTo(15, 1);
		});

		it('should handle exact 12-month boundary for S4/S5', () => {
			const startDate = new Date('2026-05-19'); // Slightly more than 12 months before exam
			const result = determineCycleSchedule(
				logger,
				startDate,
				2027,
				new Date('2027-05-20')
			);

			expect(result.scenario).toBe('S4'); // At least 12 months should be S4
			expect(result.totalTimeAvailable).toBeCloseTo(12, 1);
		});
	});

	describe('Cycle Sequencing Requirements', () => {
		it('should ensure all cycles are properly sequenced with no overlaps', () => {
			const scenarios = ['S1', 'S3', 'S4', 'S5', 'S6', 'S7'];

			scenarios.forEach(scenarioName => {
				let startDate: Date;
				switch (scenarioName) {
					case 'S1':
						startDate = new Date('2025-10-01');
						break;
					case 'S3':
						startDate = new Date('2026-04-01');
						break;
					case 'S4':
						startDate = new Date('2026-07-01');
						break;
					case 'S5':
						startDate = new Date('2026-11-15');
						break;
					case 'S6':
						startDate = new Date('2026-12-20');
						break;
					case 'S7':
						startDate = new Date('2027-03-15');
						break;
					default:
						return;
				}

				const result = determineCycleSchedule(
					logger,
					startDate,
					2028,
					new Date('2028-05-20')
				);

				const schedules = result.schedules;

				// Check no overlaps between consecutive cycles
				for (let i = 0; i < schedules.length - 1; i++) {
					const currentCycle = schedules[i];
					const nextCycle = schedules[i + 1];

					const currentEndDate = dayjs(currentCycle.endDate);
					const nextStartDate = dayjs(nextCycle.startDate);

					// Next cycle should start day after current cycle ends
					expect(nextStartDate.diff(currentEndDate, 'day')).toBe(1);
				}
			});
		});

		it('should ensure C4 always starts Jan 1 of target year', () => {
			const scenarios = ['S1', 'S3', 'S4', 'S5', 'S6'];
			const targetYear = 2028;

			scenarios.forEach(scenarioName => {
				let startDate: Date;
				switch (scenarioName) {
					case 'S1': startDate = new Date('2025-10-01'); break;
					case 'S3': startDate = new Date('2026-04-01'); break;
					case 'S4': startDate = new Date('2026-07-01'); break;
					case 'S5': startDate = new Date('2026-11-15'); break;
					case 'S6': startDate = new Date('2027-12-20'); break;
					default: return;
				}

				const result = determineCycleSchedule(
					logger,
					startDate,
					targetYear,
					new Date(`${targetYear}-05-20`)
				);

				const c4 = result.schedules.find(s => s.cycleType === CycleType.C4);
				expect(c4).toBeDefined();
				if (scenarioName === 'S6') {
					// S6 scenarios start C4 from the start date, not Jan 1
					expect(c4!.startDate).toBe(dayjs(startDate).format('YYYY-MM-DD'));
				} else {
					expect(c4!.startDate).toBe(`${targetYear}-01-01`);
				}
			});
		});

		it('should ensure C5 always starts Apr 1 of target year', () => {
			const scenarios = ['S1', 'S3', 'S4', 'S5', 'S6', 'S7'];
			const targetYear = 2028;

			scenarios.forEach(scenarioName => {
				let startDate: Date;
				switch (scenarioName) {
					case 'S1': startDate = new Date('2025-10-01'); break;
					case 'S3': startDate = new Date('2026-04-01'); break;
					case 'S4': startDate = new Date('2026-07-01'); break;
					case 'S5': startDate = new Date('2026-11-15'); break;
					case 'S6': startDate = new Date('2027-12-20'); break;
					case 'S7': startDate = new Date('2027-03-15'); break;
					default: return;
				}

				const result = determineCycleSchedule(
					logger,
					startDate,
					targetYear,
					new Date(`${targetYear}-05-20`)
				);

				const c5 = result.schedules.find(s => s.cycleType === CycleType.C5);
				if (c5) { // Only test if C5 exists (not in S6 with late start)
					if (scenarioName === 'S6' && dayjs(startDate).month() >= 11) {
						// S6 with very late start should start C5 from start date, not Apr 1
						expect(c5.startDate).toBe(dayjs(startDate).format('YYYY-MM-DD'));
					} else {
						expect(c5.startDate).toBe(`${targetYear}-04-01`);
					}
				}
			});
		});

		it('should ensure C6 always starts May 20 of target year (prelims date)', () => {
			const scenarios = ['S1', 'S3', 'S4', 'S5', 'S6', 'S7'];
			const targetYear = 2028;

			scenarios.forEach(scenarioName => {
				let startDate: Date;
				switch (scenarioName) {
					case 'S1': startDate = new Date('2025-10-01'); break;
					case 'S3': startDate = new Date('2026-04-01'); break;
					case 'S4': startDate = new Date('2026-07-01'); break;
					case 'S5': startDate = new Date('2026-11-15'); break;
					case 'S6': startDate = new Date('2027-12-20'); break;
					case 'S7': startDate = new Date('2027-03-15'); break;
					default: return;
				}

				const result = determineCycleSchedule(
					logger,
					startDate,
					targetYear,
					new Date(`${targetYear}-05-20`)
				);

				const c6 = result.schedules.find(s => s.cycleType === CycleType.C6);
				expect(c6).toBeDefined();
				expect(c6!.startDate).toBe(`${targetYear}-05-20`);
			});
		});

		it('should ensure C7 always starts Aug 1 of target year', () => {
			const scenarios = ['S1', 'S3', 'S4', 'S5', 'S6', 'S7'];
			const targetYear = 2028;

			scenarios.forEach(scenarioName => {
				let startDate: Date;
				switch (scenarioName) {
					case 'S1': startDate = new Date('2025-10-01'); break;
					case 'S3': startDate = new Date('2026-04-01'); break;
					case 'S4': startDate = new Date('2026-07-01'); break;
					case 'S5': startDate = new Date('2026-11-15'); break;
					case 'S6': startDate = new Date('2027-12-20'); break;
					case 'S7': startDate = new Date('2027-03-15'); break;
					default: return;
				}

				const result = determineCycleSchedule(
					logger,
					startDate,
					targetYear,
					new Date(`${targetYear}-05-20`)
				);

				const c7 = result.schedules.find(s => s.cycleType === CycleType.C7);
				expect(c7).toBeDefined();
				expect(c7!.startDate).toBe(`${targetYear}-08-01`);
			});
		});
	});
});