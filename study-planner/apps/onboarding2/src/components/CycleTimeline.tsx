import React from 'react';
import dayjs, { Dayjs } from 'dayjs';

export interface CycleItem {
  cycleType: string;
  startDate: string | Date;
  endDate: string | Date;
}

interface CycleTimelineProps {
  cycles: CycleItem[];
  variant?: 'timeline' | 'milestones';
}

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

// Milestones List View Component
const CycleMilestonesView: React.FC<{ cycles: CycleItem[] }> = ({ cycles }) => {
  if (!Array.isArray(cycles) || cycles.length === 0) {
    return null;
  }

  const parsed = cycles
    .map((c) => ({
      ...c,
      start: dayjs(c.startDate as any),
      end: dayjs(c.endDate as any),
    }))
    .sort((a, b) => a.start.valueOf() - b.start.valueOf());

  return (
    <div className="cycle-timeline">
      <div className="cycle-milestones-compact">
        {parsed.map((c, index) => {
          const cycleDesc = getCycleDescription(c.cycleType);
          const cycleColor = getCycleColor(c.cycleType);
          const duration = c.end.diff(c.start, 'day');
          
          return (
            <div key={`${c.cycleType}-${String(c.startDate)}`} className="cycle-milestone-row">
              <div className="cycle-milestone-row-header">
                <div className="cycle-milestone-row-number">{index + 1}</div>
                <div className="cycle-milestone-row-content">
                  <span className="cycle-milestone-row-title" style={{ color: cycleColor }}>
                  {cycleDesc}
                  </span>
                  <span className="cycle-milestone-row-dates">
                    {c.start.format('MMM D')} — {c.end.format('MMM D')}
                  </span>
                </div>
                <div className="cycle-milestone-row-footer">
                  <span className="cycle-milestone-row-code">{c.cycleType}</span>
                  <span className="cycle-milestone-row-duration">{duration}d</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Original Timeline View Component
const CycleTimelineView: React.FC<{ cycles: CycleItem[] }> = ({ cycles }) => {
  if (!Array.isArray(cycles) || cycles.length === 0) {
    return null;
  }

  const parsed = cycles
    .map((c) => ({
      ...c,
      start: dayjs(c.startDate as any),
      end: dayjs(c.endDate as any),
    }))
    .sort((a, b) => a.start.valueOf() - b.start.valueOf());

  const earliest: Dayjs = parsed[0].start;
  const latest: Dayjs = parsed.reduce((acc, c) => (c.end.isAfter(acc) ? c.end : acc), parsed[0].end);
  const totalDays = Math.max(latest.diff(earliest, 'day', true), 1);

  const segments = parsed.map((c) => {
    const offsetDays = Math.max(c.start.diff(earliest, 'day', true), 0);
    const durationDays = Math.max(c.end.diff(c.start, 'day', true), 1);
    const leftPercent = (offsetDays / totalDays) * 100;
    const widthPercent = Math.max((durationDays / totalDays) * 100, 2);
    return {
      key: `${c.cycleType}-${String(c.startDate)}`,
      label: getCycleDescription(c.cycleType),
      leftPercent,
      widthPercent,
      color: getCycleColor(c.cycleType),
      startLabel: c.start.format('MMM D'),
      endLabel: c.end.format('MMM D'),
    };
  });

  return (
    <div className="cycle-timeline">
      <div className="cycle-timeline-title">Preparation Timeline</div>
      <div className="cycle-timeline-container">
        <div className="cycle-timeline-content">
          <div className="cycle-timeline-line" />
          {segments.map((seg) => (
            <div key={seg.key} className="cycle-segment">
              <div className="cycle-segment-header">
                <div className="cycle-segment-label" style={{ color: seg.color }}>{seg.label}</div>
                <div className="cycle-segment-dates">
                  {seg.startLabel} — {seg.endLabel}
                </div>
              </div>
              <div
                title={`${seg.label}: ${seg.startLabel} → ${seg.endLabel}`}
                className="cycle-segment-bar"
              >
                <div
                  className="cycle-segment-fill"
                  style={{
                    left: `${seg.leftPercent}%`,
                    width: `${seg.widthPercent}%`,
                    background: seg.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="cycle-timeline-footer">
        <span>{earliest.format('MMM D, YYYY')}</span>
        <span>{latest.format('MMM D, YYYY')}</span>
      </div>
    </div>
  );
};

// Main component that switches between views
const CycleTimeline: React.FC<CycleTimelineProps> = ({ cycles, variant = 'timeline' }) => {
  if (variant === 'milestones') {
    return <CycleMilestonesView cycles={cycles} />;
  }
  
  return <CycleTimelineView cycles={cycles} />;
};

export default CycleTimeline;
