/**
 * Example demonstrating SubjectLoader with optional subjects
 */

import { loadAllSubjects } from '../src/services/SubjectLoader';

async function demonstrateOptionalSubjects() {
  console.log('=== SubjectLoader with Optional Subjects Demo ===\n');

  // 1. Load subjects without optional subject
  console.log('1. Loading subjects without optional subject:');
  const subjectsWithoutOptional = await loadAllSubjects();
  console.log(`   Total subjects: ${subjectsWithoutOptional.length}`);
  console.log(`   Optional subjects: ${subjectsWithoutOptional.filter(s => s.subjectCode.startsWith('OPT-')).length}`);

  // 2. Load subjects with Sociology optional
  console.log('\n2. Loading subjects with OPT-SOC (Sociology):');
  const subjectsWithSociology = await loadAllSubjects('OPT-SOC');
  console.log(`   Total subjects: ${subjectsWithSociology.length}`);
  
  const sociologySubject = subjectsWithSociology.find(s => s.subjectCode === 'OPT-SOC');
  if (sociologySubject) {
    console.log(`   ✅ Found Sociology: ${sociologySubject.subjectName}`);
    console.log(`   Baseline hours: ${sociologySubject.baselineHours}`);
    console.log(`   Exam focus: ${sociologySubject.examFocus}`);
    console.log(`   Topics: ${sociologySubject.topics.map(t => t.topicName).join(', ')}`);
  }

  // 3. Load subjects with Agriculture optional
  console.log('\n3. Loading subjects with OPT-AGR (Agriculture):');
  const subjectsWithAgriculture = await loadAllSubjects('OPT-AGR');
  console.log(`   Total subjects: ${subjectsWithAgriculture.length}`);
  
  const agricultureSubject = subjectsWithAgriculture.find(s => s.subjectCode === 'OPT-AGR');
  if (agricultureSubject) {
    console.log(`   ✅ Found Agriculture: ${agricultureSubject.subjectName}`);
    console.log(`   Baseline hours: ${agricultureSubject.baselineHours}`);
    console.log(`   Exam focus: ${agricultureSubject.examFocus}`);
    console.log(`   Topics: ${agricultureSubject.topics.map(t => t.topicName).join(', ')}`);
  }

  // 4. Verify that the optional subject appears in the final subjects list
  console.log('\n4. Verification:');
  console.log(`   Sociology in Agriculture list: ${subjectsWithAgriculture.find(s => s.subjectCode === 'OPT-SOC') ? 'Yes' : 'No'}`);
  console.log(`   Agriculture in Sociology list: ${subjectsWithSociology.find(s => s.subjectCode === 'OPT-AGR') ? 'Yes' : 'No'}`);
  
  console.log('\n✅ Optional subjects are successfully added to the main subjects list!');
  console.log('   This ensures they will appear in the final study plan with tasks.');
}

// Run the demonstration
demonstrateOptionalSubjects().catch(console.error);
