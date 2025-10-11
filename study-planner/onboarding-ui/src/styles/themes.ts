// Theme system for A/B/C testing different UI styles
import type { StyleVariant } from '../config/featureFlags';

export interface ThemeConfig {
  // Background styles
  pageBackground: string;
  cardBackground: string;
  cardBorder: string;
  cardShadow: string;
  
  // Header styles
  headerBackground: string;
  headerBorder: string;
  headerTitle: string;
  headerSubtitle: string;
  
  // Section headers
  sectionHeader: string;
  sectionHeaderIcon: string;
  sectionHeaderBackground: string;
  
  // Form elements
  inputBackground: string;
  inputBorder: string;
  inputFocus: string;
  inputShadow: string;
  labelText: string;
  requiredIndicator: string;
  
  // Messages
  errorBackground: string;
  errorBorder: string;
  errorIcon: string;
  errorText: string;
  successBackground: string;
  successBorder: string;
  successIcon: string;
  successText: string;
  
  // Buttons and interactive elements
  primaryButton: string;
  primaryButtonHover: string;
  secondaryButton: string;
  secondaryButtonHover: string;
}

// Theme A - Classic clean design
export const themeA: ThemeConfig = {
  // Background styles
  pageBackground: 'bg-gray-50',
  cardBackground: 'bg-white',
  cardBorder: 'border-gray-200',
  cardShadow: 'shadow-sm',
  
  // Header styles
  headerBackground: 'bg-white',
  headerBorder: 'border-gray-200',
  headerTitle: 'text-gray-900',
  headerSubtitle: 'text-gray-600',
  
  // Section headers
  sectionHeader: 'text-gray-900 border-b border-gray-200',
  sectionHeaderIcon: 'text-gray-500',
  sectionHeaderBackground: '',
  
  // Form elements
  inputBackground: 'bg-white',
  inputBorder: 'border-gray-300',
  inputFocus: 'focus:border-gray-500 focus:ring-gray-500/20',
  inputShadow: '',
  labelText: 'text-gray-700',
  requiredIndicator: 'text-red-500',
  
  // Messages
  errorBackground: 'bg-red-50',
  errorBorder: 'border-red-200',
  errorIcon: 'text-red-400',
  errorText: 'text-red-800',
  successBackground: 'bg-green-50',
  successBorder: 'border-green-200',
  successIcon: 'text-green-400',
  successText: 'text-green-800',
  
  // Buttons and interactive elements
  primaryButton: 'bg-blue-600 hover:bg-blue-700 text-white',
  primaryButtonHover: 'hover:bg-blue-700',
  secondaryButton: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
  secondaryButtonHover: 'hover:bg-gray-200',
};

// Theme B - Modern blue/purple gradients with enhanced styling
export const themeB: ThemeConfig = {
  // Background styles
  pageBackground: 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50',
  cardBackground: 'bg-gradient-to-br from-white/90 via-white/95 to-white/90 backdrop-blur-sm',
  cardBorder: 'border-white/20',
  cardShadow: 'shadow-xl',
  
  // Header styles
  headerBackground: 'bg-white/80 backdrop-blur-sm',
  headerBorder: 'border-white/20',
  headerTitle: 'text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-blue-700 to-indigo-700',
  headerSubtitle: 'text-slate-600',
  
  // Section headers
  sectionHeader: 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600',
  sectionHeaderIcon: 'text-blue-500',
  sectionHeaderBackground: 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg',
  
  // Form elements
  inputBackground: 'bg-white/80',
  inputBorder: 'border-slate-200',
  inputFocus: 'focus:border-blue-400 focus:ring-blue-400/20',
  inputShadow: 'shadow-sm hover:shadow-md transition-shadow duration-200',
  labelText: 'text-slate-700 font-medium',
  requiredIndicator: 'text-rose-500 font-semibold',
  
  // Messages
  errorBackground: 'bg-gradient-to-r from-red-50 to-rose-50',
  errorBorder: 'border-red-200/50',
  errorIcon: 'bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-full',
  errorText: 'text-red-800',
  successBackground: 'bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50',
  successBorder: 'border-emerald-200/50',
  successIcon: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full',
  successText: 'text-emerald-800',
  
  // Buttons and interactive elements
  primaryButton: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg',
  primaryButtonHover: 'hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200',
  secondaryButton: 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200 shadow-sm',
  secondaryButtonHover: 'hover:shadow-md transform hover:scale-[1.01] transition-all duration-200',
};

