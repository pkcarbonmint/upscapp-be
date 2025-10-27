import React, { useState, useEffect, useMemo } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import { analyzeTargetYear, YearAnalysis, getScenarioDescription } from '@/services/cyclePlanningService';

const TargetYearStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const [yearAnalyses, setYearAnalyses] = useState<YearAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate year options for the next 3 years
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    return [currentYear + 1, currentYear + 2, currentYear + 3].map(year => year.toString());
  }, [currentYear]);

  // Analyze each year option
  useEffect(() => {
    const analyzeYears = async () => {
      setLoading(true);
      try {
        const analyses = yearOptions.map(year => analyzeTargetYear(year));
        setYearAnalyses(analyses);
      } catch (error) {
        console.error('Error analyzing years:', error);
      } finally {
        setLoading(false);
      }
    };

    analyzeYears();
  }, [yearOptions]);

  const handleYearSelect = (year: string) => {
    updateFormData({
      targetYear: {
        ...formData.targetYear,
        targetYear: year
      }
    });
  };

  if (loading) {
    return (
      <StepLayout
        icon="📅"
        title="Choose Your Target Year"
        description="Analyzing preparation timelines..."
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <div>Calculating optimal study cycles...</div>
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout
      icon="📅"
      title="Choose Your Target Year"
      description="Select when you want to appear for the UPSC exam"
    >
      <div className="choice-grid choice-grid-3">
        {yearAnalyses.map((analysis) => (
          <div
            key={analysis.year}
            style={{
              background: 'linear-gradient(135deg, var(--ms-blue) 0%, var(--ms-teal) 100%)',
              color: 'var(--ms-white)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: formData.targetYear.targetYear === analysis.year 
                ? '2px solid var(--ms-white)' 
                : '2px solid transparent',
              transform: formData.targetYear.targetYear === analysis.year 
                ? 'translateY(-2px)' 
                : 'translateY(0)',
              boxShadow: formData.targetYear.targetYear === analysis.year 
                ? '0 8px 16px rgba(0, 120, 212, 0.25)' 
                : '0 4px 8px rgba(0, 120, 212, 0.15)'
            }}
            onClick={() => handleYearSelect(analysis.year)}
          >
            <div 
              style={{
                fontSize: '32px',
                fontWeight: '600',
                marginBottom: '16px',
                textAlign: 'center'
              }}
            >
              {analysis.year}
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
                <strong>Scenario:</strong> {analysis.scenario}
              </div>
              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <strong>Intensity:</strong> {analysis.intensity}
              </div>
              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <strong>Success Rate:</strong> {analysis.probability}
              </div>
            </div>
            <div 
              style={{
                fontSize: '12px',
                opacity: 0.9,
                textAlign: 'center'
              }}
            >
              ⏱️ {analysis.months} months remaining
            </div>
          </div>
        ))}
      </div>
      
      {formData.targetYear.targetYear && (() => {
        const selectedAnalysis = yearAnalyses.find(analysis => analysis.year === formData.targetYear.targetYear);
        if (!selectedAnalysis) return null;

        return (
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
              <div 
                style={{
                  background: 'var(--ms-white)',
                  padding: '12px',
                  borderRadius: '4px'
                }}
              >
                <strong>Time Available:</strong><br />
                {selectedAnalysis.months} months
              </div>
              <div 
                style={{
                  background: 'var(--ms-white)',
                  padding: '12px',
                  borderRadius: '4px'
                }}
              >
                <strong>Recommended Intensity:</strong><br />
                {selectedAnalysis.intensity}
              </div>
              <div 
                style={{
                  background: 'var(--ms-white)',
                  padding: '12px',
                  borderRadius: '4px'
                }}
              >
                <strong>Success Probability:</strong><br />
                {selectedAnalysis.probability}
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h4 style={{ color: 'var(--ms-blue)', marginBottom: '16px' }}>
                📅 Study Cycle Timeline
              </h4>
              <div style={{ fontSize: '14px', color: 'var(--ms-gray-dark)' }}>
                <strong>Scenario:</strong> {getScenarioDescription(selectedAnalysis.scenario)}
              </div>
              
              {selectedAnalysis.cycles.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {selectedAnalysis.cycles.map((cycle, index) => (
                      <div 
                        key={index}
                        style={{
                          background: 'var(--ms-white)',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid var(--ms-gray-light)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{cycle.name}</strong>
                            <div style={{ fontSize: '12px', color: 'var(--ms-gray-dark)', marginTop: '4px' }}>
                              {cycle.description}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--ms-gray-dark)' }}>
                            <div>{cycle.startDate} - {cycle.endDate}</div>
                            <div>{cycle.duration} days</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </StepLayout>
  );
};

export default TargetYearStep;