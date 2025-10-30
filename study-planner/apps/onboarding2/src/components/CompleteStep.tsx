import React, { useState, useEffect } from 'react';
import { StepProps } from '@/types';
import { downloadPlan, downloadPlanWithoutWeeklyViews, downloadMonthPlan, getAvailableMonths } from './util/download';

const CompleteStep: React.FC<StepProps> = (stepProps) => {
  const { formData } = stepProps;
  const downloadHandler = async () => downloadPlan(stepProps);
  const downloadMonthlyHandler = async () => downloadPlanWithoutWeeklyViews(stepProps);
  
  const [availableMonths, setAvailableMonths] = useState<Array<{ index: number; label: string; date: Date }>>([]);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [isLoadingMonths, setIsLoadingMonths] = useState(false);
  
  useEffect(() => {
    const loadMonths = async () => {
      setIsLoadingMonths(true);
      const months = await getAvailableMonths(stepProps);
      setAvailableMonths(months);
      setIsLoadingMonths(false);
    };
    loadMonths();
  }, [stepProps]);
  
  const downloadMonthHandler = async () => {
    if (availableMonths.length > 0) {
      await downloadMonthPlan(stepProps, selectedMonthIndex);
    }
  };
  return (
    <div className="complete-container">
      <div className="complete-icon">
        ✅
      </div>
      
      <h1 className="ms-font-title complete-title">
        Welcome to La Mentora Study Planner!
      </h1>
      
      <p className="ms-font-body complete-description">
        Your UPSC preparation journey begins now
      </p>
      
      <div className="ms-card complete-success-card">
        <div className="complete-success-header">
          <span>🎉</span>
          <span>Setup Complete!</span>
        </div>
        <p className="complete-success-content">
          Congratulations <strong>{formData.personalInfo.fullName}</strong>! Your personalized 
          study plan for UPSC {formData.targetYear.targetYear} has been created successfully.
        </p>
        
        <div className="form-grid form-grid-2 complete-stats-grid">
          <div className="complete-stat-card">
            <div className="complete-stat-value">
              {formData.commitment.timeCommitment}+ hours
            </div>
            <div className="complete-stat-label">
              Daily Commitment
            </div>
          </div>
          <div className="complete-stat-card">
            <div className="complete-stat-value">
              {formData.targetYear.targetYear}
            </div>
            <div className="complete-stat-label">
              Target Year
            </div>
          </div>
        </div>
      </div>
      
      <div className="ms-card complete-next-steps-card">
        <h3 className="complete-next-steps-title">
          What's Next?
        </h3>
        <div className="complete-next-steps-content">
          <div className="complete-next-steps-item">
            <span className="complete-next-steps-checkmark">✓</span>
            <span className="complete-next-steps-text">
              Access your personalized dashboard
            </span>
          </div>
          <div className="complete-next-steps-item">
            <span className="complete-next-steps-checkmark">✓</span>
            <span className="complete-next-steps-text">
              Download your detailed study schedule
            </span>
          </div>
          <div className="complete-next-steps-item">
            <span className="complete-next-steps-checkmark">✓</span>
            <span className="complete-next-steps-text">
              Start with your first study session
            </span>
          </div>
          <div className="complete-next-steps-item">
            <span className="complete-next-steps-checkmark">✓</span>
            <span className="complete-next-steps-text">
              Connect with our expert mentors
            </span>
          </div>
        </div>
      </div>
      
      <div className="ms-card" style={{ padding: '20px', marginTop: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
          Download Your Study Plan
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="form-grid form-grid-2" style={{ gap: '10px' }}>
            <button 
              className="ms-button ms-button-primary"
              onClick={downloadHandler}
            >
              📥 Download Full Study Plan
            </button>
            <button 
              className="ms-button ms-button-secondary"
              onClick={downloadMonthlyHandler}
            >
              📅 Download Monthly Calendar
            </button>
          </div>
          
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
            <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
              Download Specific Month
            </h4>
            {isLoadingMonths && (
              <p style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Loading months...</p>
            )}
            {!isLoadingMonths && availableMonths.length === 0 && (
              <p style={{ margin: '4px 0', fontSize: '13px', color: '#999' }}>No months available.</p>
            )}
            {!isLoadingMonths && availableMonths.length > 0 && (
              <div className="form-grid form-grid-2" style={{ gap: '8px', alignItems: 'flex-end' }}>
                <select 
                  className="ms-input"
                  value={selectedMonthIndex}
                  onChange={(e) => setSelectedMonthIndex(parseInt(e.target.value))}
                  style={{ fontSize: '14px' }}
                >
                  {availableMonths.map((month) => (
                    <option key={month.index} value={month.index}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <button 
                  className="ms-button ms-button-secondary"
                  onClick={downloadMonthHandler}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  📄 Download {availableMonths.find(m => m.index === selectedMonthIndex)?.label || 'Month'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <button 
        className="ms-button ms-button-secondary complete-button"
        onClick={() => {
          // TODO: Navigate to dashboard
          console.log('Navigate to dashboard');
        }}
        style={{ marginTop: '12px' }}
      >
        Go to Dashboard
      </button>
      
      <p className="complete-footer">
        Need help? Contact our support team at support@helios.com
      </p>
    </div>
  );
};

export default CompleteStep;