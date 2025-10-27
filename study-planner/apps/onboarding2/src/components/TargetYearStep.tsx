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
                : 'var(--ms-blue)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: formData.targetYear.targetYear === option.year 
                ? '3px solid var(--ms-blue)' 
                : '2px solid var(--ms-gray-light)',
              transform: formData.targetYear.targetYear === option.year 
                ? 'translateY(-4px) scale(1.02)' 
                : 'translateY(0) scale(1)',
              boxShadow: formData.targetYear.targetYear === option.year 
                ? '0 12px 24px rgba(0, 120, 212, 0.3)' 
                : '0 4px 8px rgba(0, 0, 0, 0.1)',
              position: 'relative'
            }}
            onClick={() => handleYearSelect(option.year)}
          >
            {formData.targetYear.targetYear === option.year && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'var(--ms-white)',
                  color: 'var(--ms-blue)',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                ✓
              </div>
            )}
            <div 
              style={{
                fontSize: '36px',
                fontWeight: '700',
                marginBottom: '12px',
                textAlign: 'center'
              }}
            >
              {option.year}
            </div>
            <div 
              style={{
                fontSize: '16px',
                opacity: 0.9,
                textAlign: 'center',
                fontWeight: '500'
              }}
            >
              ⏱️ {option.months} months
            </div>
          </div>
        ))}
      </div>
      
      {formData.targetYear.targetYear && (
        <div style={{ marginTop: '32px' }}>
          {/* Calculated Cycles Section */}
          {plannedCycles.length > 0 && (
            <div 
              style={{
                background: 'var(--ms-blue-light)',
                border: '1px solid var(--ms-blue)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px'
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
                <span>🔄</span>
                <span>Your Study Plan - {formData.targetYear.targetYear}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {plannedCycles.map(c => (
                  <div
                    key={`${c.cycleType}-${c.startDate}`}
                    style={{
                      background: 'var(--ms-white)',
                      border: '1px solid var(--ms-blue)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--ms-blue)',
                      boxShadow: '0 2px 4px rgba(0, 120, 212, 0.1)'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {getCycleDescription(c.cycleType)}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                      {c.startDate} → {c.endDate}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preparation Analysis Section */}
          <div 
            style={{
              background: 'var(--ms-gray-light)',
              border: '1px solid var(--ms-gray)',
              borderRadius: '12px',
              padding: '24px'
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
              <span>Preparation Analysis</span>
            </div>
            <div className="form-grid form-grid-3" style={{ marginTop: '12px' }}>
              {yearOptions
                .filter(option => option.year === formData.targetYear.targetYear)
                .map(option => (
                  <React.Fragment key={option.year}>
                    <div 
                      style={{
                        background: 'var(--ms-white)',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid var(--ms-gray)'
                      }}
                    >
                      <strong>Time Available:</strong><br />
                      {option.months} months
                    </div>
                    <div 
                      style={{
                        background: 'var(--ms-white)',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid var(--ms-gray)'
                      }}
                    >
                      <strong>Recommended Intensity:</strong><br />
                      {option.intensity}
                    </div>
                    <div 
                      style={{
                        background: 'var(--ms-white)',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid var(--ms-gray)'
                      }}
                    >
                      <strong>Success Probability:</strong><br />
                      {option.probability}
                    </div>
                  </React.Fragment>
                ))}
            </div>
          </div>
        </div>
      )}
    </StepLayout>
  );
};

export default TargetYearStep;