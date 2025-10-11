import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import type { StudyPlan, Block } from '../types/models';
import dayjs from 'dayjs';

// Color mapping for different task types
const TASK_TYPE_COLORS = {
  'study': 'E8F4FD', // Light blue - New learning
  'revision': 'FFF8E1', // Light yellow - Review
  'practice': 'F0F8E8', // Light green - Practice tests
  'current_affairs': 'F3E5F5', // Light purple - Current affairs
  'optional': 'FFEBEE', // Light red - Optional subject
  'break': 'F5F5F5', // Light gray - Break/rest
  'assessment': 'E0F2F1' // Light teal - Tests/assessments
} as const;

interface WeeklyTask {
  day: string;
  time: string;
  subject: string;
  task: string;
  type: keyof typeof TASK_TYPE_COLORS;
  duration: string;
  resources?: string[]; // Resource titles used by this task
}

interface WeeklySchedule {
  weekNumber: number;
  startDate: string;
  endDate: string;
  cycleName: string;
  blockTitle: string;
  tasks: WeeklyTask[];
}

export class WeeklyScheduleService {
  /**
   * Generate weekly schedule document for a study plan
   */
  static async generateWeeklySchedule(studyPlan: StudyPlan): Promise<Document> {
    const weeklySchedules = await this.generateWeeklySchedules(studyPlan);
    
    const document = new Document({
      sections: weeklySchedules.map((schedule, _index) => ({
        properties: {
          page: {
            size: {
              orientation: 'landscape',
              width: 15840, // A4 landscape width in twips
              height: 12240  // A4 landscape height in twips
            },
            margin: {
              top: 720,     // 0.5 inch
              right: 720,   // 0.5 inch
              bottom: 720,  // 0.5 inch
              left: 720     // 0.5 inch
            }
          }
        },
        children: [
          // Week header - compact
          new Paragraph({
            children: [
              new TextRun({
                text: `Week ${schedule.weekNumber}`,
                size: 24,
                bold: true,
                color: '2E5BBA',
                font: 'Calibri'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          
          // Date range and cycle info - compact
          new Paragraph({
            children: [
              new TextRun({
                text: `${schedule.startDate} - ${schedule.endDate}`,
                size: 16,
                color: '666666',
                font: 'Calibri'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `${schedule.cycleName} | ${schedule.blockTitle}`,
                size: 14,
                italics: true,
                color: '888888',
                font: 'Calibri'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          }),
          
          // Calendar-style weekly schedule table
          this.createCalendarStyleTable(schedule.tasks)
        ]
      }))
    });

    return document;
  }

  /**
   * Generate weekly schedules from study plan
   */
  private static async generateWeeklySchedules(studyPlan: StudyPlan): Promise<WeeklySchedule[]> {
    const schedules: WeeklySchedule[] = [];
    let weekNumber = 1;

    if (!studyPlan.cycles) {
      return schedules;
    }

    for (const cycle of studyPlan.cycles) {
      if (!cycle.cycleBlocks) continue;

      for (const block of cycle.cycleBlocks) {
        const blockStartDate = block.block_start_date ? dayjs(block.block_start_date) : dayjs(cycle.cycleStartDate);
        
        for (let week = 0; week < block.duration_weeks; week++) {
          const weekStartDate = blockStartDate.add(week, 'week');
          const weekEndDate = weekStartDate.add(6, 'days');
          
          const tasks = await this.convertBlockTasksToWeeklyTasks(block, week);
          
          schedules.push({
            weekNumber: weekNumber++,
            startDate: weekStartDate.format('MMM DD, YYYY'),
            endDate: weekEndDate.format('MMM DD, YYYY'),
            cycleName: cycle.cycleName || 'Study Cycle',
            blockTitle: block.block_title || 'Study Block',
            tasks
          });
        }
      }
    }

    return schedules;
  }

  /**
   * Convert existing block tasks to weekly tasks format
   */
  private static async convertBlockTasksToWeeklyTasks(block: Block, weekIndex: number): Promise<WeeklyTask[]> {
    const tasks: WeeklyTask[] = [];
    
    // Check if block has weekly_plan with tasks
    if (block.weekly_plan && block.weekly_plan.length > weekIndex) {
      const weeklyPlan = block.weekly_plan[weekIndex];
      
      if (weeklyPlan.daily_plans) {
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        for (const [dayIndex, dailyPlan] of weeklyPlan.daily_plans.entries()) {
          const dayName = dayNames[dayIndex] || `Day ${dayIndex + 1}`;
          
          if (dailyPlan.tasks && dailyPlan.tasks.length > 0) {
            for (const task of dailyPlan.tasks) {
              // Extract resources from block resources
              let resources: string[] = [];
              
              if (block.block_resources) {
                resources = [
                  ...(block.block_resources.primary_books?.slice(0, 2).map(r => r.resource_title) || []),
                  ...(block.block_resources.supplementary_materials?.slice(0, 1).map(r => r.resource_title) || []),
                  ...(block.block_resources.practice_resources?.slice(0, 1).map(r => r.resource_title) || [])
                ];
              }
              
              // Determine task type based on current affairs type or default to study
              let taskType: keyof typeof TASK_TYPE_COLORS = 'study';
              if (task.currentAffairsType) {
                taskType = 'current_affairs';
              } else if (task.title2.toLowerCase().includes('revision')) {
                taskType = 'revision';
              } else if (task.title2.toLowerCase().includes('practice') || task.title2.toLowerCase().includes('test')) {
                taskType = 'practice';
              }
              
                  tasks.push({
                    day: dayName,
                    time: '', // No fixed time
                    subject: block.subjects?.[0] || 'General Studies',
                    task: task.title2,
                    type: taskType,
                    duration: `${task.duration_minutes}m`,
                    resources
                  });
            }
          } else {
            // No tasks for this day - add a break
            tasks.push({
              day: dayName,
              time: '',
              subject: 'Rest',
              task: 'No scheduled tasks',
              type: 'break',
              duration: '24h'
            });
          }
        }
      }
    } else {
      // No weekly plan available - create placeholder tasks
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          dayNames.forEach(dayName => {
            tasks.push({
              day: dayName,
              time: '',
              subject: block.subjects?.[0] || 'General Studies',
              task: 'Study Session',
              type: 'study',
              duration: '8h'
            });
          });
    }

    return tasks;
  }

  /**
   * Format duration to show hours if >= 60 minutes, otherwise minutes
   */
  private static formatDuration(duration: string): string {
    // Extract minutes from duration string like "120m" or "2h"
    const minutesMatch = duration.match(/(\d+)m/);
    const hoursMatch = duration.match(/(\d+)h/);
    
    let totalMinutes = 0;
    if (minutesMatch) {
      totalMinutes += parseInt(minutesMatch[1]);
    }
    if (hoursMatch) {
      totalMinutes += parseInt(hoursMatch[1]) * 60;
    }
    
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    
    return `${totalMinutes}m`;
  }

  /**
   * Create calendar-style weekly schedule table with notes
   */
  private static createCalendarStyleTable(tasks: WeeklyTask[]): Table {
    const rows: TableRow[] = [];
    
    // Header row with day names
    rows.push(new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: 'Monday', bold: true, size: 14, font: 'Calibri' })],
            alignment: AlignmentType.CENTER
          })],
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: 'F0F0F0' }
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: 'Tuesday', bold: true, size: 14, font: 'Calibri' })],
            alignment: AlignmentType.CENTER
          })],
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: 'F0F0F0' }
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: 'Wednesday', bold: true, size: 14, font: 'Calibri' })],
            alignment: AlignmentType.CENTER
          })],
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: 'F0F0F0' }
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: 'Thursday', bold: true, size: 14, font: 'Calibri' })],
            alignment: AlignmentType.CENTER
          })],
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: 'F0F0F0' }
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: 'Friday', bold: true, size: 14, font: 'Calibri' })],
            alignment: AlignmentType.CENTER
          })],
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: 'F0F0F0' }
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: 'Saturday', bold: true, size: 14, font: 'Calibri' })],
            alignment: AlignmentType.CENTER
          })],
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: 'F0F0F0' }
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: 'Sunday', bold: true, size: 14, font: 'Calibri' })],
            alignment: AlignmentType.CENTER
          })],
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: 'F0F0F0' }
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: 'Notes', bold: true, size: 14, font: 'Calibri' })],
            alignment: AlignmentType.CENTER
          })],
          width: { size: 16, type: WidthType.PERCENTAGE },
          shading: { fill: 'F0F0F0' }
        })
      ]
    }));

    // Group tasks by day
    const tasksByDay = tasks.reduce((acc, task) => {
      if (!acc[task.day]) {
        acc[task.day] = [];
      }
      acc[task.day].push(task);
      return acc;
    }, {} as Record<string, WeeklyTask[]>);

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Create calendar rows - each row represents a time slot or task
    const maxTasksPerDay = Math.max(...dayNames.map(day => tasksByDay[day]?.length || 0));
    
    for (let i = 0; i < Math.max(maxTasksPerDay, 3); i++) {
      const rowCells: TableCell[] = [];
      
      // Day columns
      dayNames.forEach(dayName => {
        const dayTasks = tasksByDay[dayName] || [];
        const task = dayTasks[i];
        
        if (task) {
          rowCells.push(new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ 
                  text: task.task, 
                  size: 10,
                  bold: true,
                  font: 'Calibri'
                })],
                alignment: AlignmentType.LEFT,
                spacing: { after: 200 }
              }),
              new Paragraph({
                children: [new TextRun({ 
                  text: this.formatDuration(task.duration), 
                  size: 9,
                  color: '666666',
                  font: 'Calibri'
                })],
                alignment: AlignmentType.LEFT,
                spacing: { after: 200 }
              }),
              ...(task.resources && task.resources.length > 0 
                ? task.resources.slice(0, 2).map(resource => 
                    new Paragraph({
                      children: [new TextRun({ 
                        text: `• ${resource}`, 
                        size: 8,
                        color: '888888',
                        font: 'Calibri'
                      })],
                      alignment: AlignmentType.LEFT,
                      spacing: { after: 100 }
                    })
                  )
                : [])
            ],
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: TASK_TYPE_COLORS[task.type] }
          }));
        } else {
          rowCells.push(new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: '', size: 10, font: 'Calibri' })],
              alignment: AlignmentType.LEFT
            })],
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFFFF' }
          }));
        }
      });
      
      // Notes column
      rowCells.push(new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: '', size: 10, font: 'Calibri' })],
          alignment: AlignmentType.LEFT
        })],
        width: { size: 16, type: WidthType.PERCENTAGE },
        shading: { fill: 'FFFFFF' }
      }));
      
      rows.push(new TableRow({ children: rowCells }));
    }

    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'F0F0F0' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'F0F0F0' }
      }
    });
  }


  /**
   * Download weekly schedule as Word document
   */
  static async downloadWeeklySchedule(studyPlan: StudyPlan, _filename?: string): Promise<Blob> {
    const document = await this.generateWeeklySchedule(studyPlan);
    const buffer = await Packer.toBuffer(document);
    return new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }
}