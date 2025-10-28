import React, { useCallback, useState } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import CycleTimeline from './CycleTimeline';

const PreviewStep: React.FC<StepProps> = ({ formData }) => {
  const { personalInfo, targetYear, commitment, confidenceLevel, preview } = formData;

  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);

  const handleDownloadDocx = useCallback(async () => {
    try {
      setIsDownloadingDocx(true);

      // Lazy-load helios-ts to keep initial bundle small
      const [{ DocumentService, createStudentIntake }, dayjsModule] = await Promise.all([
        import('helios-ts'),
        import('dayjs')
      ]);

      const dayjs = dayjsModule.default;

      // Build minimal StudyPlan from preview cycles (scheduler schedules)
      const schedules: Array<{
        cycleType: string;
        startDate: string | Date;
        endDate: string | Date;
      }> = Array.isArray(preview.raw_helios_data?.cycles)
        ? preview.raw_helios_data.cycles
        : [];

      const studyPlan = {
        targeted_year: parseInt(targetYear.targetYear, 10) || new Date().getFullYear(),
        start_date: formData.targetYear.startDate || new Date(),
        study_plan_id: `plan_${Date.now()}`,
        user_id: personalInfo.email || 'anonymous',
        plan_title: `Study Plan for ${personalInfo.fullName || 'Student'}`,
        curated_resources: {
          essential_resources: [],
          recommended_timeline: { immediate_needs: [], mid_term_needs: [], long_term_needs: [] },
          budget_summary: { total_cost: 0, essential_cost: 0, optional_cost: 0, free_alternatives: 0, subscription_cost: 0 },
          alternative_options: []
        },
        cycles: schedules.map((c, index) => {
          const start = dayjs(c.startDate);
          const end = dayjs(c.endDate);
          const weeks = Math.max(1, Math.ceil(end.diff(start, 'day') / 7));
          return {
            cycleId: `${c.cycleType}-${index}`,
            cycleType: c.cycleType,
            cycleIntensity: 'Foundation',
            cycleDuration: weeks,
            cycleStartWeek: 1,
            cycleOrder: index + 1,
            cycleName: `${c.cycleType} Cycle`,
            cycleBlocks: [],
            cycleDescription: `${c.cycleType} cycle`,
            cycleStartDate: start.format('YYYY-MM-DD'),
            cycleEndDate: end.format('YYYY-MM-DD')
          };
        })
      } as any;

      // Map numeric confidence (1-5) to helios-ts ConfidenceLevel strings
      const numToLevel = (n: number): string => {
        if (n <= 1) return 'VeryWeak';
        if (n === 2) return 'Weak';
        if (n === 3) return 'Moderate';
        if (n === 4) return 'Strong';
        return 'VeryStrong';
      };
      const subjectConfidence: Record<string, string> = {};
      Object.entries(confidenceLevel || {}).forEach(([code, n]) => {
        if (typeof n === 'number') subjectConfidence[code] = numToLevel(n);
      });

      // Build StudentIntake using createStudentIntake
      const studentIntake = createStudentIntake({
        subject_confidence: subjectConfidence as any,
        study_strategy: {
          study_focus_combo: 'OneGSPlusOptional',
          weekly_study_hours: String(Math.max(1, commitment.timeCommitment) * 7),
          time_distribution: 'Balanced',
          study_approach: 'Balanced',
          revision_strategy: 'Standard',
          test_frequency: 'Weekly',
          seasonal_windows: [],
          catch_up_day_preference: commitment.catchupDayPreference || 'Saturday',
          optional_first_preference: !!commitment.optionalFirst,
          upsc_optional_subject: commitment.upscOptionalSubject,
          weekly_test_day_preference: commitment.weeklyTestDayPreference || 'Sunday'
        } as any,
        subject_approach: 'DualSubject',
        target_year: String(studyPlan.targeted_year),
        start_date: (formData.targetYear.startDate || new Date()).toISOString().slice(0, 10),
        personal_details: {
          full_name: personalInfo.fullName,
          email: personalInfo.email,
          phone_number: personalInfo.phoneNumber,
          present_location: personalInfo.presentLocation,
          student_archetype: 'General',
          graduation_stream: personalInfo.graduationStream,
          college_university: personalInfo.collegeUniversity,
          year_of_passing: Number(personalInfo.yearOfPassing) || new Date().getFullYear()
        },
        preparation_background: {
          preparing_since: 'Just Starting',
          number_of_attempts: '0',
          highest_stage_per_attempt: 'N/A'
        }
      } as any);

      await DocumentService.generateAndDownloadDocument(
        studyPlan,
        studentIntake,
        `study-plan-${studyPlan.targeted_year}.docx`
      );
    } catch (error) {
      // Surface minimal feedback; detailed logging in console
      console.error('Failed to generate DOCX:', error);
      alert('Failed to generate DOCX. Please try again.');
    } finally {
      setIsDownloadingDocx(false);
    }
  }, [commitment, confidenceLevel, formData.targetYear.startDate, personalInfo, targetYear.targetYear, preview.raw_helios_data?.cycles]);

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

        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <button
            className="ms-button ms-button-primary"
            onClick={handleDownloadDocx}
            disabled={isDownloadingDocx}
            aria-busy={isDownloadingDocx}
          >
            {isDownloadingDocx ? 'Preparing DOCX…' : 'Download Study Plan (DOCX)'}
          </button>
        </div>
      </div>
    </StepLayout>
  );
};

export default PreviewStep;