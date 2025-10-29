import React from 'react';
import { StepProps } from '@/types';
import { downloadPlan } from './util/download';

const CompleteStep: React.FC<StepProps> = (stepProps) => {
  const { formData } = stepProps;
  const downloadHandler = async () => downloadPlan(stepProps);
  return (
    <div className="complete-container">
      <div className="complete-icon">
        ✅
      </div>
      
      <h1 className="ms-font-title complete-title">
        Welcome to La Mentora Study Planner!
      </h1>
      
      <p className="ms-font-body complete-description">
        Your UPSC preparation journey begins now
      </p>
      
      <div className="ms-card complete-success-card">
        <div className="complete-success-header">
          <span>🎉</span>
          <span>Setup Complete!</span>
        </div>
        <p className="complete-success-content">
          Congratulations <strong>{formData.personalInfo.fullName}</strong>! Your personalized 
          study plan for UPSC {formData.targetYear.targetYear} has been created successfully.
        </p>
        
        <div className="form-grid form-grid-2 complete-stats-grid">
          <div className="complete-stat-card">
            <div className="complete-stat-value">
              {formData.commitment.timeCommitment}+ hours
            </div>
            <div className="complete-stat-label">
              Daily Commitment
            </div>
          </div>
          <div className="complete-stat-card">
            <div className="complete-stat-value">
              {formData.targetYear.targetYear}
            </div>
            <div className="complete-stat-label">
              Target Year
            </div>
          </div>
        </div>
      </div>
      
      <div className="ms-card complete-next-steps-card">
        <h3 className="complete-next-steps-title">
          What's Next?
        </h3>
        <div className="complete-next-steps-content">
          <div className="complete-next-steps-item">
            <span className="complete-next-steps-checkmark">✓</span>
            <span className="complete-next-steps-text">
              Access your personalized dashboard
            </span>
          </div>
          <div className="complete-next-steps-item">
            <span className="complete-next-steps-checkmark">✓</span>
            <span className="complete-next-steps-text">
              Download your detailed study schedule
            </span>
          </div>
          <div className="complete-next-steps-item">
            <span className="complete-next-steps-checkmark">✓</span>
            <span className="complete-next-steps-text">
              Start with your first study session
            </span>
          </div>
          <div className="complete-next-steps-item">
            <span className="complete-next-steps-checkmark">✓</span>
            <span className="complete-next-steps-text">
              Connect with our expert mentors
            </span>
          </div>
        </div>
      </div>
      
      <button 
        className="ms-button ms-button-primary complete-button"
        onClick={downloadHandler}
      >
        Download Study Plan
      </button>
      <button 
        className="ms-button ms-button-secondary complete-button"
        onClick={() => {
          // TODO: Navigate to dashboard
          console.log('Navigate to dashboard');
        }}
        style={{ marginTop: '12px' }}
      >
        Go to Dashboard
      </button>
      
      <p className="complete-footer">
        Need help? Contact our support team at support@helios.com
      </p>
    </div>
  );
};

export default CompleteStep;