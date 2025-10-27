import React from 'react';
import { StepProps, WeekdayOption } from '@/types';
import StepLayout from './StepLayout';

const PreferencesStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const weekdayOptions: WeekdayOption[] = [
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' },
    { value: 'Sunday', label: 'Sunday' }
  ];

  const handleCatchupDayChange = (value: string) => {
    updateFormData({
      preferences: {
        ...formData.preferences,
        catchupDay: value
      }
    });
  };

  const handleTestDayChange = (value: string) => {
    updateFormData({
      preferences: {
        ...formData.preferences,
        testDay: value
      }
    });
  };

  const handlePrioritizeOptionalToggle = () => {
    updateFormData({
      preferences: {
        ...formData.preferences,
        prioritizeOptionalSubject: !formData.preferences.prioritizeOptionalSubject
      }
    });
  };

  return (
    <StepLayout
      icon="⚙️"
      title="Study Preferences"
      description="Customize your study schedule and priorities"
    >
      <div className="form-grid form-grid-2" style={{ marginBottom: '24px' }}>
        <div>
          <label className="ms-label">Catchup Day</label>
          <select
            className="ms-select"
            value={formData.preferences.catchupDay}
            onChange={(e) => handleCatchupDayChange(e.target.value)}
          >
            <option value="">Select a day</option>
            {weekdayOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="ms-help-text">
            Choose a day for catching up on missed study sessions
          </p>
        </div>

        <div>
          <label className="ms-label">Test Day</label>
          <select
            className="ms-select"
            value={formData.preferences.testDay}
            onChange={(e) => handleTestDayChange(e.target.value)}
          >
            <option value="">Select a day</option>
            {weekdayOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="ms-help-text">
            Choose a day for taking weekly practice tests
          </p>
        </div>
      </div>

      <div 
        style={{
          background: 'var(--ms-white)',
          border: '1px solid var(--ms-gray-40)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}
        >
          <div>
            <h3 
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--ms-gray-130)',
                margin: '0 0 4px 0'
              }}
            >
              Prioritize Optional Subject
            </h3>
            <p 
              style={{
                fontSize: '14px',
                color: 'var(--ms-gray-90)',
                margin: '0'
              }}
            >
              Give more focus to your optional subject in the study plan
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrioritizeOptionalToggle}
            style={{
              width: '48px',
              height: '24px',
              borderRadius: '12px',
              border: 'none',
              background: formData.preferences.prioritizeOptionalSubject 
                ? 'var(--ms-blue)' 
                : 'var(--ms-gray-40)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'var(--ms-white)',
                position: 'absolute',
                top: '2px',
                left: formData.preferences.prioritizeOptionalSubject ? '26px' : '2px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
            />
          </button>
        </div>
        
        {formData.preferences.prioritizeOptionalSubject && (
          <div 
            style={{
              background: 'var(--ms-blue-light)',
              border: '1px solid var(--ms-blue)',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '16px'
            }}
          >
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--ms-blue)',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <span>ℹ️</span>
              <span>Optional subject will receive 40% of your study time instead of the standard 25%</span>
            </div>
          </div>
        )}
      </div>

      {/* Summary of selected preferences */}
      {(formData.preferences.catchupDay || formData.preferences.testDay) && (
        <div 
          style={{
            background: 'var(--ms-gray-10)',
            border: '1px solid var(--ms-gray-40)',
            borderRadius: '12px',
            padding: '20px'
          }}
        >
          <h4 
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--ms-gray-130)',
              margin: '0 0 12px 0'
            }}
          >
            Your Study Schedule
          </h4>
          <div className="form-grid form-grid-2">
            {formData.preferences.catchupDay && (
              <div>
                <div 
                  style={{
                    fontSize: '14px',
                    color: 'var(--ms-gray-90)',
                    marginBottom: '4px'
                  }}
                >
                  Catchup Day
                </div>
                <div 
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--ms-blue)'
                  }}
                >
                  {formData.preferences.catchupDay}
                </div>
              </div>
            )}
            {formData.preferences.testDay && (
              <div>
                <div 
                  style={{
                    fontSize: '14px',
                    color: 'var(--ms-gray-90)',
                    marginBottom: '4px'
                  }}
                >
                  Test Day
                </div>
                <div 
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--ms-blue)'
                  }}
                >
                  {formData.preferences.testDay}
                </div>
              </div>
            )}
          </div>
          {formData.preferences.prioritizeOptionalSubject && (
            <div 
              style={{
                marginTop: '12px',
                padding: '12px',
                background: 'var(--ms-white)',
                borderRadius: '8px',
                border: '1px solid var(--ms-blue)'
              }}
            >
              <div 
                style={{
                  fontSize: '14px',
                  color: 'var(--ms-blue)',
                  fontWeight: '500'
                }}
              >
                ⭐ Optional Subject Priority: Enabled
              </div>
            </div>
          )}
        </div>
      )}
    </StepLayout>
  );
};

export default PreferencesStep;