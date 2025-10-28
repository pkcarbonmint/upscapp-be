// Feature flags configuration
// This file contains feature flags that can be used to enable/disable features

export type StyleVariant = 'A' | 'B' | 'C';

export interface FeatureFlags {
  // Target Year Step features
  showStartDateSelection: boolean;
  
  // Background Step features
  useSimpleFormLayout: boolean;
  
  // OTP Verification features
  enableOTPVerification: boolean;
  useFirebaseOTP: boolean;
  
  // UI Style Variants for A/B/C testing
  styleVariant: StyleVariant;
  
  // Future feature flags can be added here
  // showAdvancedValidation: boolean;
  // enablePremiumFeatures: boolean;
}

// Default feature flag values
export const defaultFeatureFlags: FeatureFlags = {
  // START DATE SELECTION FEATURE
  // Currently disabled - to re-enable, change this to true
  // or set environment variable VITE_SHOW_START_DATE=true
  showStartDateSelection: false,
  
  // BACKGROUND FORM LAYOUT FEATURE
  // Using simple form layout for better mobile experience
  // or set environment variable VITE_USE_SIMPLE_FORM=true
  useSimpleFormLayout: true,
  
  // OTP VERIFICATION FEATURES
  // Enable OTP verification step in the flow
  // or set environment variable VITE_ENABLE_OTP=true
  enableOTPVerification: true,
  
  // Use Firebase for OTP (false = dummy OTP for testing)
  // or set environment variable VITE_USE_FIREBASE_OTP=true
  useFirebaseOTP: false,
  
  // UI STYLE VARIANT FOR A/B/C TESTING
  // 'A' = Classic gray/white design (clean & professional)
  // 'B' = Modern blue/purple gradients with enhanced styling
  // 'C' = Premium rich colors with glass morphism effects
  // or set environment variable VITE_STYLE_VARIANT=B
  styleVariant: 'A',
};

// Helper function to get URL parameters
const getUrlParams = (): URLSearchParams => {
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search);
  }
  return new URLSearchParams();
};

  // Function to get feature flags (can be extended to read from environment variables or API)
export const getFeatureFlags = (): FeatureFlags => {
  const urlParams = getUrlParams();
  
  // Helper to validate style variant
  const getStyleVariant = (): StyleVariant => {
    const urlParams = getUrlParams();
    const urlStyle = urlParams.get('style') || urlParams.get('theme');
    const envStyle = import.meta.env?.VITE_STYLE_VARIANT;
    
    const validVariants: StyleVariant[] = ['A', 'B', 'C'];
    const variant = (urlStyle || envStyle || defaultFeatureFlags.styleVariant) as StyleVariant;
    console.log('theme', variant);
    return validVariants.includes(variant) ? variant : 'B';
  };
  
  // Priority order: URL params > Environment variables > Default values
  return {
    ...defaultFeatureFlags,
    
    // Start Date Selection Feature
    showStartDateSelection: 
      urlParams.get('startDate') === 'true' || 
      (import.meta.env?.VITE_SHOW_START_DATE === 'true') || 
      defaultFeatureFlags.showStartDateSelection,
    
    // Simple Form Layout Feature
    useSimpleFormLayout: 
      urlParams.get('simpleForm') === 'true' || 
      urlParams.get('layout') === 'simple' ||
      (import.meta.env?.VITE_USE_SIMPLE_FORM === 'true') || 
      defaultFeatureFlags.useSimpleFormLayout,
    
    // OTP Verification Features
    enableOTPVerification:
      urlParams.get('otp') === 'true' ||
      (import.meta.env?.VITE_ENABLE_OTP === 'true') ||
      defaultFeatureFlags.enableOTPVerification,
    
    useFirebaseOTP:
      urlParams.get('firebaseOTP') === 'true' ||
      (import.meta.env?.VITE_USE_FIREBASE_OTP === 'true') ||
      defaultFeatureFlags.useFirebaseOTP,
    
    // Style Variant for A/B/C Testing
    styleVariant: getStyleVariant(),
  };
};

// Helper function to check if a specific feature is enabled
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  const flags = getFeatureFlags();
  const value = flags[feature];
  // Handle boolean features
  return typeof value === 'boolean' ? value : Boolean(value);
};

// A/B/C Testing helpers
export const getActiveVariant = (feature: keyof FeatureFlags): 'A' | 'B' => {
  return isFeatureEnabled(feature) ? 'B' : 'A';
};

export const getLayoutVariant = (): 'inline' | 'simple' => {
  return isFeatureEnabled('useSimpleFormLayout') ? 'simple' : 'inline';
};

// Style variant helpers
export const getStyleVariant = (): StyleVariant => {
  const urlParams = getUrlParams();
  const urlStyle = urlParams.get('style') || urlParams.get('theme');
  const envStyle = import.meta.env?.VITE_STYLE_VARIANT;
  
  const validVariants: StyleVariant[] = ['A', 'B', 'C'];
  const variant = (urlStyle || envStyle || defaultFeatureFlags.styleVariant) as StyleVariant;
  return validVariants.includes(variant) ? variant : 'B';
};

export const getStyleVariantLabel = (variant?: StyleVariant): string => {
  const style = variant || getStyleVariant();
  switch (style) {
    case 'A': return 'A (Classic)';
    case 'B': return 'B (Modern)';
    case 'C': return 'C (Premium)';
    default: return 'B (Modern)';
  }
};

// URL manipulation helpers for testing
export const generateTestUrl = (baseUrl: string, options: {
  layout?: 'simple' | 'inline';
  startDate?: boolean;
  style?: StyleVariant;
  [key: string]: any;
}): string => {
  const url = new URL(baseUrl);
  
  if (options.layout === 'simple') {
    url.searchParams.set('layout', 'simple');
  }
  
  if (options.startDate === true) {
    url.searchParams.set('startDate', 'true');
  }
  
  if (options.style) {
    url.searchParams.set('style', options.style);
  }
  
  return url.toString();
};

// Generate A/B/C test URLs
export const generateStyleTestUrls = (baseUrl: string): Record<StyleVariant, string> => {
  return {
    A: generateTestUrl(baseUrl, { style: 'A' }),
    B: generateTestUrl(baseUrl, { style: 'B' }),
    C: generateTestUrl(baseUrl, { style: 'C' }),
  };
};

// Get current feature flag status for debugging
export const getFeatureFlagStatus = (): Record<string, any> => {
  const urlParams = getUrlParams();
  const flags = getFeatureFlags();
  
  return {
    flags,
    urlParams: Object.fromEntries(urlParams.entries()),
    environment: {
      VITE_SHOW_START_DATE: import.meta.env?.VITE_SHOW_START_DATE,
      VITE_USE_SIMPLE_FORM: import.meta.env?.VITE_USE_SIMPLE_FORM,
      VITE_STYLE_VARIANT: import.meta.env?.VITE_STYLE_VARIANT,
    },
    activeVariants: {
      layout: getLayoutVariant(),
      startDateSelection: getActiveVariant('showStartDateSelection'),
      style: getStyleVariant(),
      styleLabel: getStyleVariantLabel(),
    },
    testUrls: generateStyleTestUrls(window?.location?.origin || 'http://localhost:5173')
  };
};
