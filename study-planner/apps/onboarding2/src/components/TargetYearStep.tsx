import React, { useEffect, useMemo, useState } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import dayjs from 'dayjs';
import { planCycles } from 'helios-scheduler/plan-cycles';
import type { PlanningContext, PlannerConstraints, CycleSchedule } from 'helios-scheduler/types';
import { S2WeekDay } from 'helios-scheduler/types';

const TargetYearStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const [cycles, setCycles] = useState<CycleSchedule[] | null>(null);
  const [scenario, setScenario] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const constraints: PlannerConstraints = useMemo(() => ({
    optionalSubjectCode: formData.commitment.upscOptionalSubject,
    confidenceMap: {},
    optionalFirst: formData.commitment.optionalFirst,
    catchupDay: S2WeekDay.Saturday,
    testDay: S2WeekDay.Sunday,
    workingHoursPerDay: Math.max(4, Math.min(10, formData.commitment.timeCommitment)),
    breaks: [],
    testMinutes: formData.commitment.testMinutes,
  }), [formData.commitment]);

  useEffect(() => {
    async function computeCycles() {
      setError(null);
      setCycles(null);
      setScenario(null);
      const targetYearNum = parseInt(formData.targetYear.targetYear || '0', 10);
      if (!targetYearNum) return;

      const startDateStr = formData.targetYear.startDate
        ? new Date(formData.targetYear.startDate).toISOString().slice(0, 10)
        : dayjs().format('YYYY-MM-DD');

      const prelimsExamDate = dayjs(`${targetYearNum}-05-28`);
      const mainsExamDate = dayjs(`${targetYearNum}-09-15`);

      const context: PlanningContext = {
        optionalSubject: { subjectCode: formData.commitment.upscOptionalSubject, subjectNname: 'Optional', examFocus: 'BothExams', topics: [], baselineMinutes: 0 },
        startDate: dayjs(startDateStr),
        targetYear: targetYearNum,
        prelimsExamDate,
        mainsExamDate,
        constraints,
        subjects: [],
        relativeAllocationWeights: {},
      } as any;

      try {
        const result = planCycles(context);
        setCycles(result.schedules);
        setScenario(result.scenario);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to compute cycles');
      }
    }
    computeCycles();
  }, [formData.targetYear.targetYear, formData.targetYear.startDate, constraints, formData.commitment.upscOptionalSubject]);

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
              background: 'linear-gradient(135deg, var(--ms-blue) 0%, var(--ms-teal) 100%)',
              color: 'var(--ms-white)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: formData.targetYear.targetYear === option.year 
                ? '2px solid var(--ms-white)' 
                : '2px solid transparent',
              transform: formData.targetYear.targetYear === option.year 
                ? 'translateY(-2px)' 
                : 'translateY(0)',
              boxShadow: formData.targetYear.targetYear === option.year 
                ? '0 8px 16px rgba(0, 120, 212, 0.25)' 
                : '0 4px 8px rgba(0, 120, 212, 0.15)'
            }}
            onClick={() => handleYearSelect(option.year)}
          >
            <div 
              style={{
                fontSize: '32px',
                fontWeight: '600',
                marginBottom: '16px',
                textAlign: 'center'
              }}
            >
              {option.year}
            </div>
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '16px'
              }}
            >
              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <strong>Foundation:</strong> Now - Jan {option.year}
              </div>
              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <strong>Prelims:</strong> Feb - May {option.year}
              </div>
              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <strong>Mains:</strong> May - Aug {option.year}
              </div>
            </div>
            <div 
              style={{
                fontSize: '12px',
                opacity: 0.9,
                textAlign: 'center'
              }}
            >
              ⏱️ {option.months} months remaining
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

          {/* Computed cycles using helios-scheduler */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--ms-blue)' }}>
              {scenario ? `Computed Scenario: ${scenario}` : 'Computing cycles...'}
            </div>
            {error && (
              <div style={{ color: 'red', marginBottom: '8px' }}>{error}</div>
            )}
            {cycles && cycles.length > 0 && (
              <div className="form-grid form-grid-3" style={{ marginTop: '8px' }}>
                {cycles.map((c, idx) => (
                  <div key={`${c.cycleType}-${idx}`} style={{ background: 'var(--ms-white)', padding: '12px', borderRadius: '4px' }}>
                    <strong>{c.cycleType}</strong>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      {c.startDate} → {c.endDate}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </StepLayout>
  );
};

export default TargetYearStep;