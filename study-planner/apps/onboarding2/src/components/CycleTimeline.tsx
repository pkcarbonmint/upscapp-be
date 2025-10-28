import React from 'react';
import dayjs, { Dayjs } from 'dayjs';

export interface CycleItem {
  cycleType: string;
  startDate: string | Date;
  endDate: string | Date;
}

interface CycleTimelineProps {
  cycles: CycleItem[];
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

const CycleTimeline: React.FC<CycleTimelineProps> = ({ cycles }) => {
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
    <div className="timeline">
      <div className="timeline__title">Preparation Timeline</div>
      <div className="timeline__panel">
        <div className="timeline__scroll">
          <div className="timeline__rail" />
          {segments.map((seg) => (
            <div key={seg.key} className="timeline__row">
              <div className="timeline__meta">
                <div className="timeline__label" style={{ color: seg.color }}>{seg.label}</div>
                <div className="timeline__date">
                  {seg.startLabel} — {seg.endLabel}
                </div>
              </div>
              <div className="timeline__bar" title={`${seg.label}: ${seg.startLabel} → ${seg.endLabel}`}>
                <div className="timeline__bar-fill" style={{ left: `${seg.leftPercent}%`, width: `${seg.widthPercent}%`, background: seg.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="timeline__footer">
        <span>{earliest.format('MMM D, YYYY')}</span>
        <span>{latest.format('MMM D, YYYY')}</span>
      </div>
    </div>
  );
};

export default CycleTimeline;
