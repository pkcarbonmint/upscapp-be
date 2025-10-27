import React, { useMemo } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import dayjs from 'dayjs';
import { planCycles } from 'helios-scheduler';

const PreviewStep: React.FC<StepProps> = ({ formData }) => {
  const { personalInfo, targetYear, commitment, confidenceLevel, preview } = formData;
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
                {preview.raw_helios_data?.totalHours || 2400}
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
                {Array.isArray(preview.raw_helios_data?.cycles) ? preview.raw_helios_data.cycles.length : (preview.raw_helios_data?.cycles || 3)}
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
                {preview.raw_helios_data?.blocks || 12}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Study Blocks
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

      {/* Cycle Timeline */}
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
          <div style={{ marginBottom: '32px' }}>
            <h3 className="ms-font-subtitle" style={{ marginBottom: '16px', color: 'var(--ms-blue)' }}>
              Preparation Timeline
            </h3>
            <div
              style={{
                background: 'var(--ms-blue-light)',
                border: '1px solid var(--ms-blue)',
                borderRadius: 8,
                padding: 12
              }}
            >
              <div
                style={{
                  maxHeight: 360,
                  overflowY: 'auto',
                  position: 'relative',
                  paddingLeft: 24
                }}
              >
                {/* vertical guide line */}
                <div
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: '#e5e7eb'
                  }}
                />
                {segments.map((seg: any) => (
                  <div key={seg.key} style={{ position: 'relative', marginBottom: 16 }}>
                    {/* label and dates */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 700, color: seg.color }}>{seg.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--ms-blue)' }}>
                        {seg.startLabel} — {seg.endLabel}
                      </div>
                    </div>
                    {/* per-item timeline bar showing relative position and duration */}
                    <div
                      title={`${seg.label}: ${seg.startLabel} → ${seg.endLabel}`}
                      style={{
                        position: 'relative',
                        height: 10,
                        marginTop: 6,
                        background: '#f5f7fa',
                        border: '1px solid #e5e7eb',
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
          </div>
        );
      })()}

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