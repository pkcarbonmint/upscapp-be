import React, { useState, useEffect } from 'react';
import type { IWFStudyCommitment, StudyPreference, SubjectApproach } from '../types';
import { validateCommitment, type CommitmentValidation, isCommitmentValid } from '../utils/validation';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTheme } from '../hooks/useTheme';
import { loadOptionalSubjects } from '../services/heliosService';
import type { Subject } from 'helios-ts';

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

// UPSC Optional Subject options will be loaded dynamically

// Weekly test day options
const weeklyTestDayOptions = [
  'Sunday',
  'Monday', 
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
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
  const [upscOptionalSubjects, setUpscOptionalSubjects] = useState<Subject[]>([]);

  // Load optional subjects on component mount
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const subjects = await loadOptionalSubjects();
        // Store the full Subject objects - we'll use subjectCode for server communication
        setUpscOptionalSubjects(subjects);
      } catch (error) {
        console.error('Failed to load optional subjects:', error);
        // Fallback to empty array or default list if needed
        setUpscOptionalSubjects([]);
      }
    };
    
    loadSubjects();
  }, []);

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
    <div className="space-y-4 max-w-4xl mx-auto p-2 sm:p-4">
      {/* Error Summary - Compact */}
      {hasErrors && (
        <div className={`mb-4 p-3 ${getClasses('errorBackground')} ${getClasses('errorBorder')} border rounded-md`}>
          <div className="flex items-start">
            <i className={`fas fa-exclamation-triangle mr-2 mt-0.5 text-sm ${getClasses('errorIcon')}`}></i>
            <div>
              <p className={`text-sm font-medium ${getClasses('errorText')} mb-1`}>
                Please complete required fields:
              </p>
              <ul className={`text-xs ${getClasses('errorText')} list-disc list-inside space-y-0.5`}>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Time Commitment Section - Compact */}
      <div className="space-y-2">
        <h3 className={`text-sm font-semibold ${getClasses('sectionHeader')} flex items-center`}>
          <i className={`fas fa-clock mr-2 text-xs ${getClasses('sectionHeaderIcon')}`}></i>
          Daily Study Hours <span className={getClasses('requiredIndicator')}>*</span>
        </h3>
        <ToggleGroup
          type="single"
          value={data.timeCommitment?.toString() || ''}
          onValueChange={(value) => {
            if (value) onUpdate(prev => ({ ...prev, timeCommitment: parseInt(value, 10) }));
          }}
          className="grid grid-cols-3 sm:grid-cols-5 gap-1.5"
        >
          {timeCommitmentOptions.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value.toString()} aria-label={option.label} className="h-auto flex-col min-h-[45px] p-2 text-center">
              <span className="text-xs font-semibold">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.desc}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Study Preference Section - Compact */}
      <div className="space-y-2">
        <h3 className={`text-sm font-semibold ${getClasses('sectionHeader')} flex items-center`}>
          <i className={`fas fa-chart-line mr-2 text-xs ${getClasses('sectionHeaderIcon')}`}></i>
          Study Preference <span className={getClasses('requiredIndicator')}>*</span>
        </h3>
        <ToggleGroup
          type="single"
          value={data.studyPreference}
          onValueChange={(value: StudyPreference | '') => {
            if (value) onUpdate(prev => ({ ...prev, studyPreference: value }));
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-1.5"
        >
          {studyPreferenceOptions.map((preference) => (
            <ToggleGroupItem key={preference} value={preference} aria-label={getStudyPreferenceLabel(preference)} className="py-2 px-3 text-sm">
              {getStudyPreferenceLabel(preference)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Subject Approach Section - Compact */}
      <div className="space-y-2">
        <h3 className={`text-sm font-semibold ${getClasses('sectionHeader')} flex items-center`}>
          <i className={`fas fa-layer-group mr-2 text-xs ${getClasses('sectionHeaderIcon')}`}></i>
          Subject Approach <span className={getClasses('requiredIndicator')}>*</span>
        </h3>
        <ToggleGroup
          type="single"
          value={data.subjectApproach}
          onValueChange={(value: SubjectApproach | '') => {
            if (value) onUpdate(prev => ({ ...prev, subjectApproach: value }));
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-1.5"
        >
          {subjectApproachOptions.map((approach) => (
            <ToggleGroupItem key={approach} value={approach} aria-label={getSubjectApproachLabel(approach)} className="py-2 px-3 text-sm">
              {getSubjectApproachLabel(approach)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* UPSC Optional Subject Section - Compact */}
      <div className="space-y-2">
        <h3 className={`text-sm font-semibold ${getClasses('sectionHeader')} flex items-center`}>
          <i className={`fas fa-book-open mr-2 text-xs ${getClasses('sectionHeaderIcon')}`}></i>
          UPSC Optional Subject
        </h3>
        <select
          value={data.upscOptionalSubject || ''}
          onChange={(e) => onUpdate(prev => ({ ...prev, upscOptionalSubject: e.target.value || '' }))}
          className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="">Select Optional Subject (if applicable)</option>
          {upscOptionalSubjects.map((subject) => (
            <option key={subject.subjectCode} value={subject.subjectCode}>
              {subject.subjectName}
            </option>
          ))}
        </select>
      </div>

      {/* Optional First Preference Section - Compact */}
      <div className="space-y-2">
        <h3 className={`text-sm font-semibold ${getClasses('sectionHeader')} flex items-center`}>
          <i className={`fas fa-star mr-2 text-xs ${getClasses('sectionHeaderIcon')}`}></i>
          Optional Subject Priority
        </h3>
        <label className="flex items-start space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.optionalFirst || false}
            onChange={(e) => onUpdate(prev => ({ ...prev, optionalFirst: e.target.checked }))}
            className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <div>
            <span className="text-sm text-gray-700">
              Prioritize optional subject in cycles C1, C2, C6, C7, and C8
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              Priority during these preparation cycles
            </p>
          </div>
        </label>
      </div>

      {/* Weekly Test Day Preference Section - Compact */}
      <div className="space-y-2">
        <h3 className={`text-sm font-semibold ${getClasses('sectionHeader')} flex items-center`}>
          <i className={`fas fa-calendar-check mr-2 text-xs ${getClasses('sectionHeaderIcon')}`}></i>
          Weekly Test Day
        </h3>
        <ToggleGroup
          type="single"
          value={data.weeklyTestDayPreference || 'Sunday'}
          onValueChange={(value) => {
            if (value) onUpdate(prev => ({ ...prev, weeklyTestDayPreference: value }));
          }}
          className="grid grid-cols-4 sm:grid-cols-7 gap-1"
        >
          {weeklyTestDayOptions.map((day) => (
            <ToggleGroupItem key={day} value={day} aria-label={day} className="h-auto min-h-[36px] p-1.5 text-center">
              <span className="text-xs font-medium">{day.slice(0, 3)}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-xs text-gray-500">
          Preferred day for weekly tests
        </p>
      </div>
    </div>
  );
};

export default CommitmentStep;