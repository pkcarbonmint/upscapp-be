import React, { useEffect, useState } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import { planCycles, PlanningContext, CycleType } from '@helios/helios-scheduler';
import dayjs from 'dayjs';

const PreviewStep: React.FC<StepProps> = ({ formData }) => {
  const { personalInfo, targetYear, commitment, confidenceLevel, preview } = formData;
  const [cycles, setCycles] = useState<any[]>([]);
  const [totalHours, setTotalHours] = useState<number>(0);

  useEffect(() => {
    if (targetYear.targetYear) {
      const today = dayjs();
      const year = parseInt(targetYear.targetYear);
      const prelimsDate = dayjs(`${year}-05-15`);
      const mainsDate = dayjs(`${year}-09-15`);
      
      const context: PlanningContext = {
        startDate: today,
        targetYear: year,
        prelimsExamDate: prelimsDate,
        mainsExamDate: mainsDate,
        optionalSubject: { subjectCode: commitment.upscOptionalSubject, subjectNname: '', examFocus: 'MainsOnly', topics: [], baselineMinutes: 0 },
        constraints: {
          optionalSubjectCode: commitment.upscOptionalSubject,
          confidenceMap: {},
          optionalFirst: false,
          catchupDay: 6,
          testDay: 0,
          workingHoursPerDay: commitment.timeCommitment,
          breaks: [],
          testMinutes: 180
        },
        subjects: [],
        relativeAllocationWeights: {}
      };

      try {
        const result = planCycles(context);
        setCycles(result.schedules || []);
        
        // Calculate total study hours
        const monthsAvailable = prelimsDate.diff(today, 'month', true);
        const estimatedHours = monthsAvailable * 30 * commitment.timeCommitment;
        setTotalHours(Math.round(estimatedHours));
      } catch (error) {
        console.error('Error calculating cycles:', error);
      }
    }
  }, [targetYear.targetYear, commitment.timeCommitment, commitment.upscOptionalSubject]);

  const getCycleDescription = (cycleType: CycleType): string => {
    const descriptions: Record<CycleType, string> = {
      [CycleType.C1]: 'NCERT Foundation - Building basic concepts',
      [CycleType.C2]: 'Comprehensive Foundation - Deep subject coverage',
      [CycleType.C3]: 'Mains Revision Pre-Prelims - Strategic preparation',
      [CycleType.C4]: 'Prelims Reading - Intensive prelims focus',
      [CycleType.C5]: 'Prelims Revision - Final prelims preparation',
      [CycleType.C5B]: 'Prelims Rapid Revision - Last minute prep',
      [CycleType.C6]: 'Mains Revision - Mains focused study',
      [CycleType.C7]: 'Mains Rapid Revision - Final mains push',
      [CycleType.C8]: 'Mains Foundation - Direct mains preparation'
    };
    return descriptions[cycleType] || 'Study cycle';
  };

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
                {totalHours || preview.raw_helios_data?.totalHours || 2400}
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
                {cycles.length || preview.raw_helios_data?.cycles || 3}
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
                {commitment.timeCommitment}+
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Hours Per Day
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
                {Object.keys(confidenceLevel).length}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Subjects Covered
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Study Cycles */}
      <div style={{ marginBottom: '32px' }}>
        <h3 
          className="ms-font-subtitle" 
          style={{ marginBottom: '16px', color: 'var(--ms-blue)' }}
        >
          Your Study Cycles
        </h3>
        <div 
          style={{
            background: 'var(--ms-white)',
            border: '1px solid var(--ms-gray-40)',
            borderRadius: '8px',
            padding: '20px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {cycles.length > 0 ? (
            cycles.map((cycle, idx) => (
              <div 
                key={idx}
                style={{
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: idx < cycles.length - 1 ? '1px solid var(--ms-gray-30)' : 'none'
                }}
              >
                <div 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ fontWeight: '600', color: 'var(--ms-blue)' }}>
                    {cycle.cycleType}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ms-gray-90)' }}>
                    {dayjs(cycle.startDate).format('MMM D, YYYY')} - {dayjs(cycle.endDate).format('MMM D, YYYY')}
                  </div>
                </div>
                <div 
                  style={{
                    fontSize: '13px',
                    color: 'var(--ms-gray-130)',
                    lineHeight: '1.5'
                  }}
                >
                  {getCycleDescription(cycle.cycleType)}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--ms-gray-90)', padding: '20px' }}>
              Calculating your personalized study cycles...
            </div>
          )}
        </div>
      </div>

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