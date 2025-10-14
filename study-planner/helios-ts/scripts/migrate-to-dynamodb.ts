#!/usr/bin/env ts-node

/**
 * Migration script to move JSON data to DynamoDB
 * This script reads the existing JSON files and populates the DynamoDB tables
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import * as path from 'path';

// Import JSON data
import subjectsData from '../src/config/upsc_subjects.json';
import subtopicsData from '../src/config/subtopics.json';
import prepModesData from '../src/config/prep_modes.json';
import archetypesData from '../src/config/archetypes.json';

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_PREFIX = process.env.TABLE_PREFIX || '';

// Table names
const TABLES = {
  subjects: `${TABLE_PREFIX}upsc-subjects`,
  topics: `${TABLE_PREFIX}upsc-topics`,
  subtopics: `${TABLE_PREFIX}upsc-subtopics`,
  prepModes: `${TABLE_PREFIX}prep-modes`,
  archetypes: `${TABLE_PREFIX}archetypes`,
  config: `${TABLE_PREFIX}study-planner-config`
};

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Batch write items to DynamoDB with automatic batching
 */
async function batchWriteItems(tableName: string, items: any[]): Promise<void> {
  const BATCH_SIZE = 25; // DynamoDB batch write limit
  
  console.log(`📝 Writing ${items.length} items to ${tableName}...`);
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const putRequests = batch.map(item => ({
      PutRequest: { Item: item }
    }));

    try {
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [tableName]: putRequests
        }
      }));
      
      console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)} completed`);
    } catch (error) {
      console.error(`   ❌ Error writing batch to ${tableName}:`, error);
      throw error;
    }
  }
}

/**
 * Migrate subjects data
 */
async function migrateSubjects(): Promise<void> {
  console.log('\n🔄 Migrating subjects...');
  
  const subjects = subjectsData.subjects.map(subject => ({
    subject_code: subject.code,
    subject_name: subject.name,
    baseline_hours: subject.baseline_hours,
    category: subject.category,
    exam_focus: subject.exam_focus,
    has_current_affairs: subject.has_current_affairs,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  await batchWriteItems(TABLES.subjects, subjects);
  console.log(`✅ Migrated ${subjects.length} subjects`);
}

/**
 * Migrate topics data (extracted from subjects)
 */
async function migrateTopics(): Promise<void> {
  console.log('\n🔄 Migrating topics...');
  
  const topics: any[] = [];
  
  subjectsData.subjects.forEach(subject => {
    subject.topics.forEach(topic => {
      topics.push({
        topic_code: topic.code,
        subject_code: subject.code,
        topic_name: topic.name,
        priority: topic.priority,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
  });

  await batchWriteItems(TABLES.topics, topics);
  console.log(`✅ Migrated ${topics.length} topics`);
}

/**
 * Migrate subtopics data
 */
async function migrateSubtopics(): Promise<void> {
  console.log('\n🔄 Migrating subtopics...');
  
  const subtopics = subtopicsData.map((subtopic, index) => ({
    topic_code: subtopic.topicCode,
    subtopic_id: `${subtopic.topicCode}-${index.toString().padStart(4, '0')}`,
    subtopic_name: subtopic.subtopic,
    priority_band: subtopic.priorityBand,
    exam: subtopic.exam,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  await batchWriteItems(TABLES.subtopics, subtopics);
  console.log(`✅ Migrated ${subtopics.length} subtopics`);
}

/**
 * Migrate prep modes data
 */
async function migratePrepModes(): Promise<void> {
  console.log('\n🔄 Migrating prep modes...');
  
  const prepModes = prepModesData.prep_modes.map(mode => ({
    mode_name: mode.name,
    category: mode.category,
    base_duration_weeks: mode.base_duration_weeks,
    intensity_adjustment: mode.intensity_adjustment,
    description: mode.description,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  await batchWriteItems(TABLES.prepModes, prepModes);
  console.log(`✅ Migrated ${prepModes.length} prep modes`);
}

/**
 * Migrate archetypes data
 */
async function migrateArchetypes(): Promise<void> {
  console.log('\n🔄 Migrating archetypes...');
  
  const archetypes = archetypesData.archetypes.map(archetype => ({
    archetype_name: archetype.name,
    time_commitment: archetype.time_commitment,
    weekly_hours_min: archetype.weekly_hours_min,
    weekly_hours_max: archetype.weekly_hours_max,
    description: archetype.description,
    default_pacing: archetype.default_pacing,
    default_approach: archetype.default_approach,
    special_focus: archetype.special_focus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  await batchWriteItems(TABLES.archetypes, archetypes);
  console.log(`✅ Migrated ${archetypes.length} archetypes`);
}

/**
 * Migrate configuration data
 */
async function migrateConfig(): Promise<void> {
  console.log('\n🔄 Migrating configuration...');
  
  const configItems = [
    {
      config_key: 'domain_metadata',
      config_value: subjectsData.domain,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      config_key: 'prep_modes_metadata',
      config_value: prepModesData.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      config_key: 'exam_schedule',
      config_value: prepModesData.exam_schedule,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      config_key: 'time_thresholds',
      config_value: prepModesData.time_thresholds,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      config_key: 'archetype_adjustments',
      config_value: prepModesData.archetype_adjustments,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      config_key: 'progression_rules',
      config_value: prepModesData.progression_rules,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      config_key: 'archetypes_metadata',
      config_value: archetypesData.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  await batchWriteItems(TABLES.config, configItems);
  console.log(`✅ Migrated ${configItems.length} configuration items`);
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting DynamoDB migration...');
  console.log(`📍 Region: ${AWS_REGION}`);
  console.log(`📋 Tables: ${Object.values(TABLES).join(', ')}`);
  
  try {
    await migrateSubjects();
    await migrateTopics();
    await migrateSubtopics();
    await migratePrepModes();
    await migrateArchetypes();
    await migrateConfig();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${subjectsData.subjects.length} subjects migrated`);
    console.log(`   • ${subjectsData.subjects.reduce((acc, s) => acc + s.topics.length, 0)} topics migrated`);
    console.log(`   • ${subtopicsData.length} subtopics migrated`);
    console.log(`   • ${prepModesData.prep_modes.length} prep modes migrated`);
    console.log(`   • ${archetypesData.archetypes.length} archetypes migrated`);
    console.log(`   • 7 configuration items migrated`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as migrateToDynamoDB };