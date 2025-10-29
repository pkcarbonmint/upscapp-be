import React from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import CycleTimeline from './CycleTimeline';

const PreviewStep: React.FC<StepProps> = (stepProps) => {
  const { personalInfo, targetYear, commitment, preview } = stepProps.formData;
  return (
    <StepLayout
      icon="👁️"
      title="Study Plan Preview"
      description="Review your personalized UPSC study plan"
    >
      {/* Personal Summary */}
      <div className="preview-section">
        <h3 className="ms-font-subtitle preview-section-title">
          Personal Summary
        </h3>
        <div className="preview-summary-card">
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
      <div className="preview-section">
        <h3 className="ms-font-subtitle preview-section-title">
          Study Plan Overview
        </h3>
        <div className="preview-success-card">
          <div className="preview-success-header">
            <span>🎯</span>
            <span>Your Personalized Plan is Ready!</span>
          </div>
          <p className="preview-success-content">
            Based on your inputs, we've created a comprehensive study plan tailored to your
            target year ({targetYear.targetYear}) and daily commitment ({commitment.timeCommitment}+ hours).
          </p>

        </div>
      </div>

      {/* Cycles Timeline - reuse the same display as TargetYearStep */}
      {Array.isArray(preview.raw_helios_data?.cycles) && preview.raw_helios_data.cycles.length > 0 && (
        <div className="preview-section">
          <CycleTimeline cycles={preview.raw_helios_data.cycles as any} />
        </div>
      )}

    </StepLayout>
  );
};

export default PreviewStep;