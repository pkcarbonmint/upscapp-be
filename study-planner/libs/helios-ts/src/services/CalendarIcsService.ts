import type { StudyPlan, StudentIntake } from '../types/models';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import utc from 'dayjs/plugin/utc';
import { SubjectLoader } from './SubjectLoader';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(utc);

/**
 * CalendarIcsService - Generate iCalendar (.ics) files for Google Calendar import
 * 
 * This service converts study plans into iCalendar format, which can be imported into:
 * - Google Calendar
 * - Apple Calendar
 * - Microsoft Outlook
 * - Any other calendar application supporting .ics format
 */
export class CalendarIcsService {
  /**
   * Generate ICS file content as a string
   */
  static async generateStudyPlanIcs(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake
  ): Promise<string> {
    const events = await this.generateCalendarEvents(studyPlan, studentIntake);
    return this.createIcsContent(events, studyPlan, studentIntake);
  }

  /**
   * Generate ICS file as a Blob for browser download
   */
  static async generateStudyPlanIcsBlob(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake
  ): Promise<Blob> {
    const icsContent = await this.generateStudyPlanIcs(studyPlan, studentIntake);
    // Add UTF-8 BOM (Byte Order Mark) to ensure proper encoding in all calendar applications
    const bomContent = '\uFEFF' + icsContent;
    return new Blob([bomContent], { type: 'text/calendar;charset=utf-8' });
  }

