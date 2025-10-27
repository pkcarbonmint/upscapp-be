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
            const earliest = parsed[0].start;
            const latest = parsed.reduce((acc: any, c: any) => (c.end.isAfter(acc) ? c.end : acc), parsed[0].end);
            const totalDays = Math.max(latest.diff(earliest, 'day', true), 1);
            const segments = parsed.map((c: any) => {
              const offsetDays = Math.max(c.start.diff(earliest, 'day', true), 0);
              const durationDays = Math.max(c.end.diff(c.start, 'day', true), 1);
              const leftPercent = (offsetDays / totalDays) * 100;
              const widthPercent = Math.max((durationDays / totalDays) * 100, 2);
              return {
                key: `${c.cycleType}-${c.startDate}`,
                label: getCycleDescription(c.cycleType),
                leftPercent,
                widthPercent,
                color: getCycleColor(c.cycleType),
                startLabel: c.start.format('MMM D'),
                endLabel: c.end.format('MMM D')
              };
            });
            return (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, color: 'var(--ms-blue)', marginBottom: 8 }}>Preparation Timeline</div>
                <div
                  style={{
                    background: 'var(--ms-white)',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 16
                  }}
                >
                  <div
                    style={{
                      maxHeight: 360,
                      overflowY: 'auto',
                      position: 'relative'
                    }}
                  >
                    {segments.map((seg: any) => (
                      <div key={seg.key} style={{ marginBottom: 20 }}>
                        {/* label and dates */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                          <div style={{ fontWeight: 700, color: seg.color, fontSize: '16px' }}>{seg.label}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            {seg.startLabel} — {seg.endLabel}
                          </div>
                        </div>
                        {/* per-item timeline bar showing relative position and duration */}
                        <div
                          title={`${seg.label}: ${seg.startLabel} → ${seg.endLabel}`}
                          style={{
                            position: 'relative',
                            height: 12,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 6,
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: `${seg.leftPercent}%`,
                              width: `${seg.widthPercent}%`,
                              top: 0,
                              bottom: 0,
                              background: seg.color,
                              opacity: 0.9
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 6,
                    fontSize: 12,
                    color: 'var(--ms-blue)'
                  }}
                >
                  <span>{earliest.format('MMM D, YYYY')}</span>
                  <span>{latest.format('MMM D, YYYY')}</span>
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