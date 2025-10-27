import { useState, useCallback } from 'react';
import { OnboardingFormData, OnboardingStep } from '@/types';
import { OnboardingService } from '@/services/onboardingService';

const initialFormData: OnboardingFormData = {
  personalInfo: {
    fullName: 'Rajesh Kumar',
    email: 'rajesh.kumar@example.com',
    phoneNumber: '+91 98765 43210',
    presentLocation: 'New Delhi',
    graduationStream: 'engineering',
    collegeUniversity: 'Delhi University',
    yearOfPassing: 2023,
    about: ''
  },
  targetYear: {
    targetYear: '2027',
    startDate: undefined
  },
  commitment: {
    timeCommitment: 6,
    performance: {
      history: '',
      polity: '',
      economy: '',
      geography: '',
      environment: '',
      scienceTech: ''
    },
    studyPreference: 'WeakSubjectsFirst',
    subjectApproach: 'DualSubject',
    upscOptionalSubject: 'OPT-SOC',
    optionalFirst: false,
    weeklyTestDayPreference: 'Sunday',
    catchupDayPreference: 'Saturday',
    testMinutes: 180
  },
  confidenceLevel: {},
  preview: {
    raw_helios_data: {},
    milestones: {
      foundationToPrelimsDate: null,
      prelimsToMainsDate: null
    },
    studyPlanId: null
  },
  payment: {
    paymentLink: null,
    paymentStatus: 'pending',
    selectedPlan: '',
    amount: 0
  }
};

const steps: OnboardingStep[] = [
  'personal-info',
  'commitment',
  'confidence',
  'target-year',
  'preview',
  'payment',
  'complete'
];

export function useOnboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('personal-info');
  const [formData, setFormData] = useState<OnboardingFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFormData = useCallback((updates: Partial<OnboardingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const getCurrentStepIndex = useCallback(() => {
    return steps.indexOf(currentStep);
  }, [currentStep]);

  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'personal-info':
        return formData.personalInfo.fullName && 
               formData.personalInfo.email && 
               formData.personalInfo.presentLocation &&
               formData.personalInfo.graduationStream;
      case 'commitment':
        return formData.commitment.timeCommitment > 0;
      case 'confidence':
        return Object.keys(formData.confidenceLevel).length > 0; // At least one subject rated
      case 'target-year':
        return formData.targetYear.targetYear;
      case 'preview':
        return true;
      case 'payment':
        return formData.payment.selectedPlan;
      default:
        return true;
    }
  }, [currentStep, formData]);

  const goNext = useCallback(async () => {
    if (!canGoNext()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit current step data
      switch (currentStep) {
        case 'personal-info':
          await OnboardingService.submitPersonalInfo(formData.personalInfo);
          break;
        case 'commitment':
          await OnboardingService.submitCommitment(formData.commitment);
          break;
        case 'confidence':
          await OnboardingService.submitConfidenceLevel(formData.confidenceLevel);
          break;
        case 'target-year':
          await OnboardingService.submitTargetYear(formData.targetYear);
          break;
        case 'preview':
          break;
        case 'payment':
          await OnboardingService.submitComplete(formData);
          break;
      }

      // Move to next step
      const currentIndex = getCurrentStepIndex();
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1]);
        
        // Generate preview when moving to preview step
        if (steps[currentIndex + 1] === 'preview') {
          const preview = await OnboardingService.generatePreview(formData);
          updateFormData({ preview });
        }
        
        // Generate payment link when moving to payment step
        if (steps[currentIndex + 1] === 'payment') {
          const paymentData = await OnboardingService.generatePaymentLink(formData);
          updateFormData({ payment: paymentData });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentStep, formData, canGoNext, getCurrentStepIndex, updateFormData]);

  const goPrevious = useCallback(() => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [getCurrentStepIndex]);

  return {
    currentStep,
    formData,
    updateFormData,
    goNext,
    goPrevious,
    canGoNext: canGoNext(),
    isSubmitting,
    error,
    progress: ((getCurrentStepIndex() + 1) / steps.length) * 100
  };
}