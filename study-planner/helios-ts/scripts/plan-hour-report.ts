import type { StudyPlan } from "../src/types/models";

type Row = {
    cycleType: string;
    blockIndex: number;
    week: number;
    day: number;
    duration: number;
};
const m2h = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

export function publishPlanHourReport(plan: StudyPlan) {
    const rows: Row[] = plan.cycles.flatMap((cycle) => {
        const cycleType = cycle.cycleType;
        return cycle.cycleBlocks.flatMap((block, blockIndex) => {
            const weekly_plan = block.weekly_plan;
            return weekly_plan.flatMap((week) => {
                return week.daily_plans.flatMap((day): Row => {
                    const durations = day.tasks.map((t) => t.duration_minutes);
                    const total_duration = durations.reduce((a, b) => a + b, 0);
                    return { cycleType, blockIndex: (blockIndex+1), week: week.week, day: day.day, duration: total_duration } as Row;
                });
            });
        });
    });
    const report = rows
        .sort((a: Row, b: Row) => b.duration - a.duration)
        .map((row: Row) => {
            const pad2 = (n: number) => String(n).padStart(2, '0');
            return `${row.cycleType} ${pad2(row.blockIndex)} ${pad2(row.week)} ${pad2(row.day)} ${row.duration} minutes`;
        });
    return report;
}
