import { PersonalInfo, StepProps } from '@/types';
import type { Archetype, StudentIntake, SubjectApproach } from 'helios-ts';
import type { StudyStrategy, PersonalDetails } from 'helios-ts';
import { createStudentIntake } from 'helios-ts';

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
  
  function mapPersonalDetails(personalInfo: PersonalInfo): PersonalDetails {
    return {
      full_name: personalInfo.fullName,
      email: personalInfo.email,
      phone_number: personalInfo.phoneNumber,
      present_location: personalInfo.presentLocation,
      student_archetype: personalInfo.graduationStream,
      graduation_stream: personalInfo.graduationStream,
      college_university: personalInfo.collegeUniversity,
      year_of_passing: personalInfo.yearOfPassing,
    };
  }
  
  function mapPreparationBackground(_stepProps: StepProps) {
    return {
      preparing_since: '2024-01-01',
      number_of_attempts: '1',
      highest_stage_per_attempt: 'Prelims',
    };
  }
  
  function mapCoachingDetails(_stepProps: StepProps) {
    return {
      prior_coaching: 'No',
      prior_mentorship: 'No',
      place_of_preparation: 'Home',
      coaching_institute_name: '-',
      programme_mentor_name: '-',
    };
  }
  
  function mapOptionalSubject(stepProps: StepProps) {
    return {
      optional_subject_name: stepProps.formData.commitment.upscOptionalSubject,
      optional_status: 'Done coaching',
      optional_taken_from: '-',
    };
  }
  
  const dummyStuff = {
    subject_confidence: {},
    subject_approach: 'DualSubject' as SubjectApproach,
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
  }
  export function map2StudentIntake(stepProps: StepProps): StudentIntake {
    // @ts-ignore
    const { personalInfo, targetYear, commitment, confidenceLevel, preview } = stepProps.formData;
    const intake: StudentIntake = createStudentIntake({
      ...dummyStuff,
      study_strategy: studyStrategy,
      target_year: targetYear.targetYear,
      start_date: new Date().toISOString(),
      personal_details: mapPersonalDetails(personalInfo),
      preparation_background: mapPreparationBackground(stepProps),
      coaching_details: mapCoachingDetails(stepProps),
      optional_subject: mapOptionalSubject(stepProps),
    })
    return intake;
  }
  
  export function map2Config(stepProps: StepProps) {
    return config;
  }

  export function map2Archetype(stepProps: StepProps) {
    return archetype;
  }

  export function map2UserId(stepProps: StepProps) {
    return 'fakeuserid';
  }