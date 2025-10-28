import React from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import CycleTimeline from './CycleTimeline';

const PreviewStep: React.FC<StepProps> = ({ formData }) => {
  const { personalInfo, targetYear, commitment, confidenceLevel, preview } = formData;

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
          
          <div className="form-grid form-grid-2 preview-stats-grid">
            <div className="preview-stat-card">
              <div className="preview-stat-value">
                {preview.raw_helios_data?.totalHours || 2400}
              </div>
              <div className="preview-stat-label">
                Total Study Hours
              </div>
            </div>
            <div className="preview-stat-card">
              <div className="preview-stat-value">
                {Array.isArray(preview.raw_helios_data?.cycles) ? preview.raw_helios_data.cycles.length : (preview.raw_helios_data?.cycles || 3)}
              </div>
              <div className="preview-stat-label">
                Study Cycles
              </div>
            </div>
            <div className="preview-stat-card">
              <div className="preview-stat-value">
                {preview.raw_helios_data?.blocks || 12}
              </div>
              <div className="preview-stat-label">
                Study Blocks
              </div>
            </div>
            <div className="preview-stat-card">
              <div className="preview-stat-value">
                {Object.keys(confidenceLevel).length}
              </div>
              <div className="preview-stat-label">
                Subjects Covered
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Milestones */}
      <div className="preview-section">
        <h3 className="ms-font-subtitle preview-section-title">
          Key Milestones
        </h3>
        <div className="form-grid form-grid-2">
          <div className="preview-milestone-card">
            <div className="preview-milestone-title">
              Foundation Complete
            </div>
            <div className="preview-milestone-date">
              {preview.milestones.foundationToPrelimsDate 
                ? preview.milestones.foundationToPrelimsDate.toLocaleDateString()
                : 'Feb 1, ' + targetYear.targetYear}
            </div>
          </div>
          <div className="preview-milestone-card">
            <div className="preview-milestone-title">
              Prelims Ready
            </div>
            <div className="preview-milestone-date">
              {preview.milestones.prelimsToMainsDate 
                ? preview.milestones.prelimsToMainsDate.toLocaleDateString()
                : 'May 20, ' + targetYear.targetYear}
            </div>
          </div>
        </div>
      </div>

      {/* Cycles Timeline - reuse the same display as TargetYearStep */}
      {Array.isArray(preview.raw_helios_data?.cycles) && preview.raw_helios_data.cycles.length > 0 && (
        <div className="preview-section">
          <h3 className="ms-font-subtitle preview-section-title">
            Cycle Timeline
          </h3>
          <CycleTimeline cycles={preview.raw_helios_data.cycles as any} />
        </div>
      )}

      {/* Next Steps */}
      <div className="preview-next-steps-card">
        <div className="preview-next-steps-header">
          <span>🚀</span>
          <span>Ready to Begin?</span>
        </div>
        <p className="preview-next-steps-content">
          Your personalized study plan is ready! Click "Complete Setup" to finalize your 
          registration and start your UPSC preparation journey with Helios.
        </p>
      </div>
    </StepLayout>
  );
};

export default PreviewStep;