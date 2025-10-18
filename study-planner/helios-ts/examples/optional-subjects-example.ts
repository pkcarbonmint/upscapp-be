/**
 * Example usage of ResourceLoader with optional subjects
 */

import ResourceLoader from '../src/resources/resourceIndex';

async function exampleUsage() {
  console.log('=== ResourceLoader Optional Subjects Example ===\n');

  // Load study materials for Sociology optional subject
  console.log('1. Loading study materials for OPT-SOC:');
  const materials = await ResourceLoader.loadStudyMaterials('OPT-SOC');
  console.log(`   Found ${materials.length} study material entries`);
  console.log(`   First entry subject code: ${materials[0]?.subjectCode}`);
  console.log(`   Has topic-specific materials: ${materials.some(m => m.topicCode)}`);

  // Load full subject resources for Sociology
  console.log('\n2. Loading subject resources for OPT-SOC:');
  const resources = await ResourceLoader.loadSubjectResources('OPT-SOC');
  if (resources) {
    console.log(`   Subject: ${resources.subject_info.name}`);
    console.log(`   Category: ${resources.subject_info.category}`);
    console.log(`   Exam Focus: ${resources.subject_info.exam_focus}`);
    console.log(`   Resource Count: ${resources.subject_info.resource_count}`);
    console.log(`   Topics: ${Object.keys(resources.topic_resources).length}`);
  }

  // Test with non-existent optional subject
  console.log('\n3. Testing non-existent optional subject:');
  const nonExistent = await ResourceLoader.loadStudyMaterials('OPT-NONEXISTENT');
  console.log(`   Result: ${nonExistent.length} materials (should be 0)`);

  // Test with regular subject (should still work)
  console.log('\n4. Testing regular subject (H01):');
  const regularSubject = await ResourceLoader.loadStudyMaterials('H01');
  console.log(`   Result: ${regularSubject.length} materials`);
}

// Run the example
exampleUsage().catch(console.error);
