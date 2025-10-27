import React, { useState } from 'react';
import type { IWFTargetYear } from '../types';
import { isFeatureEnabled } from '../config/featureFlags';
import { useTheme } from '../hooks/useTheme';
import { CycleType } from 'helios-scheduler';
import dayjs from 'dayjs';

interface TargetYearStepProps {
  data: IWFTargetYear;
  onUpdate: (updater: (prev: IWFTargetYear) => IWFTargetYear) => void;
}

interface IWFTargetYearOption {
  targetYear: string;
  foundationStartDate: string;
  prelimsStartDate: string;
  prelimsEndDate: string;
  mainsStartDate: string;
  mainsEndDate: string;
  timeAvailableInMonths: number | null;
  recommendedIntensity: 'LowIntensity' | 'MediumIntensity' | 'HighIntensity';
  successProbability: number;
  prelimsDate: Date; // Actual prelims date for validation
}

interface CycleInfo {
  name: string;
  startDate: string;
  endDate: string;
  duration: string;
  type: CycleType;
}

// Helper function to get cycle display name
function getCycleName(cycleType: CycleType): string {
  switch (cycleType) {
    case CycleType.C1: return "NCERT Foundation";
    case CycleType.C2: return "Comprehensive Foundation";
    case CycleType.C3: return "Mains Revision Pre-Prelims";
    case CycleType.C4: return "Prelims Reading";
    case CycleType.C5: return "Prelims Revision";
    case CycleType.C5B: return "Prelims Rapid Revision";
    case CycleType.C6: return "Mains Revision";
    case CycleType.C7: return "Mains Rapid Revision";
    case CycleType.C8: return "Mains Foundation";
    default: return cycleType;
  }
}


// Helper function to get cycles for a target year
function getCyclesForTargetYear(targetYear: string): CycleInfo[] {
  try {
    // Mock cycle data based on target year and available time
    const mockCycles: CycleInfo[] = [];
    
    if (targetYear === "2026") {
      // Short timeline - accelerated cycles
      mockCycles.push(
        { name: getCycleName(CycleType.C5), startDate: "Oct 27", endDate: "Apr 15", duration: "5.5 months", type: CycleType.C5 },
        { name: getCycleName(CycleType.C5B), startDate: "Apr 16", endDate: "May 14", duration: "4 weeks", type: CycleType.C5B },
        { name: getCycleName(CycleType.C6), startDate: "May 15", endDate: "Jul 31", duration: "2.5 months", type: CycleType.C6 },
        { name: getCycleName(CycleType.C7), startDate: "Aug 01", endDate: "Sep 15", duration: "6 weeks", type: CycleType.C7 }
      );
    } else if (targetYear === "2027") {
      // Medium timeline - balanced approach
      mockCycles.push(
        { name: getCycleName(CycleType.C2), startDate: "Oct 27", endDate: "Dec 31", duration: "9 weeks", type: CycleType.C2 },
        { name: getCycleName(CycleType.C4), startDate: "Jan 01", endDate: "Mar 31", duration: "3 months", type: CycleType.C4 },
        { name: getCycleName(CycleType.C5), startDate: "Apr 01", endDate: "May 05", duration: "5 weeks", type: CycleType.C5 },
        { name: getCycleName(CycleType.C5B), startDate: "May 06", endDate: "May 14", duration: "9 days", type: CycleType.C5B },
        { name: getCycleName(CycleType.C6), startDate: "May 15", endDate: "Jul 31", duration: "2.5 months", type: CycleType.C6 },
        { name: getCycleName(CycleType.C7), startDate: "Aug 01", endDate: "Sep 15", duration: "6 weeks", type: CycleType.C7 }
      );
    } else if (targetYear === "2028") {
      // Long timeline - comprehensive approach
      mockCycles.push(
        { name: getCycleName(CycleType.C1), startDate: "Oct 27", endDate: "Jan 26", duration: "3 months", type: CycleType.C1 },
        { name: getCycleName(CycleType.C2), startDate: "Jan 27", endDate: "Oct 31", duration: "9 months", type: CycleType.C2 },
        { name: getCycleName(CycleType.C3), startDate: "Nov 01", endDate: "Dec 31", duration: "2 months", type: CycleType.C3 },
        { name: getCycleName(CycleType.C4), startDate: "Jan 01", endDate: "Mar 31", duration: "3 months", type: CycleType.C4 },
        { name: getCycleName(CycleType.C5), startDate: "Apr 01", endDate: "May 05", duration: "5 weeks", type: CycleType.C5 },
        { name: getCycleName(CycleType.C5B), startDate: "May 06", endDate: "May 14", duration: "9 days", type: CycleType.C5B },
        { name: getCycleName(CycleType.C6), startDate: "May 15", endDate: "Jul 31", duration: "2.5 months", type: CycleType.C6 },
        { name: getCycleName(CycleType.C7), startDate: "Aug 01", endDate: "Sep 15", duration: "6 weeks", type: CycleType.C7 }
      );
    }
    
    return mockCycles;
  } catch (error) {
    console.warn(`Failed to generate cycles for ${targetYear}:`, error);
    return [];
  }
}

