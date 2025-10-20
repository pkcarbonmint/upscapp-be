import { distributeTasksIntoDays } from 'scheduler';
import { WeeklyTask, DailyHourLimits } from 'scheduler';

// Test if the document generation process is using the updated scheduler
function testSchedulerVersion() {
  console.log('🔍 Testing scheduler version used by document generation');
  console.log('=' .repeat(80));
  
  // Create the exact T1 scenario tasks that should cause scheduling holes
  const t1Tasks: WeeklyTask[] = [
    // Monday: 2 tasks (17.5 hours total)
    { task_id: 'task-1', humanReadableId: 'OPT-AGRw0t1', title: 'Practice (Answer Writing): Agriculture', duration_minutes: 600, taskType: 'practice', resources: [], subjectCode: 'OPT-AGR' },
    { task_id: 'task-2', humanReadableId: 'undefinedw0t2', title: 'Weekly Revision', duration_minutes: 450, taskType: 'practice', resources: [], subjectCode: 'undefined' },
    
    // Tuesday: 2 tasks (17.5 hours total)
    { task_id: 'task-3', humanReadableId: 'OPT-AGRw0t3', title: 'Practice (Answer Writing): Agriculture', duration_minutes: 600, taskType: 'practice', resources: [], subjectCode: 'OPT-AGR' },
    { task_id: 'task-4', humanReadableId: 'undefinedw0t4', title: 'Weekly Revision', duration_minutes: 450, taskType: 'practice', resources: [], subjectCode: 'undefined' },
    
    // Wednesday: 2 tasks (17.5 hours total)
    { task_id: 'task-5', humanReadableId: 'OPT-AGRw0t5', title: 'Practice (Answer Writing): Agriculture', duration_minutes: 600, taskType: 'practice', resources: [], subjectCode: 'OPT-AGR' },
    { task_id: 'task-6', humanReadableId: 'undefinedw0t6', title: 'Weekly Revision', duration_minutes: 450, taskType: 'practice', resources: [], subjectCode: 'undefined' },
    
    // Thursday: 2 tasks (17.5 hours total)
    { task_id: 'task-7', humanReadableId: 'OPT-AGRw0t7', title: 'Practice (Answer Writing): Agriculture', duration_minutes: 600, taskType: 'practice', resources: [], subjectCode: 'OPT-AGR' },
    { task_id: 'task-8', humanReadableId: 'undefinedw0t8', title: 'Weekly Revision', duration_minutes: 450, taskType: 'practice', resources: [], subjectCode: 'undefined' },
    
    // Sunday: 3 tasks (20 hours total)
    { task_id: 'task-9', humanReadableId: 'OPT-AGRw0t9', title: 'Practice (Answer Writing): Agriculture', duration_minutes: 600, taskType: 'practice', resources: [], subjectCode: 'OPT-AGR' },
    { task_id: 'task-10', humanReadableId: 'OPT-AGRw0t10', title: 'Test (Mains): Agriculture', duration_minutes: 150, taskType: 'test', resources: [], subjectCode: 'OPT-AGR' },
    { task_id: 'task-11', humanReadableId: 'undefinedw0t11', title: 'Weekly Revision', duration_minutes: 450, taskType: 'practice', resources: [], subjectCode: 'undefined' },
  ];

  const dailyLimits: DailyHourLimits = {
    regular_day: 8, // 8 hours per day
    test_day: 6     // 6 hours on test days
  };

  console.log(`📊 Tasks: ${t1Tasks.length} tasks`);
  console.log(`📊 Total duration: ${(t1Tasks.reduce((sum, task) => sum + task.duration_minutes, 0) / 60).toFixed(2)} hours`);
  console.log(`📊 Daily limits: Regular=${dailyLimits.regular_day}h, Test=${dailyLimits.test_day}h`);

  const result = distributeTasksIntoDays({
    tasks: t1Tasks,
    dailyLimits: dailyLimits,
    // Use default values: Saturday is catchup day, Sunday is test day
  });

  console.log('\n📅 Daily task distribution:');
  result.dailyPlans.forEach((day, index) => {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];
    const totalHours = (day.tasks.reduce((sum, task) => sum + task.duration_minutes, 0) / 60).toFixed(2);
    console.log(`   ${dayName}: ${day.tasks.length} tasks (${totalHours}h)`);
    
    if (day.tasks.length > 0) {
      day.tasks.forEach(task => {
        console.log(`      - ${task.title} (${task.duration_minutes}min, ${task.taskType})`);
      });
    }
  });

  // Check for scheduling holes
  const daysWithNoTasks: number[] = [];
  result.dailyPlans.forEach((day, index) => {
    if (day.tasks.length === 0) {
      daysWithNoTasks.push(index);
    }
  });

  console.log(`\n🔍 Analysis:`);
  console.log(`   Days with no tasks: ${daysWithNoTasks.length > 0 ? daysWithNoTasks.join(', ') : 'None'}`);
  
  if (daysWithNoTasks.length > 0) {
    const dayNames = daysWithNoTasks.map(day => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]);
    console.log(`   ❌ SCHEDULING HOLES DETECTED: Days ${daysWithNoTasks.join(', ')} (${dayNames.join(', ')}) have no tasks`);
    console.log(`   🔧 This indicates the OLD scheduler is being used (with catchup day restrictions)`);
  } else {
    console.log(`   ✅ NO SCHEDULING HOLES DETECTED`);
    console.log(`   🔧 This indicates the NEW scheduler is being used (catchup day restrictions removed)`);
  }
}

testSchedulerVersion();
