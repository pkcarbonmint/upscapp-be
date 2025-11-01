import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { StepProps } from '@/types';
import type { StudyPlan, StudyCycle } from 'helios-ts';
import { SubjectLoader } from 'helios-ts';
import CycleTimeline, { CycleItem } from './CycleTimeline';
import {
  downloadPlan,
  downloadPlanWithoutWeeklyViews,
  downloadMonthPlan,
  downloadGoogleCalendar,
} from './util/download';
import { map2StudentIntake, map2UserId } from './util/intake-mapper';

dayjs.extend(isBetween);

interface Props extends StepProps {}

interface CycleColor {
  bg: string;
  fg: string;
  border: string;
}

interface PlanStats {
  start: Dayjs;
  end: Dayjs;
  totalDays: number;
  totalWeeks: number;
  cycleCount: number;
  blockCount: number;
}

interface BlockWithCycle {
  id: string;
  cycle: StudyCycle;
  block: any;
  start: Dayjs;
  end: Dayjs;
  subjectCodes: string[];
  subjectNames: string[];
}

interface BlockSchedule {
  id: string;
  title: string;
  subjectNames: string[];
  subjectCodes: string[];
  start: Dayjs;
  end: Dayjs;
  cycleType?: string;
  cycleName?: string;
}

interface DayCell {
  date: Dayjs;
  inMonth: boolean;
  cycleType?: string;
  cycleName?: string;
  subjects: string[];
  blocks: BlockSchedule[];
}

interface WeekBlock extends BlockSchedule {
  activeDays: Dayjs[];
}

interface WeekSummary {
  key: string;
  start: Dayjs;
  end: Dayjs;
  cycle?: StudyCycle;
  subjects: string[];
  blocks: WeekBlock[];
  inMonth: boolean;
}

interface MonthView {
  id: string;
  label: string;
  start: Dayjs;
  end: Dayjs;
  associatedCycles: StudyCycle[];
  dayCells: DayCell[];
  weeks: WeekSummary[];
}

interface BirdsEyeCycle {
  id: string;
  name: string;
  cycleType: string;
  intensity?: string;
  description: string;
  start: Dayjs;
  end: Dayjs;
  durationDays: number;
  blockCount: number;
  focusSubjects: string[];
}

interface SelectOption {
  value: number;
  label: string;
}