// Mock data matching Elm app structure
const targetYearOptions: IWFTargetYearOption[] = [
  {
    targetYear: "2026", 
    foundationStartDate: "Oct 2025",
    prelimsStartDate: "Jan 2026",
    prelimsEndDate: "May 2026",
    mainsStartDate: "Jun 2026",
    mainsEndDate: "Aug 2026",
    timeAvailableInMonths: 8,
    recommendedIntensity: 'HighIntensity',
    successProbability: 75,
    prelimsDate: new Date('2025-10-01') // Approximate prelims date
  },
  {
    targetYear: "2027",
    foundationStartDate: "Oct 2026", 
    prelimsStartDate: "Jan 2027",
    prelimsEndDate: "May 2027",
    mainsStartDate: "June 2027",
    mainsEndDate: "Aug 2027",
    timeAvailableInMonths: 20,
    recommendedIntensity: 'MediumIntensity',
    successProbability: 85,
    prelimsDate: new Date('2026-10-01') // Approximate prelims date
  },
  {
    targetYear: "2028",
    foundationStartDate: "Oct 2027", 
    prelimsStartDate: "Jan 2028",
    prelimsEndDate: "May 2028",
    mainsStartDate: "Jun 2028",
    mainsEndDate: "Aug 2028",
    timeAvailableInMonths: 32,
    recommendedIntensity: 'LowIntensity',
    successProbability: 95,
    prelimsDate: new Date('2027-10-01') // Approximate prelims date
  }
];

interface TargetYearOptionProps {
  option: IWFTargetYearOption;
  isSelected: boolean;
  onSelect: () => void;
}

