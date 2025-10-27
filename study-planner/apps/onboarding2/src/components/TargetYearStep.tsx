import React, { useMemo } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import dayjs from 'dayjs';
import { planCycles } from 'helios-scheduler';

const TargetYearStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const getCycleDescription = (cycleType: string) => {
    switch (cycleType) {
      case 'C1': return 'NCERT Foundation';
      case 'C2': return 'Comprehensive Foundation';
      case 'C3': return 'Mains Revision Pre-Prelims';
      case 'C4': return 'Prelims Reading';
      case 'C5': return 'Prelims Revision';
      case 'C5.b': return 'Prelims Rapid Revision';
      case 'C6': return 'Mains Revision';
      case 'C7': return 'Rapid Mains';
      case 'C8': return 'Mains Foundation';
      default: return 'Study Cycle';
    }
  };

  const handleYearSelect = (year: string) => {
    updateFormData({
      targetYear: {
        ...formData.targetYear,
        targetYear: year
      }
    });
  };

  const yearOptions = [
    {
      year: '2026',
      months: 16,
      intensity: 'High (8-10 hrs/day)',
      probability: '65%'
    },
    {
      year: '2027', 
      months: 28,
      intensity: 'Moderate (6-8 hrs/day)',
      probability: '78%'
    },
    {
      year: '2028',
      months: 40,
      intensity: 'Comfortable (4-6 hrs/day)', 
      probability: '85%'
    }
  ];

  const plannedCycles = useMemo(() => {
    const target = parseInt(formData.targetYear.targetYear || String(new Date().getFullYear() + 2));
    const start = dayjs(formData.targetYear.startDate || new Date());
    try {
      const prelims = dayjs(`${target}-05-20`);
      const mains = dayjs(`${target}-09-20`);
      const result = planCycles({
        optionalSubject: {
          subjectCode: formData.commitment.upscOptionalSubject,
          subjectNname: 'Optional',
          examFocus: 'MainsOnly',
          topics: [],
          baselineMinutes: 0
        },
        startDate: start,
        targetYear: target,
        prelimsExamDate: prelims,
        mainsExamDate: mains,
        constraints: {
          optionalSubjectCode: formData.commitment.upscOptionalSubject,
          confidenceMap: {},
          optionalFirst: formData.commitment.optionalFirst,
          catchupDay: 6,
          testDay: 0,
          workingHoursPerDay: formData.commitment.timeCommitment,
          breaks: [],
          testMinutes: formData.commitment.testMinutes,
        },
        subjects: [],
        relativeAllocationWeights: {}
      });
      return result.schedules;
    } catch {
      return [];
    }
  }, [formData.targetYear, formData.commitment]);

  const getCyclesForYear = (year: string) => {
    const target = parseInt(year);
    const start = dayjs(formData.targetYear.startDate || new Date());
    try {
      const prelims = dayjs(`${target}-05-20`);
      const mains = dayjs(`${target}-09-20`);
      return planCycles({
        optionalSubject: {
          subjectCode: formData.commitment.upscOptionalSubject,
          subjectNname: 'Optional',
          examFocus: 'MainsOnly',
          topics: [],
          baselineMinutes: 0
        },
        startDate: start,
        targetYear: target,
        prelimsExamDate: prelims,
        mainsExamDate: mains,
        constraints: {
          optionalSubjectCode: formData.commitment.upscOptionalSubject,
          confidenceMap: {},
          optionalFirst: formData.commitment.optionalFirst,
          catchupDay: 6,
          testDay: 0,
          workingHoursPerDay: formData.commitment.timeCommitment,
          breaks: [],
          testMinutes: formData.commitment.testMinutes,
        },
        subjects: [],
        relativeAllocationWeights: {}
      }).schedules;
    } catch {
      return [];
    }
  };

  return (
    <StepLayout
      icon="📅"
      title="Choose Your Target Year"
      description="Select when you want to appear for the UPSC exam"
    >
      <div className="choice-grid choice-grid-3">
        {yearOptions.map((option) => (
          <div
            key={option.year}
            style={{
              background: formData.targetYear.targetYear === option.year 
                ? 'linear-gradient(135deg, var(--ms-blue) 0%, var(--ms-teal) 100%)'
                : 'var(--ms-white)',
              color: formData.targetYear.targetYear === option.year 
                ? 'var(--ms-white)' 
                : 'var(--ms-gray-130)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: formData.targetYear.targetYear === option.year 
                ? '2px solid var(--ms-blue)' 
                : '2px solid var(--ms-gray-40)',
              transform: formData.targetYear.targetYear === option.year 
                ? 'translateY(-2px)' 
                : 'translateY(0)',
              boxShadow: formData.targetYear.targetYear === option.year 
                ? '0 8px 16px rgba(0, 120, 212, 0.25)' 
                : '0 2px 4px rgba(0, 0, 0, 0.08)'
            }}
            onClick={() => handleYearSelect(option.year)}
          >
            <div 
              style={{
                fontSize: '32px',
                fontWeight: '600',
                marginBottom: '12px',
                textAlign: 'center'
              }}
            >
              {option.year}
            </div>
            <div 
              style={{
                fontSize: '14px',
                opacity: 0.9,
                textAlign: 'center',
                fontWeight: '500'
              }}
            >
              ⏱️ {option.months} months available
            </div>
          </div>
        ))}
      </div>
      
      {formData.targetYear.targetYear && (
        <div 
          style={{
            background: 'var(--ms-blue-light)',
            border: '1px solid var(--ms-blue)',
            borderRadius: '12px',
            padding: '24px',
            marginTop: '32px'
          }}
        >
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              color: 'var(--ms-blue)',
              fontWeight: '600',
              fontSize: '18px'
            }}
          >
            <span>📊</span>
            <span>Your Preparation Analysis</span>
          </div>
          <div className="form-grid form-grid-3" style={{ marginTop: '12px' }}>
            {yearOptions
              .filter(option => option.year === formData.targetYear.targetYear)
              .map(option => (
                <React.Fragment key={option.year}>
                  <div 
                    style={{
                      background: 'var(--ms-white)',
                      padding: '12px',
                      borderRadius: '4px'
                    }}
                  >
                    <strong>Time Available:</strong><br />
                    {option.months} months
                  </div>
                  <div 
                    style={{
                      background: 'var(--ms-white)',
                      padding: '12px',
                      borderRadius: '4px'
                    }}
                  >
                    <strong>Recommended Intensity:</strong><br />
                    {option.intensity}
                  </div>
                  <div 
                    style={{
                      background: 'var(--ms-white)',
                      padding: '12px',
                      borderRadius: '4px'
                    }}
                  >
                    <strong>Success Probability:</strong><br />
                    {option.probability}
                  </div>
                </React.Fragment>
              ))}
          </div>
          {plannedCycles.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, color: 'var(--ms-blue)', marginBottom: 8 }}>Calculated Cycles</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {plannedCycles.map(c => (
                  <li key={`${c.cycleType}-${c.startDate}`}>{getCycleDescription(c.cycleType)}: {c.startDate} → {c.endDate}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </StepLayout>
  );
};

export default TargetYearStep;