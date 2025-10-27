import { OnboardingFormData } from '@/types';

// Placeholder service for server interactions
export class OnboardingService {
  
  // Placeholder for step 1 submission
  static async submitPersonalInfo(data: OnboardingFormData['personalInfo']): Promise<void> {
    console.log('📤 [PLACEHOLDER] Submitting personal info:', data);
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Placeholder for step 2 submission
  static async submitTargetYear(data: OnboardingFormData['targetYear']): Promise<void> {
    console.log('📤 [PLACEHOLDER] Submitting target year:', data);
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Placeholder for step 3 submission
  static async submitCommitment(data: OnboardingFormData['commitment']): Promise<void> {
    console.log('📤 [PLACEHOLDER] Submitting commitment:', data);
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Placeholder for step 4 submission
  static async submitConfidenceLevel(data: OnboardingFormData['confidenceLevel']): Promise<void> {
    console.log('📤 [PLACEHOLDER] Submitting confidence level:', data);
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Placeholder for final submission
  static async submitComplete(data: OnboardingFormData): Promise<{ studentId: string }> {
    console.log('📤 [PLACEHOLDER] Submitting complete form:', data);
    // TODO: Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { studentId: 'student_' + Date.now() };
  }

  // Generate study plan preview using helios-ts
  static async generatePreview(data: Partial<OnboardingFormData>): Promise<OnboardingFormData['preview']> {
    console.log('📤 Generating preview with helios-ts for:', data);
    
    try {
      // Import helios service dynamically to handle potential import issues
      const { HeliosService } = await import('./heliosService');
      
      // Generate study plan if we have enough data
      if (data.personalInfo && data.targetYear && data.commitment && data.confidenceLevel) {
        const fullData = data as OnboardingFormData;
        const planData = await HeliosService.generateStudyPlan(fullData);
        const milestones = HeliosService.calculateMilestones(fullData.targetYear.targetYear, planData.studyPlan);
        
        return {
          raw_helios_data: {
            totalHours: planData.totalHours,
            subjects: planData.subjects,
            cycles: planData.cycles,
            blocks: planData.blocks,
            studyPlan: planData.studyPlan
          },
          milestones: {
            foundationToPrelimsDate: milestones.foundationToPrelimsDate,
            prelimsToMainsDate: milestones.prelimsToMainsDate
          },
          studyPlanId: 'plan_' + Date.now()
        };
      }
    } catch (error) {
      console.warn('Failed to generate plan with helios-ts, using fallback:', error);
    }
    
    // Fallback to mock data
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      raw_helios_data: {
        totalHours: 2400,
        subjects: ['History', 'Geography', 'Polity', 'Economy'],
        cycles: 3,
        blocks: 12
      },
      milestones: {
        foundationToPrelimsDate: new Date('2026-02-01'),
        prelimsToMainsDate: new Date('2026-05-20')
      },
      studyPlanId: 'plan_' + Date.now()
    };
  }
}