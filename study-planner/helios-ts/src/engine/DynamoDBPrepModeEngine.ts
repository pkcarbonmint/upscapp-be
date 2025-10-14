import type { PrepMode } from '../types/Types';
import type { Archetype } from '../types/models';
import type { PrepModeConfigFile, ExamSchedule, PrelimThresholds, MainsThresholds } from '../types/config';
import { loadPrepModeConfig } from '../services/DynamoDBSubjectLoader';
import dayjs from 'dayjs';

// Cache for config
let prepModeConfigCache: PrepModeConfigFile | null = null;

async function getPrepModeConfig(): Promise<PrepModeConfigFile> {
  if (prepModeConfigCache === null) {
    prepModeConfigCache = await loadPrepModeConfig();
  }
  return prepModeConfigCache;
}

function getArchetypeWeeklyHours(archetype: Archetype): number {
    return archetype.timeCommitment === 'FullTime' ? 45 : 25;
}

function getPrelimsDatesForYear(examSchedule: ExamSchedule, year: number): dayjs.Dayjs {
  return examSchedule ? 
    dayjs().year(year).month(examSchedule.prelims_month - 1).date(examSchedule.prelims_day)
    : dayjs().year(year).month(4).date(20); // Default to May 20 if no schedule
}

function getMainsDatesForYear(examSchedule: ExamSchedule, year: number): dayjs.Dayjs {
    return examSchedule ?
      dayjs().year(year).month(examSchedule.mains_month - 1).date(examSchedule.mains_day)
      : dayjs().year(year).month(7).date(20); // Default to August 20 if no schedule
}

function diffDays(date1: dayjs.Dayjs, date2: dayjs.Dayjs): number {
    return Math.abs(date2.diff(date1, 'day'));
}

function determinePrelimsPrepMode(thresholds: PrelimThresholds, daysToPrelims: number, weeklyHours: number): PrepMode {
    if (daysToPrelims >= thresholds.standard_days) return "StandardPrelims";
    if (daysToPrelims >= thresholds.accelerated_days) return "AcceleratedPrelims";
    if (daysToPrelims >= thresholds.crash_days) {
        return weeklyHours >= thresholds.minimum_hours_for_crash ? "CrashPrelims" : "TooLateMode";
    }
    return "TooLateMode";
}

function determineMainsPrepMode(thresholds: MainsThresholds, daysToMains: number, _weeklyHours: number): PrepMode {
    if (daysToMains >= thresholds.mains_standard_days) return "StandardMains";
    if (daysToMains >= thresholds.mains_accelerated_days) return "AcceleratedMains";
    if (daysToMains >= thresholds.mains_crash_days) return "CrashMains";
    return "TooLateMode";
}

async function determinePrepModeForYear(currentDate: dayjs.Dayjs, targetYear: number, archetype: Archetype): Promise<PrepMode> {
    const prepModeConfig = await getPrepModeConfig();
    const examSchedule = prepModeConfig.exam_schedule;
    const thresholds = prepModeConfig.time_thresholds;
    const prelimsDate = getPrelimsDatesForYear(examSchedule, targetYear);
    const mainsDate = getMainsDatesForYear(examSchedule, targetYear);
    const daysToPrelimsFromNow = diffDays(prelimsDate, currentDate);
    const daysToMainsFromNow = diffDays(mainsDate, currentDate);
    const weeklyHours = getArchetypeWeeklyHours(archetype);

    if (daysToPrelimsFromNow < thresholds.prelims.too_late_days && currentDate.isBefore(prelimsDate)) {
        return "TooLateMode";
    } else if (currentDate.isAfter(mainsDate) || currentDate.isSame(mainsDate)) {
        return "InterviewPrep";
    } else if (daysToPrelimsFromNow > thresholds.foundation.longterm_days) {
        return "LongtermFoundation";
    } else if (daysToPrelimsFromNow > thresholds.foundation.mediumterm_days) {
        return "MediumtermFoundation";
    } else if (currentDate.isBefore(prelimsDate)) {
        return determinePrelimsPrepMode(thresholds.prelims, daysToPrelimsFromNow, weeklyHours);
    } else {
        return determineMainsPrepMode(thresholds.mains, daysToMainsFromNow, weeklyHours);
    }
}

function parseTargetYear(targetYearText: string): number | null {
    const year = parseInt(targetYearText, 10);
    return !isNaN(year) && year >= 2024 && year <= 2030 ? year : null;
}

export async function getPrepModeProgression(
    planDate: dayjs.Dayjs,
    targetYearStr: string | undefined,
    archetype: Archetype,
    weeklyHours: number // Add weeklyHours as a direct parameter
): Promise<PrepMode[]> {

    const initialMode = await (async () => {
        if (!targetYearStr) return "LongtermFoundation";
        const targetYear = parseTargetYear(targetYearStr);
        if (!targetYear) return "LongtermFoundation";
        return await determinePrepModeForYear(planDate, targetYear, archetype);
    })();

    if (initialMode === "TooLateMode") return ["TooLateMode"];
    if (initialMode === "InterviewPrep") return ["InterviewPrep"];

    if (initialMode === "LongtermFoundation") {
        return ["LongtermFoundation", "MediumtermFoundation", "StandardPrelims", "StandardMains", "InterviewPrep"];
    }

    if (initialMode === "MediumtermFoundation") {
        const targetYear = parseTargetYear(targetYearStr || '');
        if (targetYear) {
            const prepModeConfig = await getPrepModeConfig();
            const prelimsDate = getPrelimsDatesForYear(prepModeConfig.exam_schedule, targetYear);
            const daysToPrelims = diffDays(prelimsDate, planDate);
            if (daysToPrelims > prepModeConfig.time_thresholds.foundation.mediumterm_days && weeklyHours > 35) {
                return ["MediumtermFoundation", "StandardPrelims", "StandardMains", "InterviewPrep"];
            }
        }
        return ["MediumtermFoundation", "AcceleratedPrelims", "AcceleratedMains", "InterviewPrep"];
    }

    if (initialMode === "StandardPrelims") {
        return weeklyHours > 35
            ? ["StandardPrelims", "StandardMains", "InterviewPrep"]
            : ["StandardPrelims", "AcceleratedMains", "InterviewPrep"];
    }

    if (initialMode === "AcceleratedPrelims") {
        return weeklyHours > 35
            ? ["AcceleratedPrelims", "StandardMains", "InterviewPrep"]
            : ["AcceleratedPrelims", "AcceleratedMains", "InterviewPrep"];
    }

    if (initialMode === "CrashPrelims") {
        return ["CrashPrelims", "CrashMains", "InterviewPrep"];
    }

    if (initialMode === "StandardMains") return ["StandardMains", "InterviewPrep"];
    if (initialMode === "AcceleratedMains") return ["AcceleratedMains", "InterviewPrep"];
    if (initialMode === "CrashMains") return ["CrashMains", "InterviewPrep"];

    return [initialMode];
}