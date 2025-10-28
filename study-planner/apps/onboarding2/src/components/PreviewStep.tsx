import React from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import CycleTimeline from './CycleTimeline';
import type { Archetype, StudentIntake } from 'helios-ts';
import type { StudyStrategy, PersonalDetails } from 'helios-ts';
import { CalendarDocxService, createStudentIntake } from 'helios-ts';

const config = {
  block_duration_clamp: {
    min_weeks: 2,
    max_weeks: 8,
},
daily_hour_limits: {
    regular_day: 8,
    catch_up_day: 5,
    test_day: 6,
},
task_effort_split: {
  study: 0.6,
  revision: 0.2,
  practice: 0.15,
  test: 0.05,
  gs_optional_ratio: 1,
}

} as const;

const studyStrategy: StudyStrategy = {
  study_focus_combo: 'OneGSPlusOptional',
  weekly_study_hours: '40',
  time_distribution: 'Balanced',
  study_approach: 'Balanced',
  revision_strategy: 'Balanced',
  test_frequency: 'Balanced',
  seasonal_windows: [],
  catch_up_day_preference: 'Sunday',
  upsc_optional_subject: 'OPT-SOC',
};

const archetype: Archetype = {
  archetype: 'Full-Time Professional',
  timeCommitment: 'FullTime',
  weeklyHoursMin: 35,
  weeklyHoursMax: 50,
  description: 'Full-time student with 40+ hours per week',
  defaultPacing: 'Balanced',
  defaultApproach: 'DualSubject',
  specialFocus: [],
};
const personalDetails: PersonalDetails = {
  full_name: 'John Doe',
  email: 'john.doe@example.com',
  phone_number: '1234567890',
  present_location: 'New York, NY',
  student_archetype: 'Full-Time Professional',
  graduation_stream: 'Bachelor of Science',
  college_university: 'Example University',
  year_of_passing: 2024,
};


const PreviewStep: React.FC<StepProps> = ({ formData }) => {
  const { personalInfo, targetYear, commitment, confidenceLevel, preview } = formData;

  async function downloadPlan() {
    // generate plan using generateInitialPlan function
    // pass the plan to CalendarDocxService to generate word document
    // the document should be saved in a buffer and downloaded to the user's browser
    const intake: StudentIntake = createStudentIntake({
      subject_confidence: {},
      study_strategy: studyStrategy,
      subject_approach: 'DualSubject',
      target_year: targetYear.targetYear,
      start_date: new Date().toISOString(),
      personal_details: personalDetails,
      preparation_background: {
        preparing_since: '2024-01-01',
        number_of_attempts: '1',
        highest_stage_per_attempt: 'Prelims',
        last_attempt_gs_prelims_score: 85,
        last_attempt_csat_score: 120,
      },
      coaching_details: {
        prior_coaching: 'No',
        prior_mentorship: 'No',
        place_of_preparation: 'Home',
        coaching_institute_name: 'Example Coaching Institute',
        programme_mentor_name: 'Example Programme Mentor',
      },
      optional_subject: {
        optional_subject_name: 'Public Administration',
        optional_status: 'Done coaching',
        optional_taken_from: 'Example Institute',
      },
      test_experience: {
        test_series_attempted: ['Test Series A', 'Test Series B'],
        csat_self_assessment: 'Average',
        csat_weak_areas: ['Area 1', 'Area 2'],
      },
      syllabus_awareness: {
        gs_syllabus_understanding: 'Average',
        optional_syllabus_understanding: 'Average',
        pyq_awareness_and_use: 'Average',
      },
    })
    const userId = 'fakeuserid'
    const { generateInitialPlan } = await import('helios-ts');
    const {plan} = await generateInitialPlan(userId, config, archetype, intake);
    const blob = await CalendarDocxService.generateStudyPlanDocxBlob(plan, intake);
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element to trigger download
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `study-plan-${targetYear.targetYear}.docx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    
    // Clean up the blob URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }



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
        <button onClick={downloadPlan} className="ms-button ms-button-primary">Download Plan</button>
      </div>
    </StepLayout>
  );
};

export default PreviewStep;