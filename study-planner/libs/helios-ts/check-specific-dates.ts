import { studyPlan } from "./generated-docs/T1";
import type { StudyPlan } from "./src/types/models";
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

function checkSpecificDate(plan: StudyPlan, dateStr: string) {
  console.log(`🔍 Checking ${dateStr} for tasks`);
  console.log('=' .repeat(80));
  
  const targetDate = dayjs(dateStr);
  const dayName = targetDate.format('dddd');
  
  console.log(`📅 Date: ${targetDate.format('YYYY-MM-DD')} (${dayName})`);
  
  let foundTasks = false;
  let totalTasksFound = 0;
  
  // Check all cycles
  for (const cycle of plan.cycles || []) {
    const cycleStart = dayjs(cycle.cycleStartDate);
    const cycleEnd = dayjs(cycle.cycleEndDate);
    
    if (!targetDate.isBetween(cycleStart, cycleEnd, 'day', '[]')) {
      continue;
    }
    
    console.log(`🔄 Cycle: ${cycle.cycleName} (${cycle.cycleType})`);
    
    // Check all blocks in this cycle
    for (const block of cycle.cycleBlocks || []) {
      const blockStart = dayjs(block.block_start_date);
      const blockEnd = dayjs(block.block_end_date);
      
      if (!targetDate.isBetween(blockStart, blockEnd, 'day', '[]')) {
        continue;
      }
      
      console.log(`   📦 Block: ${block.block_name || 'Unnamed'} (${blockStart.format('MMM DD')} - ${blockEnd.format('MMM DD')})`);
      
      // Calculate which week of the block this day falls into
      const daysFromStart = targetDate.diff(blockStart, 'day');
      const weekNumber = Math.floor(daysFromStart / 7) + 1;
      const dayOfWeek = targetDate.day();
      
      console.log(`   📊 Days from start: ${daysFromStart}, Week: ${weekNumber}, Day of week: ${dayOfWeek}`);
      
      const weeklyPlan = block.weekly_plan?.find((wp: any) => wp.week === weekNumber);
      
      if (!weeklyPlan) {
        console.log(`   ❌ No weekly plan found for week ${weekNumber}`);
        continue;
      }
      
      console.log(`   ✅ Found weekly plan for week ${weekNumber}`);
      
      const dayPlan = weeklyPlan.daily_plans?.find((dp: any) => dp.day === dayOfWeek);
      
      if (!dayPlan) {
        console.log(`   ❌ No daily plan found for day ${dayOfWeek}`);
        continue;
      }
      
      console.log(`   ✅ Found daily plan for day ${dayOfWeek}`);
      
      const tasks = dayPlan.tasks || [];
      
      if (tasks.length === 0) {
        console.log(`   📭 No tasks found for ${dateStr}`);
      } else {
        foundTasks = true;
        totalTasksFound += tasks.length;
        console.log(`   📋 Found ${tasks.length} task(s):`);
        
        tasks.forEach((task: any, index: number) => {
          console.log(`      ${index + 1}. ${task.title} (${task.duration_minutes}min, ${task.subjectCode})`);
        });
      }
    }
  }
  
  console.log(`\n📊 SUMMARY for ${dateStr}:`);
  console.log(`   📋 Total tasks found: ${totalTasksFound}`);
  
  if (foundTasks) {
    console.log(`   ✅ T1.js HAS tasks for ${dateStr}`);
  } else {
    console.log(`   ❌ T1.js has NO tasks for ${dateStr}`);
  }
}

function main() {
  try {
    // Check the specific dates mentioned by the user
    checkSpecificDate(studyPlan as unknown as StudyPlan, '2025-06-20'); // Friday
    console.log('\n' + '='.repeat(80) + '\n');
    checkSpecificDate(studyPlan as unknown as StudyPlan, '2025-06-21'); // Saturday
    console.log('\n' + '='.repeat(80) + '\n');
    checkSpecificDate(studyPlan as unknown as StudyPlan, '2025-06-27'); // Friday
    console.log('\n' + '='.repeat(80) + '\n');
    checkSpecificDate(studyPlan as unknown as StudyPlan, '2025-06-28'); // Saturday
  } catch (error) {
    console.error('❌ Error checking dates:', error);
  }
}

main();
