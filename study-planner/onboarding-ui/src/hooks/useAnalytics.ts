// React hooks for Google Analytics integration
import { useEffect, useCallback } from 'react';
import { analytics } from '../services/analytics';
import { getStyleVariant } from '../config/featureFlags';

/**
 * Hook to track page views automatically
 */
export const usePageTracking = () => {
  useEffect(() => {
    analytics.trackPageView();
  }, []);
};

/**
 * Hook to track form interactions
 */
export const useFormTracking = (stepName: string) => {
  const trackFieldFocus = useCallback((fieldName: string) => {
    analytics.trackFormInteraction(stepName, 'focus', fieldName);
  }, [stepName]);

  const trackFieldChange = useCallback((fieldName: string) => {
    analytics.trackFormInteraction(stepName, 'change', fieldName);
  }, [stepName]);

  const trackFieldError = useCallback((fieldName: string, errorMessage: string) => {
    analytics.trackFormError(stepName, errorMessage, fieldName);
  }, [stepName]);

  const trackStepComplete = useCallback((timeSpent?: number) => {
    analytics.trackStepCompletion(stepName, timeSpent);
  }, [stepName]);

  const trackFormSubmit = useCallback((timeSpent?: number) => {
    analytics.trackFormSuccess(stepName, timeSpent);
  }, [stepName]);

  return {
    trackFieldFocus,
    trackFieldChange,
    trackFieldError,
    trackStepComplete,
    trackFormSubmit
  };
};

/**
 * Hook to track theme-related events
 */
export const useThemeTracking = () => {
  const trackThemeView = useCallback(() => {
    const theme = getStyleVariant();
    analytics.track('theme_viewed', {
      theme_variant: theme,
      page: window.location.pathname
    });
  }, []);

  const trackThemeInteraction = useCallback((action: string, element?: string) => {
    analytics.trackEngagement(action, 'theme_interaction');
    if (element) {
      analytics.track('theme_element_interaction', {
        element,
        action
      });
    }
  }, []);

  return {
    trackThemeView,
    trackThemeInteraction
  };
};

/**
 * Hook to track conversion events
 */
export const useConversionTracking = () => {
  const trackConversion = useCallback((type: string, value?: number, additionalData?: Record<string, any>) => {
    analytics.trackConversion(type, value);
    
    if (additionalData) {
      analytics.track('conversion_detailed', {
        conversion_type: type,
        conversion_value: value,
        ...additionalData
      });
    }
  }, []);

  const trackStepConversion = useCallback((fromStep: string, toStep: string, timeSpent?: number) => {
    analytics.track('step_progression', {
      from_step: fromStep,
      to_step: toStep,
      progression_time: timeSpent
    });
  }, []);

  return {
    trackConversion,
    trackStepConversion
  };
};

/**
 * Hook for A/B/C testing analytics
 */
export const useABTestTracking = () => {
  const trackVariantExposure = useCallback((testName: string, variant: string) => {
    analytics.track('ab_test_exposure', {
      test_name: testName,
      test_variant: variant,
      theme_variant: getStyleVariant()
    });
  }, []);

  const trackVariantConversion = useCallback((testName: string, variant: string, goal: string) => {
    analytics.track('ab_test_conversion', {
      test_name: testName,
      test_variant: variant,
      conversion_goal: goal,
      theme_variant: getStyleVariant()
    });
  }, []);

  return {
    trackVariantExposure,
    trackVariantConversion
  };
};
