import React from 'react';
import { StepProps, TimeCommitmentOption } from '@/types';
import StepLayout from './StepLayout';

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

  const getArchetype = (hours: number) => {
    if (hours >= 8) return 'Full-time Dedicated';
    if (hours >= 6) return 'Serious Aspirant';
    return 'Part-time Learner';
  };

  return (
    <StepLayout
      icon="⏰"
      title="Study Commitment"
      description="How many hours can you dedicate to studying daily?"
    >
      <h2 
        className="ms-font-subtitle" 
        style={{ marginBottom: '20px', color: 'var(--ms-gray-130)' }}
      >
        Choose Your Daily Study Hours
      </h2>
      
      <div className="choice-grid choice-grid-2">
        {timeCommitmentOptions.map((option) => (
          <div
            key={option.value}
            style={{
              background: 'var(--ms-white)',
              border: formData.commitment.timeCommitment === option.value 
                ? '2px solid var(--ms-blue)' 
                : '2px solid var(--ms-gray-40)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              position: 'relative',
              transform: formData.commitment.timeCommitment === option.value 
                ? 'translateY(-2px)' 
                : 'translateY(0)',
              boxShadow: formData.commitment.timeCommitment === option.value 
                ? '0 4px 16px rgba(0, 120, 212, 0.2)' 
                : '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
            onClick={() => handleCommitmentSelect(option.value)}
          >
            {formData.commitment.timeCommitment === option.value && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'var(--ms-blue)',
                  color: 'var(--ms-white)',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ✓
              </div>
            )}
            
            <div 
              style={{
                fontSize: '28px',
                fontWeight: '600',
                color: 'var(--ms-blue)',
                marginBottom: '8px'
              }}
            >
              {option.label.split(' ')[0]}
            </div>
            <div 
              style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '8px',
                color: 'var(--ms-gray-130)'
              }}
            >
              {option.label}
            </div>
            <p 
              style={{
                fontSize: '14px',
                color: 'var(--ms-gray-90)',
                margin: '0 0 12px',
                lineHeight: '1.5'
              }}
            >
              {option.description}
            </p>
            <div 
              style={{
                background: 'var(--ms-gray-20)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--ms-gray-90)',
                fontWeight: '500'
              }}
            >
              Recommended for: {
                option.value <= 4 ? 'Working professionals, part-time preparation' :
                option.value <= 6 ? 'Serious aspirants, balanced lifestyle' :
                option.value <= 8 ? 'Dedicated students, competitive preparation' :
                'Full-time aspirants, final attempt preparation'
              }
            </div>
          </div>
        ))}
      </div>
      
      {formData.commitment.timeCommitment > 0 && (
        <div 
          style={{
            background: 'var(--ms-blue-light)',
            border: '1px solid var(--ms-blue)',
            borderRadius: '12px',
            padding: '24px',
            marginTop: '32px'
          }}
        >
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              color: 'var(--ms-blue)',
              fontWeight: '600',
              fontSize: '18px'
            }}
          >
            <span>📊</span>
            <span>Your Study Profile Analysis</span>
          </div>
          <div 
            style={{
              color: 'var(--ms-gray-130)',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
          >
            <p>
              Based on your selection of <strong>{formData.commitment.timeCommitment}+ hours daily</strong>, 
              here's your personalized study profile:
            </p>
            
            <div className="form-grid form-grid-2" style={{ marginTop: '16px' }}>
              <div 
                style={{
                  background: 'var(--ms-white)',
                  padding: '16px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}
              >
                <div 
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: 'var(--ms-blue)',
                    marginBottom: '4px'
                  }}
                >
                  {formData.commitment.timeCommitment * 7}
                </div>
                <div 
                  style={{
                    fontSize: '12px',
                    color: 'var(--ms-gray-90)',
                    fontWeight: '500'
                  }}
                >
                  Hours per week
                </div>
              </div>
              <div 
                style={{
                  background: 'var(--ms-white)',
                  padding: '16px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}
              >
                <div 
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: 'var(--ms-blue)',
                    marginBottom: '4px'
                  }}
                >
                  {getArchetype(formData.commitment.timeCommitment)}
                </div>
                <div 
                  style={{
                    fontSize: '12px',
                    color: 'var(--ms-gray-90)',
                    fontWeight: '500'
                  }}
                >
                  Study archetype
                </div>
              </div>
            </div>
            
            <p 
              style={{
                marginTop: '16px',
                fontSize: '13px',
                color: 'var(--ms-gray-90)'
              }}
            >
              <strong>Tip:</strong> This schedule allows for a healthy work-life balance while maintaining 
              consistent progress. We recommend 5 days of intensive study with 2 days for revision and current affairs.
            </p>
          </div>
        </div>
      )}
    </StepLayout>
  );
};

export default CommitmentStep;