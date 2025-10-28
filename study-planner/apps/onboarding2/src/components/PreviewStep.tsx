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
      <div className="section">
        <h3 className="ms-font-subtitle section__title">Personal Summary</h3>
        <div className="info-card">
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
      <div className="section">
        <h3 className="ms-font-subtitle section__title">Study Plan Overview</h3>
        <div className="overview-card">
          <div className="overview-card__header">
            <span>🎯</span>
            <span>Your Personalized Plan is Ready!</span>
          </div>
          <p className="paragraph">
            Based on your inputs, we've created a comprehensive study plan tailored to your 
            target year ({targetYear.targetYear}) and daily commitment ({commitment.timeCommitment}+ hours).
          </p>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card__value">
                {preview.raw_helios_data?.totalHours || 2400}
              </div>
              <div className="stat-card__label">Total Study Hours</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">
                {Array.isArray(preview.raw_helios_data?.cycles) ? preview.raw_helios_data.cycles.length : (preview.raw_helios_data?.cycles || 3)}
              </div>
              <div className="stat-card__label">Study Cycles</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">
                {preview.raw_helios_data?.blocks || 12}
              </div>
              <div className="stat-card__label">Study Blocks</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value">
                {Object.keys(confidenceLevel).length}
              </div>
              <div className="stat-card__label">Subjects Covered</div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Milestones */}
      <div className="section">
        <h3 className="ms-font-subtitle section__title">Key Milestones</h3>
        <div className="form-grid form-grid-2">
          <div className="milestone-card">
            <div className="milestone-card__title">Foundation Complete</div>
            <div className="text-dark">
              {preview.milestones.foundationToPrelimsDate 
                ? preview.milestones.foundationToPrelimsDate.toLocaleDateString()
                : 'Feb 1, ' + targetYear.targetYear}
            </div>
          </div>
          <div className="milestone-card">
            <div className="milestone-card__title">Prelims Ready</div>
            <div className="text-dark">
              {preview.milestones.prelimsToMainsDate 
                ? preview.milestones.prelimsToMainsDate.toLocaleDateString()
                : 'May 20, ' + targetYear.targetYear}
            </div>
          </div>
        </div>
      </div>

      {/* Cycles Timeline - reuse the same display as TargetYearStep */}
      {Array.isArray(preview.raw_helios_data?.cycles) && preview.raw_helios_data.cycles.length > 0 && (
        <div className="section">
          <h3 className="ms-font-subtitle section__title">Cycle Timeline</h3>
          <CycleTimeline cycles={preview.raw_helios_data.cycles as any} />
        </div>
      )}

      {/* Next Steps */}
      <div className="cta-card">
        <div className="cta-card__header">
          <span>🚀</span>
          <span>Ready to Begin?</span>
        </div>
        <p className="paragraph paragraph--compact">
          Your personalized study plan is ready! Click "Complete Setup" to finalize your 
          registration and start your UPSC preparation journey with Helios.
        </p>
      </div>
    </StepLayout>
  );
};

export default PreviewStep;