  /**
   * Generate calendar events from study plan
   */
  private static async generateCalendarEvents(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    const cycles = studyPlan.cycles || [];

    // Add cycle milestone events
    for (const cycle of cycles) {
      const cycleStart = dayjs(cycle.cycleStartDate);
      const cycleEnd = dayjs(cycle.cycleEndDate);

      // Add cycle start event
      events.push({
        uid: `cycle-start-${cycle.cycleName}-${cycleStart.format('YYYY-MM-DD')}`,
        summary: `?? ${cycle.cycleName} - Start`,
        description: this.formatCycleDescription(cycle, 'start'),
        start: cycleStart.toDate(),
        end: cycleStart.add(1, 'hour').toDate(),
        location: 'Study Plan',
        allDay: true,
        categories: ['Study Plan', 'Milestone']
      });

      // Add cycle end event
      events.push({
        uid: `cycle-end-${cycle.cycleName}-${cycleEnd.format('YYYY-MM-DD')}`,
        summary: `? ${cycle.cycleName} - Complete`,
        description: this.formatCycleDescription(cycle, 'end'),
        start: cycleEnd.toDate(),
        end: cycleEnd.add(1, 'hour').toDate(),
        location: 'Study Plan',
        allDay: true,
        categories: ['Study Plan', 'Milestone']
      });

      // Add daily study tasks
      for (const block of cycle.cycleBlocks) {
        // Iterate through weekly plans
        if (block.weekly_plan) {
          for (const weeklyPlan of block.weekly_plan) {
            if (weeklyPlan.daily_plans) {
              for (const dailyPlan of weeklyPlan.daily_plans) {
                const dayDate = dayjs(dailyPlan.date);
                
                // Check if this is a catch-up day
                const isCatchupDay = this.isCatchupDay(
                  dayDate,
                  studentIntake.study_strategy?.catch_up_day_preference
                );

                if (dailyPlan.tasks && dailyPlan.tasks.length > 0) {
                  // Group tasks by subject
                  const tasksBySubject = this.groupTasksBySubject(dailyPlan.tasks, block.subjects);
                  
                  // Track current time for sequential scheduling
                  let currentTime = dayDate.hour(9).minute(0); // Start at 9 AM
                  
                  for (const [subjectCode, tasks] of Object.entries(tasksBySubject)) {
                    const subjectName = this.getSubjectName(subjectCode);
                    const totalDuration = tasks.reduce((sum, task) => sum + (task.duration_minutes || 0), 0);
                    
                    // Create event for this subject on this day - sequential scheduling
                    const eventStart = currentTime;
                    const eventEnd = eventStart.add(totalDuration, 'minute');
                    
                    // Update current time for next subject
                    currentTime = eventEnd;

                    events.push({
                      uid: `study-${subjectCode}-${dayDate.format('YYYY-MM-DD')}`,
                      summary: `${isCatchupDay ? '?? ' : '?? '}${subjectName}`,
                      description: this.formatTasksDescription(tasks, subjectName, isCatchupDay),
                      start: eventStart.toDate(),
                      end: eventEnd.toDate(),
                      location: 'Study Session',
                      categories: ['Study Plan', 'Study Session', subjectName],
                      color: this.getCategoryColor(cycle.cycleType)
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    // Add exam dates if available
    const examDate = dayjs(`${studyPlan.targeted_year}-08-31`);
    events.push({
      uid: `upsc-prelims-${studyPlan.targeted_year}`,
      summary: `?? UPSC Prelims ${studyPlan.targeted_year}`,
      description: `UPSC Civil Services Preliminary Examination ${studyPlan.targeted_year}`,
      start: examDate.toDate(),
      end: examDate.add(1, 'day').toDate(),
      location: 'Exam Center',
      allDay: true,
      categories: ['Exam', 'Important']
    });

    return events;
  }

  /**
   * Create ICS file content from events
   */
  private static createIcsContent(
    events: CalendarEvent[],
    studyPlan: StudyPlan,
    studentIntake: StudentIntake
  ): string {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//La Mentora//Study Planner//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:UPSC Study Plan ${studyPlan.targeted_year} - ${studentIntake.personal_details?.full_name || 'Student'}`,
      'X-WR-TIMEZONE:Asia/Kolkata',
      'X-WR-CALDESC:Personalized UPSC study plan created by La Mentora Study Planner'
    ];

    // Add timezone definition for IST
    lines.push(
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Kolkata',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:+0530',
      'TZOFFSETTO:+0530',
      'TZNAME:IST',
      'END:STANDARD',
      'END:VTIMEZONE'
    );

    // Add each event
    for (const event of events) {
      lines.push(...this.formatEvent(event));
    }

    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }

  /**
   * Format a single event in ICS format
   */
  private static formatEvent(event: CalendarEvent): string[] {
    const lines: string[] = ['BEGIN:VEVENT'];

    // Add UID
    lines.push(`UID:${event.uid}@lamentora.com`);

    // Add timestamp
    const now = dayjs();
    lines.push(`DTSTAMP:${this.formatIcsDate(now.toDate())}`);

    // Add start and end dates
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${this.formatIcsDateOnly(event.start)}`);
      lines.push(`DTEND;VALUE=DATE:${this.formatIcsDateOnly(event.end)}`);
    } else {
      lines.push(`DTSTART;TZID=Asia/Kolkata:${this.formatIcsDateTime(event.start)}`);
      lines.push(`DTEND;TZID=Asia/Kolkata:${this.formatIcsDateTime(event.end)}`);
    }

    // Add summary (title)
    lines.push(`SUMMARY:${this.escapeIcsText(event.summary)}`);

    // Add description
    if (event.description) {
      lines.push(`DESCRIPTION:${this.escapeIcsText(event.description)}`);
    }

    // Add location
    if (event.location) {
      lines.push(`LOCATION:${this.escapeIcsText(event.location)}`);
    }

    // Add categories
    if (event.categories && event.categories.length > 0) {
      lines.push(`CATEGORIES:${event.categories.join(',')}`);
    }

    // Add color (if supported)
    if (event.color) {
      lines.push(`COLOR:${event.color}`);
    }

    // Add status
    lines.push('STATUS:CONFIRMED');

    // Add transparency
    lines.push('TRANSP:OPAQUE');

    lines.push('END:VEVENT');

    return lines;
  }

  /**
   * Format date for ICS (YYYYMMDDTHHMMSSZ)
   */
  private static formatIcsDate(date: Date): string {
    return dayjs(date).utc().format('YYYYMMDDTHHmmss') + 'Z';
  }

  /**
   * Format date-time for ICS (YYYYMMDDTHHMMSS)
   */
  private static formatIcsDateTime(date: Date): string {
    return dayjs(date).format('YYYYMMDDTHHmmss');
  }

  /**
   * Format date only for ICS (YYYYMMDD)
   */
  private static formatIcsDateOnly(date: Date): string {
    return dayjs(date).format('YYYYMMDD');
  }

  /**
   * Escape special characters for ICS text fields
   */
  private static escapeIcsText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Format cycle description
   */
  private static formatCycleDescription(cycle: any, type: 'start' | 'end'): string {
    const lines: string[] = [];
    
    if (type === 'start') {
      lines.push(`Starting ${cycle.cycleName}`);
      lines.push(`Duration: ${cycle.cycleDuration || 'N/A'} weeks`);
    } else {
      lines.push(`Completing ${cycle.cycleName}`);
      lines.push(`Review your progress and prepare for the next phase.`);
    }

    if (cycle.cycleBlocks && cycle.cycleBlocks.length > 0) {
      lines.push('');
      lines.push('Subjects covered:');
      const subjects = new Set<string>();
      cycle.cycleBlocks.forEach((block: any) => {
        block.subjects?.forEach((subject: string) => {
          subjects.add(this.getSubjectName(subject));
        });
      });
      subjects.forEach(subject => lines.push(`- ${subject}`));
    }

    return lines.join('\\n');
  }

  /**
   * Format tasks description for an event
   */
  private static formatTasksDescription(
    tasks: any[],
    subjectName: string,
    isCatchupDay: boolean
  ): string {
    const lines: string[] = [];
    
    if (isCatchupDay) {
      lines.push('?? CATCH-UP DAY');
      lines.push('Use this day to review and consolidate your learning.');
      lines.push('');
    }

    lines.push(`Subject: ${subjectName}`);
    lines.push('');
    lines.push('Tasks:');

    for (const task of tasks) {
      const duration = this.formatDuration(task.duration_minutes || 0);
      const taskType = task.taskType || 'study';
      const title = this.formatTaskTitle(task.title);
      
      lines.push(`? ${title} (${duration}) - ${taskType.toUpperCase()}`);
    }

    const totalMinutes = tasks.reduce((sum, task) => sum + (task.duration_minutes || 0), 0);
    lines.push('');
    lines.push(`Total Duration: ${this.formatDuration(totalMinutes)}`);

    return lines.join('\\n');
  }

  /**
   * Group tasks by subject
   */
  private static groupTasksBySubject(tasks: any[], subjects: string[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    // If there's only one subject, assign all tasks to it
    if (subjects.length === 1) {
      grouped[subjects[0]] = tasks;
      return grouped;
    }

    // Try to match tasks to subjects based on task title
    for (const task of tasks) {
      let assigned = false;
      for (const subject of subjects) {
        if (task.title && task.title.includes(subject)) {
          if (!grouped[subject]) grouped[subject] = [];
          grouped[subject].push(task);
          assigned = true;
          break;
        }
      }
      
      // If no match found, assign to first subject
      if (!assigned) {
        const defaultSubject = subjects[0];
        if (!grouped[defaultSubject]) grouped[defaultSubject] = [];
        grouped[defaultSubject].push(task);
      }
    }

    return grouped;
  }

  /**
   * Get subject name from subject code
   */
  private static getSubjectName(subjectCode: string): string {
    const subject = SubjectLoader.getSubjectByCode(subjectCode);
    return subject?.subjectName || subjectCode;
  }

  /**
   * Format task title
   */
  private static formatTaskTitle(taskTitle: string): string {
    // Remove subject code prefix
    const match = taskTitle.match(/^([A-Z0-9-]+)\s+(.+?)\s+-\s+([A-Z0-9-]+(?:\/[0-9]+)?)$/);
    if (match) {
      const [, , taskType] = match;
      return taskType;
    }
    return taskTitle;
  }

  /**
   * Format duration
   */
  private static formatDuration(minutes: number): string {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${remainingMinutes}m`;
      }
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Check if a day is a catchup day
   */
  private static isCatchupDay(day: dayjs.Dayjs, catchUpPreference?: string): boolean {
    const dayOfWeek = day.day();
    const dayMap: Record<string, number> = {
      'SUNDAY': 0,
      'MONDAY': 1,
      'TUESDAY': 2,
      'WEDNESDAY': 3,
      'THURSDAY': 4,
      'FRIDAY': 5,
      'SATURDAY': 6
    };

    if (catchUpPreference && dayMap[catchUpPreference] !== undefined) {
      return dayOfWeek === dayMap[catchUpPreference];
    }

    return false;
  }

  /**
   * Get category color for cycle type
   */
  private static getCategoryColor(cycleType: string): string {
    const colorMap: Record<string, string> = {
      'C1': '#3B82F6',
      'C2': '#22C55E',
      'C3': '#EC4899',
      'C4': '#EF4444',
      'C5': '#8B5CF6',
      'C5B': '#8B5CF6',
      'C6': '#06B6D4',
      'C7': '#F59E0B',
      'C8': '#84CC16'
    };

    return colorMap[cycleType] || '#6B7280';
  }
}

/**
 * Calendar event interface
 */
interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  allDay?: boolean;
  categories?: string[];
  color?: string;
}
