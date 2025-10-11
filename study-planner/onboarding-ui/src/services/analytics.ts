// Google Analytics 4 (GA4) service for A/B/C theme testing
import { getStyleVariant, getStyleVariantLabel } from '../config/featureFlags';

// Google Analytics 4 types
interface GAEvent {
  event_name: string;
  [key: string]: any;
}

interface GAConfig {
  page_title?: string;
  page_location?: string;
  custom_map?: Record<string, string>;
}

// Custom event types for theme testing
interface ThemeEvent {
  theme_variant: 'A' | 'B' | 'C';
  theme_label: string;
  step?: string;
  form_field?: string;
  interaction_type?: 'click' | 'focus' | 'submit' | 'error' | 'success';
  error_message?: string;
  completion_time?: number;
  from_theme?: string;
  to_theme?: string;
  conversion_type?: string;
  conversion_value?: number;
  engagement_action?: string;
  engagement_category?: string;
}

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

class AnalyticsService {
  private isInitialized = false;
  private measurementId: string | null = null;

  /**
   * Initialize Google Analytics 4
   * @param measurementId - Your GA4 Measurement ID (e.g., 'G-XXXXXXXXXX')
   */
  initialize(measurementId: string): void {
    if (this.isInitialized) return;

    this.measurementId = measurementId;

    // Load Google Analytics script
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script1);

    // Initialize dataLayer and gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    // Configure GA4
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      // Enhanced measurement for better tracking
      enhanced_measurement_events: true,
      // Custom parameters for theme testing
      custom_map: {
        custom_parameter_1: 'theme_variant',
        custom_parameter_2: 'theme_label'
      }
    });

    this.isInitialized = true;
    console.log('Google Analytics initialized:', measurementId);
  }

  /**
   * Track page views with theme context
   */
  trackPageView(page?: string): void {
    if (!this.isInitialized) return;

    const theme = getStyleVariant();
    const themeLabel = getStyleVariantLabel();

    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: page || window.location.pathname,
      theme_variant: theme,
      theme_label: themeLabel,
      custom_parameter_1: theme,
      custom_parameter_2: themeLabel
    });
  }

  /**
   * Track theme-specific events
   */
  trackThemeEvent(eventName: string, properties: Partial<ThemeEvent> & Record<string, any> = {}): void {
    if (!this.isInitialized) return;

    const theme = getStyleVariant();
    const themeLabel = getStyleVariantLabel();

    const eventData: ThemeEvent & GAEvent & Record<string, any> = {
      event_name: eventName,
      theme_variant: theme,
      theme_label: themeLabel,
      ...properties
    };

    window.gtag('event', eventName, eventData);
  }

  /**
   * Track form interactions by step
   */
  trackFormInteraction(step: string, action: string, field?: string): void {
    this.trackThemeEvent('form_interaction', {
      step,
      interaction_type: action as any,
      form_field: field
    });
  }

  /**
   * Track form completion by step
   */
  trackStepCompletion(step: string, timeSpent?: number): void {
    this.trackThemeEvent('step_completed', {
      step,
      completion_time: timeSpent
    });
  }

  /**
   * Track form errors
   */
  trackFormError(step: string, errorMessage: string, field?: string): void {
    this.trackThemeEvent('form_error', {
      step,
      error_message: errorMessage,
      form_field: field,
      interaction_type: 'error'
    });
  }

  /**
   * Track successful form submission
   */
  trackFormSuccess(step: string, timeSpent?: number): void {
    this.trackThemeEvent('form_success', {
      step,
      completion_time: timeSpent,
      interaction_type: 'success'
    });
  }

  /**
   * Track theme switches (for debugging/testing)
   */
  trackThemeSwitch(fromTheme: string, toTheme: string): void {
    this.trackThemeEvent('theme_switched', {
      theme_variant: toTheme as any,
      from_theme: fromTheme,
      interaction_type: 'click'
    });
  }

  /**
   * Track conversion events
   */
  trackConversion(conversionType: string, value?: number): void {
    this.trackThemeEvent('conversion', {
      conversion_type: conversionType,
      conversion_value: value,
      interaction_type: 'submit'
    });
  }

  /**
   * Track user engagement metrics
   */
  trackEngagement(action: string, category: string = 'engagement'): void {
    this.trackThemeEvent('engagement', {
      engagement_action: action,
      engagement_category: category,
      interaction_type: 'click'
    });
  }

  /**
   * Set user properties (for segmentation)
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.isInitialized) return;

    window.gtag('config', this.measurementId!, {
      custom_map: {
        ...properties,
        theme_variant: getStyleVariant(),
        theme_label: getStyleVariantLabel()
      }
    });
  }

  /**
   * Track custom events
   */
  track(eventName: string, properties: Record<string, any> = {}): void {
    if (!this.isInitialized) return;

    const theme = getStyleVariant();
    
    window.gtag('event', eventName, {
      ...properties,
      theme_variant: theme,
      theme_label: getStyleVariantLabel(theme)
    });
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Export types for use in components
export type { ThemeEvent, GAEvent, GAConfig };

// Helper function to initialize analytics (call this in your App.tsx)
export const initializeAnalytics = (measurementId: string) => {
  analytics.initialize(measurementId);
};
