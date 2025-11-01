import React, { useEffect, useState } from 'react';
import { StepProps } from '@/types';
import { downloadPlan, downloadPlanWithoutWeeklyViews, downloadMonthPlan, getAvailableMonths, downloadGoogleCalendar } from './util/download';
import { map2StudentIntake, map2UserId } from './util/intake-mapper';
import Header from './Header';
import Footer from './Footer';

interface Props extends StepProps {}

// Cycle type colors matching CalendarDocxService
const CYCLE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  'C1': { bg: '#DBEAFE', fg: '#1D4ED8', border: '#3B82F6' },
  'C2': { bg: '#DCFCE7', fg: '#15803D', border: '#22C55E' },
  'C3': { bg: '#FCE7F3', fg: '#BE185D', border: '#EC4899' },
  'C4': { bg: '#FEE2E2', fg: '#B91C1C', border: '#EF4444' },
  'C5': { bg: '#EDE9FE', fg: '#6D28D9', border: '#8B5CF6' },
  'C5B': { bg: '#EDE9FE', fg: '#6D28D9', border: '#8B5CF6' },
  'C6': { bg: '#E0F2FE', fg: '#0369A1', border: '#06B6D4' },
  'C7': { bg: '#FFEDD5', fg: '#C2410C', border: '#F59E0B' },
  'C8': { bg: '#ECFCCB', fg: '#3F6212', border: '#84CC16' },
};

