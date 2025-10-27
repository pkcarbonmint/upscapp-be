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

  const getCycleColor = (cycleType: string) => {
    switch (cycleType) {
      case 'C1': return '#2F6FED';
      case 'C2': return '#1B9AAA';
      case 'C3': return '#8E6CFF';
      case 'C4': return '#F77062';
      case 'C5': return '#FF9F1C';
      case 'C5.b': return '#F94144';
      case 'C6': return '#2A9D8F';
      case 'C7': return '#E76F51';
      case 'C8': return '#264653';
      default: return '#6C757D';
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

  const yearOptions2 = yearOptions.map((opt) => ({
    ...opt,
    months: Math.ceil(dayjs(`${opt.year}-05-20`).diff(dayjs(), 'month', true))
  }));

  return (
    <StepLayout
      icon="📅"
      title="Choose Your Target Year"
      description="Select when you want to appear for the UPSC exam"
    >
      <div className="choice-grid choice-grid-3">
        {yearOptions2.map((option) => {
          const isSelected = formData.targetYear.targetYear === option.year;
          return (
            <div
              key={option.year}
              style={{
                background: isSelected 
                  ? 'linear-gradient(135deg, #0078D4 0%, #106EBE 100%)'
                  : 'linear-gradient(135deg, rgba(0, 120, 212, 0.1) 0%, rgba(16, 110, 190, 0.1) 100%)',
                color: isSelected ? 'var(--ms-white)' : 'var(--ms-blue)',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: isSelected 
                  ? '3px solid #0078D4' 
                  : '2px solid #E1E1E1',
                transform: isSelected 
                  ? 'scale(1.05)' 
                  : 'scale(1)',
                boxShadow: isSelected 
                  ? '0 12px 24px rgba(0, 120, 212, 0.35)' 
                  : '0 2px 4px rgba(0, 0, 0, 0.1)',
                position: 'relative'
              }}
              onClick={() => handleYearSelect(option.year)}
            >
              {isSelected && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'var(--ms-white)',
                    color: 'var(--ms-blue)',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  ✓
                </div>
              )}
              <div 
                style={{
                  fontSize: '48px',
                  fontWeight: '700',
                  marginBottom: '12px',
                  textAlign: 'center'
                }}
              >
                {option.year}
              </div>
              <div 
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  textAlign: 'center',
                  opacity: isSelected ? 1 : 0.8
                }}
              >
                ⏱️ {option.months} months available
              </div>
            </div>
          );
        })}
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
          {plannedCycles.length > 0 && (() => {
            const parsed = plannedCycles
              .map((c: any) => ({
                ...c,
                start: dayjs(c.startDate),
                end: dayjs(c.endDate),
                cycleType: c.cycleType
              }))
              .sort((a: any, b: any) => a.start.valueOf() - b.start.valueOf());
            
            return (
              <div style={{ marginTop: 24 }}>
                <div style={{ 
                  fontWeight: 600, 
                  color: 'var(--ms-blue)', 
                  marginBottom: 16,
                  fontSize: '18px'
                }}>
                  📚 Preparation Timeline
                </div>
                <div
                  style={{
                    background: 'var(--ms-white)',
                    borderRadius: 8,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {parsed.map((cycle: any, index: number) => {
                    const duration = cycle.end.diff(cycle.start, 'day');
                    const weeks = Math.round(duration / 7);
                    const label = getCycleDescription(cycle.cycleType);
                    const color = getCycleColor(cycle.cycleType);
                    
                    return (
                      <div
                        key={`${cycle.cycleType}-${cycle.startDate}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '12px',
                          background: 'rgba(0, 120, 212, 0.03)',
                          borderRadius: 8,
                          border: '1px solid rgba(0, 120, 212, 0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 120, 212, 0.08)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 120, 212, 0.03)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        {/* Cycle number badge */}
                        <div
                          style={{
                            minWidth: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: color,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                          }}
                        >
                          {index + 1}
                        </div>
                        
                        {/* Cycle info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '15px',
                              color: color,
                              marginBottom: '4px'
                            }}
                          >
                            {label}
                          </div>
                          <div
                            style={{
                              fontSize: '13px',
                              color: '#666',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <span>
                              📅 {cycle.start.format('MMM D, YYYY')} → {cycle.end.format('MMM D, YYYY')}
                            </span>
                            <span style={{ 
                              color: color,
                              fontWeight: 600,
                              background: `${color}15`,
                              padding: '2px 8px',
                              borderRadius: 4
                            }}>
                              {weeks} weeks
                            </span>
                          </div>
                        </div>
                        
                        {/* Visual duration bar */}
                        <div
                          style={{
                            width: '120px',
                            height: '8px',
                            background: '#E1E1E1',
                            borderRadius: 4,
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: '100%',
                              background: `linear-gradient(90deg, ${color}AA, ${color})`,
                              borderRadius: 4
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </StepLayout>
  );
};

export default TargetYearStep;