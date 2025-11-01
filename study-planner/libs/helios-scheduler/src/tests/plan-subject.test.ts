import { describe, it, expect } from 'vitest';
import { planSubjectTasks } from '../plan-tasks';
import { S2Subject, S2Constraints, S2SlotType, S2WeekDay, CycleType } from '../types';
import dayjs from 'dayjs';
import * as fs from 'fs';
import * as path from 'path';

describe('planSubjectTasks - Debug Test Cases', () => {
  it('should reproduce error scenario from captured debug data', async () => {
    // Look for debug files in the debug directory
    const debugDir = path.join(__dirname, '..', '..', 'debug');
    
    if (!fs.existsSync(debugDir)) {
      console.log('No debug directory found. Skipping test.');
      return;
    }

    const debugFiles = fs.readdirSync(debugDir)
      .filter(file => file.startsWith('createTasks_v2_debug_') && file.endsWith('.json'))
      .sort()
      .reverse(); // Get the most recent file first

    if (debugFiles.length === 0) {
      console.log('No debug files found. Skipping test.');
      return;
    }

    const latestDebugFile = debugFiles[0];
    const debugFilePath = path.join(debugDir, latestDebugFile);
    
    console.log(`Loading debug data from: ${debugFilePath}`);
    
    const debugData = JSON.parse(fs.readFileSync(debugFilePath, 'utf-8'));
    
    // Reconstruct the inputs from the debug data
    const subject: S2Subject = {
      isNCERT: debugData.inputs.subject.isNCERT || false,
      subjectCode: debugData.inputs.subject.subjectCode,
      subjectNname: debugData.inputs.subject.subjectNname,
      examFocus: debugData.inputs.subject.examFocus,
      topics: debugData.inputs.subject.topics.map((topic: any) => ({
        code: topic.code,
        baselineMinutes: topic.baselineMinutes,
        subtopics: topic.subtopics.map((subtopic: any) => ({
          code: subtopic.code,
          name: subtopic.name,
          baselineMinutes: subtopic.baselineMinutes,
          isEssential: subtopic.isEssential,
          priorityLevel: subtopic.priorityLevel
        }))
      })),
      baselineMinutes: debugData.inputs.subject.baselineMinutes
    };

    const constraints: S2Constraints = {
      cycleType: debugData.inputs.constraints.cycleType as CycleType,
      dayMaxMinutes: debugData.inputs.constraints.dayMaxMinutes,
      dayMinMinutes: debugData.inputs.constraints.dayMinMinutes,
      catchupDay: debugData.inputs.constraints.catchupDay as S2WeekDay,
      testDay: debugData.inputs.constraints.testDay as S2WeekDay,
      testMinutes: debugData.inputs.constraints.testMinutes,
      taskEffortSplit: debugData.inputs.constraints.taskEffortSplit as Record<S2SlotType, number>
    };

    const from = dayjs(debugData.inputs.from);
    const to = dayjs(debugData.inputs.to);

    console.log(`Reproducing error scenario:`);
    console.log(`- Subject: ${subject.subjectCode}`);
    console.log(`- Date range: ${from.format('YYYY-MM-DD')} to ${to.format('YYYY-MM-DD')}`);
    console.log(`- Topics: ${subject.topics.length}`);
    console.log(`- Original error: ${debugData.errorMessage}`);
    console.log(`- Missing days: ${debugData.missingDays.filter((d: any) => !d.isCovered).length}`);

    // This should now work without throwing an error (fix applied)
    const tasks = planSubjectTasks(from, to, subject, constraints);
    expect(tasks).toBeDefined();
    expect(tasks.length).toBeGreaterThan(0);
    
    // Verify all days are covered
    const taskDates = new Set(tasks.map(task => task.date.format('YYYY-MM-DD')));
    const allDays = [];
    for (let i = 0; i < to.diff(from, 'day'); i++) {
      allDays.push(dayjs(from).add(i, 'day').format('YYYY-MM-DD'));
    }
    
    const missingDays = allDays.filter(day => !taskDates.has(day));
    expect(missingDays).toHaveLength(0);
    
    console.log(`✅ Fix successful: Generated ${tasks.length} tasks covering all ${allDays.length} days`);
  });

  it('should create a test case template for manual debugging', () => {
    // This test creates a template that can be used to manually test scenarios
    const templateData = {
      description: "Template for creating manual test cases",
      inputs: {
        subject: {
          subjectCode: "TEST_SUBJECT",
          subjectNname: "Test Subject",
          examFocus: "BothExams",
          topics: [
            {
              code: "TOPIC_1",
              baselineMinutes: 120,
              subtopics: [
                {
                  code: "SUBT_1",
                  name: "Test Subtopic 1",
                  baselineMinutes: 60,
                  isEssential: true,
                  priorityLevel: 1
                }
              ]
            }
          ],
          baselineMinutes: 120
        },
        constraints: {
          cycleType: "C1",
          dayMaxMinutes: 480,
          dayMinMinutes: 240,
          catchupDay: 0, // Sunday
          testDay: 6, // Saturday
          testMinutes: 180,
          taskEffortSplit: {
            [S2SlotType.STUDY]: 0.6,
            [S2SlotType.REVISION]: 0.3,
            [S2SlotType.PRACTICE]: 0.1,
            [S2SlotType.TEST]: 0,
            [S2SlotType.CATCHUP]: 0
          }
        },
        from: "2024-01-01 09:00:00",
        to: "2024-01-07 18:00:00"
      }
    };

    const templateFile = path.join(__dirname, '..', '..', 'debug', 'test_template.json');
    const debugDir = path.dirname(templateFile);
    
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    fs.writeFileSync(templateFile, JSON.stringify(templateData, null, 2));
    console.log(`Test template created at: ${templateFile}`);
    
    expect(fs.existsSync(templateFile)).toBe(true);
  });
});
