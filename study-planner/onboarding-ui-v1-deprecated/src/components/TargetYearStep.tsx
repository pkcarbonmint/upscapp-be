import React, { useState } from 'react';
import type { IWFTargetYear } from '../types';
import { isFeatureEnabled } from '../config/featureFlags';
import { useTheme } from '../hooks/useTheme';

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
        
        {/* Timeline sections */}
        <div className="space-y-2 text-sm">
          <div className="bg-white bg-opacity-25 rounded-md p-2">
            <strong className="font-semibold text-gray-800">Foundation</strong>
            <br />
            <span className="text-gray-700 opacity-90">
              {option.foundationStartDate} - {option.prelimsStartDate}
            </span>
          </div>
          <div className="bg-white bg-opacity-25 rounded-md p-2">
            <strong className="font-semibold text-gray-800">Prelims</strong>
            <br />
            <span className="text-gray-700 opacity-90">
              {option.prelimsStartDate} - {option.prelimsEndDate}
            </span>
          </div>
          <div className="bg-white bg-opacity-25 rounded-md p-2">
            <strong className="font-semibold text-gray-800">Mains</strong>
            <br />
            <span className="text-gray-700 opacity-90">
              {option.mainsStartDate} - {option.mainsEndDate}
            </span>
          </div>
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