const TargetYearOption: React.FC<TargetYearOptionProps> = ({ option, isSelected, onSelect }) => {
  const { getClasses } = useTheme();
  const cycles = getCyclesForTargetYear(option.targetYear);
  
  const getGradientClass = (year: string): string => {
    switch (year) {
      case "2026": return "bg-gradient-to-br from-red-400 to-red-600";
      case "2027": return "bg-gradient-to-br from-green-400 to-green-600";
      case "2028": return "bg-gradient-to-br from-blue-400 to-blue-600";
      default: return "bg-gradient-to-br from-gray-400 to-gray-600";
    }
  };

  const getDescription = (year: string): string => {
    switch (year) {
      case "2026": return "For those with prior preparation or who are confident in their timeline.";
      case "2027": return "Ideal for building a solid foundation from scratch with a balanced approach.";
      case "2028": return "Suited for long-term goals, college students, or working professionals.";
      default: return "Choose your target year for UPSC preparation.";
    }
  };

  const getRemainingTimeColor = (year: string): string => {
    switch (year) {
      case "2026": return "text-red-600";
      case "2027": return "text-green-600";
      case "2028": return "text-blue-600";
      default: return "text-gray-600";
    }
  };

  const baseCardClasses = `flex flex-col rounded-xl overflow-hidden transition-transform transform duration-300 ease-in-out cursor-pointer ${getClasses('cardShadow')}`;
  const interactiveClasses = `hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${getClasses('inputFocus')}`;
  const selectionClasses = isSelected ? `ring-2 ${getClasses('inputFocus')} shadow-xl scale-105` : getClasses('cardShadow');
  const topSectionClasses = `${getGradientClass(option.targetYear)} p-6 text-center relative flex-grow`;
  const bottomSectionClasses = isSelected ? getClasses('cardBackground') : getClasses('inputBackground');
  
  const remainingTime = option.timeAvailableInMonths 
    ? `${option.timeAvailableInMonths} months remaining`
    : "Calculating...";

  return (
    <div 
      className={`${baseCardClasses} ${interactiveClasses} ${selectionClasses}`}
      onClick={onSelect}
    >
      {/* Top colored section */}
      <div className={topSectionClasses}>
        {/* Checkmark icon */}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center">
            ✓
          </div>
        )}
        
        {/* Year title */}
        <h2 className={`text-3xl font-bold mb-4 flex items-center justify-center gap-2 ${isSelected ? 'text-gray-800' : 'text-white'}`}>
          <span className="text-2xl">🗓️</span>
          {option.targetYear}
        </h2>
        
        {/* Cycles Display */}
        <div className="space-y-1 text-xs">
          <div className="text-white font-semibold mb-2">Study Cycles</div>
          {cycles.length > 0 ? (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {cycles.map((cycle, index) => (
                <div key={index} className="bg-white bg-opacity-20 rounded-md p-2 text-left">
                  <div className="font-semibold text-gray-800 text-xs truncate">
                    {cycle.name}
                  </div>
                  <div className="text-gray-700 opacity-90 text-xs">
                    {cycle.startDate} - {cycle.endDate}
                  </div>
                  <div className="text-gray-600 opacity-80 text-xs">
                    {cycle.duration}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white bg-opacity-20 rounded-md p-2">
              <div className="text-gray-700 text-xs">
                Cycles will be generated based on your start date
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom description section */}
      <div className={`${bottomSectionClasses} p-4 space-y-3`}>
        <p className={`text-sm ${getClasses('labelText')} text-center`}>
          {getDescription(option.targetYear)}
        </p>
        <div className={`text-center font-bold text-lg flex items-center justify-center gap-2 ${getRemainingTimeColor(option.targetYear)}`}>
          <span className="text-xl">⏳</span>
          {remainingTime}
        </div>
      </div>
    </div>
  );
};

export const TargetYearStep: React.FC<TargetYearStepProps> = ({ data, onUpdate }) => {
  const { getClasses } = useTheme();
  const [startDateError, setStartDateError] = useState<string | null>(null);
  
  const selectedOption = targetYearOptions.find(opt => opt.targetYear === data.targetYear);
  
  const handleYearSelect = (targetYear: string) => {
    onUpdate(prev => ({ ...prev, targetYear, startDate: undefined }));
    setStartDateError(null);
  };
  
  const validateStartDate = (dateString: string): string | null => {
    if (!selectedOption) return null;
    
    const selectedDate = new Date(dateString);
    const today = new Date();
    const prelimsDate = selectedOption.prelimsDate;
    
    // Calculate 10 days before prelims
    const maxAllowedDate = new Date(prelimsDate);
    maxAllowedDate.setDate(maxAllowedDate.getDate() - 10);
    
    if (selectedDate < today) {
      return "Start date must be in the future";
    }
    
    if (selectedDate > maxAllowedDate) {
      return `Start date must be at least 10 days before prelims (${maxAllowedDate.toLocaleDateString()})`;
    }
    
    return null;
  };
  
  const handleStartDateChange = (dateString: string) => {
    const error = validateStartDate(dateString);
    setStartDateError(error);
    
    if (!error) {
      onUpdate(prev => ({ ...prev, startDate: dateString }));
    }
  };
  
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const getMaxDate = () => {
    if (!selectedOption) return undefined;
    const maxDate = new Date(selectedOption.prelimsDate);
    maxDate.setDate(maxDate.getDate() - 10);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-8">
        {targetYearOptions.map((option) => (
          <TargetYearOption
            key={option.targetYear}
            option={option}
            isSelected={data.targetYear === option.targetYear}
            onSelect={() => handleYearSelect(option.targetYear)}
          />
        ))}
      </div>
      
      {/* Start Date Selection - Feature Flag Controlled */}
      {data.targetYear && isFeatureEnabled('showStartDateSelection') && (
        <div className={`mt-8 p-6 ${getClasses('inputBackground')} ${getClasses('inputBorder')} border rounded-lg ${getClasses('inputShadow')}`}>
          <h3 className={`text-lg font-semibold ${getClasses('sectionHeader')} mb-4 flex items-center gap-2`}>
            <span className="text-xl">📅</span>
            When would you like to start your preparation?
          </h3>
          <p className={`text-sm ${getClasses('headerSubtitle')} mb-6`}>
            Select a start date for your study plan. This must be a future date and at least 10 days before the prelims exam.
          </p>
          
          <div className="max-w-md">
            <input
              type="date"
              value={data.startDate || ''}
              onChange={(e) => handleStartDateChange(e.target.value)}
              min={getMinDate()}
              max={getMaxDate()}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none ${getClasses('inputFocus')} ${
                startDateError ? 'border-red-500' : getClasses('inputBorder')
              } ${getClasses('inputShadow')}`}
            />
            {startDateError && (
              <p className={`mt-2 text-sm ${getClasses('errorText')} flex items-center gap-1`}>
                <i className="fas fa-exclamation-circle"></i>
                {startDateError}
              </p>
            )}
            {data.startDate && !startDateError && (
              <p className={`mt-2 text-sm ${getClasses('successText')} flex items-center gap-1`}>
                <i className="fas fa-check-circle"></i>
                Start date set for {new Date(data.startDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TargetYearStep;
