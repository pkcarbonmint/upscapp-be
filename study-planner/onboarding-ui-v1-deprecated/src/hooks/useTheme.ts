// Hook for accessing theme configuration based on current style variant
import { useMemo } from 'react';
import { getStyleVariant } from '../config/featureFlags';
import { getCurrentTheme, getThemeClasses, type ThemeConfig } from '../styles/themes';
import type { StyleVariant } from '../config/featureFlags';

export interface UseThemeReturn {
  variant: StyleVariant;
  theme: ThemeConfig;
  getClasses: (element: keyof ThemeConfig) => string;
  isA: boolean;
  isB: boolean;
  isC: boolean;
}

export const useTheme = (): UseThemeReturn => {
  const variant = getStyleVariant();
  
  const theme = useMemo(() => getCurrentTheme(variant), [variant]);
  
  const getClasses = useMemo(() => 
    (element: keyof ThemeConfig) => getThemeClasses(variant, element),
    [variant]
  );
  
  return {
    variant,
    theme,
    getClasses,
    isA: variant === 'A',
    isB: variant === 'B',
    isC: variant === 'C',
  };
};

// Convenience hook for specific theme elements
export const useThemeClasses = (element: keyof ThemeConfig): string => {
  const { getClasses } = useTheme();
  return getClasses(element);
};

// Hook for conditional theme-based rendering
export const useThemeConditional = <T>(options: {
  A?: T;
  B?: T;
  C?: T;
  default?: T;
}): T | undefined => {
  const { variant } = useTheme();
  
  return options[variant] ?? options.default;
};
