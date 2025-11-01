import React, { useEffect, useMemo, useState } from 'react';
import { StepProps } from '@/types';
import { downloadPlan, downloadPlanWithoutWeeklyViews, downloadMonthPlan, getAvailableMonths } from './util/download';

interface Props extends StepProps {}

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // approx

const StudentDashboard: React.FC<Props> = (stepProps) => {
  const { formData } = stepProps;

  const [availableMonths, setAvailableMonths] = useState<Array<{ index: number; label: string; date: Date }>>([]);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [isLoadingMonths, setIsLoadingMonths] = useState(false);

  const [lastRebalanceAt, setLastRebalanceAt] = useState<number | null>(null);

  useEffect(() => {
    // Load months for per-month download
    const loadMonths = async () => {
      setIsLoadingMonths(true);
      const months = await getAvailableMonths(stepProps);
      setAvailableMonths(months);
      setIsLoadingMonths(false);
    };
    loadMonths();
  }, [stepProps]);

  useEffect(() => {
    // Load last rebalance timestamp from storage
    try {
      const stored = localStorage.getItem('helios-last-rebalance-at');
      if (stored) {
        const ts = parseInt(stored, 10);
        if (!Number.isNaN(ts)) setLastRebalanceAt(ts);
      }
    } catch {}
  }, []);

  const now = Date.now();
  const { canRebalance, nextAllowedDate } = useMemo(() => {
    if (!lastRebalanceAt) {
      // First time: require at least one month before enabling
      return {
        canRebalance: false,
        nextAllowedDate: new Date(now + ONE_MONTH_MS),
      };
    }
    const next = lastRebalanceAt + ONE_MONTH_MS;
    return {
      canRebalance: now >= next,
      nextAllowedDate: new Date(next),
    };
  }, [lastRebalanceAt, now]);

  const downloadFull = async () => downloadPlan(stepProps);
  const downloadMonthlyCalendar = async () => downloadPlanWithoutWeeklyViews(stepProps);
  const downloadSelectedMonth = async () => {
    if (availableMonths.length > 0) {
      await downloadMonthPlan(stepProps, selectedMonthIndex);
    }
  };

  const handleRebalanceClick = async () => {
    // Placeholder for future implementation; disabled until allowed monthly
    // Intentionally left no-op as feature is gated
  };

  return (
    <div className="container" style={{ paddingTop: '16px', paddingBottom: '24px' }}>
      <div className="ms-card" style={{ marginBottom: '16px' }}>
        <h1 className="ms-font-title" style={{ margin: 0 }}>Student Dashboard</h1>
        <p className="ms-font-body" style={{ marginTop: '6px' }}>
          Welcome back, <strong>{formData.personalInfo.fullName}</strong> — manage your study plan below.
        </p>
      </div>

      <div className="ms-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>Download Your Study Plan</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="form-grid form-grid-2" style={{ gap: '10px' }}>
            <button className="ms-button ms-button-primary" onClick={downloadFull}>
              📥 Download Full Study Plan
            </button>
            <button className="ms-button ms-button-secondary" onClick={downloadMonthlyCalendar}>
              📅 Download Monthly Calendar
            </button>
          </div>

          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
            <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#666' }}>Download Specific Month</h4>
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
                <button className="ms-button ms-button-secondary" onClick={downloadSelectedMonth} style={{ whiteSpace: 'nowrap' }}>
                  📄 Download {availableMonths.find((m) => m.index === selectedMonthIndex)?.label || 'Month'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ms-card" style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 'bold' }}>Rebalance Your Plan</h3>
        <p className="ms-font-body" style={{ marginBottom: '12px', color: '#555' }}>
          You can request a plan rebalance once every month based on your progress and updated preferences.
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={`ms-button ${canRebalance ? 'ms-button-primary' : 'ms-button-disabled'}`}
            onClick={handleRebalanceClick}
            disabled={!canRebalance}
            title={canRebalance ? 'Rebalance available' : `Available again on ${nextAllowedDate.toLocaleDateString()}`}
          >
            ♻️ Rebalance Plan
          </button>
          <span style={{ fontSize: '13px', color: '#666' }}>
            {canRebalance ? 'You can rebalance now.' : `Next eligible date: ${nextAllowedDate.toLocaleDateString()}`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
