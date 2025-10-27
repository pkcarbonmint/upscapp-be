// Import types and functions from helios-ts
// Note: These imports may fail if helios-ts is not properly linked
type StudentIntake = any;
type StudyPlan = any;
type TimeCommitment = number;
type ConfidenceLevel = number;

// Placeholder functions - replace with actual helios-ts imports when available
const generateInitialPlan = async (_intake: StudentIntake): Promise<StudyPlan> => {
  throw new Error('helios-ts not available');
};

const createStudentIntake = (data: any): StudentIntake => {
  return data;
};
import { OnboardingFormData } from '@/types';

export class HeliosService {
  /**
   * Generate a study plan preview using helios-ts
   */
  static async generateStudyPlan(formData: OnboardingFormData): Promise<{
    studyPlan: StudyPlan;
    totalHours: number;
    cycles: number;
    blocks: number;
    subjects: string[];
  }> {
    try {
      // Convert form data to helios-ts StudentIntake format
      const studentIntake: StudentIntake = createStudentIntake({
        // Personal info
        name: formData.personalInfo.fullName,
        email: formData.personalInfo.email,
        phone: formData.personalInfo.phoneNumber,
        location: formData.personalInfo.presentLocation,
        
        // Academic background
        stream: formData.personalInfo.graduationStream,
        graduationYear: formData.personalInfo.yearOfPassing,
        
        // Target and commitment
        targetYear: parseInt(formData.targetYear.targetYear),
        timeCommitment: formData.commitment.timeCommitment as TimeCommitment,
        
        // Subject confidence mapping
        subjectConfidence: Object.entries(formData.confidenceLevel).reduce((acc, [key, value]) => {
          acc[key] = value as ConfidenceLevel;
          return acc;
        }, {} as Record<string, ConfidenceLevel>),
        
        // Study preferences
        studyPreference: formData.commitment.studyPreference,
        subjectApproach: formData.commitment.subjectApproach,
        optionalSubject: formData.commitment.upscOptionalSubject,
        optionalFirst: formData.commitment.optionalFirst,
        
        // Schedule preferences
        weeklyTestDay: formData.commitment.weeklyTestDayPreference,
        catchupDay: formData.commitment.catchupDayPreference,
        testDuration: formData.commitment.testMinutes
      });

      // Generate the study plan
      const studyPlan = await generateInitialPlan(studentIntake);
      
      // Extract summary information
      const totalHours = studyPlan.blocks?.reduce((sum: number, block: any) => sum + (block.totalHours || 0), 0) || 0;
      const cycles = studyPlan.cycles?.length || 3;
      const blocks = studyPlan.blocks?.length || 12;
      const subjects: string[] = studyPlan.blocks ? [...new Set(studyPlan.blocks.flatMap((block: any) => 
        block.subjects?.map((subject: any) => subject.name) || []
      ))].filter((name): name is string => typeof name === 'string') : ['History', 'Geography', 'Polity', 'Economy'];

      return {
        studyPlan,
        totalHours,
        cycles,
        blocks,
        subjects
      };
    } catch (error) {
      console.error('Error generating study plan with helios-ts:', error);
      
      // Fallback to mock data if helios-ts fails
      return {
        studyPlan: {} as StudyPlan,
        totalHours: formData.commitment.timeCommitment * 365 * (parseInt(formData.targetYear.targetYear) - 2024),
        cycles: 3,
        blocks: 12,
        subjects: ['History', 'Geography', 'Polity', 'Economy', 'Environment', 'Science & Technology'] as string[]
      };
    }
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