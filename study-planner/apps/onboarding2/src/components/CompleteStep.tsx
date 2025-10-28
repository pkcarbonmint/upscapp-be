import React from 'react';
import { StepProps } from '@/types';

const CompleteStep: React.FC<StepProps> = ({ formData }) => {
  return (
    <div className="complete-container">
      <div className="complete-icon">
        ✅
      </div>
      
      <h1 className="ms-font-title complete-title">
        Welcome to Helios!
      </h1>
      
      <p className="ms-font-body complete-subtitle">
        Your UPSC preparation journey begins now
      </p>
      
      <div className="success-card">
        <div className="success-header">
          <span>🎉</span>
          <span>Setup Complete!</span>
        </div>
        <p className="success-message">
          Congratulations <strong>{formData.personalInfo.fullName}</strong>! Your personalized 
          study plan for UPSC {formData.targetYear.targetYear} has been created successfully.
        </p>
        
        <div className="form-grid form-grid-2" style={{ marginTop: '20px' }}>
          <div className="stat-card">
            <div className="stat-value">
              {formData.commitment.timeCommitment}+ hours
            </div>
            <div className="stat-label">
              Daily Commitment
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {formData.targetYear.targetYear}
            </div>
            <div className="stat-label">
              Target Year
            </div>
          </div>
        </div>
      </div>
      
      <div className="ms-card next-steps-card">
        <h3 className="next-steps-title">
          What's Next?
        </h3>
        <div className="next-steps-list">
          <div className="next-step-item">
            <span className="next-step-checkmark">✓</span>
            <span className="next-step-text">
              Access your personalized dashboard
            </span>
          </div>
          <div className="next-step-item">
            <span className="next-step-checkmark">✓</span>
            <span className="next-step-text">
              Download your detailed study schedule
            </span>
          </div>
          <div className="next-step-item">
            <span className="next-step-checkmark">✓</span>
            <span className="next-step-text">
              Start with your first study session
            </span>
          </div>
          <div className="next-step-item">
            <span className="next-step-checkmark">✓</span>
            <span className="next-step-text">
              Connect with our expert mentors
            </span>
          </div>
        </div>
      </div>
      
      <button 
        className="ms-button ms-button-primary dashboard-button"
        onClick={() => {
          // TODO: Navigate to dashboard
          console.log('Navigate to dashboard');
        }}
      >
        Go to Dashboard
      </button>
      
      <p className="support-text">
        Need help? Contact our support team at support@helios.com
      </p>
    </div>
  );
};

export default CompleteStep;