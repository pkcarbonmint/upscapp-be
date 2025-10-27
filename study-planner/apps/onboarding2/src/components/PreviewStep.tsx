import React, { useState, useEffect } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import { planCycles } from 'helios-scheduler';
import { SubjectLoader } from 'helios-ts';
import dayjs from 'dayjs';

const PreviewStep: React.FC<StepProps> = ({ formData }) => {
  const { personalInfo, targetYear, commitment, confidenceLevel, preview } = formData;
  const [studyPlan, setStudyPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateStudyPlan = async () => {
      if (!targetYear.targetYear) return;
      
      setLoading(true);
      try {
        // Calculate cycles
        const startDate = dayjs();
        const targetYearNum = parseInt(targetYear.targetYear);
        const prelimsExamDate = dayjs(`${targetYearNum}-05-26`);
        const mainsExamDate = dayjs(`${targetYearNum}-09-15`);

        const context = {
          startDate,
          targetYear: targetYearNum,
          prelimsExamDate,
          mainsExamDate,
          constraints: {
            maxHoursPerDay: 10,
            minHoursPerDay: 2,
            preferredStudyDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
          }
        };

        const cycles = planCycles(context);
        
        // Load subjects to calculate total hours
        const subjects = SubjectLoader.loadAllSubjects(commitment.upscOptionalSubject);
        const totalHours = subjects.reduce((sum, subject) => sum + subject.baselineHours, 0);
        
        // Calculate study hours per day
        const totalDays = dayjs(prelimsExamDate).diff(startDate, 'day');
        const hoursPerDay = Math.round(totalHours / totalDays * 10) / 10;

        setStudyPlan({
          cycles,
          totalHours,
          hoursPerDay,
          totalDays,
          subjects: subjects.length
        });
      } catch (error) {
        console.error('Failed to generate study plan:', error);
      } finally {
        setLoading(false);
      }
    };

    generateStudyPlan();
  }, [targetYear.targetYear, commitment.upscOptionalSubject]);

  const getCycleDescription = (cycleType: string) => {
    const descriptions: { [key: string]: string } = {
      'C1': 'NCERT Foundation - Building basic concepts and fundamentals',
      'C2': 'Comprehensive Foundation - Deep dive into all subjects',
      'C3': 'Advanced Preparation - Specialized topics and current affairs',
      'C4': 'Prelims Reading - Focus on prelims-specific content',
      'C5': 'Prelims Revision - Intensive revision and practice tests',
      'C5B': 'Rapid Revision - Final sprint before prelims',
      'C6': 'Mains Revision - Transition to mains preparation',
      'C7': 'Rapid Mains - Final preparation for mains exam',
      'C8': 'Mains Foundation - Direct mains preparation for late starters'
    };
    return descriptions[cycleType] || 'Study phase';
  };

  if (loading) {
    return (
      <StepLayout
        icon="👁️"
        title="Study Plan Preview"
        description="Generating your personalized study plan..."
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: 'var(--ms-gray-90)' }}>
            Calculating study hours, cycles and creating your personalized plan...
          </div>
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout
      icon="👁️"
      title="Study Plan Preview"
      description="Review your personalized UPSC study plan"
    >
      {/* Personal Summary */}
      <div style={{ marginBottom: '32px' }}>
        <h3 
          className="ms-font-subtitle" 
          style={{ marginBottom: '16px', color: 'var(--ms-blue)' }}
        >
          Personal Summary
        </h3>
        <div 
          style={{
            background: 'var(--ms-gray-20)',
            padding: '20px',
            borderRadius: '8px'
          }}
        >
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
      <div style={{ marginBottom: '32px' }}>
        <h3 
          className="ms-font-subtitle" 
          style={{ marginBottom: '16px', color: 'var(--ms-blue)' }}
        >
          Study Plan Overview
        </h3>
        <div 
          style={{
            background: 'var(--ms-green)',
            color: 'var(--ms-white)',
            padding: '24px',
            borderRadius: '12px'
          }}
        >
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              fontSize: '18px',
              fontWeight: '600'
            }}
          >
            <span>🎯</span>
            <span>Your Personalized Plan is Ready!</span>
          </div>
          <p style={{ margin: '0 0 16px', lineHeight: '1.6' }}>
            Based on your inputs, we've created a comprehensive study plan tailored to your 
            target year ({targetYear.targetYear}) and daily commitment ({commitment.timeCommitment}+ hours).
          </p>
          
          <div className="form-grid form-grid-2" style={{ marginTop: '16px' }}>
            <div 
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div 
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}
              >
                {studyPlan?.totalHours || 0}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Total Study Hours
              </div>
            </div>
            <div 
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div 
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}
              >
                {studyPlan?.cycles?.schedules?.length || 0}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Study Cycles
              </div>
            </div>
            <div 
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div 
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}
              >
                {studyPlan?.hoursPerDay || 0}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Hours per Day
              </div>
            </div>
            <div 
              style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center'
              }}
            >
              <div 
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}
              >
                {studyPlan?.subjects || 0}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Subjects Covered
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Study Cycles Detail */}
      {studyPlan?.cycles?.schedules && (
        <div style={{ marginBottom: '32px' }}>
          <h3 
            className="ms-font-subtitle" 
            style={{ marginBottom: '16px', color: 'var(--ms-blue)' }}
          >
            Study Phases (Cycles)
          </h3>
          <div className="form-grid form-grid-1">
            {studyPlan.cycles.schedules.map((cycle: any, index: number) => (
              <div 
                key={index}
                style={{
                  background: 'var(--ms-white)',
                  border: '1px solid var(--ms-gray-40)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '16px'
                }}
              >
                <div 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}
                >
                  <div 
                    style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: 'var(--ms-blue)'
                    }}
                  >
                    {cycle.cycleType}
                  </div>
                  <div 
                    style={{
                      fontSize: '12px',
                      color: 'var(--ms-gray-90)',
                      background: 'var(--ms-gray-20)',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}
                  >
                    {dayjs(cycle.endDate).diff(dayjs(cycle.startDate), 'day')} days
                  </div>
                </div>
                <div 
                  style={{
                    fontSize: '14px',
                    color: 'var(--ms-gray-130)',
                    marginBottom: '8px'
                  }}
                >
                  {getCycleDescription(cycle.cycleType)}
                </div>
                <div 
                  style={{
                    fontSize: '12px',
                    color: 'var(--ms-gray-90)'
                  }}
                >
                  {dayjs(cycle.startDate).format('MMM DD, YYYY')} - {dayjs(cycle.endDate).format('MMM DD, YYYY')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Milestones */}
      <div style={{ marginBottom: '32px' }}>
        <h3 
          className="ms-font-subtitle" 
          style={{ marginBottom: '16px', color: 'var(--ms-blue)' }}
        >
          Key Milestones
        </h3>
        <div className="form-grid form-grid-2">
          <div 
            style={{
              background: 'var(--ms-blue-light)',
              border: '1px solid var(--ms-blue)',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}
          >
            <div 
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--ms-blue)',
                marginBottom: '8px'
              }}
            >
              Foundation Complete
            </div>
            <div style={{ color: 'var(--ms-gray-130)' }}>
              {preview.milestones.foundationToPrelimsDate 
                ? preview.milestones.foundationToPrelimsDate.toLocaleDateString()
                : 'Feb 1, ' + targetYear.targetYear}
            </div>
          </div>
          <div 
            style={{
              background: 'var(--ms-blue-light)',
              border: '1px solid var(--ms-blue)',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}
          >
            <div 
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--ms-blue)',
                marginBottom: '8px'
              }}
            >
              Prelims Ready
            </div>
            <div style={{ color: 'var(--ms-gray-130)' }}>
              {preview.milestones.prelimsToMainsDate 
                ? preview.milestones.prelimsToMainsDate.toLocaleDateString()
                : 'May 20, ' + targetYear.targetYear}
            </div>
          </div>
        </div>
      </div>

      {/* Cycles and Descriptions */}
      {Array.isArray(preview.raw_helios_data?.cycles) && preview.raw_helios_data.cycles.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 className="ms-font-subtitle" style={{ marginBottom: '16px', color: 'var(--ms-blue)' }}>
            Cycle Timeline
          </h3>
          <div style={{ background: 'var(--ms-blue-light)', border: '1px solid var(--ms-blue)', padding: 16, borderRadius: 8 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {preview.raw_helios_data.cycles.map((c: any) => (
                <li key={`${c.cycleType}-${c.startDate}`}>
                  <strong>{c.cycleType}</strong> — {getCycleDescription(c.cycleType)}: {c.startDate} → {c.endDate}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div 
        style={{
          background: 'var(--ms-orange)',
          color: 'var(--ms-white)',
          padding: '24px',
          borderRadius: '12px'
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
            fontSize: '18px',
            fontWeight: '600'
          }}
        >
          <span>🚀</span>
          <span>Ready to Begin?</span>
        </div>
        <p style={{ margin: '0', lineHeight: '1.6' }}>
          Your personalized study plan is ready! Click "Complete Setup" to finalize your 
          registration and start your UPSC preparation journey with Helios.
        </p>
      </div>
    </StepLayout>
  );
};

export default PreviewStep;