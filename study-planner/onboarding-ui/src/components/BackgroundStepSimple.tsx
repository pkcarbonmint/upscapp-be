import React, { useState, useEffect } from 'react';
import { type IWFBackground } from '../types';
import { validateBackground, type BackgroundValidation, isBackgroundValid } from '../utils/validation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '../hooks/useTheme';
import { useFormTracking } from '../hooks/useAnalytics';

interface BackgroundStepSimpleProps {
  data: IWFBackground;
  onUpdate: (updater: (prev: IWFBackground) => IWFBackground) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  forceShowErrors?: boolean;
}

export const BackgroundStepSimple: React.FC<BackgroundStepSimpleProps> = ({ 
  data, 
  onUpdate, 
  onValidationChange, 
  forceShowErrors = false 
}) => {
  const [validation, setValidation] = useState<BackgroundValidation>(() => validateBackground(data));
  const [showErrors, setShowErrors] = useState(forceShowErrors);
  const { getClasses } = useTheme();
  const { trackFieldFocus, trackFieldChange } = useFormTracking('Background');

  // Update validation when data changes
  useEffect(() => {
    const newValidation = validateBackground(data);
    setValidation(newValidation);
    
    if (onValidationChange) {
      const isValid = isBackgroundValid(newValidation);
      // Filter out "required" field errors for display
      const errors = Object.values(newValidation)
        .filter(result => !result.isValid && result.error && !result.error.includes('is required'))
        .map(result => result.error!)
        .filter(Boolean);
      onValidationChange(isValid, errors);
    }
  }, [data, onValidationChange]);

  // Update showErrors when forceShowErrors changes
  useEffect(() => {
    if (forceShowErrors) {
      setShowErrors(true);
    }
  }, [forceShowErrors]);

  // Only show errors when explicitly forced (e.g., form submission)
  // Removed aggressive error showing on blur

  // Get only non-required field errors for display
  const getDisplayErrors = () => {
    return Object.values(validation)
      .filter(result => !result.isValid && result.error && !result.error.includes('is required'))
      .map(result => result.error!)
      .filter(Boolean);
  };

  return (
    <div className="max-w-2xl mx-auto p-2 sm:p-6">
      {/* Theme-based container */}
      <div className={`${getClasses('cardBackground')} ${getClasses('cardBorder')} ${getClasses('cardShadow')} rounded-xl border p-3 sm:p-6`}>
        {/* Error Summary */}
        {showErrors && getDisplayErrors().length > 0 && (
          <div className={`mb-6 p-4 ${getClasses('errorBackground')} ${getClasses('errorBorder')} border rounded-lg shadow-sm`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <div className={`w-6 h-6 flex items-center justify-center ${getClasses('errorIcon')}`}>
                  <i className="fas fa-exclamation text-xs"></i>
                </div>
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-semibold ${getClasses('errorText')}`}>
                  Please fix the following issues:
                </h3>
                <ul className={`text-sm ${getClasses('errorText')} mt-2 list-disc list-inside space-y-1`}>
                  {getDisplayErrors().map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        <form className="space-y-6">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <div className="relative">
              <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
              <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
                <i className={`fas fa-user mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
                Personal Information
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className={getClasses('labelText')}>Full Name <span className={getClasses('requiredIndicator')}>*</span></Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={data.fullName}
                  onChange={(e) => {
                    onUpdate(m => ({ ...m, fullName: e.target.value }))
                    trackFieldChange('fullName')
                  }}
                  onFocus={() => trackFieldFocus('fullName')}
                  className={`${getClasses('inputBackground')} ${getClasses('inputBorder')} ${getClasses('inputFocus')} ${getClasses('inputShadow')}`}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="presentLocation" className={getClasses('labelText')}>Current Location <span className={getClasses('requiredIndicator')}>*</span></Label>
                <Input
                  id="presentLocation"
                  placeholder="City, State"
                  value={data.presentLocation}
                  onChange={(e) => onUpdate(m => ({ ...m, presentLocation: e.target.value }))}
                  className={`${getClasses('inputBackground')} ${getClasses('inputBorder')} ${getClasses('inputFocus')} ${getClasses('inputShadow')}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className={getClasses('labelText')}>Email Address <span className={getClasses('requiredIndicator')}>*</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={data.email}
                  onChange={(e) => onUpdate(m => ({ ...m, email: e.target.value }))}
                  className={`${getClasses('inputBackground')} ${getClasses('inputBorder')} ${getClasses('inputFocus')} ${getClasses('inputShadow')}`}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className={getClasses('labelText')}>Phone Number <span className={getClasses('requiredIndicator')}>*</span></Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={data.phoneNumber}
                  onChange={(e) => onUpdate(m => ({ ...m, phoneNumber: e.target.value }))}
                  className={`${getClasses('inputBackground')} ${getClasses('inputBorder')} ${getClasses('inputFocus')} ${getClasses('inputShadow')}`}
                />
              </div>
            </div>
          </div>

          {/* Educational Background Section */}
          <div className="space-y-4">
            <div className="relative">
              <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
              <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
                <i className={`fas fa-graduation-cap mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
                Educational Background
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="graduationStream" className={getClasses('labelText')}>Graduation Stream <span className={getClasses('requiredIndicator')}>*</span></Label>
                <Input
                  id="graduationStream"
                  placeholder="e.g., Engineering, Arts, Commerce"
                  value={data.graduationStream}
                  onChange={(e) => onUpdate(m => ({ ...m, graduationStream: e.target.value }))}
                  className={`${getClasses('inputBackground')} ${getClasses('inputBorder')} ${getClasses('inputFocus')} ${getClasses('inputShadow')}`}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="collegeUniversity" className={getClasses('labelText')}>College/University <span className={getClasses('requiredIndicator')}>*</span></Label>
                <Input
                  id="collegeUniversity"
                  placeholder="e.g., Delhi University"
                  value={data.collegeUniversity}
                  onChange={(e) => onUpdate(m => ({ ...m, collegeUniversity: e.target.value }))}
                  className={`${getClasses('inputBackground')} ${getClasses('inputBorder')} ${getClasses('inputFocus')} ${getClasses('inputShadow')}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearOfPassing" className={getClasses('labelText')}>Year of Passing <span className={getClasses('requiredIndicator')}>*</span></Label>
                <Input
                  id="yearOfPassing"
                  type="number"
                  placeholder="2024"
                  value={data.yearOfPassing}
                  onChange={(e) => onUpdate(m => ({ ...m, yearOfPassing: parseInt(e.target.value) || 0 }))}
                  className={`${getClasses('inputBackground')} ${getClasses('inputBorder')} ${getClasses('inputFocus')} ${getClasses('inputShadow')}`}
                />
              </div>
              <div></div> {/* Empty div for grid alignment */}
            </div>
          </div>

          {/* About Section */}
          <div className="space-y-4">
            <div className="relative">
              <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
              <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
                <i className={`fas fa-heart mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
                A little more about yourself...
              </h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="about" className={getClasses('labelText')}>Tell us about yourself <span className={getClasses('requiredIndicator')}>*</span></Label>
              <Textarea
                id="about"
                placeholder="Share your background, interests, and what motivates you to pursue UPSC..."
                value={data.about}
                onChange={(e) => onUpdate(m => ({ ...m, about: e.target.value }))}
                className={`${getClasses('inputBackground')} ${getClasses('inputBorder')} ${getClasses('inputFocus')} ${getClasses('inputShadow')} min-h-[100px]`}
              />
            </div>
          </div>

          {/* Success Message */}
          {isBackgroundValid(validation) && showErrors && (
            <div className={`mt-6 p-4 ${getClasses('successBackground')} ${getClasses('successBorder')} border rounded-lg shadow-sm`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 flex items-center justify-center ${getClasses('successIcon')}`}>
                    <i className="fas fa-check text-sm"></i>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-semibold ${getClasses('successText')}`}>
                    🎉 All fields completed successfully!
                  </h3>
                  <p className={`text-sm ${getClasses('successText')} mt-1`}>
                    You can now proceed to the next step with confidence.
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default BackgroundStepSimple;