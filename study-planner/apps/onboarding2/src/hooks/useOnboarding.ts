import { useState, useCallback } from 'react';
import { OnboardingFormData, OnboardingStep } from '@/types';
import { OnboardingService } from '@/services/onboardingService';

const initialFormData: OnboardingFormData = {
  personalInfo: {
    fullName: 'Test Student',
    email: 'test@example.com',
    phoneNumber: '+91 99999 99999',
    presentLocation: 'New Delhi',
    graduationStream: 'engineering',
    collegeUniversity: 'IIT Delhi',
    yearOfPassing: 2023,
    about: 'Quick walkthrough profile'
  },
  targetYear: {
    targetYear: String(new Date().getFullYear() + 2),
    startDate: new Date()
  },
  commitment: {
    timeCommitment: 8,
    performance: {
      history: 'Good',
      polity: 'Average',
      economy: 'Good',
      geography: 'Average',
      environment: 'Basic',
      scienceTech: 'Good'
    },
    studyPreference: 'WeakSubjectsFirst',
    subjectApproach: 'DualSubject',
    upscOptionalSubject: 'OPT-PSIR',
    optionalFirst: false,
    weeklyTestDayPreference: 'Sunday',
    catchupDayPreference: 'Saturday',
    testMinutes: 180
  },
  confidenceLevel: {
    history: 3,
    geography: 3,
    polity: 3,
    economy: 3,
    environment: 3,
    science: 3,
    international: 3,
    security: 3,
    society: 3,
    governance: 3,
    ethics: 3,
    current: 3
  },
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
        return Object.keys(formData.confidenceLevel).length >= 12; // At least 12 subjects rated
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