import React, { useState, useEffect } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import { planCycles, PlanningContext, CycleType } from '@helios/helios-scheduler';
import dayjs from 'dayjs';

const TargetYearStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const [cyclesByYear, setCyclesByYear] = useState<Record<string, any>>({});

  useEffect(() => {
    // Calculate cycles for each year option
    const today = dayjs();
    const years = ['2026', '2027', '2028'];
    
    const calculatedCycles: Record<string, any> = {};
    years.forEach(year => {
      const targetYear = parseInt(year);
      const prelimsDate = dayjs(`${targetYear}-05-15`); // Approximate prelims date
      const mainsDate = dayjs(`${targetYear}-09-15`); // Approximate mains date
      
      const context: PlanningContext = {
        startDate: today,
        targetYear,
        prelimsExamDate: prelimsDate,
        mainsExamDate: mainsDate,
        optionalSubject: { subjectCode: 'OPT-SOC', subjectNname: 'Sociology', examFocus: 'MainsOnly', topics: [], baselineMinutes: 0 },
        constraints: {
          optionalSubjectCode: 'OPT-SOC',
          confidenceMap: {},
          optionalFirst: false,
          catchupDay: 6,
          testDay: 0,
          workingHoursPerDay: 6,
          breaks: [],
          testMinutes: 180
        },
        subjects: [],
        relativeAllocationWeights: {}
      };

      try {
        const result = planCycles(context);
        calculatedCycles[year] = result;
      } catch (error) {
        console.error(`Error calculating cycles for ${year}:`, error);
        calculatedCycles[year] = { schedules: [] };
      }
    });

    setCyclesByYear(calculatedCycles);
  }, []);

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
                gap: '6px',
                marginBottom: '16px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}
            >
              {cyclesByYear[option.year]?.schedules?.length > 0 ? (
                cyclesByYear[option.year].schedules.map((cycle: any, idx: number) => (
                  <div 
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}
                  >
                    <strong>{cycle.cycleType}:</strong> {dayjs(cycle.startDate).format('MMM D')} - {dayjs(cycle.endDate).format('MMM D, YYYY')}
                  </div>
                ))
              ) : (
                <>
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
                </>
              )}
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
        </div>
      )}
    </StepLayout>
  );
};

export default TargetYearStep;