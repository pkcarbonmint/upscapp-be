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
                end: dayjs(c.endDate)
              }))
              .sort((a: any, b: any) => a.start.valueOf() - b.start.valueOf());
            
            return (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, color: 'var(--ms-blue)', marginBottom: 16, fontSize: '18px' }}>
                  📅 Preparation Timeline
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {parsed.map((cycle: any, index: number) => {
                    const duration = cycle.end.diff(cycle.start, 'day');
                    const durationWeeks = Math.round(duration / 7);
                    const isLast = index === parsed.length - 1;
                    
                    return (
                      <div key={`${cycle.cycleType}-${cycle.startDate}`} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Timeline connector line */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '24px' }}>
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: getCycleColor(cycle.cycleType),
                              border: '3px solid var(--ms-white)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              zIndex: 2,
                              position: 'relative'
                            }}
                          />
                          {!isLast && (
                            <div
                              style={{
                                width: '2px',
                                height: '40px',
                                background: 'linear-gradient(to bottom, var(--ms-blue-light), var(--ms-blue))',
                                marginTop: '4px'
                              }}
                            />
                          )}
                        </div>
                        
                        {/* Cycle card */}
                        <div
                          style={{
                            flex: 1,
                            background: 'var(--ms-white)',
                            border: `2px solid ${getCycleColor(cycle.cycleType)}`,
                            borderRadius: '12px',
                            padding: '16px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <div
                                style={{
                                  fontSize: '16px',
                                  fontWeight: '700',
                                  color: getCycleColor(cycle.cycleType),
                                  marginBottom: '4px'
                                }}
                              >
                                {getCycleDescription(cycle.cycleType)}
                              </div>
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--ms-blue)',
                                  fontWeight: '500'
                                }}
                              >
                                {cycle.start.format('MMM D, YYYY')} → {cycle.end.format('MMM D, YYYY')}
                              </div>
                            </div>
                            <div
                              style={{
                                background: getCycleColor(cycle.cycleType),
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                minWidth: '60px',
                                textAlign: 'center'
                              }}
                            >
                              {durationWeeks}w
                            </div>
                          </div>
                          
                          {/* Progress bar for cycle duration */}
                          <div
                            style={{
                              width: '100%',
                              height: '6px',
                              background: 'var(--ms-blue-light)',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                background: `linear-gradient(90deg, ${getCycleColor(cycle.cycleType)} 0%, ${getCycleColor(cycle.cycleType)}80 100%)`,
                                borderRadius: '3px'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Timeline summary */}
                <div
                  style={{
                    marginTop: '20px',
                    padding: '16px',
                    background: 'linear-gradient(135deg, var(--ms-blue-light) 0%, rgba(0, 120, 212, 0.05) 100%)',
                    borderRadius: '12px',
                    border: '1px solid var(--ms-blue-light)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ms-blue)', marginBottom: '4px' }}>
                        Total Preparation Period
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ms-blue)', opacity: 0.8 }}>
                        {parsed[0].start.format('MMM D, YYYY')} → {parsed[parsed.length - 1].end.format('MMM D, YYYY')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--ms-blue)' }}>
                        {parsed.length} Cycles
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ms-blue)', opacity: 0.8 }}>
                        {Math.round(parsed[parsed.length - 1].end.diff(parsed[0].start, 'week'))} weeks total
                      </div>
                    </div>
                  </div>
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