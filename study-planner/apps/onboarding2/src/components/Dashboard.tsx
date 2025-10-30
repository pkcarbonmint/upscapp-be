import React, { useState, useEffect } from 'react';
import { StepProps } from '@/types';
import { downloadPlan, downloadPlanWithoutWeeklyViews, downloadMonthPlan, getAvailableMonths } from './util/download';

const Dashboard: React.FC<StepProps> = (stepProps) => {
  const { formData } = stepProps;
  const downloadHandler = async () => downloadPlan(stepProps);
  const downloadMonthlyHandler = async () => downloadPlanWithoutWeeklyViews(stepProps);
  
  const [availableMonths, setAvailableMonths] = useState<Array<{ index: number; label: string; date: Date }>>([]);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [isLoadingMonths, setIsLoadingMonths] = useState(false);
  
  // Track last rebalance date - in a real app, this would come from backend
  const [lastRebalanceDate, setLastRebalanceDate] = useState<Date | null>(null);
  const [canRebalance, setCanRebalance] = useState(false);
  const [daysUntilRebalance, setDaysUntilRebalance] = useState<number>(0);
  
  useEffect(() => {
    const loadMonths = async () => {
      setIsLoadingMonths(true);
      const months = await getAvailableMonths(stepProps);
      setAvailableMonths(months);
      setIsLoadingMonths(false);
    };
    loadMonths();
  }, [stepProps]);
  
  useEffect(() => {
    // Check rebalance eligibility
    // For now, simulate last rebalance was 15 days ago
    const stored = localStorage.getItem('lastRebalance');
    if (stored) {
      const date = new Date(stored);
      setLastRebalanceDate(date);
      
      const now = new Date();
      const daysSinceRebalance = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, 30 - daysSinceRebalance);
      
      setDaysUntilRebalance(daysRemaining);
      setCanRebalance(daysSinceRebalance >= 30);
    } else {
      // First time - can't rebalance yet
      setCanRebalance(false);
      setDaysUntilRebalance(30);
    }
  }, []);
  
  const downloadMonthHandler = async () => {
    if (availableMonths.length > 0) {
      await downloadMonthPlan(stepProps, selectedMonthIndex);
    }
  };
  
  const handleRebalance = () => {
    if (canRebalance) {
      // In a real app, this would trigger a backend API call to rebalance the plan
      alert('Rebalancing your study plan based on your progress and preferences...');
      localStorage.setItem('lastRebalance', new Date().toISOString());
      setLastRebalanceDate(new Date());
      setCanRebalance(false);
      setDaysUntilRebalance(30);
    }
  };
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-icon">
          📊
        </div>
        <h1 className="ms-font-title dashboard-title">
          Welcome Back, {formData.personalInfo.fullName}!
        </h1>
        <p className="ms-font-body dashboard-subtitle">
          Your UPSC {formData.targetYear.targetYear} Study Dashboard
        </p>
      </div>
      
      {/* Overview Cards */}
      <div className="ms-card dashboard-overview-card">
        <h3 className="dashboard-section-title">
          📈 Your Study Plan Overview
        </h3>
        <div className="form-grid form-grid-3 dashboard-stats-grid">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">⏰</div>
            <div className="dashboard-stat-value">
              {formData.commitment.timeCommitment}+ hrs
            </div>
            <div className="dashboard-stat-label">
              Daily Commitment
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">🎯</div>
            <div className="dashboard-stat-value">
              {formData.targetYear.targetYear}
            </div>
            <div className="dashboard-stat-label">
              Target Year
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">📚</div>
            <div className="dashboard-stat-value">
              {formData.commitment.upscOptionalSubject || 'N/A'}
            </div>
            <div className="dashboard-stat-label">
              Optional Subject
            </div>
          </div>
        </div>
      </div>
      
      {/* Download Section */}
      <div className="ms-card dashboard-downloads-card">
        <h3 className="dashboard-section-title">
          📥 Download Your Study Plan
        </h3>
        <p className="dashboard-section-description">
          Get your personalized study plan in various formats for easy reference
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          <div className="form-grid form-grid-2" style={{ gap: '12px' }}>
            <button 
              className="ms-button ms-button-primary dashboard-download-btn"
              onClick={downloadHandler}
            >
              📥 Download Full Study Plan
            </button>
            <button 
              className="ms-button ms-button-secondary dashboard-download-btn"
              onClick={downloadMonthlyHandler}
            >
              📅 Download Monthly Calendar
            </button>
          </div>
          
          <div className="dashboard-month-download-section">
            <h4 className="dashboard-month-download-title">
              Download Specific Month
            </h4>
            {isLoadingMonths && (
              <p className="dashboard-loading-text">Loading months...</p>
            )}
            {!isLoadingMonths && availableMonths.length === 0 && (
              <p className="dashboard-empty-text">No months available.</p>
            )}
            {!isLoadingMonths && availableMonths.length > 0 && (
              <div className="form-grid form-grid-2" style={{ gap: '12px', alignItems: 'flex-end' }}>
                <select 
                  className="ms-input"
                  value={selectedMonthIndex}
                  onChange={(e) => setSelectedMonthIndex(parseInt(e.target.value))}
                >
                  {availableMonths.map((month) => (
                    <option key={month.index} value={month.index}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <button 
                  className="ms-button ms-button-secondary dashboard-download-btn"
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
      
      {/* Rebalance Section */}
      <div className="ms-card dashboard-rebalance-card">
        <h3 className="dashboard-section-title">
          ⚖️ Rebalance Your Study Plan
        </h3>
        <p className="dashboard-section-description">
          Update your study plan based on your progress and changing preferences
        </p>
        
        <div className="dashboard-rebalance-info">
          {canRebalance ? (
            <div className="dashboard-rebalance-status dashboard-rebalance-status--available">
              <span className="dashboard-rebalance-status-icon">✅</span>
              <span>You can rebalance your plan now!</span>
            </div>
          ) : (
            <div className="dashboard-rebalance-status dashboard-rebalance-status--unavailable">
              <span className="dashboard-rebalance-status-icon">⏳</span>
              <span>
                {lastRebalanceDate 
                  ? `You can rebalance again in ${daysUntilRebalance} days`
                  : `Rebalancing will be available 30 days after your first plan generation`
                }
              </span>
            </div>
          )}
        </div>
        
        <button 
          className="ms-button ms-button-primary dashboard-rebalance-btn"
          onClick={handleRebalance}
          disabled={!canRebalance}
          title={!canRebalance ? `Available in ${daysUntilRebalance} days` : 'Click to rebalance'}
        >
          {canRebalance ? '⚖️ Rebalance Plan Now' : `🔒 Rebalance (Available in ${daysUntilRebalance} days)`}
        </button>
        
        <div className="dashboard-rebalance-note">
          <strong>Note:</strong> Rebalancing is allowed once every 30 days to ensure consistency in your preparation.
          When you rebalance, the system will analyze your progress and adjust your study plan accordingly.
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="ms-card dashboard-actions-card">
        <h3 className="dashboard-section-title">
          🚀 Quick Actions
        </h3>
        <div className="dashboard-quick-actions">
          <div className="dashboard-action-item">
            <span className="dashboard-action-icon">📖</span>
            <div className="dashboard-action-content">
              <div className="dashboard-action-title">Start Today's Study Session</div>
              <div className="dashboard-action-description">Begin your scheduled studies for today</div>
            </div>
            <button className="ms-button ms-button-secondary" style={{ whiteSpace: 'nowrap' }}>
              Start
            </button>
          </div>
          <div className="dashboard-action-item">
            <span className="dashboard-action-icon">📝</span>
            <div className="dashboard-action-content">
              <div className="dashboard-action-title">Track Your Progress</div>
              <div className="dashboard-action-description">Mark completed topics and update your progress</div>
            </div>
            <button className="ms-button ms-button-secondary" style={{ whiteSpace: 'nowrap' }}>
              Track
            </button>
          </div>
          <div className="dashboard-action-item">
            <span className="dashboard-action-icon">💬</span>
            <div className="dashboard-action-content">
              <div className="dashboard-action-title">Connect with Mentor</div>
              <div className="dashboard-action-description">Get guidance from expert UPSC mentors</div>
            </div>
            <button className="ms-button ms-button-secondary" style={{ whiteSpace: 'nowrap' }}>
              Connect
            </button>
          </div>
        </div>
      </div>
      
      <p className="dashboard-footer">
        Need help? Contact our support team at support@lamentora.com
      </p>
    </div>
  );
};

export default Dashboard;