const normalizeCycleType = (cycleType?: string) => (cycleType || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

const DEFAULT_CYCLE_COLOR: CycleColor = {
  bg: '#F3F4F6',
  fg: '#1F2937',
  border: '#D1D5DB',
};

const CYCLE_TYPE_COLORS: Record<string, CycleColor> = {
  C1: { bg: '#DBEAFE', border: '#3B82F6', fg: '#1D4ED8' },
  C2: { bg: '#DCFCE7', border: '#22C55E', fg: '#166534' },
  C3: { bg: '#FCE7F3', border: '#EC4899', fg: '#BE185D' },
  C4: { bg: '#FEE2E2', border: '#EF4444', fg: '#B91C1C' },
  C5: { bg: '#FFEFD5', border: '#FB923C', fg: '#C2410C' },
  C5B: { bg: '#FFEFD5', border: '#FB923C', fg: '#C2410C' },
  C6: { bg: '#E0F2FE', border: '#06B6D4', fg: '#0369A1' },
  C7: { bg: '#FFEDD5', border: '#F59E0B', fg: '#B45309' },
  C8: { bg: '#ECFCCB', border: '#84CC16', fg: '#4D7C0F' },
};

const CYCLE_DESCRIPTIONS: Record<string, string> = {
  C1: 'NCERT Foundation — building core concepts from the ground up.',
  C2: 'Comprehensive Foundation — deep dives across GS subjects.',
  C3: 'Mains Revision Pre-Prelims — reinforcing mains readiness.',
  C4: 'Prelims Reading — broad coverage with daily practice.',
  C5: 'Prelims Revision — intensive revision and mock focus.',
  C5B: 'Prelims Rapid Revision — accelerated refresh before exam.',
  C6: 'Mains Revision — thorough answer-writing and consolidation.',
  C7: 'Rapid Mains — high-frequency revision sprints.',
  C8: 'Mains Foundation — structured build-up for mains depth.',
};

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const StudentDashboard: React.FC<Props> = (stepProps) => {
  const { formData } = stepProps;
  const previewPlan = formData.preview.raw_helios_data as StudyPlan | null;

  const latestStepPropsRef = useRef(stepProps);
  useEffect(() => {
    latestStepPropsRef.current = stepProps;
  }, [stepProps]);

  const [plan, setPlan] = useState<StudyPlan | null>(() => previewPlan ?? null);
  const [isLoading, setIsLoading] = useState(!previewPlan);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);

  const subjectNameCache = useRef(new Map<string, string>());

  useEffect(() => {
    try {
      SubjectLoader.loadAllSubjects(formData.commitment.upscOptionalSubject || undefined);
    } catch (err) {
      console.warn('Failed to preload subjects for dashboard view:', err);
    }
  }, [formData.commitment.upscOptionalSubject]);

  const resolveSubjectName = useCallback((subjectCode: string) => {
    if (subjectNameCache.current.has(subjectCode)) {
      return subjectNameCache.current.get(subjectCode)!;
    }
    try {
      const subject = SubjectLoader.getSubjectByCode(subjectCode);
      const name = subject?.subjectName || subjectCode;
      subjectNameCache.current.set(subjectCode, name);
      return name;
    } catch (err) {
      console.warn('Subject lookup failed for code:', subjectCode, err);
      return subjectCode;
    }
  }, []);

  const getCycleColor = useCallback((cycleType?: string): CycleColor => {
    if (!cycleType) return DEFAULT_CYCLE_COLOR;
    const normalized = normalizeCycleType(cycleType);
    return CYCLE_TYPE_COLORS[normalized] || DEFAULT_CYCLE_COLOR;
  }, []);

  const getCycleDescriptionText = useCallback((cycleType?: string) => {
    if (!cycleType) return 'Study cycle overview';
    const normalized = normalizeCycleType(cycleType);
    return CYCLE_DESCRIPTIONS[normalized] || 'Study cycle overview';
  }, []);

  const generatePlanFromEngine = useCallback(async () => {
    const current = latestStepPropsRef.current;
    const { generatePlan } = await import('helios-ts');
    const intake = map2StudentIntake(current);
    return generatePlan(map2UserId(current), intake) as Promise<StudyPlan>;
  }, []);

  useEffect(() => {
    if (previewPlan) {
      setPlan(previewPlan);
      setIsLoading(false);
      setError(null);
    }
  }, [previewPlan]);

  const hasTriggeredGeneration = useRef(false);
  useEffect(() => {
    if (previewPlan || hasTriggeredGeneration.current) {
      return;
    }
    hasTriggeredGeneration.current = true;
    let isMounted = true;
    setIsLoading(true);

    generatePlanFromEngine()
      .then((generated) => {
        if (!isMounted) return;
        setPlan(generated);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to generate study plan for dashboard:', err);
        if (!isMounted) return;
        setError('We could not load your plan right now. Please try again.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [previewPlan, generatePlanFromEngine]);

  const handleRegeneratePlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const regenerated = await generatePlanFromEngine();
      setPlan(regenerated);
    } catch (err) {
      console.error('Manual plan refresh failed:', err);
      setError('Unable to refresh the plan at the moment. Please retry in a bit.');
    } finally {
      setIsLoading(false);
    }
  }, [generatePlanFromEngine]);

  const cycleRanges = useMemo(() => {
    if (!plan?.cycles) return [] as Array<{ cycle: StudyCycle; start: Dayjs; end: Dayjs }>;
    return plan.cycles.map((cycle) => ({
      cycle,
      start: dayjs((cycle as any).cycleStartDate || cycle.cycleStartDate),
      end: dayjs((cycle as any).cycleEndDate || cycle.cycleEndDate || (cycle as any).cycleStartDate),
    }));
  }, [plan]);

  const blocks = useMemo<BlockWithCycle[]>(() => {
    if (!plan?.cycles) return [];
    const collection: BlockWithCycle[] = [];
    plan.cycles.forEach((cycle) => {
      cycle.cycleBlocks?.forEach((block: any, index: number) => {
        const rawStart = block.block_start_date ?? block.blockStartDate;
        const rawEnd = block.block_end_date ?? block.blockEndDate ?? rawStart;
        if (!rawStart) return;
        const start = dayjs(rawStart);
        const end = dayjs(rawEnd || rawStart);
        const subjectCodes = Array.isArray(block.subjects) ? block.subjects : [];
        const subjectNames = subjectCodes.map(resolveSubjectName);
        const blockId = block.block_id || `${cycle.cycleId || cycle.cycleName || 'cycle'}-${index}-${start.format('YYYYMMDD')}`;
        collection.push({
          id: blockId,
          cycle,
          block,
          start,
          end,
          subjectCodes,
          subjectNames,
        });
      });
    });
    return collection;
  }, [plan, resolveSubjectName]);

  const planStats = useMemo<PlanStats | null>(() => {
    if (!plan || !plan.start_date) return null;
    const start = dayjs(plan.start_date);
    const end = cycleRanges.reduce((latest, range) => (range.end.isAfter(latest) ? range.end : latest), start);
    const totalDays = Math.max(end.diff(start, 'day') + 1, 0);
    const totalWeeks = Math.max(Math.ceil(totalDays / 7), 0);
    const cycleCount = plan.cycles?.length ?? 0;
    const blockCount = plan.cycles?.reduce((sum, cycle) => sum + (cycle.cycleBlocks?.length ?? 0), 0) ?? 0;
    return { start, end, totalDays, totalWeeks, cycleCount, blockCount };
  }, [plan, cycleRanges]);

  const birdsEyeCycles = useMemo<BirdsEyeCycle[]>(() => {
    if (!plan?.cycles) return [];
    return plan.cycles.map((cycle, index) => {
      const start = dayjs((cycle as any).cycleStartDate || cycle.cycleStartDate);
      const end = dayjs((cycle as any).cycleEndDate || cycle.cycleEndDate || (cycle as any).cycleStartDate);
      const durationDays = Math.max(end.diff(start, 'day') + 1, 0);
      const blockCount = cycle.cycleBlocks?.length ?? 0;
      const subjectFrequency = new Map<string, number>();
      cycle.cycleBlocks?.forEach((block: any) => {
        (block.subjects ?? []).forEach((subjectCode: string) => {
          const subjectName = resolveSubjectName(subjectCode);
          subjectFrequency.set(subjectName, (subjectFrequency.get(subjectName) ?? 0) + 1);
        });
      });
      const focusSubjects = Array.from(subjectFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
      return {
        id: cycle.cycleId || `cycle-${index}`,
        name: (cycle.cycleName || `Cycle ${index + 1}`).replace(/ Cycle$/i, ''),
        cycleType: cycle.cycleType,
        intensity: cycle.cycleIntensity,
        description: cycle.cycleDescription || getCycleDescriptionText(cycle.cycleType),
        start,
        end,
        durationDays,
        blockCount,
        focusSubjects,
      };
    });
  }, [plan, resolveSubjectName, getCycleDescriptionText]);

  const monthViews = useMemo<MonthView[]>(() => {
    if (!plan?.start_date || cycleRanges.length === 0) return [];
    const months: MonthView[] = [];
    const planStart = dayjs(plan.start_date);
    const planEnd = cycleRanges.reduce((latest, range) => (range.end.isAfter(latest) ? range.end : latest), planStart);

    for (let cursor = planStart.startOf('month'); cursor.isBefore(planEnd, 'month') || cursor.isSame(planEnd, 'month'); cursor = cursor.add(1, 'month')) {
      const monthStart = cursor.startOf('month');
      const monthEnd = cursor.endOf('month');
      const relevantCycles = cycleRanges
        .filter((range) => range.start.isSameOrBefore(monthEnd, 'day') && range.end.isSameOrAfter(monthStart, 'day'))
        .map((range) => range.cycle);

      const calendarStart = monthStart.startOf('week');
      const calendarEnd = monthEnd.endOf('week');
      const dayCells: DayCell[] = [];

      for (let date = calendarStart; date.isBefore(calendarEnd, 'day') || date.isSame(calendarEnd, 'day'); date = date.add(1, 'day')) {
        const activeCycle = cycleRanges.find((range) => date.isSameOrAfter(range.start, 'day') && date.isSameOrBefore(range.end, 'day'))?.cycle;
        const dayBlocks = blocks.filter((block) => date.isSameOrAfter(block.start, 'day') && date.isSameOrBefore(block.end, 'day'));
        const subjects = unique(dayBlocks.flatMap((block) => block.subjectNames));

        dayCells.push({
          date,
          inMonth: date.isSame(monthStart, 'month'),
          cycleType: activeCycle?.cycleType,
          cycleName: activeCycle?.cycleName,
          subjects,
          blocks: dayBlocks.map((block) => ({
            id: block.id,
            title: block.block.block_title ?? block.block.blockTitle ?? 'Study Block',
            subjectNames: block.subjectNames,
            subjectCodes: block.subjectCodes,
            start: block.start,
            end: block.end,
            cycleType: block.cycle.cycleType,
            cycleName: block.cycle.cycleName,
          })),
        });
      }

      const weeks: WeekSummary[] = [];
      for (let index = 0; index < dayCells.length; index += 7) {
        const weekDays = dayCells.slice(index, index + 7);
        if (weekDays.length === 0) continue;
        const weekStart = weekDays[0].date;
        const weekEnd = weekDays[weekDays.length - 1].date;
        const inMonth = weekDays.some((day) => day.inMonth);
        const weekCycle = cycleRanges.find((range) => weekDays.some((day) => normalizeCycleType(day.cycleType) === normalizeCycleType(range.cycle.cycleType)))?.cycle;
        const weekBlocksMap = new Map<string, WeekBlock>();

        weekDays.forEach((day) => {
          day.blocks.forEach((block) => {
            const existing = weekBlocksMap.get(block.id);
            if (!existing) {
              weekBlocksMap.set(block.id, {
                ...block,
                activeDays: [day.date],
              });
            } else {
              existing.activeDays.push(day.date);
            }
          });
        });

        const weekBlocks = Array.from(weekBlocksMap.values()).map((block) => ({
          ...block,
          activeDays: block.activeDays.sort((a, b) => a.valueOf() - b.valueOf()),
        }));

        const weekSubjects = unique(weekBlocks.flatMap((block) => block.subjectNames));

        weeks.push({
          key: `${weekStart.format('YYYY-MM-DD')}__${weekEnd.format('YYYY-MM-DD')}`,
          start: weekStart,
          end: weekEnd,
          cycle: weekCycle,
          blocks: weekBlocks,
          subjects: weekSubjects,
          inMonth,
        });
      }

      months.push({
        id: monthStart.format('YYYY-MM'),
        label: monthStart.format('MMMM YYYY'),
        start: monthStart,
        end: monthEnd,
        associatedCycles: relevantCycles,
        dayCells,
        weeks,
      });
    }

    return months;
  }, [plan, cycleRanges, blocks]);

  useEffect(() => {
    if (monthViews.length === 0) {
      setSelectedWeekKey(null);
      return;
    }
    if (selectedMonthIndex >= monthViews.length) {
      setSelectedMonthIndex(monthViews.length - 1);
    }
  }, [monthViews, selectedMonthIndex]);

  useEffect(() => {
    const month = monthViews[selectedMonthIndex];
    if (!month) {
      setSelectedWeekKey(null);
      return;
    }
    if (month.weeks.length === 0) {
      setSelectedWeekKey(null);
      return;
    }
    if (selectedWeekKey && month.weeks.some((week) => week.key === selectedWeekKey)) {
      return;
    }
    const fallbackWeek = month.weeks.find((week) => week.inMonth) ?? month.weeks[0];
    setSelectedWeekKey(fallbackWeek?.key ?? null);
  }, [monthViews, selectedMonthIndex, selectedWeekKey]);

  const monthOptions = useMemo<SelectOption[]>(() => monthViews.map((month, index) => ({ value: index, label: month.label })), [monthViews]);

  const timelineCycles = useMemo<CycleItem[]>(() => birdsEyeCycles.map((cycle) => ({
    cycleType: cycle.cycleType,
    startDate: cycle.start.toISOString(),
    endDate: cycle.end.toISOString(),
  })), [birdsEyeCycles]);

  const selectedMonth = monthViews[selectedMonthIndex];
  const weeksForSelectedMonth = useMemo(() => selectedMonth ? selectedMonth.weeks.filter((week) => week.inMonth) : [], [selectedMonth]);

  return (
    <div className="container" style={{ paddingTop: '16px', paddingBottom: '32px' }}>
      <PlanSummaryCard
        planStats={planStats}
        personalName={formData.personalInfo.fullName}
        targetYear={formData.targetYear.targetYear}
        isLoading={isLoading}
        error={error}
        onRefresh={handleRegeneratePlan}
      />

      <BirdsEyeViewSection
        cycles={birdsEyeCycles}
        timelineCycles={timelineCycles}
        getCycleColor={getCycleColor}
      />

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <MonthViewSection
          months={monthViews}
          monthOptions={monthOptions}
          selectedMonthIndex={selectedMonthIndex}
          onMonthChange={setSelectedMonthIndex}
          getCycleColor={getCycleColor}
        />
        <WeekViewSection
          monthLabel={selectedMonth?.label}
          weeks={weeksForSelectedMonth}
          selectedWeekKey={selectedWeekKey}
          onWeekChange={setSelectedWeekKey}
          getCycleColor={getCycleColor}
        />
      </div>

      <DownloadActionsCard
        stepProps={stepProps}
        monthOptions={monthOptions}
        selectedMonthIndex={selectedMonthIndex}
        onMonthChange={setSelectedMonthIndex}
        isLoading={isLoading}
      />
    </div>
  );
};

interface PlanSummaryCardProps {
  planStats: PlanStats | null;
  personalName: string;
  targetYear: string;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
}

const PlanSummaryCard: React.FC<PlanSummaryCardProps> = ({ planStats, personalName, targetYear, isLoading, error, onRefresh }) => (
  <div className="ms-card" style={{ padding: '24px', marginBottom: '16px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
      <div>
        <h1 className="ms-font-title" style={{ margin: 0 }}>Your Study Plan Dashboard</h1>
        <p className="ms-font-body" style={{ marginTop: '8px', color: '#4B5563' }}>
          Welcome back, <strong>{personalName}</strong>. Here&apos;s the latest snapshot of your UPSC {targetYear} preparation plan.
        </p>
        <p className="ms-font-caption" style={{ marginTop: '4px', color: '#9CA3AF' }}>
          Editing tools will arrive soon — this view is structured to support updates without redesigning the layout.
        </p>
      </div>
      <button
        className="ms-button ms-button-secondary"
        style={{ minWidth: '160px' }}
        onClick={() => onRefresh()}
        disabled={isLoading}
      >
        {isLoading ? 'Refreshing…' : 'Refresh Plan'}
      </button>
    </div>

    {error && (
      <div className="error-message" style={{ marginTop: '16px' }}>
        {error}
      </div>
    )}

    {isLoading && !planStats && !error && (
      <p className="ms-font-body" style={{ marginTop: '16px', color: '#6B7280' }}>Loading your personalized plan…</p>
    )}

    {planStats && (
      <div style={{ marginTop: '20px', display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <MetricCard
          label="Plan Duration"
          value={`${planStats.totalWeeks} weeks`}
          helper={`${planStats.start.format('MMM D, YYYY')} – ${planStats.end.format('MMM D, YYYY')}`}
        />
        <MetricCard
          label="Study Cycles"
          value={`${planStats.cycleCount}`}
          helper="Structured progression roadmap"
        />
        <MetricCard
          label="Study Blocks"
          value={`${planStats.blockCount}`}
          helper="Focused work segments"
        />
        <MetricCard
          label="Total Days"
          value={`${planStats.totalDays}`}
          helper="Inclusive of buffers and revision"
        />
      </div>
    )}
  </div>
);

interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, helper }) => (
  <div
    style={{
      borderRadius: '18px',
      padding: '18px',
      background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.12), rgba(255, 210, 63, 0.1))',
      border: '1px solid rgba(255, 107, 53, 0.25)',
      boxShadow: '0 10px 30px rgba(255, 107, 53, 0.08)',
    }}
  >
    <div className="ms-font-caption" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', marginBottom: '6px' }}>{label}</div>
    <div className="ms-font-title" style={{ fontSize: '24px', marginBottom: '4px', color: '#1F2937' }}>{value}</div>
    {helper && <div className="ms-font-caption" style={{ color: '#6B7280' }}>{helper}</div>}
  </div>
);

interface BirdsEyeViewSectionProps {
  cycles: BirdsEyeCycle[];
  timelineCycles: CycleItem[];
  getCycleColor: (cycleType?: string) => CycleColor;
}

const BirdsEyeViewSection: React.FC<BirdsEyeViewSectionProps> = ({ cycles, timelineCycles, getCycleColor }) => (
  <div className="ms-card" style={{ padding: '24px', marginBottom: '16px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '12px' }}>
      <div>
        <h2 className="ms-font-subtitle" style={{ margin: 0 }}>Bird&apos;s Eye View</h2>
        <p className="ms-font-body" style={{ marginTop: '6px', color: '#4B5563' }}>
          Track how each study cycle flows across the calendar year.
        </p>
      </div>
      <span className="ms-font-caption" style={{ color: '#9CA3AF' }}>{cycles.length} cycles mapped</span>
    </div>

    {timelineCycles.length > 0 && (
      <div style={{ marginTop: '20px' }}>
        <CycleTimeline cycles={timelineCycles} />
      </div>
    )}

    <div style={{ marginTop: '24px', display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
      {cycles.map((cycle) => {
        const color = getCycleColor(cycle.cycleType);
        return (
          <div
            key={cycle.id}
            style={{
              position: 'relative',
              borderRadius: '20px',
              padding: '20px',
              border: `1px solid ${color.border}`,
              background: '#FFFFFF',
              overflow: 'hidden',
              boxShadow: '0 12px 30px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: `${color.bg}40`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div className="ms-font-caption" style={{ color: color.fg, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                {cycle.cycleType} {cycle.intensity ? `• ${cycle.intensity}` : ''}
              </div>
              <div className="ms-font-subtitle" style={{ lineHeight: '28px', marginBottom: '6px', color: '#1F2937' }}>{cycle.name}</div>
              <p className="ms-font-body" style={{ color: '#4B5563', marginBottom: '12px' }}>{cycle.description}</p>
              <div className="ms-font-caption" style={{ color: '#6B7280', marginBottom: '10px' }}>
                {cycle.start.format('MMM D')} – {cycle.end.format('MMM D')} ({cycle.durationDays} days)
              </div>
              {cycle.focusSubjects.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {cycle.focusSubjects.map((subject) => (
                    <span
                      key={subject}
                      className="ms-font-caption"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        background: '#FFFFFF',
                        border: `1px solid ${color.border}`,
                        color: color.fg,
                      }}
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              )}
              <div className="ms-font-caption" style={{ color: '#9CA3AF', marginTop: '12px' }}>{cycle.blockCount} blocks</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

interface MonthViewSectionProps {
  months: MonthView[];
  monthOptions: SelectOption[];
  selectedMonthIndex: number;
  onMonthChange: (index: number) => void;
  getCycleColor: (cycleType?: string) => CycleColor;
}

const MonthViewSection: React.FC<MonthViewSectionProps> = ({ months, monthOptions, selectedMonthIndex, onMonthChange, getCycleColor }) => {
  const selectedMonth = months[selectedMonthIndex];

  return (
    <div className="ms-card" style={{ padding: '24px', minWidth: '320px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h3 className="ms-font-subtitle" style={{ margin: 0 }}>Monthly View</h3>
          <p className="ms-font-body" style={{ marginTop: '6px', color: '#4B5563' }}>Zoom into a calendar-style view of your study focus.</p>
        </div>
        <select
          className="ms-select"
          value={selectedMonthIndex}
          onChange={(event) => onMonthChange(Number(event.target.value))}
          disabled={monthOptions.length === 0}
          style={{ minWidth: '200px' }}
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {selectedMonth ? (
        <MonthGrid month={selectedMonth} getCycleColor={getCycleColor} />
      ) : (
        <p className="ms-font-body" style={{ marginTop: '20px', color: '#6B7280' }}>
          Generate or select a plan to see its monthly layout.
        </p>
      )}
    </div>
  );
};

interface MonthGridProps {
  month: MonthView;
  getCycleColor: (cycleType?: string) => CycleColor;
}

const MonthGrid: React.FC<MonthGridProps> = ({ month, getCycleColor }) => (
  <div style={{ marginTop: '20px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
      {dayLabels.map((day) => (
        <div key={day} className="ms-font-caption" style={{ textAlign: 'center', fontWeight: 600, color: '#6B7280' }}>{day}</div>
      ))}

      {month.dayCells.map((day) => {
        const color = getCycleColor(day.cycleType);
        const isMuted = !day.inMonth;
        return (
          <div
            key={day.date.format('YYYY-MM-DD')}
            style={{
              borderRadius: '14px',
              padding: '12px',
              minHeight: '110px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              border: `1px solid ${isMuted ? 'rgba(209, 213, 219, 0.6)' : `${color.border}66`}`,
              background: isMuted ? 'rgba(249, 250, 251, 0.6)' : '#FFFFFF',
            }}
            title={day.blocks.map((block) => block.title).join('\n')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="ms-font-body" style={{ fontWeight: 600, color: isMuted ? '#9CA3AF' : color.fg }}>{day.date.date()}</span>
              {day.cycleName && (
                <span className="ms-font-caption" style={{ color: isMuted ? '#A1A1AA' : color.fg }}>
                  {day.cycleName.replace(/ Cycle$/i, '')}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {day.subjects.slice(0, 3).map((subject) => (
                <span
                  key={subject}
                  className="ms-font-caption"
                  style={{
                    padding: '4px 8px',
                    borderRadius: '999px',
                    background: isMuted ? 'rgba(209, 213, 219, 0.3)' : `${color.bg}80`,
                    color: '#374151',
                  }}
                >
                  {subject}
                </span>
              ))}
              {day.subjects.length > 3 && (
                <span className="ms-font-caption" style={{ padding: '4px 8px', borderRadius: '999px', background: 'rgba(107, 114, 128, 0.12)', color: '#4B5563' }}>
                  +{day.subjects.length - 3}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

interface WeekViewSectionProps {
  monthLabel?: string;
  weeks: WeekSummary[];
  selectedWeekKey: string | null;
  onWeekChange: (weekKey: string | null) => void;
  getCycleColor: (cycleType?: string) => CycleColor;
}

const WeekViewSection: React.FC<WeekViewSectionProps> = ({ monthLabel, weeks, selectedWeekKey, onWeekChange, getCycleColor }) => {
  const selectedWeek = weeks.find((week) => week.key === selectedWeekKey) ?? null;

  return (
    <div className="ms-card" style={{ padding: '24px', minWidth: '320px' }}>
      <div>
        <h3 className="ms-font-subtitle" style={{ margin: 0 }}>Weekly Detail</h3>
        <p className="ms-font-body" style={{ marginTop: '6px', color: '#4B5563' }}>
          Drill into the focus areas for {monthLabel ? monthLabel : 'your selected month'}.
        </p>
      </div>

      {weeks.length > 0 ? (
        <>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginTop: '16px' }}>
            {weeks.map((week) => {
              const isActive = week.key === selectedWeekKey;
              return (
                <button
                  key={week.key}
                  className={`ms-button ${isActive ? 'ms-button-primary' : 'ms-button-secondary'}`}
                  style={{ flex: '0 0 auto', padding: '10px 16px', minWidth: '160px', whiteSpace: 'nowrap' }}
                  onClick={() => onWeekChange(week.key)}
                >
                  {week.start.format('MMM D')} – {week.end.format('MMM D')}
                </button>
              );
            })}
          </div>

          {selectedWeek ? (
            <WeekDetailsCard week={selectedWeek} getCycleColor={getCycleColor} />
          ) : (
            <p className="ms-font-body" style={{ marginTop: '20px', color: '#6B7280' }}>
              Select a week to see its detailed breakdown.
            </p>
          )}
        </>
      ) : (
        <p className="ms-font-body" style={{ marginTop: '20px', color: '#6B7280' }}>
          Choose a month to view its weekly schedule.
        </p>
      )}
    </div>
  );
};

interface WeekDetailsCardProps {
  week: WeekSummary;
  getCycleColor: (cycleType?: string) => CycleColor;
}

const WeekDetailsCard: React.FC<WeekDetailsCardProps> = ({ week, getCycleColor }) => {
  const color = getCycleColor(week.cycle?.cycleType);
  return (
    <div
      style={{
        marginTop: '20px',
        borderRadius: '18px',
        border: `1px solid ${color.border}`,
        background: `${color.bg}40`,
        padding: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
      }}
    >
      <div>
        <div className="ms-font-caption" style={{ color: color.fg, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {week.cycle?.cycleType ? `${week.cycle.cycleType} • ${week.cycle.cycleName?.replace(/ Cycle$/i, '') || 'Cycle'}` : 'Focus Week'}
        </div>
        <div className="ms-font-subtitle" style={{ marginTop: '4px', color: '#1F2937' }}>
          {week.start.format('MMM D')} – {week.end.format('MMM D')}
        </div>
        {week.subjects.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {week.subjects.map((subject) => (
              <span
                key={subject}
                className="ms-font-caption"
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: '#FFFFFF',
                  border: `1px solid ${color.border}`,
                  color: color.fg,
                }}
              >
                {subject}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '16px', background: '#FFFFFF', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(209, 213, 219, 0.6)' }}>
        {week.blocks.length === 0 ? (
          <p className="ms-font-body" style={{ margin: '16px', color: '#6B7280' }}>
            No specific blocks scheduled this week. Use the time for consolidation or mentor-driven adjustments.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(249, 250, 251, 0.8)', textAlign: 'left' }}>
                <th style={{ padding: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280' }}>Block</th>
                <th style={{ padding: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280' }}>Subjects</th>
                <th style={{ padding: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280' }}>Schedule</th>
                <th style={{ padding: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', textAlign: 'center' }}>Active Days</th>
              </tr>
            </thead>
            <tbody>
              {week.blocks.map((block) => {
                const dayCount = unique(block.activeDays.map((day) => day.format('YYYY-MM-DD'))).length;
                return (
                  <tr key={block.id} style={{ borderTop: '1px solid rgba(229, 231, 235, 0.8)' }}>
                    <td style={{ padding: '14px', fontWeight: 600, color: '#111827' }}>{block.title}</td>
                    <td style={{ padding: '14px', color: '#4B5563' }}>{block.subjectNames.join(', ') || '—'}</td>
                    <td style={{ padding: '14px', color: '#4B5563', whiteSpace: 'nowrap' }}>
                      {block.start.format('MMM D')} – {block.end.format('MMM D')}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', color: '#4B5563' }}>{dayCount} day{dayCount === 1 ? '' : 's'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

interface DownloadActionsCardProps {
  stepProps: StepProps;
  monthOptions: SelectOption[];
  selectedMonthIndex: number;
  onMonthChange: (index: number) => void;
  isLoading: boolean;
}

const DownloadActionsCard: React.FC<DownloadActionsCardProps> = ({ stepProps, monthOptions, selectedMonthIndex, onMonthChange, isLoading }) => (
  <div className="ms-card" style={{ padding: '24px', marginTop: '16px' }}>
    <h3 className="ms-font-subtitle" style={{ margin: 0 }}>Download Your Study Plan</h3>
    <p className="ms-font-body" style={{ marginTop: '6px', color: '#4B5563' }}>
      Export official documents or add the plan to your calendar.
    </p>

    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="form-grid form-grid-2" style={{ gap: '12px' }}>
        <button className="ms-button ms-button-primary" onClick={() => downloadPlan(stepProps)} disabled={isLoading}>
          📥 Download Full Study Plan
        </button>
        <button className="ms-button ms-button-secondary" onClick={() => downloadPlanWithoutWeeklyViews(stepProps)} disabled={isLoading}>
          📅 Download Monthly Calendar
        </button>
      </div>

      <div>
        <button
          className="ms-button ms-button-primary"
          style={{ width: '100%', background: '#4285F4' }}
          onClick={() => downloadGoogleCalendar(stepProps)}
          disabled={isLoading}
        >
          📆 Export to Google Calendar (.ics)
        </button>
        <p className="ms-font-caption" style={{ marginTop: '8px', color: '#6B7280', textAlign: 'center' }}>
          Compatible with Google, Apple, and Outlook calendars.
        </p>
      </div>

      <div style={{ marginTop: '4px', paddingTop: '16px', borderTop: '1px solid rgba(209, 213, 219, 0.6)' }}>
        <label className="ms-label" htmlFor="dashboard-month-download">Download a specific month</label>
        <div className="form-grid form-grid-2" style={{ gap: '10px', alignItems: 'center' }}>
          <select
            id="dashboard-month-download"
            className="ms-select"
            value={selectedMonthIndex}
            onChange={(event) => onMonthChange(Number(event.target.value))}
            disabled={isLoading || monthOptions.length === 0}
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            className="ms-button ms-button-secondary"
            onClick={() => downloadMonthPlan(stepProps, selectedMonthIndex)}
            disabled={isLoading || monthOptions.length === 0}
            style={{ whiteSpace: 'nowrap' }}
          >
            📄 Download {monthOptions[selectedMonthIndex]?.label ?? 'Month'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default StudentDashboard;
