import React, { useMemo } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import { planCycles, CycleType, PlanningContext, S2WeekDay } from 'helios-scheduler';
import dayjs from 'dayjs';

const TargetYearStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const handleYearSelect = (year: string) => {
    updateFormData({
      targetYear: {
        ...formData.targetYear,
        targetYear: year
      }
    });
  };

  // Generate year options dynamically from 2026 to 2028
  const yearOptions = useMemo(() => {
    const startDate = dayjs(); // Current date
    const years = ['2026', '2027', '2028'];
    
    return years.map(year => {
      const targetYear = parseInt(year);
      const prelimsExamDate = dayjs(`${targetYear}-05-16`); // Assumed prelims exam date
      const mainsExamDate = dayjs(`${targetYear}-09-15`); // Assumed mains exam date
      
      // Create a minimal planning context to get cycle information
      const context: PlanningContext = {
        startDate,
        targetYear,
        prelimsExamDate,
        mainsExamDate,
        optionalSubject: {
          subjectCode: 'OPT',
          subjectNname: 'Optional',
          examFocus: 'MainsOnly',
          topics: [],
          baselineMinutes: 0
        },
        subjects: [],
        relativeAllocationWeights: {},
        constraints: {
          optionalSubjectCode: 'OPT',
          confidenceMap: {},
          optionalFirst: false,
          catchupDay: S2WeekDay.Sunday,
          testDay: S2WeekDay.Saturday,
          workingHoursPerDay: 8,
          breaks: [],
          testMinutes: 180
        }
      };

      try {
        const result = planCycles(context);
        const monthsAvailable = Math.round(result.totalTimeAvailable);
        
        // Determine intensity based on available months
        let intensity: string;
        let probability: string;
        
        if (monthsAvailable >= 30) {
          intensity = 'Comfortable (4-6 hrs/day)';
          probability = '85%';
        } else if (monthsAvailable >= 20) {
          intensity = 'Moderate (6-8 hrs/day)';
          probability = '78%';
        } else if (monthsAvailable >= 12) {
          intensity = 'High (8-10 hrs/day)';
          probability = '65%';
        } else {
          intensity = 'Very High (10-12 hrs/day)';
          probability = '50%';
        }
        
        return {
          year,
          months: monthsAvailable,
          intensity,
          probability,
          cycles: result.schedules
        };
      } catch (error) {
        // Fallback if planning fails
        return {
          year,
          months: prelimsExamDate.diff(startDate, 'month'),
          intensity: 'Variable',
          probability: 'N/A',
          cycles: []
        };
      }
    });
  }, []);

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
              {option.cycles && option.cycles.length > 0 ? (
                option.cycles.slice(0, 3).map((cycle, idx) => {
                  const cycleNames: Record<string, string> = {
                    [CycleType.C1]: 'NCERT Foundation',
                    [CycleType.C2]: 'Foundation',
                    [CycleType.C3]: 'Revision',
                    [CycleType.C4]: 'Prelims Reading',
                    [CycleType.C5]: 'Prelims Revision',
                    [CycleType.C5B]: 'Rapid Revision',
                    [CycleType.C6]: 'Mains Revision',
                    [CycleType.C7]: 'Mains Rapid',
                    [CycleType.C8]: 'Mains Foundation'
                  };
                  
                  const startDate = dayjs(cycle.startDate);
                  const endDate = dayjs(cycle.endDate);
                  
                  return (
                    <div 
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <strong>{cycleNames[cycle.cycleType] || cycle.cycleType}:</strong> {startDate.format('MMM YYYY')} - {endDate.format('MMM YYYY')}
                    </div>
                  );
                })
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