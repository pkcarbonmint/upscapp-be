import { useState, useCallback, useEffect } from 'react';
import { OnboardingFormData, OnboardingStep } from '@/types';
// Load subjects from helios-ts so we can prefill confidence to 'average'
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
    subjectOrderingPreference: 'balanced',
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
  // Get initial step from URL or default to first step
  const getStepFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const urlStep = params.get('step') as OnboardingStep | null;
    return urlStep && steps.includes(urlStep) ? urlStep : 'personal-info';
  };
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(getStepFromURL());
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
        const nextStep = steps[currentIndex + 1];
        setCurrentStep(nextStep);
        
        // Push new state to history so browser back button works
        window.history.pushState({ step: nextStep }, '', `?step=${nextStep}`);
        
        // Generate preview when moving to preview step
        if (nextStep === 'preview') {
          const preview = await OnboardingService.generatePreview(formData);
          updateFormData({ preview });
        }
        
        // Generate payment link when moving to payment step
        if (nextStep === 'payment') {
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
      const prevStep = steps[currentIndex - 1];
      setCurrentStep(prevStep);
      // Update URL without pushing to history (browser back button will handle it)
      window.history.replaceState({}, '', `?step=${prevStep}`);
    }
  }, [getCurrentStepIndex]);

  // Initialize URL if not present (first load)
  useEffect(() => {
    const urlStep = getStepFromURL();
    if (!urlStep) {
      window.history.replaceState({}, '', `?step=${currentStep}`);
    }
  }, []); // Only run once on mount

  // Listen to browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlStep = getStepFromURL();
      if (urlStep && urlStep !== currentStep) {
        setCurrentStep(urlStep);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentStep]);

  // Prefill confidence to 'average' (3 stars) for all subjects from helios-ts
  useEffect(() => {
    if (Object.keys(formData.confidenceLevel).length === 0) {
      (async () => {
        try {
          const { loadAllSubjects } = await import('helios-ts');
          const subjects = await loadAllSubjects(formData.commitment.upscOptionalSubject);
          const defaults = subjects.reduce<Record<string, number>>((acc, subject) => {
            acc[subject.subjectCode] = 3; // Average by default
            return acc;
          }, {});
          setFormData(prev => ({ ...prev, confidenceLevel: defaults }));
        } catch (e) {
          // ignore errors and keep empty map
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