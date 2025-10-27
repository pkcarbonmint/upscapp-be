import { useState, useCallback, useEffect } from 'react';
import { OnboardingFormData, OnboardingStep } from '@/types';
// Load subjects from helios-ts so we can prefill confidence to 'average'
import { loadAllSubjects } from 'helios-ts';
import { OnboardingService } from '@/services/onboardingService';

// Sample data to enable a fast walkthrough out of the box
const sampleFormData: OnboardingFormData = {
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

// Empty structure used when demo mode is disabled
const emptyFormData: OnboardingFormData = {
  personalInfo: {
    fullName: '',
    email: '',
    phoneNumber: '',
    presentLocation: '',
    graduationStream: '',
    collegeUniversity: '',
    yearOfPassing: new Date().getFullYear(),
    about: ''
  },
  targetYear: {
    targetYear: '',
    startDate: undefined
  },
  commitment: {
    timeCommitment: 0,
    performance: {
      history: '',
      polity: '',
      economy: '',
      geography: '',
      environment: '',
      scienceTech: ''
    },
    studyPreference: '',
    subjectApproach: '',
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
  // Enable demo defaults by default; allow disabling via env or query (?demo=0)
  const isDemoEnabled = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '0') return false;
      if (params.get('demo') === '1') return true;
      const envVal = (import.meta as any).env?.VITE_ONBOARDING2_DEMO;
      if (typeof envVal === 'string') {
        return envVal === '1' || envVal.toLowerCase() === 'true';
      }
    } catch {
      // ignore
    }
    return true; // default ON for quick walkthroughs
  })();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('personal-info');
  const [formData, setFormData] = useState<OnboardingFormData>(
    isDemoEnabled ? sampleFormData : emptyFormData
  );
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

  // Prefill confidence to 'average' (3 stars) for all subjects from helios-ts
  useEffect(() => {
    if (Object.keys(formData.confidenceLevel).length === 0) {
      (async () => {
        try {
          const subjects = await loadAllSubjects(formData.commitment.upscOptionalSubject);
          const defaults = subjects.reduce<Record<string, number>>((acc, subject) => {
            acc[subject.subjectCode] = 3; // Average by default
            return acc;
          }, {});
          setFormData(prev => ({ ...prev, confidenceLevel: defaults }));
        } catch (e) {
          // Fallback: ensure at least 12 subjects to allow quick walkthrough
          const fallbackCodes = [
            'HIST', 'POL', 'ECON', 'GEO', 'ENV', 'SCI',
            'CA', 'ETH', 'ESSAY', 'INTV', 'OPT-P1', 'OPT-P2'
          ];
          const defaults: Record<string, number> = {};
          for (const code of fallbackCodes) defaults[code] = 3;
          setFormData(prev => ({ ...prev, confidenceLevel: defaults }));
        }
      })();
    }
  }, [formData.confidenceLevel, formData.commitment.upscOptionalSubject]);

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