const StudentDashboard: React.FC<Props> = (stepProps) => {
  const { formData } = stepProps;
  const [studyPlan, setStudyPlan] = useState<any>(null);
  const [studentIntake, setStudentIntake] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'birds-eye' | 'months' | 'weeks'>('birds-eye');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [availableMonths, setAvailableMonths] = useState<Array<{ index: number; label: string; date: Date }>>([]);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        setLoading(true);
        
        // Try to get plan from formData first
        let plan = formData.preview.raw_helios_data;
        const intake = map2StudentIntake(stepProps);
        
        // If not available, generate it
        if (!plan || !plan.cycles) {
          const { generatePlan } = await import('helios-ts');
          plan = await generatePlan(map2UserId(stepProps), intake);
        }
        
        setStudyPlan(plan);
        setStudentIntake(intake);
        
        // Load available months
        const months = await getAvailableMonths(stepProps);
        setAvailableMonths(months);
      } catch (error) {
        console.error('Error loading plan:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPlan();
  }, [formData, stepProps]);

  const downloadFull = async () => downloadPlan(stepProps);
  const downloadMonthlyCalendar = async () => downloadPlanWithoutWeeklyViews(stepProps);
  const downloadGoogleCalendarHandler = async () => downloadGoogleCalendar(stepProps);
  const downloadSelectedMonth = async () => {
    if (availableMonths.length > 0) {
      await downloadMonthPlan(stepProps, selectedMonthIndex);
    }
  };

  if (loading || !studyPlan || !studentIntake) {
    return (
      <>
        <Header currentStep={7} totalSteps={7} />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div className="navigation-spinner" style={{ width: '40px', height: '40px' }} />
          <p style={{ color: 'white', fontSize: '16px' }}>Loading your study plan...</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header currentStep={7} totalSteps={7} />
      <div className="container" style={{ paddingTop: '24px', paddingBottom: '48px' }}>
        {/* Welcome Section */}
        <div className="ms-card" style={{ padding: '32px', marginBottom: '24px' }}>
          <h1 className="ms-font-title" style={{ margin: '0 0 8px 0' }}>
            Welcome back, {formData.personalInfo.fullName}!
          </h1>
          <p className="ms-font-body" style={{ margin: 0, color: 'var(--ms-gray-90)' }}>
            Your personalized UPSC {formData.targetYear.targetYear} study plan is ready. 
            Explore the bird's eye view, month-by-month breakdown, and weekly schedules below.
          </p>
        </div>

        {/* Download Section */}
        <div className="ms-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
            📥 Download Your Study Plan
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-grid form-grid-2" style={{ gap: '12px' }}>
              <button className="ms-button ms-button-primary" onClick={downloadFull}>
                📥 Full Study Plan
              </button>
              <button className="ms-button ms-button-secondary" onClick={downloadMonthlyCalendar}>
                📅 Monthly Calendar Only
              </button>
            </div>
            
            <button 
              className="ms-button ms-button-primary"
              onClick={downloadGoogleCalendarHandler}
              style={{ width: '100%', backgroundColor: '#4285F4' }}
            >
              📆 Export to Google Calendar (.ics)
            </button>
            
            <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
              <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
                Download Specific Month
              </h4>
              {availableMonths.length > 0 && (
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
                    onClick={downloadSelectedMonth}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    📄 Download {availableMonths.find(m => m.index === selectedMonthIndex)?.label || 'Month'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View Selector */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className={`ms-button ${activeView === 'birds-eye' ? 'ms-button-primary' : 'ms-button-secondary'}`}
            onClick={() => setActiveView('birds-eye')}
          >
            🦅 Bird's Eye View
          </button>
          <button 
            className={`ms-button ${activeView === 'months' ? 'ms-button-primary' : 'ms-button-secondary'}`}
            onClick={() => setActiveView('months')}
          >
            📅 Month Views
          </button>
          <button 
            className={`ms-button ${activeView === 'weeks' ? 'ms-button-primary' : 'ms-button-secondary'}`}
            onClick={() => setActiveView('weeks')}
          >
            📆 Week Views
          </button>
        </div>

        {/* Content Area */}
        {activeView === 'birds-eye' && <BirdsEyeView studyPlan={studyPlan} />}
        {activeView === 'months' && <MonthViews studyPlan={studyPlan} />}
        {activeView === 'weeks' && <WeekViews studyPlan={studyPlan} studentIntake={studentIntake} />}
      </div>
      <Footer />
    </>
  );
};

// Bird's Eye View Component
const BirdsEyeView: React.FC<{ studyPlan: any }> = ({ studyPlan }) => {
  const cycles = studyPlan.cycles || [];
  
  const getCycleDescription = (cycleType: string): string => {
    const descriptions: Record<string, string> = {
      'C1': 'NCERT Foundation - Building core concepts from NCERT textbooks',
      'C2': 'Comprehensive Foundation - Deep dive into all subjects',
      'C3': 'Mains Revision Pre-Prelims - Focused Mains preparation',
      'C4': 'Prelims Reading - Comprehensive Prelims preparation',
      'C5': 'Prelims Revision - Intensive revision and practice',
      'C5B': 'Prelims Rapid Revision - Quick revision and tests',
      'C6': 'Mains Revision - Comprehensive Mains revision',
      'C7': 'Mains Rapid Revision - Quick revision and answer writing',
      'C8': 'Mains Foundation - Building strong Mains foundation'
    };
    return descriptions[cycleType] || 'Study cycle for comprehensive preparation';
  };

  return (
    <div className="ms-card" style={{ padding: '32px' }}>
      <h2 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: 'bold', color: 'var(--ms-blue)' }}>
        🦅 Bird's Eye View - Cycle Timeline
      </h2>
      <p style={{ marginBottom: '24px', color: 'var(--ms-gray-90)' }}>
        A chronological overview of your study cycles from start to finish
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {cycles.map((cycle: any, index: number) => {
          const colors = CYCLE_COLORS[cycle.cycleType] || { bg: '#F5F5F5', fg: '#333', border: '#999' };
          const startDate = new Date(cycle.cycleStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const endDate = new Date(cycle.cycleEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const duration = Math.ceil((new Date(cycle.cycleEndDate).getTime() - new Date(cycle.cycleStartDate).getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <div 
              key={index}
              style={{
                backgroundColor: colors.bg,
                border: `2px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '20px',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(8px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: colors.fg }}>
                  {cycle.cycleName}
                </h3>
                <span style={{ 
                  backgroundColor: colors.fg, 
                  color: 'white', 
                  padding: '4px 12px', 
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {duration} days
                </span>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: colors.fg, opacity: 0.9 }}>
                {getCycleDescription(cycle.cycleType)}
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: colors.fg, fontWeight: '600' }}>
                📅 {startDate} → {endDate}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Month Views Component
const MonthViews: React.FC<{ studyPlan: any }> = ({ studyPlan }) => {
  const cycles = studyPlan.cycles || [];
  const [selectedMonth, setSelectedMonth] = useState(0);
  
  // Get all months in the study plan
  const getMonthsInPlan = () => {
    const startDate = new Date(studyPlan.start_date);
    const endDate = new Date(`${studyPlan.targeted_year}-08-31`);
    const months: Array<{ date: Date; label: string }> = [];
    
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (current <= end) {
      months.push({
        date: new Date(current),
        label: current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  };
  
  const months = getMonthsInPlan();
  const currentMonth = months[selectedMonth];
  
  if (!currentMonth) return null;
  
  // Find which cycle this month belongs to
  const getCycleForMonth = (monthDate: Date) => {
    for (const cycle of cycles) {
      const cycleStart = new Date(cycle.cycleStartDate);
      const cycleEnd = new Date(cycle.cycleEndDate);
      if (monthDate >= cycleStart && monthDate <= cycleEnd) {
        return cycle;
      }
    }
    return null;
  };
  
  const cycle = getCycleForMonth(currentMonth.date);
  const colors = cycle ? CYCLE_COLORS[cycle.cycleType] || { bg: '#F5F5F5', fg: '#333', border: '#999' } : { bg: '#F5F5F5', fg: '#333', border: '#999' };
  
  // Generate calendar grid for the month
  const generateCalendar = () => {
    const year = currentMonth.date.getFullYear();
    const month = currentMonth.date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const weeks: number[][] = [];
    let week: number[] = new Array(firstDay).fill(0);
    
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7 || day === daysInMonth) {
        while (week.length < 7) week.push(0);
        weeks.push(week);
        week = [];
      }
    }
    
    return weeks;
  };
  
  const calendar = generateCalendar();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="ms-card" style={{ padding: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '24px', fontWeight: 'bold', color: 'var(--ms-blue)' }}>
          📅 Month Views
        </h2>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="ms-button ms-button-secondary"
            onClick={() => setSelectedMonth(Math.max(0, selectedMonth - 1))}
            disabled={selectedMonth === 0}
            style={{ padding: '8px 16px' }}
          >
            ← Previous
          </button>
          
          <select 
            className="ms-input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{ flex: 1, maxWidth: '300px' }}
          >
            {months.map((m, idx) => (
              <option key={idx} value={idx}>{m.label}</option>
            ))}
          </select>
          
          <button 
            className="ms-button ms-button-secondary"
            onClick={() => setSelectedMonth(Math.min(months.length - 1, selectedMonth + 1))}
            disabled={selectedMonth === months.length - 1}
            style={{ padding: '8px 16px' }}
          >
            Next →
          </button>
        </div>
      </div>
      
      <div style={{ 
        backgroundColor: colors.bg, 
        border: `2px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: colors.fg }}>
            {currentMonth.label}
          </h3>
          {cycle && (
            <span style={{ 
              backgroundColor: colors.fg, 
              color: 'white', 
              padding: '6px 16px', 
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 'bold'
            }}>
              {cycle.cycleName}
            </span>
          )}
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '8px',
          marginTop: '16px'
        }}>
          {dayNames.map(day => (
            <div key={day} style={{ 
              textAlign: 'center', 
              fontWeight: 'bold', 
              fontSize: '14px',
              color: colors.fg,
              padding: '8px 0'
            }}>
              {day}
            </div>
          ))}
          
          {calendar.flat().map((day, idx) => (
            <div 
              key={idx} 
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: day ? 'white' : 'transparent',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: day ? '600' : 'normal',
                color: day ? colors.fg : 'transparent',
                border: day ? `1px solid ${colors.border}` : 'none'
              }}
            >
              {day || ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Week Views Component
const WeekViews: React.FC<{ studyPlan: any; studentIntake: any }> = ({ studyPlan, studentIntake }) => {
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  
  // Get all weeks in the study plan
  const getWeeksInPlan = () => {
    const startDate = new Date(studyPlan.start_date);
    const endDate = new Date(`${studyPlan.targeted_year}-08-31`);
    const weeks: Array<{ startDate: Date; endDate: Date; label: string }> = [];
    
    // Start from the beginning of the week containing the start date
    const current = new Date(startDate);
    current.setDate(current.getDate() - current.getDay());
    
    while (current <= endDate) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      weeks.push({
        startDate: new Date(weekStart),
        endDate: new Date(weekEnd),
        label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      });
      
      current.setDate(current.getDate() + 7);
    }
    
    return weeks;
  };
  
  const weeks = getWeeksInPlan();
  const currentWeek = weeks[selectedWeekIndex];
  
  if (!currentWeek) return null;
  
  // Find which cycle this week belongs to
  const getCycleForWeek = (weekStart: Date) => {
    for (const cycle of studyPlan.cycles || []) {
      const cycleStart = new Date(cycle.cycleStartDate);
      const cycleEnd = new Date(cycle.cycleEndDate);
      if (weekStart >= cycleStart && weekStart <= cycleEnd) {
        return cycle;
      }
    }
    return null;
  };
  
  const cycle = getCycleForWeek(currentWeek.startDate);
  const colors = cycle ? CYCLE_COLORS[cycle.cycleType] || { bg: '#F5F5F5', fg: '#333', border: '#999' } : { bg: '#F5F5F5', fg: '#333', border: '#999' };
  
  // Generate 7 days for the week
  const generateWeekDays = () => {
    const days = [];
    const current = new Date(currentWeek.startDate);
    
    for (let i = 0; i < 7; i++) {
      days.push({
        date: new Date(current),
        dayName: current.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: current.getDate(),
        monthDay: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };
  
  const weekDays = generateWeekDays();
  
  return (
    <div className="ms-card" style={{ padding: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '24px', fontWeight: 'bold', color: 'var(--ms-blue)' }}>
          📆 Week Views
        </h2>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="ms-button ms-button-secondary"
            onClick={() => setSelectedWeekIndex(Math.max(0, selectedWeekIndex - 1))}
            disabled={selectedWeekIndex === 0}
            style={{ padding: '8px 16px' }}
          >
            ← Previous Week
          </button>
          
          <select 
            className="ms-input"
            value={selectedWeekIndex}
            onChange={(e) => setSelectedWeekIndex(parseInt(e.target.value))}
            style={{ flex: 1, maxWidth: '400px' }}
          >
            {weeks.map((w, idx) => (
              <option key={idx} value={idx}>Week {idx + 1}: {w.label}</option>
            ))}
          </select>
          
          <button 
            className="ms-button ms-button-secondary"
            onClick={() => setSelectedWeekIndex(Math.min(weeks.length - 1, selectedWeekIndex + 1))}
            disabled={selectedWeekIndex === weeks.length - 1}
            style={{ padding: '8px 16px' }}
          >
            Next Week →
          </button>
        </div>
      </div>
      
      <div style={{ 
        backgroundColor: colors.bg, 
        border: `2px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: colors.fg }}>
            📅 {currentWeek.label}
          </h3>
          {cycle && (
            <span style={{ 
              backgroundColor: colors.fg, 
              color: 'white', 
              padding: '6px 16px', 
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 'bold'
            }}>
              {cycle.cycleName}
            </span>
          )}
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '12px' 
        }}>
          {weekDays.map((day, idx) => (
            <div 
              key={idx}
              style={{
                backgroundColor: 'white',
                border: `2px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                minHeight: '100px'
              }}
            >
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '14px', 
                color: colors.fg,
                marginBottom: '4px'
              }}>
                {day.dayName}
              </div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: colors.fg,
                marginBottom: '4px'
              }}>
                {day.dayNumber}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: colors.fg,
                opacity: 0.8
              }}>
                {day.monthDay}
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          backgroundColor: 'white', 
          borderRadius: '8px',
          border: `1px solid ${colors.border}`
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: colors.fg }}>
            💡 <strong>Note:</strong> Detailed daily tasks and schedules are available in the downloaded documents. 
            Use the download buttons above to get your complete weekly plan with all task details.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
