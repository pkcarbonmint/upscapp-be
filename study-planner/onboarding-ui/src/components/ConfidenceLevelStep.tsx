import React, { useState, useEffect } from 'react';
import type { IWFConfidenceLevelAssessment } from '../types';
import type { ConfidenceLevel } from 'helios-ts';
import type { Subject } from 'helios-ts';
import { useTheme } from '../hooks/useTheme';

interface ConfidenceLevelStepProps {
  data: IWFConfidenceLevelAssessment;
  onUpdate: (updater: (prev: IWFConfidenceLevelAssessment) => IWFConfidenceLevelAssessment) => void;
}

interface SubjectGroup {
  name: string;
  subjects: Subject[];
  description: string;
}

// Map helios-ts confidence levels to UI-friendly labels
const confidenceLevelLabels: Record<ConfidenceLevel, string> = {
  'NotStarted': 'Not Started',
  'VeryWeak': 'Very Weak',
  'Weak': 'Weak',
  'Moderate': 'Moderate',
  'Strong': 'Strong',
  'VeryStrong': 'Very Strong'
};

// Map confidence levels to numbers for slider (5-point scale, excluding NotStarted)
const confidenceToNumber = (level: ConfidenceLevel): number => {
  switch (level) {
    case 'NotStarted': return 1; // Default fallback
    case 'VeryWeak': return 1;
    case 'Weak': return 2;
    case 'Moderate': return 3;
    case 'Strong': return 4;
    case 'VeryStrong': return 5;
    default: return 3;
  }
};

const numberToConfidence = (num: number): ConfidenceLevel => {
  switch (num) {
    case 1: return 'VeryWeak';
    case 2: return 'Weak';
    case 3: return 'Moderate';
    case 4: return 'Strong';
    case 5: return 'VeryStrong';
    default: return 'Moderate';
  }
};

const getSliderColor = (level: ConfidenceLevel): string => {
  switch (level) {
    case 'NotStarted': return 'accent-red-500';
    case 'VeryWeak': return 'accent-orange-500';
    case 'Weak': return 'accent-yellow-500';
    case 'Moderate': return 'accent-blue-500';
    case 'Strong': return 'accent-lime-500';
    case 'VeryStrong': return 'accent-green-500';
    default: return 'accent-gray-500';
  }
};

interface ConfidenceSliderProps {
  value: ConfidenceLevel;
  onChange: (level: ConfidenceLevel) => void;
}

const ConfidenceSlider: React.FC<ConfidenceSliderProps> = ({ value, onChange }) => {
  const { getClasses } = useTheme();
  const sliderValue = confidenceToNumber(value).toString();
  const currentLabel = confidenceLevelLabels[value];
  const sliderColor = getSliderColor(value);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs sm:text-sm text-gray-500">Very Weak</span>
        <span className={`text-xs sm:text-sm font-medium ${getClasses('labelText')}`}>{currentLabel}</span>
        <span className="text-xs sm:text-sm text-gray-500">Very Strong</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        step="1"
        value={sliderValue}
        className={`w-full h-4 sm:h-3 md:h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 touch-manipulation ${sliderColor}`}
        onChange={(e) => onChange(numberToConfidence(parseInt(e.target.value)))}
      />
    </div>
  );
};

interface StarRatingProps {
  currentStars: number;
  onStarClick: (stars: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({ currentStars, onStarClick }) => {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= currentStars;
        return (
          <button
            key={n}
            onClick={() => onStarClick(n)}
            className="mx-0.5 p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
            title={`${n} star${n === 1 ? '' : 's'}`}
            type="button"
          >
            <span className={`text-lg ${filled ? "text-yellow-500" : "text-gray-300"} hover:text-yellow-400 transition-colors`}>
              {filled ? "★" : "☆"}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export const ConfidenceLevelStep: React.FC<ConfidenceLevelStepProps> = ({ data, onUpdate }) => {
  const { getClasses } = useTheme();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [_subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);

  // Load subjects from helios-ts
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const { loadAllSubjects } = await import('helios-ts');
        const allSubjects = loadAllSubjects();
        setSubjects(allSubjects);
        
        // Create subject groups for quick overview
        const groups: SubjectGroup[] = [
          {
            name: "All Subjects",
            subjects: allSubjects,
            description: "All UPSC subjects for confidence assessment"
          }
        ];
        
        setSubjectGroups(groups);
      } catch (error) {
        console.error('Failed to load subjects:', error);
      }
    };
    
    loadSubjects();
  }, []);


