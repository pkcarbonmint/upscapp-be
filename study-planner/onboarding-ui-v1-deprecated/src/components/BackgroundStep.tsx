import React, { useState, useEffect } from 'react';
import { type IWFBackground } from '../types';
import { validateBackground, type BackgroundValidation, isBackgroundValid } from '../utils/validation';
import BackgroundStepSimple from './BackgroundStepSimple';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { isFeatureEnabled } from '../config/featureFlags';

interface BackgroundStepProps {
  data: IWFBackground;
  onUpdate: (updater: (prev: IWFBackground) => IWFBackground) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  forceShowErrors?: boolean;
}

interface InlineInputProps {
  tabIndex: number;
  autoFocus?: boolean;
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  errorMessage?: string;
}

const InlineInput: React.FC<InlineInputProps> = ({ 
  tabIndex, 
  autoFocus = false, 
  id, 
  placeholder, 
  value, 
  onChange,
  hasError = false,
  errorMessage
}) => (
  <span className="relative inline-block">
    <input
      className={cn(
        "inline-block w-auto mx-1 rounded-md border border-input bg-transparent px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        hasError && "border-destructive text-destructive focus-visible:ring-destructive"
      )}
      id={id}
      name={id}
      type="text"
      placeholder={placeholder}
      value={value}
      tabIndex={tabIndex}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      title={hasError ? errorMessage : undefined}
    />
    {hasError && errorMessage && (
      <div className="absolute top-full left-0 mt-1 text-xs sm:text-sm text-destructive whitespace-nowrap z-10 bg-background border border-destructive px-2 py-2 rounded shadow-sm max-w-xs">
        {errorMessage}
      </div>
    )}
  </span>
);

interface InlineYearProps {
  tabIndex: number;
  id: string;
  placeholder: string;
  value: number;
  onChange: (value: number) => void;
  hasError?: boolean;
  errorMessage?: string;
}

const InlineYear: React.FC<InlineYearProps> = ({ 
  tabIndex, 
  id, 
  placeholder, 
  value, 
  onChange,
  hasError = false,
  errorMessage
}) => (
  <span className="relative inline-block">
    <input
      className={cn(
        "inline-block w-20 mx-1 rounded-md border border-input bg-transparent px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        hasError && "border-destructive text-destructive focus-visible:ring-destructive"
      )}
      id={id}
      name={id}
      type="text"
      placeholder={placeholder}
      value={value.toString()}
      tabIndex={tabIndex}
      onChange={(e) => {
        const parsed = parseInt(e.target.value);
        if (!isNaN(parsed)) {
          onChange(parsed);
        }
      }}
      title={hasError ? errorMessage : undefined}
    />
    {hasError && errorMessage && (
      <div className="absolute top-full left-0 mt-1 text-xs sm:text-sm text-destructive whitespace-nowrap z-10 bg-background border border-destructive px-2 py-2 rounded shadow-sm max-w-xs">
        {errorMessage}
      </div>
    )}
  </span>
);

