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
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
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
              <div style={{ 
                fontWeight: 600, 
                color: 'var(--ms-blue)', 
                marginBottom: 20,
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📈</span>
                <span>Your Study Timeline</span>
              </div>
              
              <div style={{
                position: 'relative',
                padding: '20px 0'
              }}>
                {/* Timeline line */}
                <div style={{
                  position: 'absolute',
                  left: '20px',
                  top: '0',
                  bottom: '0',
                  width: '3px',
                  background: 'linear-gradient(180deg, #0078D4 0%, #106EBE 100%)',
                  borderRadius: '2px'
                }} />
                
                {plannedCycles.map((cycle, index) => {
                  const startDate = dayjs(cycle.startDate);
                  const endDate = dayjs(cycle.endDate);
                  const duration = endDate.diff(startDate, 'day');
                  const isLast = index === plannedCycles.length - 1;
                  
                  return (
                    <div key={`${cycle.cycleType}-${cycle.startDate}`} style={{
                      position: 'relative',
                      marginBottom: isLast ? '0' : '24px',
                      paddingLeft: '60px'
                    }}>
                      {/* Timeline node */}
                      <div style={{
                        position: 'absolute',
                        left: '8px',
                        top: '8px',
                        width: '24px',
                        height: '24px',
                        background: 'var(--ms-white)',
                        border: '3px solid #0078D4',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#0078D4',
                        zIndex: 2
                      }}>
                        {index + 1}
                      </div>
                      
                      {/* Cycle card */}
                      <div style={{
                        background: 'var(--ms-white)',
                        border: '1px solid #E1E1E1',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}>
                        {/* Cycle header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '12px'
                        }}>
                          <div>
                            <h4 style={{
                              margin: '0 0 4px 0',
                              fontSize: '16px',
                              fontWeight: '600',
                              color: 'var(--ms-blue)'
                            }}>
                              {getCycleDescription(cycle.cycleType)}
                            </h4>
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              fontWeight: '500'
                            }}>
                              Phase {index + 1} of {plannedCycles.length}
                            </div>
                          </div>
                          <div style={{
                            background: '#F0F8FF',
                            color: '#0078D4',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {duration} days
                          </div>
                        </div>
                        
                        {/* Timeline dates */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '14px',
                          color: '#666',
                          marginBottom: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📅</span>
                            <span>{startDate.format('MMM DD, YYYY')}</span>
                          </div>
                          <div style={{
                            width: '20px',
                            height: '1px',
                            background: '#E1E1E1',
                            margin: '0 8px'
                          }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🏁</span>
                            <span>{endDate.format('MMM DD, YYYY')}</span>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div style={{
                          width: '100%',
                          height: '6px',
                          background: '#F0F0F0',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, #0078D4 0%, #106EBE 100%)',
                            borderRadius: '3px',
                            animation: 'pulse 2s ease-in-out infinite'
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Timeline summary */}
              <div style={{
                background: 'linear-gradient(135deg, #F0F8FF 0%, #E6F3FF 100%)',
                border: '1px solid #B3D9FF',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '20px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--ms-blue)',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}>
                  Total Preparation Duration
                </div>
                <div style={{
                  fontSize: '20px',
                  color: 'var(--ms-blue)',
                  fontWeight: '700'
                }}>
                  {plannedCycles.length > 0 && (() => {
                    const firstCycle = dayjs(plannedCycles[0].startDate);
                    const lastCycle = dayjs(plannedCycles[plannedCycles.length - 1].endDate);
                    const totalDays = lastCycle.diff(firstCycle, 'day');
                    const months = Math.floor(totalDays / 30);
                    const days = totalDays % 30;
                    return `${months} month${months !== 1 ? 's' : ''} ${days} day${days !== 1 ? 's' : ''}`;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </StepLayout>
    </>
  );
};

export default TargetYearStep;