  const setAllToModerate = () => {
    const newData = { ...data };
    subjects.forEach(subject => {
      newData[subject.subjectCode] = 'Moderate';
    });
    onUpdate(() => newData);
  };

  const resetToDefaults = () => {
    onUpdate(() => ({}));
  };

  if (subjects.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-2 sm:p-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-2 sm:p-4">
      {/* Introduction Note */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <i className="fas fa-info-circle text-blue-500 mt-0.5 mr-3"></i>
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-1">What is this assessment?</h4>
            <p className="text-sm text-blue-700">
              We're asking about your confidence level in different UPSC subjects to help personalize your study plan. 
              Rate your comfort level from 1 star (not started) to 6 stars (very strong) for each subject area. 
              This helps us recommend the right resources and focus areas for your preparation.
            </p>
          </div>
        </div>
      </div>

      {/* Subjects Section */}
      <div className="mt-2 space-y-4">
        <div className="relative">
          <div className={`absolute inset-0 ${getClasses('sectionHeaderBackground')} -z-10`}></div>
          <h3 className={`text-base sm:text-lg font-semibold ${getClasses('sectionHeader')} pb-3 mb-4`}>
            <i className={`fas fa-book mr-2 ${getClasses('sectionHeaderIcon')}`}></i>
            Subjects
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {subjects.map((subject) => (
            <div key={subject.subjectCode} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className={`text-sm font-medium ${getClasses('labelText')}`}>
                  {subject.subjectName}
                  <span className="text-xs text-gray-500 ml-2">({subject.subjectCode})</span>
                </div>
                <div className="text-xs text-gray-500">
                  {subject.category} • {subject.examFocus} • {subject.baselineHours}h baseline
                </div>
              </div>
              <StarRating
                currentStars={confidenceToNumber(data[subject.subjectCode] || 'Moderate')}
                onStarClick={(stars) => {
                  const level = numberToConfidence(stars);
                  // Apply to all topics under this subject
                  const newData = { ...data };
                  newData[subject.subjectCode] = level;
                  // Apply to all topics if they exist
                  if (subject.topics) {
                    subject.topics.forEach(topic => {
                      newData[`${subject.subjectCode}/${topic.topicCode}`] = level;
                    });
                  }
                  onUpdate(() => newData);
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={setAllToModerate}
            className={`px-3 py-2 rounded-md text-sm border ${getClasses('secondaryButton')} ${getClasses('secondaryButtonHover')}`}
          >
            I'm not sure (set to Moderate)
          </button>
          <button
            onClick={resetToDefaults}
            className={`px-3 py-2 rounded-md text-sm border ${getClasses('secondaryButton')} ${getClasses('secondaryButtonHover')}`}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Advanced Details Section */}
      <div className="mt-6">
        <details className="group">
          <summary className={`cursor-pointer select-none text-sm ${getClasses('labelText')} flex items-center gap-2`}>
            Customize details (Advanced)
            <span className={`ml-1 ${getClasses('sectionHeaderIcon')} group-open:rotate-180 transition-transform`}>▾</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-6">
            {subjects.map((subject) => (
              <div key={subject.subjectCode} className="space-y-4">
                <div className={`${getClasses('inputBackground')} ${getClasses('inputBorder')} border p-4 rounded-lg`}>
                  <h3 className={`text-lg font-semibold ${getClasses('sectionHeader')} mb-2`}>
                    {subject.subjectName} ({subject.subjectCode})
                  </h3>
                  <div className="text-sm text-gray-600 mb-4">
                    {subject.category} • {subject.examFocus} • {subject.baselineHours}h baseline
                  </div>
                  
                  {subject.topics && subject.topics.length > 0 && (
                    <div className="space-y-3">
                      <h4 className={`text-sm font-medium ${getClasses('labelText')}`}>
                        Topics ({subject.topics.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {subject.topics.map((topic) => (
                          <div key={topic.topicCode} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{topic.topicName}</div>
                                <div className="text-xs text-gray-500">{topic.topicCode}</div>
                                <div className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                                  topic.priority === 'EssentialTopic' ? 'bg-red-100 text-red-800' :
                                  topic.priority === 'PriorityTopic' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {topic.priority}
                                </div>
                              </div>
                            </div>
                            <ConfidenceSlider
                              value={data[`${subject.subjectCode}/${topic.topicCode}`] || data[subject.subjectCode] || 'Moderate'}
                              onChange={(level) => {
                                const newData = { ...data };
                                newData[`${subject.subjectCode}/${topic.topicCode}`] = level;
                                onUpdate(() => newData);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
};

export default ConfidenceLevelStep;