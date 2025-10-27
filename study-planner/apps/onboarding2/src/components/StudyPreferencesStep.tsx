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
      title="Study Commitment" 
      description="How many hours can you dedicate to studying daily?"
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
      <h2 
        className="ms-font-subtitle" 
        style={{ marginBottom: '16px', color: 'var(--ms-gray-130)' }}
      >
        Choose Your Daily Study Hours
      </h2>
      
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
      }}>
        {timeCommitmentOptions.map((option) => (
          <div
            key={option.value}
            style={{
              background: 'var(--ms-white)',
              border: formData.commitment.timeCommitment === option.value 
                ? '2px solid var(--ms-blue)' 
                : '2px solid var(--ms-gray-40)',
              borderRadius: '8px',
              padding: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              position: 'relative',
              flex: '1 1 auto',
              minWidth: '120px',
              maxWidth: '200px',
              transform: formData.commitment.timeCommitment === option.value 
                ? 'translateY(-2px)' 
                : 'translateY(0)',
              boxShadow: formData.commitment.timeCommitment === option.value 
                ? '0 3px 12px rgba(0, 120, 212, 0.2)' 
                : '0 1px 4px rgba(0, 0, 0, 0.08)'
            }}
            onClick={() => handleCommitmentSelect(option.value)}
          >
            {formData.commitment.timeCommitment === option.value && (
              <div
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  background: 'var(--ms-blue)',
                  color: 'var(--ms-white)',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: '600'
                }}
              >
                ✓
              </div>
            )}
            
            <div 
              style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '4px',
                color: 'var(--ms-gray-130)'
              }}
            >
              {option.label}
            </div>
            <p 
              style={{
                fontSize: '11px',
                color: 'var(--ms-gray-90)',
                margin: '0',
                lineHeight: '1.3'
              }}
            >
              {option.description}
            </p>
          </div>
        ))}
      </div>
      
      {formData.commitment.timeCommitment > 0 && (
        <>
          {/* Study Preferences Section */}
          <div 
            style={{
              background: 'var(--ms-white)',
              border: '1px solid var(--ms-gray-40)',
              borderRadius: '12px',
              padding: '12px',
              marginTop: '24px'
            }}
          >
            <h3 
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--ms-gray-130)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>⚙️</span>
              <span>Study Preferences</span>
            </h3>

            <div className="form-grid form-grid-2" style={{ gap: '20px' }}>
              {/* Catchup Day */}
              <div>
                <label 
                  className="ms-label"
                  style={{ marginBottom: '8px', display: 'block' }}
                >
                  📅 Catchup Day
                </label>
                <select
                  className="ms-select"
                  value={formData.commitment.catchupDayPreference}
                  onChange={(e) => updateFormData({
                    commitment: { ...formData.commitment, catchupDayPreference: e.target.value }
                  })}
                  style={{ width: '100%' }}
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
                <p 
                  style={{
                    fontSize: '12px',
                    color: 'var(--ms-gray-90)',
                    marginTop: '4px',
                    lineHeight: '1.4'
                  }}
                >
                  Day reserved for catching up on pending topics
                </p>
              </div>

              {/* Test Day */}
              <div>
                <label 
                  className="ms-label"
                  style={{ marginBottom: '8px', display: 'block' }}
                >
                  📝 Weekly Test Day
                </label>
                <select
                  className="ms-select"
                  value={formData.commitment.weeklyTestDayPreference}
                  onChange={(e) => updateFormData({
                    commitment: { ...formData.commitment, weeklyTestDayPreference: e.target.value }
                  })}
                  style={{ width: '100%' }}
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
                <p 
                  style={{
                    fontSize: '12px',
                    color: 'var(--ms-gray-90)',
                    marginTop: '4px',
                    lineHeight: '1.4'
                  }}
                >
                  Day for weekly mock tests and assessments
                </p>
              </div>
            </div>

            {/* Prioritize Optional Subject Toggle */}
            <div 
              style={{
                marginTop: '20px',
                padding: '16px',
                background: 'var(--ms-gray-10)',
                borderRadius: '8px'
              }}
            >
              <label 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--ms-gray-130)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎯</span>
                  <div>
                    <div>Prioritize Optional Subject</div>
                    <div 
                      style={{
                        fontSize: '12px',
                        fontWeight: '400',
                        color: 'var(--ms-gray-90)',
                        marginTop: '2px'
                      }}
                    >
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
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '24px',
                    background: formData.commitment.optionalFirst 
                      ? 'var(--ms-blue)' 
                      : 'var(--ms-gray-60)',
                    borderRadius: '12px',
                    transition: 'background 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: formData.commitment.optionalFirst ? '26px' : '2px',
                      width: '20px',
                      height: '20px',
                      background: 'var(--ms-white)',
                      borderRadius: '50%',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }}
                  />
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