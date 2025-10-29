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
      <div className="form-section--small">
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
      <h2 className="ms-font-subtitle form-section-title">
        Choose Your Daily Study Hours
      </h2>
      
      <div className="choice-grid">
        {timeCommitmentOptions.map((option) => (
          <div
            key={option.value}
            className={`choice-option ${formData.commitment.timeCommitment === option.value ? 'choice-option--selected' : ''}`}
            onClick={() => handleCommitmentSelect(option.value)}
          >
            {formData.commitment.timeCommitment === option.value && (
              <div className="choice-option-checkmark">
                ✓
              </div>
            )}
            
            <div className="choice-option-label">
              {option.label}
            </div>
            <p className="choice-option-description">
              {option.description}
            </p>
          </div>
        ))}
      </div>
      
      {formData.commitment.timeCommitment > 0 && (
        <>
          {/* Study Preferences Section */}
          <div className="study-preferences-card">
            <h3 className="study-preferences-header">
              <span>⚙️</span>
              <span>Study Preferences</span>
            </h3>

            <div className="form-grid form-grid-2 form-grid--gap-large">
              {/* Catchup Day */}
              <div>
                <label className="ms-label form-label--block">
                  📅 Catchup Day
                </label>
                <p className="form-description" style={{ marginBottom: '12px' }}>
                  Day reserved for catching up on pending topics
                </p>
                <div className="day-buttons-row">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={`day-button ${formData.commitment.catchupDayPreference === day ? 'day-button--selected' : ''}`}
                      onClick={() => updateFormData({
                        commitment: { ...formData.commitment, catchupDayPreference: day }
                      })}
                    >
                      <span className="day-button-text">{day.slice(0, 3)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Day */}
              <div>
                <label className="ms-label form-label--block">
                  📝 Weekly Test Day
                </label>
                <p className="form-description" style={{ marginBottom: '12px' }}>
                  Day for weekly mock tests and assessments
                </p>
                <div className="day-buttons-row">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={`day-button ${formData.commitment.weeklyTestDayPreference === day ? 'day-button--selected' : ''}`}
                      onClick={() => updateFormData({
                        commitment: { ...formData.commitment, weeklyTestDayPreference: day }
                      })}
                    >
                      <span className="day-button-text">{day.slice(0, 3)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subject Ordering Preference */}
            <div className="form-section" style={{ marginTop: '24px' }}>
              <label className="ms-label" style={{ marginBottom: '12px' }}>
                📚 Subject Study Order
              </label>
              <div className="choice-grid choice-grid-3" style={{ marginTop: '0' }}>
                <div
                  className={`choice-option ${formData.commitment.subjectOrderingPreference === 'weakest-first' ? 'choice-option--selected' : ''}`}
                  onClick={() => updateFormData({
                    commitment: { ...formData.commitment, subjectOrderingPreference: 'weakest-first' }
                  })}
                >
                  {formData.commitment.subjectOrderingPreference === 'weakest-first' && (
                    <div className="choice-option-checkmark">✓</div>
                  )}
                  <div className="choice-option-label">Weakest First</div>
                  <p className="choice-option-description">Focus on improving areas you struggle with</p>
                </div>

                <div
                  className={`choice-option ${formData.commitment.subjectOrderingPreference === 'balanced' ? 'choice-option--selected' : ''}`}
                  onClick={() => updateFormData({
                    commitment: { ...formData.commitment, subjectOrderingPreference: 'balanced' }
                  })}
                >
                  {formData.commitment.subjectOrderingPreference === 'balanced' && (
                    <div className="choice-option-checkmark">✓</div>
                  )}
                  <div className="choice-option-label">Balanced</div>
                  <p className="choice-option-description">Mix of strong and weak subjects</p>
                </div>

                <div
                  className={`choice-option ${formData.commitment.subjectOrderingPreference === 'strongest-first' ? 'choice-option--selected' : ''}`}
                  onClick={() => updateFormData({
                    commitment: { ...formData.commitment, subjectOrderingPreference: 'strongest-first' }
                  })}
                >
                  {formData.commitment.subjectOrderingPreference === 'strongest-first' && (
                    <div className="choice-option-checkmark">✓</div>
                  )}
                  <div className="choice-option-label">Strongest First</div>
                  <p className="choice-option-description">Build momentum with your strengths</p>
                </div>
              </div>
            </div>

            {/* Prioritize Optional Subject Toggle */}
            <div className="toggle-container">
              <label className="toggle-label">
                <div className="toggle-content">
                  <span>🎯</span>
                  <div>
                    <div>Prioritize Optional Subject</div>
                    <div className="toggle-description">
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
                  className={`toggle-switch ${formData.commitment.optionalFirst ? 'toggle-switch--active' : ''}`}
                >
                  <div className={`toggle-slider ${formData.commitment.optionalFirst ? 'toggle-slider--active' : ''}`} />
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