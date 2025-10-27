import React from 'react';
import { StepProps } from '@/types';

const CompleteStep: React.FC<StepProps> = ({ formData }) => {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <div 
        style={{
          width: '80px',
          height: '80px',
          background: 'var(--ms-green)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '32px'
        }}
      >
        ✅
      </div>
      
      <h1 
        className="ms-font-title" 
        style={{ 
          margin: '0 0 12px',
          color: 'var(--ms-gray-130)'
        }}
      >
        Welcome to Helios!
      </h1>
      
      <p 
        className="ms-font-body" 
        style={{ 
          margin: '0 0 32px',
          color: 'var(--ms-gray-90)',
          fontSize: '16px'
        }}
      >
        Your UPSC preparation journey begins now
      </p>
      
      <div 
        className="ms-card"
        style={{
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          marginBottom: '32px',
          background: 'var(--ms-green)',
          color: 'var(--ms-white)',
          border: 'none'
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            fontSize: '20px',
            fontWeight: '600',
            justifyContent: 'center'
          }}
        >
          <span>🎉</span>
          <span>Setup Complete!</span>
        </div>
        <p style={{ margin: '0 0 20px', lineHeight: '1.6' }}>
          Congratulations <strong>{formData.personalInfo.fullName}</strong>! Your personalized 
          study plan for UPSC {formData.targetYear.targetYear} has been created successfully.
        </p>
        
        <div className="form-grid form-grid-2" style={{ marginTop: '20px' }}>
          <div 
            style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '16px',
              borderRadius: '8px'
            }}
          >
            <div 
              style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '4px'
              }}
            >
              {formData.commitment.timeCommitment}+ hours
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              Daily Commitment
            </div>
          </div>
          <div 
            style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '16px',
              borderRadius: '8px'
            }}
          >
            <div 
              style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '4px'
              }}
            >
              {formData.targetYear.targetYear}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              Target Year
            </div>
          </div>
        </div>
      </div>
      
      <div 
        className="ms-card"
        style={{
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          marginBottom: '32px'
        }}
      >
        <h3 
          style={{
            margin: '0 0 16px',
            color: 'var(--ms-blue)',
            fontSize: '18px',
            fontWeight: '600'
          }}
        >
          What's Next?
        </h3>
        <div style={{ textAlign: 'left' }}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '12px'
            }}
          >
            <span style={{ color: 'var(--ms-green)', fontSize: '16px' }}>✓</span>
            <span style={{ fontSize: '14px', color: 'var(--ms-gray-130)' }}>
              Access your personalized dashboard
            </span>
          </div>
          <div 
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '12px'
            }}
          >
            <span style={{ color: 'var(--ms-green)', fontSize: '16px' }}>✓</span>
            <span style={{ fontSize: '14px', color: 'var(--ms-gray-130)' }}>
              Download your detailed study schedule
            </span>
          </div>
          <div 
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '12px'
            }}
          >
            <span style={{ color: 'var(--ms-green)', fontSize: '16px' }}>✓</span>
            <span style={{ fontSize: '14px', color: 'var(--ms-gray-130)' }}>
              Start with your first study session
            </span>
          </div>
          <div 
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}
          >
            <span style={{ color: 'var(--ms-green)', fontSize: '16px' }}>✓</span>
            <span style={{ fontSize: '14px', color: 'var(--ms-gray-130)' }}>
              Connect with our expert mentors
            </span>
          </div>
        </div>
      </div>
      
      <button 
        className="ms-button ms-button-primary"
        style={{
          padding: '12px 32px',
          fontSize: '16px',
          fontWeight: '600'
        }}
        onClick={() => {
          // TODO: Navigate to dashboard
          console.log('Navigate to dashboard');
        }}
      >
        Go to Dashboard
      </button>
      
      <p 
        style={{
          marginTop: '24px',
          fontSize: '12px',
          color: 'var(--ms-gray-90)'
        }}
      >
        Need help? Contact our support team at support@helios.com
      </p>
    </div>
  );
};

export default CompleteStep;