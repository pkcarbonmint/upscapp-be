import React, { useState, useEffect } from 'react';
import type { IWFStudyCommitment, StudyPreference, SubjectApproach } from '../types';
import { S2WeekDay } from 'scheduler2/types';
import { validateCommitment, type CommitmentValidation, isCommitmentValid } from '../utils/validation';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTheme } from '../hooks/useTheme';
import { loadOptionalSubjects } from '../services/heliosService';
import type { Subject } from 'helios-ts';

// Helper functions for S2WeekDay enum
const dayStringToEnum = (day: string): S2WeekDay => {
  return S2WeekDay[day as keyof typeof S2WeekDay];
};

const dayEnumToString = (day: S2WeekDay): string => {
  return S2WeekDay[day];
};


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

const weeklyCatchupDayOptions = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

interface TestMinuteOption {
  label: string;
  value: number;
}

const testMinuteOptions: TestMinuteOption[] = [
    { label: "60 min", value: 60 },
    { label: "90 min", value: 90 },
    { label: "120 min", value: 120 },
    { label: "180 min", value: 180 },
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

      {/* UPSC Optional Subject Section */}
      <div className="space-y-4">
        <div className="relative">
          <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
          <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
            <i className={`fas fa-book-open mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
            UPSC Optional Subject
          </h3>
        </div>
        <div className="space-y-3">
          <select
            value={data.upscOptionalSubject || ''}
            onChange={(e) => onUpdate(prev => ({ ...prev, upscOptionalSubject: e.target.value || '' }))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Select Optional Subject (if applicable)</option>
            {upscOptionalSubjects.map((subject) => (
              <option key={subject.subjectCode} value={subject.subjectCode}>
                {subject.subjectName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Optional First Preference Section */}
      <div className="space-y-4">
        <div className="relative">
          <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
          <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
            <i className={`fas fa-star mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
            Optional Subject Priority
          </h3>
        </div>
        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.optionalFirst || false}
              onChange={(e) => onUpdate(prev => ({ ...prev, optionalFirst: e.target.checked }))}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">
              Prioritize optional subject in cycles C1, C2, C6, C7, and C8
            </span>
          </label>
          <p className="text-xs text-gray-500 ml-7">
            When checked, your optional subject will be given priority during these preparation cycles
          </p>
        </div>
      </div>

      {/* Weekly Test Day Preference Section */}
      <div className="space-y-4">
        <div className="relative">
          <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
          <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
            <i className={`fas fa-calendar-check mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
            Weekly Test Day Preference <span className={getClasses('requiredIndicator')}>*</span>
          </h3>
        </div>
        <ToggleGroup
          type="single"
          value={dayEnumToString(data.weeklyTestDayPreference)}
          onValueChange={(value) => {
            if (value) onUpdate(prev => ({ ...prev, weeklyTestDayPreference: dayStringToEnum(value) }));
          }}
          className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2"
        >
          {weeklyTestDayOptions.map((day) => (
            <ToggleGroupItem key={day} value={day} aria-label={day} className="h-auto flex-col min-h-[50px] p-2">
              <span className="text-sm font-medium">{day}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-xs text-gray-500">
          Choose your preferred day for weekly tests and assessments
        </p>
      </div>

      {/* Weekly Catch-up Day Preference Section */}
      <div className="space-y-4">
        <div className="relative">
          <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
          <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
            <i className={`fas fa-redo-alt mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
            Weekly Catch-up Day <span className={getClasses('requiredIndicator')}>*</span>
          </h3>
        </div>
        <ToggleGroup
          type="single"
          value={dayEnumToString(data.catchupDayPreference)}
          onValueChange={(value) => {
            if (value) onUpdate(prev => ({ ...prev, catchupDayPreference: dayStringToEnum(value) }));
          }}
          className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2"
        >
          {weeklyCatchupDayOptions.map((day) => (
            <ToggleGroupItem key={day} value={day} aria-label={day} className="h-auto flex-col min-h-[50px] p-2">
              <span className="text-sm font-medium">{day}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-xs text-gray-500">
          Choose a day to catch up on any pending work for the week.
        </p>
      </div>

      {/* Test Minutes Section */}
      <div className="space-y-4">
        <div className="relative">
          <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
          <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
            <i className={`fas fa-stopwatch mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
            Time for Tests <span className={getClasses('requiredIndicator')}>*</span>
          </h3>
        </div>
        <ToggleGroup
          type="single"
          value={data.testMinutes?.toString() || '180'}
          onValueChange={(value) => {
            if (value) onUpdate(prev => ({ ...prev, testMinutes: parseInt(value, 10) }));
          }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {testMinuteOptions.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value.toString()} aria-label={option.label} className="h-auto flex-col min-h-[50px] p-2">
              <span className="text-sm font-medium">{option.label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-xs text-gray-500">
          Select the duration for your weekly tests. 180 minutes is standard for a full-length UPSC paper.
        </p>
      </div>
    </div>
  );
};

export default CommitmentStep;