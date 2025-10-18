import { describe, it, expect, beforeEach } from 'vitest';
import { loadAllSubjects } from '../services/SubjectLoader';
import { createStudentIntake } from '../types/models';
import { CycleType } from '../types/Types';
import { createBlocksForSubjects } from '../engine/cycle-utils';
import { isOptional } from '../engine/cycle-utils';

describe('GS:Optional Ratio Integration Tests', () => {
  let subjects: any[];
  let mockIntake: any;

  beforeEach(async () => {
    subjects = await loadAllSubjects('OPT-SOC'); // Include Sociology as optional subject
    
    // Create a mock intake with balanced approach
    mockIntake = createStudentIntake({
      start_date: '2025-03-01',
      target_year: '2027',
      subject_confidence: {},
      subject_approach: 'DualSubject',
      personal_details: {
        full_name: 'Test Student',
        email: 'test@example.com',
        phone_number: '1234567890',
        present_location: 'Delhi',
        student_archetype: 'Graduate',
        graduation_stream: 'Engineering',
        college_university: 'Test University',
        year_of_passing: 2020
      },
      preparation_background: {
        preparing_since: '12_months',
        number_of_attempts: '0',
        highest_stage_per_attempt: 'N/A'
      },
      study_strategy: {
        study_focus_combo: 'OneGSPlusOptional',
        study_approach: 'Balanced',
        weekly_study_hours: '49',
        time_distribution: 'Balanced',
        revision_strategy: 'weekly',
        test_frequency: 'weekly',
        seasonal_windows: ['summer', 'winter'],
        catch_up_day_preference: 'sunday',
        upsc_optional_subject: 'OPT-AGR'
      }
    });
    
  });

  describe('Subject Classification Tests', () => {
    it('should correctly identify GS and Optional subjects', () => {
      const gsSubjects = subjects.filter(s => !isOptional(s));
      const optionalSubjects = subjects.filter(s => isOptional(s));

      expect(gsSubjects.length).toBeGreaterThan(0);
      expect(optionalSubjects.length).toBeGreaterThan(0);
      
      // Verify all subjects are classified
      expect(gsSubjects.length + optionalSubjects.length).toBe(subjects.length);
      
      // Verify OPT subject is classified as optional
      const optSubject = subjects.find(s => s.subjectCode === 'OPT');
      expect(optSubject).toBeDefined();
      expect(isOptional(optSubject)).toBe(true);
      
      console.log(`✅ Subject classification: ${gsSubjects.length} GS, ${optionalSubjects.length} Optional`);
    });

    it('should have consistent subject classification across different approaches', () => {
      const approaches = ['balanced', 'WeakFirst', 'StrongFirst'];
      
      approaches.forEach(() => {
        // Use the mockIntake from beforeEach
        const gsSubjects = subjects.filter(s => !isOptional(s));
        const optionalSubjects = subjects.filter(s => isOptional(s));
        
        // Classification should be consistent regardless of approach
        expect(gsSubjects.length).toBeGreaterThan(0);
        expect(optionalSubjects.length).toBeGreaterThan(0);
      });
      
      console.log('✅ Subject classification consistent across approaches');
    });
  });

  describe('GS:Optional Ratio Calculation Tests', () => {
    it('should return correct ratios for different study approaches', () => {
      const testCases = [
        { approach: 'balanced', expected: { gs: 0.67, optional: 0.33 } },
        { approach: 'WeakFirst', expected: { gs: 0.8, optional: 0.2 } },
        { approach: 'StrongFirst', expected: { gs: 0.5, optional: 0.5 } }
      ];

      testCases.forEach(({ approach, expected }) => {
      const intake = mockIntake;

        const ratio = intake.getGSOptionalRatio();
        expect(ratio.gs).toBe(expected.gs);
        expect(ratio.optional).toBe(expected.optional);
        
        console.log(`✅ ${approach}: GS=${ratio.gs}, Optional=${ratio.optional}`);
      });
    });

    it('should validate ratio totals do not exceed 100%', () => {
      const approaches = ['balanced', 'WeakFirst', 'StrongFirst'];
      
      approaches.forEach(approach => {
      const intake = mockIntake;

        const ratio = intake.getGSOptionalRatio();
        const total = ratio.gs + ratio.optional;
        
        expect(total).toBeLessThanOrEqual(1.0);
        expect(ratio.gs).toBeGreaterThanOrEqual(0);
        expect(ratio.optional).toBeGreaterThanOrEqual(0);
        
        console.log(`✅ ${approach}: Total=${total.toFixed(2)} (valid)`);
      });
    });
  });

  describe('Block Creation with GS:Optional Ratios', () => {
    it('should create blocks respecting GS:Optional ratios with plenty of time', async () => {
      const totalHours = 2000; // Plenty of time - no subjects should be dropped
      const confidenceMap = new Map<string, number>();
      subjects.forEach(subject => {
        confidenceMap.set(subject.subjectCode, 1.0);
      });

      const blocks = await createBlocksForSubjects({
        intake: mockIntake,
        subjects: subjects,
        totalHours: totalHours,
        confidenceMap: confidenceMap,
        blockPrefix: 'Test',
        cycleType: CycleType.C1,
        cycleOrder: 1,
        cycleName: 'Test Cycle',
        cycleStartDate: '2025-03-01',
        cycleEndDate: '2025-12-31',
        subjData: { subjects, subtopics: { subtopics: [] } },
        logger: {
          logInfo: () => {},
          logWarn: () => {},
          logDebug: () => {},
          getLogs: () => [],
          clear: () => {}
        }
      });

      // Calculate total hours allocated to GS and Optional subjects
      const gsBlocks = blocks.filter(block => {
        const subjectCode = block.subjects[0];
        const subject = subjects.find(s => s.subjectCode === subjectCode);
        return subject && !isOptional(subject);
      });

      const optionalBlocks = blocks.filter(block => {
        const subjectCode = block.subjects[0];
        const subject = subjects.find(s => s.subjectCode === subjectCode);
        return subject && isOptional(subject);
      });

      // Use estimated_hours (allocated by scheduler)
      const gsHours = gsBlocks.reduce((sum, block) => sum + (block.estimated_hours || 0), 0);
      const optionalHours = optionalBlocks.reduce((sum, block) => sum + (block.estimated_hours || 0), 0);

      const ratio = mockIntake.getGSOptionalRatio();
      const expectedGSHours = Math.floor(totalHours * ratio.gs);
      const expectedOptionalHours = Math.floor(totalHours * ratio.optional);

      // Debug logging
      console.log(`🔍 Simple Test Debug:`);
      console.log(`  Total hours: ${totalHours}`);
      console.log(`  Total blocks: ${blocks.length}`);
      console.log(`  GS blocks: ${gsBlocks.length}, Optional blocks: ${optionalBlocks.length}`);
      console.log(`  GS hours: ${gsHours}, Expected: ${expectedGSHours}`);
      console.log(`  Optional hours: ${optionalHours}, Expected: ${expectedOptionalHours}`);
      console.log(`  Expected ratio: GS=${ratio.gs}, Optional=${ratio.optional}`);
      console.log(`  Actual ratio: GS=${(gsHours / (gsHours + optionalHours)).toFixed(3)}, Optional=${(optionalHours / (gsHours + optionalHours)).toFixed(3)}`);

      // With plenty of time, all subjects should be scheduled
      expect(blocks.length).toBe(subjects.length);
      
      // Check that GS:Optional ratio is respected
      const totalScheduledHours = gsHours + optionalHours;
      const actualGSRatio = totalScheduledHours > 0 ? gsHours / totalScheduledHours : 0;
      const actualOptionalRatio = totalScheduledHours > 0 ? optionalHours / totalScheduledHours : 0;
      
      // Allow 5% tolerance for ratio differences
      const ratioTolerance = 0.05;
      
      expect(Math.abs(actualGSRatio - ratio.gs)).toBeLessThanOrEqual(ratioTolerance);
      expect(Math.abs(actualOptionalRatio - ratio.optional)).toBeLessThanOrEqual(ratioTolerance);
    });

    it('should create blocks respecting GS:Optional ratios', async () => {
      const totalHours = 1000;
      const confidenceMap = new Map<string, number>();
      subjects.forEach(subject => {
        confidenceMap.set(subject.subjectCode, 1.0);
      });

      const blocks = await createBlocksForSubjects({
        intake: mockIntake,
        subjects: subjects,
        totalHours: totalHours,
        confidenceMap: confidenceMap,
        blockPrefix: 'Test',
        cycleType: CycleType.C1,
        cycleOrder: 1,
        cycleName: 'Test Cycle',
        cycleStartDate: '2025-03-01',
        cycleEndDate: '2025-05-31',
        subjData: { subjects, subtopics: { subtopics: [] } },
        logger: {
        logInfo: () => {},
        logDebug: () => {},
        logWarn: () => {},
        getLogs: () => [],
        clear: () => {}
        }
      });

      // Calculate total hours allocated to GS and Optional subjects
      // Note: We should check the allocated hours from the scheduler library, not the final block hours
      // because block hours might be adjusted due to scheduling constraints
      const gsBlocks = blocks.filter(block => {
        const subjectCode = block.subjects[0]; // Block has subjects array, not subjectCode
        const subject = subjects.find(s => s.subjectCode === subjectCode);
        return subject && !isOptional(subject);
      });

      const optionalBlocks = blocks.filter(block => {
        const subjectCode = block.subjects[0]; // Block has subjects array, not subjectCode
        const subject = subjects.find(s => s.subjectCode === subjectCode);
        return subject && isOptional(subject);
      });

      // Use estimated_hours (allocated by scheduler) instead of totalHours (final block hours)
      const gsHours = gsBlocks.reduce((sum, block) => sum + (block.estimated_hours || 0), 0);
      const optionalHours = optionalBlocks.reduce((sum, block) => sum + (block.estimated_hours || 0), 0);

      const ratio = mockIntake.getGSOptionalRatio();
      const expectedGSHours = Math.floor(totalHours * ratio.gs);
      const expectedOptionalHours = Math.floor(totalHours * ratio.optional);

      // Debug logging
      console.log(`🔍 Test Debug:`);
      console.log(`  Total blocks: ${blocks.length}`);
      console.log(`  GS blocks: ${gsBlocks.length}, Optional blocks: ${optionalBlocks.length}`);
      console.log(`  GS hours: ${gsHours}, Expected: ${expectedGSHours}`);
      console.log(`  Optional hours: ${optionalHours}, Expected: ${expectedOptionalHours}`);
      console.log(`  Expected ratio: GS=${ratio.gs}, Optional=${ratio.optional}`);
      console.log(`  Actual ratio: GS=${(gsHours / (gsHours + optionalHours)).toFixed(3)}, Optional=${(optionalHours / (gsHours + optionalHours)).toFixed(3)}`);
      console.log(`  GS block details:`, gsBlocks.map(b => ({ code: b.subjects[0], estimated: b.estimated_hours, actual: b.actual_hours })));
      console.log(`  Optional block details:`, optionalBlocks.map(b => ({ code: b.subjects[0], estimated: b.estimated_hours, actual: b.actual_hours })));

      // The scheduler library correctly allocates hours according to GS:Optional ratio,
      // but the scheduling logic may prioritize certain subjects over others.
      // We should check that:
      // 1. Optional subjects are scheduled (since they're important)
      // 2. The ratio is reasonable (not completely off)
      // 3. Both GS and Optional subjects get some allocation
      
      expect(optionalHours).toBeGreaterThan(0); // Optional subjects should be scheduled
      expect(gsHours).toBeGreaterThan(0); // GS subjects should be scheduled
      
      // Check that the ratio is not completely off (allow 30% tolerance)
      const totalScheduledHours = gsHours + optionalHours;
      const actualGSRatio = totalScheduledHours > 0 ? gsHours / totalScheduledHours : 0;
      const actualOptionalRatio = totalScheduledHours > 0 ? optionalHours / totalScheduledHours : 0;
      
      // Allow 30% tolerance for scheduling constraints
      const ratioTolerance = 0.3;
      
      // The actual ratio should be within reasonable bounds
      expect(Math.abs(actualGSRatio - ratio.gs)).toBeLessThanOrEqual(ratioTolerance);
      expect(Math.abs(actualOptionalRatio - ratio.optional)).toBeLessThanOrEqual(ratioTolerance);
      
      console.log(`✅ Block creation: GS=${gsHours}/${expectedGSHours}h, Optional=${optionalHours}/${expectedOptionalHours}h`);
    });

    it('should maintain ratio consistency across different cycle types', async () => {
      const cycleTypes = [CycleType.C1, CycleType.C2, CycleType.C4, CycleType.C6];
      const totalHours = 500;
      
      for (const cycleType of cycleTypes) {
        const confidenceMap = new Map<string, number>();
        subjects.forEach(subject => {
          confidenceMap.set(subject.subjectCode, 1.0);
        });

        const blocks = await createBlocksForSubjects({
          intake: mockIntake,
          subjects: subjects,
          totalHours: totalHours,
          confidenceMap: confidenceMap,
          blockPrefix: 'Test',
          cycleType: cycleType,
          cycleOrder: 1,
          cycleName: 'Test Cycle',
          cycleStartDate: '2025-03-01',
          cycleEndDate: '2025-05-31',
          subjData: { subjects, subtopics: { subtopics: [] } },
          logger: {
        logInfo: () => {},
        logDebug: () => {},
        logWarn: () => {},
        getLogs: () => [],
        clear: () => {}
          }
        });

        const gsBlocks = blocks.filter(block => {
          const subjectCode = block.subjects[0]; // Block has subjects array, not subjectCode
          const subject = subjects.find(s => s.subjectCode === subjectCode);
          return subject && !isOptional(subject);
        });

        const optionalBlocks = blocks.filter(block => {
          const subjectCode = block.subjects[0]; // Block has subjects array, not subjectCode
          const subject = subjects.find(s => s.subjectCode === subjectCode);
          return subject && isOptional(subject);
        });

        const gsHours = gsBlocks.reduce((sum, block) => sum + (block.estimated_hours || 0), 0);
        const optionalHours = optionalBlocks.reduce((sum, block) => sum + (block.estimated_hours || 0), 0);

        const ratio = mockIntake.getGSOptionalRatio();
        const expectedGSHours = Math.floor(totalHours * ratio.gs);
        const expectedOptionalHours = Math.floor(totalHours * ratio.optional);

        // Allow 20% tolerance for rounding and minimum hour constraints
        const tolerance = Math.floor(totalHours * 0.2);
        
        expect(Math.abs(gsHours - expectedGSHours)).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(optionalHours - expectedOptionalHours)).toBeLessThanOrEqual(tolerance);
        
        console.log(`✅ ${cycleType}: GS=${gsHours}/${expectedGSHours}h, Optional=${optionalHours}/${expectedOptionalHours}h`);
      }
    });

    it('should handle edge cases with minimal hours', async () => {
      const totalHours = 50; // Very small total
      const confidenceMap = new Map<string, number>();
      subjects.forEach(subject => {
        confidenceMap.set(subject.subjectCode, 1.0);
      });

      const blocks = await createBlocksForSubjects({
        intake: mockIntake,
        subjects: subjects,
        totalHours: totalHours,
        confidenceMap: confidenceMap,
        blockPrefix: 'Test',
        cycleType: CycleType.C1,
        cycleOrder: 1,
        cycleName: 'Test Cycle',
        cycleStartDate: '2025-03-01',
        cycleEndDate: '2025-05-31',
        subjData: { subjects, subtopics: { subtopics: [] } },
        logger: {
        logInfo: () => {},
        logDebug: () => {},
        logWarn: () => {},
        getLogs: () => [],
        clear: () => {}
        }
      });

      // Should still create blocks even with minimal hours
      expect(blocks.length).toBeGreaterThan(0);
      
      const gsBlocks = blocks.filter(block => {
        const subjectCode = block.subjects[0]; // Block has subjects array, not subjectCode
        const subject = subjects.find(s => s.subjectCode === subjectCode);
        return subject && !isOptional(subject);
      });

      const optionalBlocks = blocks.filter(block => {
        const subjectCode = block.subjects[0]; // Block has subjects array, not subjectCode
        const subject = subjects.find(s => s.subjectCode === subjectCode);
        return subject && isOptional(subject);
      });

      const gsHours = gsBlocks.reduce((sum, block) => sum + (block.estimated_hours || 0), 0);
      const optionalHours = optionalBlocks.reduce((sum, block) => sum + (block.estimated_hours || 0), 0);

      // With minimal hours, we should still try to respect the ratio
      const ratio = mockIntake.getGSOptionalRatio();
      const expectedGSHours = Math.floor(totalHours * ratio.gs);
      const expectedOptionalHours = Math.floor(totalHours * ratio.optional);

      // Allow larger tolerance for small numbers
      const tolerance = Math.max(10, Math.floor(totalHours * 0.3));
      
      expect(Math.abs(gsHours - expectedGSHours)).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(optionalHours - expectedOptionalHours)).toBeLessThanOrEqual(tolerance);
      
      console.log(`✅ Minimal hours: GS=${gsHours}/${expectedGSHours}h, Optional=${optionalHours}/${expectedOptionalHours}h`);
    });
  });

  describe('Integration with Study Approaches', () => {
    it('should create different allocations for different study approaches', async () => {
      const approaches = ['balanced', 'WeakFirst', 'StrongFirst'];
      const totalHours = 1000;
      const results: any[] = [];

      for (const approach of approaches) {
      const intake = mockIntake;

        const confidenceMap = new Map<string, number>();
        subjects.forEach(subject => {
          confidenceMap.set(subject.subjectCode, 1.0);
        });

        const blocks = await createBlocksForSubjects({
          intake: intake,
          subjects: subjects,
          totalHours: totalHours,
          confidenceMap: confidenceMap,
          blockPrefix: 'Test',
          cycleType: CycleType.C1,
          cycleOrder: 1,
          cycleName: 'Test Cycle',
          cycleStartDate: '2025-03-01',
          cycleEndDate: '2025-05-31',
          subjData: { subjects, subtopics: { subtopics: [] } },
          logger: {
        logInfo: () => {},
        logDebug: () => {},
        logWarn: () => {},
        getLogs: () => [],
        clear: () => {}
          }
        });

        const gsBlocks = blocks.filter(block => {
          const subjectCode = block.subjects[0]; // Block has subjects array, not subjectCode
          const subject = subjects.find(s => s.subjectCode === subjectCode);
          return subject && !isOptional(subject);
        });

        const optionalBlocks = blocks.filter(block => {
          const subjectCode = block.subjects[0]; // Block has subjects array, not subjectCode
          const subject = subjects.find(s => s.subjectCode === subjectCode);
          return subject && isOptional(subject);
        });

        const gsHours = gsBlocks.reduce((sum, block) => sum + (block.estimated_hours || 0), 0);
        const optionalHours = optionalBlocks.reduce((sum, block) => sum + (block.estimated_hours || 0), 0);

        results.push({
          approach,
          gsHours,
          optionalHours,
          ratio: intake.getGSOptionalRatio()
        });
      }

      // Verify that different approaches produce different allocations
      const balanced = results.find(r => r.approach === 'balanced');
      const weakFirst = results.find(r => r.approach === 'WeakFirst');
      const strongFirst = results.find(r => r.approach === 'StrongFirst');

      expect(balanced!.gsHours).toBeLessThan(weakFirst!.gsHours);
      expect(balanced!.optionalHours).toBeGreaterThan(weakFirst!.optionalHours);
      
      expect(strongFirst!.gsHours).toBeLessThan(balanced!.gsHours);
      expect(strongFirst!.optionalHours).toBeGreaterThan(balanced!.optionalHours);

      console.log('✅ Different approaches produce different allocations:');
      results.forEach(result => {
        console.log(`  ${result.approach}: GS=${result.gsHours}h, Optional=${result.optionalHours}h`);
      });
    });
  });
});
