import React, { useState } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import CycleTimeline from './CycleTimeline';
import { downloadStudyPlanDocument, canGenerateDocument } from '@/services/documentService';

const PreviewStep: React.FC<StepProps> = ({ formData }) => {
  const { personalInfo, targetYear, commitment, confidenceLevel, preview } = formData;
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadDocument = async () => {
    try {
      setIsDownloading(true);
      setDownloadError(null);
      await downloadStudyPlanDocument(formData);
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadError(error instanceof Error ? error.message : 'Failed to download document');
    } finally {
      setIsDownloading(false);
    }
  };

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

      {/* Download Document Section */}
      {canGenerateDocument(formData) && (
        <div className="preview-section">
          <h3 className="ms-font-subtitle preview-section-title">
            Download Your Plan
          </h3>
          <div className="preview-download-card">
            <div className="preview-download-content">
              <div className="preview-download-icon">📄</div>
              <div className="preview-download-text">
                <h4>Study Plan Document</h4>
                <p>Download your complete study plan as a Word document with detailed schedules, resources, and milestones.</p>
              </div>
            </div>
            <button
              onClick={handleDownloadDocument}
              disabled={isDownloading}
              className="ms-button ms-button-primary"
              style={{ marginTop: '1rem' }}
            >
              {isDownloading ? '⏳ Generating...' : '⬇️ Download Word Document'}
            </button>
            {downloadError && (
              <div className="preview-error-message" style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                backgroundColor: '#FFF4F4', 
                border: '1px solid #FFE0E0', 
                borderRadius: '4px',
                color: '#D32F2F'
              }}>
                ⚠️ {downloadError}
              </div>
            )}
          </div>
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