const isSimpleOne = isFeatureEnabled('useSimpleFormLayout');
export const BackgroundStep: React.FC<BackgroundStepProps> = ({ data, onUpdate, onValidationChange, forceShowErrors = false }) => {
  // Check feature flag to determine which layout to use
  if (isSimpleOne) {
  return (
      <BackgroundStepSimple
        data={data}
        onUpdate={onUpdate}
        onValidationChange={onValidationChange}
        forceShowErrors={forceShowErrors}
      />
    );
  }
  // Original inline layout implementation
  const [validation, setValidation] = useState<BackgroundValidation>(() => validateBackground(data));
  const [showErrors, setShowErrors] = useState(forceShowErrors);

  // Update validation when data changes
  useEffect(() => {
    const newValidation = validateBackground(data);
    setValidation(newValidation);
    
    if (onValidationChange) {
      const isValid = isBackgroundValid(newValidation);
      const errors = Object.values(newValidation)
        .filter(result => !result.isValid)
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

  // Show errors when user tries to navigate or after first interaction
  const handleBlur = () => {
    setShowErrors(true);
  };

  return (
    <div className="p-2 max-w-4xl mx-auto">
      <div className="space-y-6"></div>
      <form className="space-y-6" onBlur={handleBlur}>
        <div className="prose max-w-none text-gray-800">
          <span>I am </span>
          <InlineInput
            tabIndex={1}
            autoFocus={true}
            id="fullName"
            placeholder="Your full name"
            value={data.fullName}
            onChange={(val) => onUpdate(m => ({ ...m, fullName: val }))}
            hasError={showErrors && !validation.fullName.isValid}
            errorMessage={validation.fullName.error}
          />
          <span>, my phone number is: </span>
          <InlineInput
            tabIndex={2}
            id="phoneNumber"
            placeholder="+91..."
            value={data.phoneNumber}
            onChange={(val) => onUpdate(m => ({ ...m, phoneNumber: val }))}
            hasError={showErrors && !validation.phoneNumber.isValid}
            errorMessage={validation.phoneNumber.error}
          />
          <span> and my email address is </span>
          <InlineInput
            tabIndex={3}
            id="email"
            placeholder="name@example.com"
            value={data.email}
            onChange={(val) => onUpdate(m => ({ ...m, email: val }))}
            hasError={showErrors && !validation.email.isValid}
            errorMessage={validation.email.error}
          />
          <span>. I live in </span>
          <InlineInput
            tabIndex={4}
            id="presentLocation"
            placeholder="City, State"
            value={data.presentLocation}
            onChange={(val) => onUpdate(m => ({ ...m, presentLocation: val }))}
            hasError={showErrors && !validation.presentLocation.isValid}
            errorMessage={validation.presentLocation.error}
          />
          <span>. I am studying/studied </span>
          <InlineInput
            tabIndex={5}
            id="graduationStream"
            placeholder="e.g., Engineering, Arts"
            value={data.graduationStream}
            onChange={(val) => onUpdate(m => ({ ...m, graduationStream: val }))}
            hasError={showErrors && !validation.graduationStream.isValid}
            errorMessage={validation.graduationStream.error}
          />
          <span> from </span>
          <InlineInput
            tabIndex={6}
            id="collegeUniversity"
            placeholder="e.g., Delhi University"
            value={data.collegeUniversity}
            onChange={(val) => onUpdate(m => ({ ...m, collegeUniversity: val }))}
            hasError={showErrors && !validation.collegeUniversity.isValid}
            errorMessage={validation.collegeUniversity.error}
          />
          <span>. I have graduated (or will graduate) in </span>
          <InlineYear
            tabIndex={7}
            id="yearOfPassing"
            placeholder="2024"
            value={data.yearOfPassing}
            onChange={(val) => onUpdate(m => ({ ...m, yearOfPassing: val }))}
            hasError={showErrors && !validation.yearOfPassing.isValid}
            errorMessage={validation.yearOfPassing.error}
          />
          <span>.</span>
        </div>
        
        <div className="mt-6">
          <label htmlFor="about" className="block text-gray-700 text-sm font-semibold mb-2">
            Here is a little more about myself
          </label>
          <Textarea
            id="about"
            placeholder="Be witty, funny, bold — tell us a bit about yourself"
            rows={4}
            value={data.about}
            onChange={(e) => onUpdate(m => ({ ...m, about: e.target.value }))}
            className={cn(
                (showErrors && !validation.about.isValid) && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {showErrors && !validation.about.isValid && validation.about.error && (
            <p className="text-sm font-medium text-destructive mt-1">
              {validation.about.error}
            </p>
          )}
          <div className="text-xs sm:text-sm text-gray-500 mt-2">
            Tip: Use Tab / Shift+Tab to jump between blanks above.
          </div>
        </div>
      </form>
    </div>
  );
};

export default BackgroundStep;