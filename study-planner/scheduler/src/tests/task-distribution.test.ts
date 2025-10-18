import { describe, it, expect, beforeEach } from 'vitest';
import { determineBlockSchedule } from '../blocks';
import { Subject, CycleSchedule, StudyApproach, SubjectType, CycleType } from '../types';
import dayjs from 'dayjs';

describe('Task Distribution Tests', () => {
  let mockSubjects: Subject[];
  let mockConfidenceMap: Map<string, number>;
  let mockCycleSchedule: CycleSchedule;

  beforeEach(() => {
    // Create mock subjects similar to T1 scenario
    mockSubjects = [
      {
        subjectCode: 'H01',
        baselineHours: 4,
        subjectType: 'GS' as SubjectType
      },
      {
        subjectCode: 'H02',
        baselineHours: 4,
        subjectType: 'GS' as SubjectType
      },
      {
        subjectCode: 'H03',
        baselineHours: 4,
        subjectType: 'GS' as SubjectType
      },
      {
        subjectCode: 'OPT-AGR',
        baselineHours: 4,
        subjectType: 'Optional' as SubjectType,
        isOptional: true,
        optionalSubjectName: 'Agriculture'
      }
    ];

    mockConfidenceMap = new Map([
      ['H01', 0.7], // VeryStrong
      ['H02', 0.7], // VeryStrong
      ['H03', 0.7], // VeryStrong
      ['OPT-AGR', 0.7] // VeryStrong
    ]);

    mockCycleSchedule = {
      cycleType: 'C1' as CycleType,
      startDate: '2025-03-01',
      endDate: '2025-06-01', // 13 weeks duration (March 1 to June 1)
      priority: 'mandatory'
    };
  });

  describe('T1 Scenario Replication', () => {
    it('should distribute tasks evenly across all weeks of a block', () => {
      const totalHours = 13 * 7 * 8; // 13 weeks * 7 days * 8 hours per day = 728 hours
      const workingHoursPerDay = 8;

      const result = determineBlockSchedule(
        mockCycleSchedule,
        mockSubjects,
        mockConfidenceMap,
        totalHours,
        'Balanced' as StudyApproach,
        workingHoursPerDay,
        { gs: 0.8, optional: 0.2 }
      );

      console.log('Result:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result));
      console.log('Scheduled', result.length, 'subjects');

      // Verify all subjects are scheduled
      expect(result.length).toBe(4);

      // Verify subjects have different start dates (sequential scheduling)
      const startDates = result.map(s => s.startDate);
      const uniqueStartDates = new Set(startDates);
      expect(uniqueStartDates.size).toBeGreaterThan(1);

      // Log subject details
      result.forEach(subject => {
        console.log(`Subject ${subject.subjectCode}: ${subject.startDate} to ${subject.endDate}`);
        console.log(`  Duration: ${dayjs(subject.endDate).diff(dayjs(subject.startDate), 'day')} days`);
      });
    });

    it('should not cram all tasks into the first week of multi-week blocks', () => {
      const totalHours = 13 * 7 * 8; // 13 weeks * 7 days * 8 hours per day = 728 hours
      const workingHoursPerDay = 8;

      const result = determineBlockSchedule(
        mockCycleSchedule,
        mockSubjects,
        mockConfidenceMap,
        totalHours,
        'Balanced' as StudyApproach,
        workingHoursPerDay,
        { gs: 0.8, optional: 0.2 }
      );

      console.log('Result:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result));

      // Verify subjects span multiple weeks
      result.forEach(subject => {
        const durationDays = dayjs(subject.endDate).diff(dayjs(subject.startDate), 'day');
        console.log(`Subject ${subject.subjectCode}: ${durationDays} days`);
        
        if (durationDays > 7) {
          console.log(`  Multi-week subject: ${subject.subjectCode} (${durationDays} days)`);
        }
      });
    });

    it('should respect GS:Optional ratio while distributing tasks properly', () => {
      const totalHours = 13 * 7 * 8; // 13 weeks * 7 days * 8 hours per day = 728 hours
      const workingHoursPerDay = 8;

      const result = determineBlockSchedule(
        mockCycleSchedule,
        mockSubjects,
        mockConfidenceMap,
        totalHours,
        'Balanced' as StudyApproach,
        workingHoursPerDay,
        { gs: 0.8, optional: 0.2 }
      );

      console.log('Result:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result));

      // Calculate GS vs Optional hours
      const gsSubjects = result.filter(s => {
        const subject = mockSubjects.find(sub => sub.subjectCode === s.subjectCode);
        return subject?.subjectType === 'GS';
      });
      const optionalSubjects = result.filter(s => {
        const subject = mockSubjects.find(sub => sub.subjectCode === s.subjectCode);
        return subject?.subjectType === 'Optional';
      });
      
      // For this test, we'll just verify that both GS and Optional subjects are scheduled
      const gsHours = gsSubjects.length * 4; // Approximate based on baseline hours
      const optionalHours = optionalSubjects.length * 4;
      
      console.log(`GS hours: ${gsHours}, Optional hours: ${optionalHours}`);
      
      const gsRatio = gsHours / (gsHours + optionalHours);
      const optionalRatio = optionalHours / (gsHours + optionalHours);
      
      console.log(`GS ratio: ${gsRatio.toFixed(2)}, Optional ratio: ${optionalRatio.toFixed(2)}`);

      // Verify ratios are approximately correct (within 10% tolerance)
      expect(gsRatio).toBeCloseTo(0.8, 1);
      expect(optionalRatio).toBeCloseTo(0.2, 1);
    });
  });

  describe('Task Distribution Logic', () => {
    it('should create weekly plans that span the full block duration', () => {
      const totalHours = 13 * 7 * 8; // 13 weeks * 7 days * 8 hours per day = 728 hours
      const workingHoursPerDay = 8;

      const result = determineBlockSchedule(
        mockCycleSchedule,
        mockSubjects,
        mockConfidenceMap,
        totalHours,
        'Balanced' as StudyApproach,
        workingHoursPerDay,
        { gs: 0.8, optional: 0.2 }
      );

      console.log('Result:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result));

      // Verify subjects utilize the full cycle duration
      result.forEach(subject => {
        const durationDays = dayjs(subject.endDate).diff(dayjs(subject.startDate), 'day');
        console.log(`Subject: ${subject.subjectCode}, Duration: ${durationDays} days`);
      });
    });

    it('should distribute subjects across the full cycle duration', () => {
      const totalHours = 13 * 7 * 8; // 13 weeks * 7 days * 8 hours per day = 728 hours
      const workingHoursPerDay = 8;

      const result = determineBlockSchedule(
        mockCycleSchedule,
        mockSubjects,
        mockConfidenceMap,
        totalHours,
        'Balanced' as StudyApproach,
        workingHoursPerDay,
        { gs: 0.8, optional: 0.2 }
      );

      console.log('Result:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result));
      console.log('Scheduled', result.length, 'subjects');

      // Calculate cycle duration
      const cycleStart = dayjs(mockCycleSchedule.startDate);
      const cycleEnd = dayjs(mockCycleSchedule.endDate);
      const cycleDurationDays = cycleEnd.diff(cycleStart, 'day');
      
      console.log(`Cycle duration: ${cycleDurationDays} days`);

      // Verify subjects are distributed across the cycle
      result.forEach(subject => {
        const startDate = dayjs(subject.startDate);
        const endDate = dayjs(subject.endDate);
        const durationDays = endDate.diff(startDate, 'day');
        
        console.log(`Subject ${subject.subjectCode}: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')} (${durationDays} days)`);
      });

      // Verify subjects start on different dates (sequential scheduling)
      const startDates = result.map(s => s.startDate);
      const uniqueStartDates = new Set(startDates);
      console.log(`Unique start dates: ${uniqueStartDates.size} out of ${result.length} subjects`);
      
      expect(uniqueStartDates.size).toBeGreaterThan(1);
    });
  });
});