import React, { useEffect, useState } from 'react';
import { StepProps, TimeCommitmentOption } from '@/types';
import StepLayout from './StepLayout';
import { type Subject } from 'helios-ts';


const CommitmentStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const timeCommitmentOptions: TimeCommitmentOption[] = [
    { value: 2, label: '2-4 hours', description: 'Light preparation, part-time study' },
    { value: 4, label: '4-6 hours', description: 'Moderate preparation, balanced approach' },
    { value: 6, label: '6-8 hours', description: 'Serious preparation, dedicated study' },
    { value: 8, label: '8-10 hours', description: 'Intensive preparation, full commitment' },
    { value: 10, label: '10+ hours', description: 'Full-time preparation, maximum dedication' }
  ];

  const handleCommitmentSelect = (value: number) => {
    updateFormData({
      commitment: {
        ...formData.commitment,
        timeCommitment: value
      }
    });
  };

  return (
    <StepLayout
      icon="⏰"
      title="Study Preferences"
      description="Tell us about your study preferences and strategies so we can tailor your plan"
    >
      <div style={{ marginBottom: 16 }}>
        <label className="ms-label">Select Optional Subject</label>
        <select
          className="ms-select"
          value={formData.commitment.upscOptionalSubject}
          onChange={(e) => updateFormData({
            commitment: { ...formData.commitment, upscOptionalSubject: e.target.value }
          })}
        >
          {/* Load options dynamically */}
          <Options />
        </select>
      </div>
      <h2 className="ms-font-subtitle" style={{ marginBottom: '16px', color: 'var(--ms-gray-130)' }}>
        Choose Your Daily Study Hours
      </h2>
      
      <div className="commitment-options-container">
        {timeCommitmentOptions.map((option) => (
          <div
            key={option.value}
            className={`commitment-option ${
              formData.commitment.timeCommitment === option.value ? 'commitment-option-selected' : ''
            }`}
            onClick={() => handleCommitmentSelect(option.value)}
          >
            {formData.commitment.timeCommitment === option.value && (
              <div className="commitment-option-checkmark">
                ✓
              </div>
            )}
            
            <div className="commitment-option-label">
              {option.label}
            </div>
            <p className="commitment-option-description">
              {option.description}
            </p>
          </div>
        ))}
      </div>
      
      {formData.commitment.timeCommitment > 0 && (
        <>
          {/* Study Preferences Section */}
          <div className="preferences-section">
            <h3 className="preferences-title">
              <span>⚙️</span>
              <span>Study Preferences</span>
            </h3>

            <div className="form-grid form-grid-2" style={{ gap: '20px' }}>
              {/* Catchup Day */}
              <div>
                <label className="ms-label preference-item-label">
                  📅 Catchup Day
                </label>
                <select
                  className="ms-select"
                  value={formData.commitment.catchupDayPreference}
                  onChange={(e) => updateFormData({
                    commitment: { ...formData.commitment, catchupDayPreference: e.target.value }
                  })}
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
                <p className="preference-help-text">
                  Day reserved for catching up on pending topics
                </p>
              </div>

              {/* Test Day */}
              <div>
                <label className="ms-label preference-item-label">
                  📝 Weekly Test Day
                </label>
                <select
                  className="ms-select"
                  value={formData.commitment.weeklyTestDayPreference}
                  onChange={(e) => updateFormData({
                    commitment: { ...formData.commitment, weeklyTestDayPreference: e.target.value }
                  })}
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
                <p className="preference-help-text">
                  Day for weekly mock tests and assessments
                </p>
              </div>
            </div>

            {/* Prioritize Optional Subject Toggle */}
            <div className="toggle-container">
              <label className="toggle-label">
                <div className="toggle-label-content">
                  <span>🎯</span>
                  <div>
                    <div>Prioritize Optional Subject</div>
                    <div className="toggle-label-description">
                      Focus on optional subject first in your study schedule
                    </div>
                  </div>
                </div>
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    updateFormData({
                      commitment: { 
                        ...formData.commitment, 
                        optionalFirst: !formData.commitment.optionalFirst 
                      }
                    });
                  }}
                  className={`toggle-switch ${
                    formData.commitment.optionalFirst ? 'toggle-switch-active' : ''
                  }`}
                >
                  <div className={`toggle-switch-knob ${
                    formData.commitment.optionalFirst ? 'toggle-switch-knob-active' : ''
                  }`} />
                </div>
              </label>
            </div>
          </div>
        </>
      )}
    </StepLayout>
  );
};

export default CommitmentStep;

// Separate component to fetch and render optional subject options
function Options() {
  const [options, setOptions] = useState<Subject[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const { getAllOptionalSubjects } = await import('helios-ts');
        const list = await getAllOptionalSubjects();
        setOptions(list);
      } catch {
        setOptions([]);
      }
    })();
  }, []);
  return (
    <>
      {options.map((s) => (
        <option key={s.subjectCode} value={s.subjectCode}>{s.subjectName}</option>
      ))}
    </>
  );
}