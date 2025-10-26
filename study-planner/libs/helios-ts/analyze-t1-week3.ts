import { studyPlan } from "./generated-docs/T1";
import type { StudyPlan } from "./src/types/models";
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

function analyzeT1ScenarioTasks(plan: StudyPlan) {
  console.log('🔍 Analyzing T1 Scenario Task Distribution');
  console.log('=' .repeat(80));
  
  // Find C2 cycle (UPSC Foundation Cycle)
  const c2Cycle = plan.cycles?.find(cycle => cycle.cycleType === 'C2');
  
  if (!c2Cycle) {
    console.log('❌ C2 cycle not found');
    return;
  }
  
  console.log(`📅 C2 Cycle: ${c2Cycle.cycleName}`);
  console.log(`📅 Duration: ${c2Cycle.cycleStartDate} to ${c2Cycle.cycleEndDate}`);
  
  // Analyze Week 3 specifically (where we see holes)
  const block = c2Cycle.cycleBlocks?.[0]; // First block
  if (!block) {
    console.log('❌ No blocks found');
    return;
  }
  
  console.log(`📦 Block: ${block.block_name || 'Unnamed'}`);
  console.log(`📅 Block Duration: ${block.block_start_date} to ${block.block_end_date}`);
  
  const weeklyPlan = block.weekly_plan?.find((wp: any) => wp.week === 3);
  if (!weeklyPlan) {
    console.log('❌ Week 3 not found');
    return;
  }
  
  console.log(`\n📅 Week 3 Analysis:`);
  
  const dailyPlans = weeklyPlan.daily_plans || [];
  let totalTasks = 0;
  let totalHours = 0;
  
  dailyPlans.forEach((dailyPlan, index) => {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dailyPlan.day];
    const tasks = dailyPlan.tasks || [];
    const dayHours = tasks.reduce((sum, task) => sum + task.duration_minutes, 0) / 60;
    
    totalTasks += tasks.length;
    totalHours += dayHours;
    
    console.log(`   ${dayName} (day ${dailyPlan.day}): ${tasks.length} tasks (${dayHours.toFixed(2)}h)`);
    
    if (tasks.length > 0) {
      tasks.forEach((task: any, taskIndex: number) => {
        console.log(`      ${taskIndex + 1}. ${task.title} (${task.duration_minutes}min, ${task.subjectCode})`);
      });
    }
  });
  
  console.log(`\n📊 Week 3 Summary:`);
  console.log(`   📋 Total tasks: ${totalTasks}`);
  console.log(`   ⏱️  Total hours: ${totalHours.toFixed(2)}`);
  console.log(`   📊 Average hours per day: ${(totalHours / 7).toFixed(2)}`);
  
  // Extract task details for test case
  console.log(`\n🧪 Test Case Data:`);
  console.log(`const t1Week3Tasks = [`);
  
  dailyPlans.forEach((dailyPlan, index) => {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dailyPlan.day];
    const tasks = dailyPlan.tasks || [];
    
    if (tasks.length > 0) {
      console.log(`  // ${dayName} (day ${dailyPlan.day}): ${tasks.length} tasks`);
      tasks.forEach((task: any) => {
        console.log(`  { task_id: '${task.task_id}', humanReadableId: '${task.humanReadableId}', title: '${task.title}', duration_minutes: ${task.duration_minutes}, taskType: '${task.taskType}', resources: [], subjectCode: '${task.subjectCode}' },`);
      });
    }
  });
  
  console.log(`];`);
}

function main() {
  try {
    analyzeT1ScenarioTasks(studyPlan as unknown as StudyPlan);
  } catch (error) {
    console.error('❌ Error analyzing T1 scenario:', error);
  }
}

main();
