type StudentIntake = any;
type StudyPlan = any;
type TimeCommitment = number;
type ConfidenceLevel = number;

import dayjs from 'dayjs';
import { planCycles } from 'helios-scheduler';
import { OnboardingFormData } from '@/types';

export class HeliosService {
  /**
   * Generate a study plan preview using helios-ts
   */
  static async generateStudyPlan(formData: OnboardingFormData): Promise<{
    studyPlan: StudyPlan;
    totalHours: number;
    cycles: any;
    blocks: number;
    subjects: string[];
  }> {
    const target = parseInt(formData.targetYear.targetYear);
    const start = dayjs(formData.targetYear.startDate || new Date());
    const prelims = dayjs(`${target}-05-20`);
    const mains = dayjs(`${target}-09-20`);
    const schedules = planCycles({
      optionalSubject: {
        subjectCode: formData.commitment.upscOptionalSubject,
        subjectNname: 'Optional',
        examFocus: 'MainsOnly',
        topics: [],
        baselineMinutes: 0,
      },
      startDate: start,
      targetYear: target,
      prelimsExamDate: prelims,
      mainsExamDate: mains,
      constraints: {
        optionalSubjectCode: formData.commitment.upscOptionalSubject,
        confidenceMap: formData.confidenceLevel as any,
        optionalFirst: formData.commitment.optionalFirst,
        catchupDay: 6,
        testDay: 0,
        workingHoursPerDay: formData.commitment.timeCommitment,
        breaks: [],
        testMinutes: formData.commitment.testMinutes,
      },
      subjects: [],
      relativeAllocationWeights: {}
    }).schedules;

    // Estimate hours based on commitment and duration to mains
    const daysToMains = mains.diff(start, 'day');
    const totalHours = Math.max(0, daysToMains) * formData.commitment.timeCommitment;
    const subjects = Object.keys(formData.confidenceLevel);
    const blocks = schedules.length * 4; // simple proxy

    return {
      studyPlan: {} as StudyPlan,
      totalHours,
      cycles: schedules,
      blocks,
      subjects
    };
  }

  /**
   * Get study plan milestones
   */
  static calculateMilestones(targetYear: string, studyPlan?: StudyPlan): {
    foundationToPrelimsDate: Date;
    prelimsToMainsDate: Date;
  } {
    const year = parseInt(targetYear);
    
    // If we have a real study plan, use its timeline
    if (studyPlan && studyPlan.timeline) {
      return {
        foundationToPrelimsDate: new Date(studyPlan.timeline.foundationEndDate || `${year}-02-01`),
        prelimsToMainsDate: new Date(studyPlan.timeline.prelimsEndDate || `${year}-05-20`)
      };
    }
    
    // Default milestone dates
    return {
      foundationToPrelimsDate: new Date(`${year}-02-01`),
      prelimsToMainsDate: new Date(`${year}-05-20`)
    };
  }

  /**
   * Get recommended study intensity based on target year and commitment
   */
  static getStudyIntensity(targetYear: string, timeCommitment: number): {
    intensity: string;
    successProbability: string;
    monthsRemaining: number;
  } {
    const year = parseInt(targetYear);
    const currentYear = new Date().getFullYear();
    const monthsRemaining = (year - currentYear) * 12;
    
    let intensity: string;
    let successProbability: string;
    
    if (monthsRemaining <= 18) {
      intensity = timeCommitment >= 8 ? 'High (8-10 hrs/day)' : 'Very High (10+ hrs/day)';
      successProbability = timeCommitment >= 8 ? '65%' : '45%';
    } else if (monthsRemaining <= 30) {
      intensity = timeCommitment >= 6 ? 'Moderate (6-8 hrs/day)' : 'High (8-10 hrs/day)';
      successProbability = timeCommitment >= 6 ? '78%' : '65%';
    } else {
      intensity = timeCommitment >= 4 ? 'Comfortable (4-6 hrs/day)' : 'Moderate (6-8 hrs/day)';
      successProbability = timeCommitment >= 4 ? '85%' : '78%';
    }
    
    return {
      intensity,
      successProbability,
      monthsRemaining
    };
  }
}