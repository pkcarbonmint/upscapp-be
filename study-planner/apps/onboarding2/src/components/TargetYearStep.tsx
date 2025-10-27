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
          {plannedCycles.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 600, color: 'var(--ms-blue)', marginBottom: 16, fontSize: '16px' }}>
                📚 Your Preparation Timeline
              </div>
              <div style={{ 
                position: 'relative',
                padding: '20px 0',
                overflow: 'auto'
              }}>
                {/* Timeline Container */}
                <div style={{
                  display: 'flex',
                  gap: '0',
                  position: 'relative',
                  minWidth: 'fit-content'
                }}>
                  {plannedCycles.map((cycle, index) => {
                    const startDate = dayjs(cycle.startDate);
                    const endDate = dayjs(cycle.endDate);
                    const durationDays = endDate.diff(startDate, 'day');
                    const durationWeeks = Math.ceil(durationDays / 7);
                    
                    return (
                      <div
                        key={`${cycle.cycleType}-${cycle.startDate}`}
                        style={{
                          flex: `0 0 ${Math.max(120, durationWeeks * 8)}px`,
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {/* Timeline Bar */}
                        <div style={{
                          background: `linear-gradient(135deg, 
                            ${index % 4 === 0 ? '#0078D4' : 
                              index % 4 === 1 ? '#00BCF2' : 
                              index % 4 === 2 ? '#8661C5' : '#00B7C3'}, 
                            ${index % 4 === 0 ? '#106EBE' : 
                              index % 4 === 1 ? '#00A2D4' : 
                              index % 4 === 2 ? '#744DA9' : '#009CA4'})`,
                          borderRadius: '8px',
                          padding: '12px',
                          minHeight: '80px',
                          color: 'white',
                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                        }}
                        >
                          {/* Cycle Badge */}
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(255, 255, 255, 0.3)',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: '600',
                          }}>
                            {cycle.cycleType}
                          </div>
                          
                          {/* Cycle Name */}
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            marginBottom: '8px',
                            lineHeight: '1.3',
                            paddingRight: '50px',
                          }}>
                            {getCycleDescription(cycle.cycleType)}
                          </div>
                          
                          {/* Duration */}
                          <div style={{
                            fontSize: '11px',
                            opacity: 0.9,
                            marginTop: 'auto',
                          }}>
                            ⏱️ {durationWeeks} week{durationWeeks !== 1 ? 's' : ''}
                          </div>
                        </div>
                        
                        {/* Date Labels */}
                        <div style={{
                          marginTop: '8px',
                          fontSize: '11px',
                          color: 'var(--ms-blue)',
                          fontWeight: '500',
                        }}>
                          <div>{startDate.format('MMM D, YYYY')}</div>
                          {index === plannedCycles.length - 1 && (
                            <div style={{ marginTop: '4px', color: '#666' }}>
                              → {endDate.format('MMM D, YYYY')}
                            </div>
                          )}
                        </div>
                        
                        {/* Arrow Connector */}
                        {index < plannedCycles.length - 1 && (
                          <div style={{
                            position: 'absolute',
                            right: '-12px',
                            top: '40px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            color: 'var(--ms-blue)',
                            fontSize: '20px',
                            fontWeight: 'bold',
                          }}>
                            →
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Summary */}
                <div style={{
                  marginTop: '20px',
                  padding: '12px',
                  background: 'rgba(0, 120, 212, 0.08)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: 'var(--ms-blue)',
                  fontWeight: '500',
                }}>
                  <strong>Total Journey:</strong> {plannedCycles.length} phase{plannedCycles.length !== 1 ? 's' : ''} • 
                  From {dayjs(plannedCycles[0]?.startDate).format('MMM YYYY')} to {dayjs(plannedCycles[plannedCycles.length - 1]?.endDate).format('MMM YYYY')}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </StepLayout>
  );
};

export default TargetYearStep;