import React, { useState, useEffect } from 'react';
import type { IWFStudyCommitment, StudyPreference, SubjectApproach } from '../types';
import { validateCommitment, type CommitmentValidation, isCommitmentValid } from '../utils/validation';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTheme } from '../hooks/useTheme';

interface CommitmentStepProps {
  data: IWFStudyCommitment;
  onUpdate: (updater: (prev: IWFStudyCommitment) => IWFStudyCommitment) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  forceShowErrors?: boolean;
}

interface TimeCommitmentOption {
  label: string;
  value: number;
  desc: string;
}

const timeCommitmentOptions: TimeCommitmentOption[] = [
  { label: "<2 hrs", value: 2, desc: "Casual" },
  { label: "2-4 hrs", value: 4, desc: "Part-time" },
  { label: "4-6 hrs", value: 6, desc: "Serious" },
  { label: "6-8 hrs", value: 8, desc: "Dedicated" },
  { label: "8+ hrs", value: 10, desc: "Full-time" }
];

const studyPreferenceOptions: StudyPreference[] = [
  'WeakSubjectsFirst',
  'StrongSubjectsFirst',
  'Balanced'
];

const subjectApproachOptions: SubjectApproach[] = [
  'SingleSubject',
  'DualSubject', 
  'TripleSubject'
];

const getStudyPreferenceLabel = (pref: StudyPreference): string => {
  switch (pref) {
    case 'WeakSubjectsFirst': return "Weak Subjects First";
    case 'StrongSubjectsFirst': return "Strong Subjects First";
    case 'Balanced': return "Balanced";
  }
};

const getSubjectApproachLabel = (approach: SubjectApproach): string => {
  switch (approach) {
    case 'SingleSubject': return "Single Subject";
    case 'DualSubject': return "Dual Subject";
    case 'TripleSubject': return "Triple Subject";
  }
};

export const CommitmentStep: React.FC<CommitmentStepProps> = ({ 
  data, 
  onUpdate, 
  onValidationChange, 
  forceShowErrors = false 
}) => {
  const { getClasses } = useTheme();
  const [validation, setValidation] = useState<CommitmentValidation>(() => validateCommitment(data));
  const [showErrors, setShowErrors] = useState(forceShowErrors);

  // Update validation when data changes
  useEffect(() => {
    const newValidation = validateCommitment(data);
    setValidation(newValidation);
    
    if (onValidationChange) {
      const isValid = isCommitmentValid(newValidation);
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
  
  // Show validation errors when present
  const hasErrors = showErrors && !isCommitmentValid(validation);
  const validationErrors = Object.values(validation)
    .filter(result => !result.isValid)
    .map(result => result.error!)
    .filter(Boolean);
  
  return (
    <div className="space-y-6 sm:space-y-10 max-w-4xl mx-auto p-2 sm:p-4">
      {/* Error Summary */}
      {hasErrors && (
        <div className={`mb-6 p-4 ${getClasses('errorBackground')} ${getClasses('errorBorder')} border rounded-lg shadow-sm`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <div className={`w-6 h-6 flex items-center justify-center ${getClasses('errorIcon')}`}>
                <i className="fas fa-exclamation text-xs"></i>
              </div>
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-semibold ${getClasses('errorText')}`}>
                Please complete all required fields:
              </h3>
              <ul className={`text-sm ${getClasses('errorText')} mt-2 list-disc list-inside space-y-1`}>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Time Commitment Section */}
      <div className="space-y-4">
        <div className="relative">
          <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
          <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
            <i className={`fas fa-clock mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
            Daily Study Hours <span className={getClasses('requiredIndicator')}>*</span>
          </h3>
        </div>
        <ToggleGroup
          type="single"
          value={data.timeCommitment?.toString() || ''}
          onValueChange={(value) => {
            if (value) onUpdate(prev => ({ ...prev, timeCommitment: parseInt(value, 10) }));
          }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2"
        >
          {timeCommitmentOptions.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value.toString()} aria-label={option.label} className="h-auto flex-col min-h-[60px] p-3">
              <span className="text-sm sm:text-base font-semibold">{option.label}</span>
              <span className="text-xs sm:text-sm text-muted-foreground">{option.desc}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Study Preference Section */}
      <div className="space-y-4">
        <div className="relative">
          <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
          <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
            <i className={`fas fa-chart-line mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
            Study Preference <span className={getClasses('requiredIndicator')}>*</span>
          </h3>
        </div>
        <ToggleGroup
          type="single"
          value={data.studyPreference}
          onValueChange={(value: StudyPreference | '') => {
            if (value) onUpdate(prev => ({ ...prev, studyPreference: value }));
          }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"
        >
          {studyPreferenceOptions.map((preference) => (
            <ToggleGroupItem key={preference} value={preference} aria-label={getStudyPreferenceLabel(preference)}>
              {getStudyPreferenceLabel(preference)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Subject Approach Section */}
      <div className="space-y-4">
        <div className="relative">
          <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
          <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
            <i className={`fas fa-layer-group mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
            Subject Approach <span className={getClasses('requiredIndicator')}>*</span>
          </h3>
        </div>
        <ToggleGroup
          type="single"
          value={data.subjectApproach}
          onValueChange={(value: SubjectApproach | '') => {
            if (value) onUpdate(prev => ({ ...prev, subjectApproach: value }));
          }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"
        >
          {subjectApproachOptions.map((approach) => (
            <ToggleGroupItem key={approach} value={approach} aria-label={getSubjectApproachLabel(approach)}>
              {getSubjectApproachLabel(approach)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
};

export default CommitmentStep;