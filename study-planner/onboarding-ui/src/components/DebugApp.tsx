import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { IntakeWizardFormData, IWFBackground, IWFOTPVerification, IWFConfidenceLevelAssessment } from '../types';
import { S2WeekDay } from 'helios-scheduler';
import { useTheme } from '../hooks/useTheme';
import PreviewStep from './PreviewStep';

// Initial data matching the main app
const initialBackground: IWFBackground = {
  fullName: "John Doe",
  email: "john.doe@example.com",
  phoneNumber: "+1234567890",
  phoneVerified: true,
  presentLocation: "New York",
  graduationStream: "Engineering",
  collegeUniversity: "MIT",
  yearOfPassing: 2020,
  about: "Software engineer with 3 years of experience"
};

const initialOTPVerification: IWFOTPVerification = {
  phoneNumber: "+1234567890",
  otpCode: "123456",
  verificationId: "verification_123",
  isVerified: true,
  attempts: 1,
  lastSentAt: new Date().toISOString()
};

const initialFormData: IntakeWizardFormData = {
  background: initialBackground,
  otpVerification: initialOTPVerification,
  targetYear: { targetYear: "2026", startDate: "2025-01-15" },
  commitment: {
    timeCommitment: 6,
    performance: {
      history: "Good",
      polity: "Average",
      economy: "Good",
      geography: "Average",
      environment: "Poor",
      scienceTech: "Good"
    },
    studyPreference: "WeakSubjectsFirst",
    subjectApproach: "DualSubject",
    upscOptionalSubject: 'OPT-SOC',
    optionalFirst: false,
    weeklyTestDayPreference: S2WeekDay.Sunday,
    catchupDayPreference: S2WeekDay.Saturday,
    testMinutes: 180
  },
  confidenceLevel: {
    "H01": "Moderate",
    "H02": "Strong",
    "G01": "Weak",
    "E01": "VeryStrong",
    "P01": "Moderate",
    "S01": "Weak"
  } as IWFConfidenceLevelAssessment,
  preview: {
    raw_helios_data: {
      plan_id: "debug_plan_123",
      total_weeks: 52,
      blocks: [
        {
          name: "Foundation Block",
          duration_weeks: 20,
          subjects: ["H01", "G01", "E01"]
        },
        {
          name: "Prelims Preparation",
          duration_weeks: 16,
          subjects: ["H01", "H02", "G01", "E01", "P01", "S01"]
        },
        {
          name: "Mains Preparation",
          duration_weeks: 16,
          subjects: ["H01", "H02", "G01", "E01", "P01"]
        }
      ]
    },
    milestones: {
      foundationToPrelimsDate: "2025-05-15",
      prelimsToMainsDate: "2025-08-15"
    },
    studyPlanId: "debug_plan_123"
  },
  payment: {},
  final: {
    submitted: false,
    message: null,
    studentId: null
  }
};

const DebugApp: React.FC = () => {
  const { getClasses } = useTheme();
  const [formData, setFormData] = useState<IntakeWizardFormData>(initialFormData);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [previewData, setPreviewData] = useState(initialFormData.preview);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Memoize the preview data display to prevent infinite re-renders
  const previewDataDisplay = useMemo(() => {
    return JSON.stringify(previewData, null, 2);
  }, [previewData]);

  // Initialize JSON input with current form data (excluding preview)
  useEffect(() => {
    const { preview, ...formDataWithoutPreview } = formData;
    setJsonInput(JSON.stringify(formDataWithoutPreview, null, 2));
  }, []);

  const handleJsonUpdate = () => {
    try {
      const parsedData = JSON.parse(jsonInput);
      // Merge with existing preview data
      setFormData({ ...formData, ...parsedData });
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const resetToDefaults = () => {
    setFormData(initialFormData);
    setPreviewData(initialFormData.preview);
    // Exclude preview data from JSON editor
    const { preview, background, otpVerification, ...formDataWithoutPreview } = initialFormData;
    setJsonInput(JSON.stringify(formDataWithoutPreview, null, 2));
    setJsonError(null);
  };

  const handleFormDataUpdate = (updates: Partial<IntakeWizardFormData>) => {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);
    
    // Update preview data separately to avoid infinite loops
    if (updates.preview) {
      setPreviewData(updates.preview);
      return; // Early return to prevent further updates when only preview changes
    }
    
    // Only update JSON input if textarea is not focused to preserve cursor position
    if (document.activeElement !== textareaRef.current) {
      // Exclude preview data from JSON editor
      const { preview, background, otpVerification, ...formDataWithoutPreview } = newFormData;
      setJsonInput(JSON.stringify(formDataWithoutPreview, null, 2));
    }
  };

  return (
    <div className={`min-h-screen ${getClasses('pageBackground')} flex flex-col`}>
      {/* Debug Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Debug App - Preview Step</h1>
            <p className="text-blue-100 text-sm">Edit form data to test preview step behavior</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowJsonEditor(!showJsonEditor)}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-400 rounded text-sm transition-colors"
            >
              {showJsonEditor ? 'Hide' : 'Show'} JSON Editor
            </button>
            <button
              onClick={resetToDefaults}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-400 rounded text-sm transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* JSON Editor Sidebar */}
        {showJsonEditor && (
          <div className="w-1/2 border-r border-gray-200 bg-gray-50 p-4 overflow-auto">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Form Data Editor</h2>
              <p className="text-sm text-gray-600 mb-4">
                Edit the JSON below to modify form data. Changes will be reflected in the preview step.
              </p>
              
              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleJsonUpdate}
                  className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-sm transition-colors"
                >
                  Apply Changes
                </button>
                <button
                  onClick={() => {
                    const { preview, background,otpVerification, ...formDataWithoutPreview } = formData;
                    setJsonInput(JSON.stringify(formDataWithoutPreview, null, 2));
                  }}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
                >
                  Reset to Current
                </button>
              </div>

              {jsonError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                  <strong>JSON Error:</strong> {jsonError}
                </div>
              )}
            </div>

            <textarea
              ref={textareaRef}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-96 p-3 border border-gray-300 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter JSON data here..."
            />
            
            {/* Preview Data Display */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview Data (Read-only)</h3>
              <pre className="bg-gray-100 border border-gray-300 rounded p-3 text-xs font-mono overflow-auto max-h-48">
                <code>{previewDataDisplay}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Preview Step Content */}
        <div className={`flex-1 ${showJsonEditor ? 'w-1/2' : 'w-full'} p-4 overflow-auto`}>
          <div className={`${getClasses('cardBackground')} ${getClasses('cardBorder')} ${getClasses('cardShadow')} border rounded-xl p-6`}>
            <div className="mb-6">
              <h1 className={`text-2xl font-bold ${getClasses('headerTitle')} mb-2`}>
                Review Your Plan
              </h1>
              <p className={`text-base ${getClasses('headerSubtitle')}`}>
                Review your personalized study plan
              </p>
            </div>

            <div className="min-h-[24rem]">
              <PreviewStep 
                formData={formData}
                onUpdate={handleFormDataUpdate}
              />
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default DebugApp;
