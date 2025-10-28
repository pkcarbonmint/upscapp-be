import React from 'react';
import { StepProps } from '@/types';

const CompleteStep: React.FC<StepProps> = ({ formData }) => {
  return (
    <div className="complete">
      <div className="complete__badge">✅</div>
      
      <h1 className="ms-font-title complete__title">Welcome to Helios!</h1>
      
      <p className="ms-font-body complete__subtitle">Your UPSC preparation journey begins now</p>
      
      <div className="ms-card hero-card">
        <div className="hero-card__header">
          <span>🎉</span>
          <span>Setup Complete!</span>
        </div>
        <p className="paragraph">
          Congratulations <strong>{formData.personalInfo.fullName}</strong>! Your personalized 
          study plan for UPSC {formData.targetYear.targetYear} has been created successfully.
        </p>
        <div className="summary-grid">
          <div className="simple-card">
            <div className="simple-card__value">{formData.commitment.timeCommitment}+ hours</div>
            <div className="simple-card__label">Daily Commitment</div>
          </div>
          <div className="simple-card">
            <div className="simple-card__value">{formData.targetYear.targetYear}</div>
            <div className="simple-card__label">Target Year</div>
          </div>
        </div>
      </div>
      
      <div className="ms-card next-card">
        <h3 className="next-card__title">What's Next?</h3>
        <div className="text-left">
          <div className="check-row">
            <span className="check-row__icon">✓</span>
            <span className="check-row__text">Access your personalized dashboard</span>
          </div>
          <div className="check-row">
            <span className="check-row__icon">✓</span>
            <span className="check-row__text">Download your detailed study schedule</span>
          </div>
          <div className="check-row">
            <span className="check-row__icon">✓</span>
            <span className="check-row__text">Start with your first study session</span>
          </div>
          <div className="check-row">
            <span className="check-row__icon">✓</span>
            <span className="check-row__text">Connect with our expert mentors</span>
          </div>
        </div>
      </div>
      
      <button 
        className="ms-button ms-button-primary btn-lg"
        onClick={() => {
          // TODO: Navigate to dashboard
          console.log('Navigate to dashboard');
        }}
      >
        Go to Dashboard
      </button>
      
      <p className="support-note">Need help? Contact our support team at support@helios.com</p>
    </div>
  );
};

export default CompleteStep;