// Theme C - Premium rich colors with glass morphism and luxury effects
export const themeC: ThemeConfig = {
  // Background styles
  pageBackground: 'bg-gradient-to-br from-purple-900/5 via-rose-50/30 through-amber-50/20 to-emerald-50/40',
  cardBackground: 'bg-gradient-to-br from-white/95 via-purple-50/30 to-rose-50/20 backdrop-blur-lg',
  cardBorder: 'border-gradient-to-r from-purple-200/30 via-rose-200/30 to-amber-200/30',
  cardShadow: 'shadow-2xl shadow-purple-500/10',
  
  // Header styles
  headerBackground: 'bg-gradient-to-r from-purple-600/90 via-rose-500/90 to-amber-500/90 backdrop-blur-lg',
  headerBorder: 'border-white/30',
  headerTitle: 'text-white font-bold',
  headerSubtitle: 'text-white/80',
  
  // Section headers
  sectionHeader: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-rose-500 to-amber-500',
  sectionHeaderIcon: 'text-purple-500',
  sectionHeaderBackground: 'bg-gradient-to-r from-purple-500/15 via-rose-500/10 to-amber-500/15 rounded-xl',
  
  // Form elements
  inputBackground: 'bg-white/90 backdrop-blur-sm',
  inputBorder: 'border-purple-200/50',
  inputFocus: 'focus:border-purple-400 focus:ring-purple-400/30',
  inputShadow: 'shadow-lg hover:shadow-xl transition-all duration-300',
  labelText: 'text-slate-800 font-semibold',
  requiredIndicator: 'text-rose-600 font-bold',
  
  // Messages
  errorBackground: 'bg-gradient-to-r from-red-100/80 via-rose-100/80 to-pink-100/80 backdrop-blur-sm',
  errorBorder: 'border-red-300/50',
  errorIcon: 'bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-full shadow-lg',
  errorText: 'text-red-900 font-medium',
  successBackground: 'bg-gradient-to-r from-emerald-100/80 via-green-100/80 to-teal-100/80 backdrop-blur-sm',
  successBorder: 'border-emerald-300/50',
  successIcon: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full shadow-lg',
  successText: 'text-emerald-900 font-medium',
  
  // Buttons and interactive elements
  primaryButton: 'bg-gradient-to-r from-purple-600 via-rose-500 to-amber-500 hover:from-purple-700 hover:via-rose-600 hover:to-amber-600 text-white shadow-xl',
  primaryButtonHover: 'hover:shadow-2xl transform hover:scale-[1.03] transition-all duration-300',
  secondaryButton: 'bg-white/90 hover:bg-white text-slate-800 border border-purple-200/50 shadow-lg backdrop-blur-sm',
  secondaryButtonHover: 'hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300',
};

// Theme registry
export const themes: Record<StyleVariant, ThemeConfig> = {
  A: themeA,
  B: themeB,
  C: themeC,
};

// Helper function to get current theme
export const getCurrentTheme = (variant: StyleVariant): ThemeConfig => {
  return themes[variant] || themeB;
};

// Helper function to get theme classes for a specific element type
export const getThemeClasses = (
  variant: StyleVariant,
  element: keyof ThemeConfig
): string => {
  const theme = getCurrentTheme(variant);
  return theme[element] || '';
};
