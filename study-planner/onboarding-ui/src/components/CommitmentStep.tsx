import React from 'react';
import type { IWFStudyCommitment, StudyPreference, SubjectApproach } from '../types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTheme } from '../hooks/useTheme';

interface CommitmentStepProps {
  data: IWFStudyCommitment;
  onUpdate: (updater: (prev: IWFStudyCommitment) => IWFStudyCommitment) => void;
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

export const CommitmentStep: React.FC<CommitmentStepProps> = ({ data, onUpdate }) => {
  const { getClasses } = useTheme();
  
  return (
    <div className="space-y-6 sm:space-y-10 max-w-4xl mx-auto p-2 sm:p-4">
      {/* Time Commitment Section */}
      <div className="space-y-4">
        <div className="relative">
          <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
          <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
            <i className={`fas fa-clock mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
            Daily Study Hours
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
            Study Preference
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
            Subject Approach
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