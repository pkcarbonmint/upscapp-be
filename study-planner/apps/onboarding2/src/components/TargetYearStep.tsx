import React, { useState, useEffect } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import { planCycles } from 'helios-scheduler';
import dayjs from 'dayjs';

const TargetYearStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const [cycles, setCycles] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleYearSelect = (year: string) => {
    updateFormData({
      targetYear: {
        ...formData.targetYear,
        targetYear: year,
        startDate: new Date()
      }
    });
  };

  const calculateCycles = async (targetYear: string) => {
    if (!targetYear) return;
    
    setLoading(true);
    try {
      const startDate = dayjs();
      const targetYearNum = parseInt(targetYear);
      const prelimsExamDate = dayjs(`${targetYearNum}-05-26`); // Approximate prelims date
      const mainsExamDate = dayjs(`${targetYearNum}-09-15`); // Approximate mains date

      const context = {
        startDate,
        targetYear: targetYearNum,
        prelimsExamDate,
        mainsExamDate,
        constraints: {
          maxHoursPerDay: 10,
          minHoursPerDay: 2,
          preferredStudyDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        }
      };

      const result = planCycles(context);
      setCycles(result);
    } catch (error) {
      console.error('Failed to calculate cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.targetYear.targetYear) {
      calculateCycles(formData.targetYear.targetYear);
    }
  }, [formData.targetYear.targetYear]);

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
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '16px', color: 'var(--ms-gray-90)' }}>
                Calculating study cycles...
              </div>
            </div>
          ) : cycles ? (
            <div>
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

              {/* Study Cycles */}
              <div style={{ marginTop: '24px' }}>
                <h4 
                  style={{
                    color: 'var(--ms-blue)',
                    marginBottom: '16px',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  Study Phases (Cycles)
                </h4>
                <div className="form-grid form-grid-2">
                  {cycles.schedules?.map((cycle: any, index: number) => (
                    <div 
                      key={index}
                      style={{
                        background: 'var(--ms-white)',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid var(--ms-gray-40)'
                      }}
                    >
                      <div 
                        style={{
                          fontWeight: '600',
                          color: 'var(--ms-blue)',
                          marginBottom: '8px'
                        }}
                      >
                        {cycle.cycleType}
                      </div>
                      <div 
                        style={{
                          fontSize: '12px',
                          color: 'var(--ms-gray-90)',
                          marginBottom: '4px'
                        }}
                      >
                        {dayjs(cycle.startDate).format('MMM DD, YYYY')} - {dayjs(cycle.endDate).format('MMM DD, YYYY')}
                      </div>
                      <div 
                        style={{
                          fontSize: '11px',
                          color: 'var(--ms-gray-70)'
                        }}
                      >
                        {dayjs(cycle.endDate).diff(dayjs(cycle.startDate), 'day')} days
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '16px', color: 'var(--ms-gray-90)' }}>
                Select a target year to see your study plan
              </div>
            </div>
          )}
        </div>
      )}
    </StepLayout>
  );
};

export default TargetYearStep;