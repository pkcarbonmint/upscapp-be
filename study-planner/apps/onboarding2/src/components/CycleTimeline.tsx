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
    <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 600, color: 'var(--ms-blue)', marginBottom: 8 }}>Preparation Timeline</div>
      <div
        style={{
          background: 'var(--ms-white)',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 12,
        }}
      >
        <div
          style={{
            maxHeight: 360,
            overflowY: 'auto',
            position: 'relative',
            paddingLeft: 24,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 8,
              top: 0,
              bottom: 0,
              width: 2,
              background: '#e5e7eb',
            }}
          />
          {segments.map((seg) => (
            <div key={seg.key} style={{ position: 'relative', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, color: seg.color }}>{seg.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ms-blue)' }}>
                  {seg.startLabel} — {seg.endLabel}
                </div>
              </div>
              <div
                title={`${seg.label}: ${seg.startLabel} → ${seg.endLabel}`}
                style={{
                  position: 'relative',
                  height: 10,
                  marginTop: 6,
                  background: '#f5f7fa',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${seg.leftPercent}%`,
                    width: `${seg.widthPercent}%`,
                    top: 0,
                    bottom: 0,
                    background: seg.color,
                    opacity: 0.9,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
          fontSize: 12,
          color: 'var(--ms-blue)',
        }}
      >
        <span>{earliest.format('MMM D, YYYY')}</span>
        <span>{latest.format('MMM D, YYYY')}</span>
      </div>
    </div>
  );
};

export default CycleTimeline;
