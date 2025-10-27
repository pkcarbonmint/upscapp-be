import React from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';

const PreviewStep: React.FC<StepProps> = ({ formData }) => {
  const { personalInfo, targetYear, commitment, confidenceLevel, preview } = formData;

  return (
    <StepLayout
      icon="👁️"
      title="Study Plan Preview"
      description="Review your personalized UPSC study plan"
    >
      {/* Personal Summary */}
      <div style={{ marginBottom: '32px' }}>
        <h3 
          className="ms-font-subtitle" 
          style={{ marginBottom: '16px', color: 'var(--ms-blue)' }}
        >
          Personal Summary
        </h3>
        <div 
          style={{
            background: 'var(--ms-gray-20)',
            padding: '20px',
            borderRadius: '8px'
          }}
        >
          <div className="form-grid form-grid-2">
            <div>
              <strong>Name:</strong> {personalInfo.fullName}
            </div>
            <div>
              <strong>Target Year:</strong> {targetYear.targetYear}
            </div>
            <div>
              <strong>Daily Commitment:</strong> {commitment.timeCommitment}+ hours
            </div>
            <div>
              <strong>Location:</strong> {personalInfo.presentLocation}
            </div>
          </div>
        </div>
      </div>

      {/* Study Plan Overview */}
      <div style={{ marginBottom: '32px' }}>
        <h3 
          className="ms-font-subtitle" 
          style={{ marginBottom: '16px', color: 'var(--ms-blue)' }}
        >
          Study Plan Overview
        </h3>
        <div 
          style={{
            background: 'var(--ms-green)',
            color: 'var(--ms-white)',
            padding: '24px',
            borderRadius: '12px'
          }}
        >
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              fontSize: '18px',
              fontWeight: '600'
            }}
          >
            <span>🎯</span>
            <span>Your Personalized Plan is Ready!</span>
          </div>
          <p style={{ margin: '0 0 16px', lineHeight: '1.6' }}>
            Based on your inputs, we've created a comprehensive study plan tailored to your 
            target year ({targetYear.targetYear}) and daily commitment ({commitment.timeCommitment}+ hours).
          </p>
          
          <div className="form-grid form-grid-2" style={{ marginTop: '16px' }}>
            <div 
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div 
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}
              >
                {preview.raw_helios_data?.totalHours || 2400}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Total Study Hours
              </div>
            </div>
            <div 
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div 
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}
              >
                {preview.raw_helios_data?.cycles || 3}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Study Cycles
              </div>
            </div>
            <div 
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div 
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}
              >
                {preview.raw_helios_data?.blocks || 12}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Study Blocks
              </div>
            </div>
            <div 
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div 
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}
              >
                {Object.keys(confidenceLevel).length}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Subjects Covered
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Milestones */}
      <div style={{ marginBottom: '32px' }}>
        <h3 
          className="ms-font-subtitle" 
          style={{ marginBottom: '16px', color: 'var(--ms-blue)' }}
        >
          Key Milestones
        </h3>
        <div className="form-grid form-grid-2">
          <div 
            style={{
              background: 'var(--ms-blue-light)',
              border: '1px solid var(--ms-blue)',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}
          >
            <div 
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--ms-blue)',
                marginBottom: '8px'
              }}
            >
              Foundation Complete
            </div>
            <div style={{ color: 'var(--ms-gray-130)' }}>
              {preview.milestones.foundationToPrelimsDate 
                ? preview.milestones.foundationToPrelimsDate.toLocaleDateString()
                : 'Feb 1, ' + targetYear.targetYear}
            </div>
          </div>
          <div 
            style={{
              background: 'var(--ms-blue-light)',
              border: '1px solid var(--ms-blue)',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}
          >
            <div 
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--ms-blue)',
                marginBottom: '8px'
              }}
            >
              Prelims Ready
            </div>
            <div style={{ color: 'var(--ms-gray-130)' }}>
              {preview.milestones.prelimsToMainsDate 
                ? preview.milestones.prelimsToMainsDate.toLocaleDateString()
                : 'May 20, ' + targetYear.targetYear}
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div 
        style={{
          background: 'var(--ms-orange)',
          color: 'var(--ms-white)',
          padding: '24px',
          borderRadius: '12px'
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
            fontSize: '18px',
            fontWeight: '600'
          }}
        >
          <span>🚀</span>
          <span>Ready to Begin?</span>
        </div>
        <p style={{ margin: '0', lineHeight: '1.6' }}>
          Your personalized study plan is ready! Click "Complete Setup" to finalize your 
          registration and start your UPSC preparation journey with Helios.
        </p>
      </div>
    </StepLayout>
  );
};

export default PreviewStep;