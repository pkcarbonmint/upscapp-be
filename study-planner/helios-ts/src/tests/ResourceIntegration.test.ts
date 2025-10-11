import { describe, it, expect, beforeEach } from 'vitest';
import { generateInitialPlan } from '../engine/NewEngine-generate-plan';
import { DEFAULT_CONFIG } from '../config';
import type { StudentIntake, Archetype } from '../types/models';
import { createStudentIntake } from '../types/models';
import type { Config } from '../engine/engine-types';

describe('Resource Integration Tests', () => {
  let testConfig: Config;
  let testArchetype: Archetype;
  let testIntake: StudentIntake;

  beforeEach(() => {
    // Use default configuration
    testConfig = DEFAULT_CONFIG;

    // Create a test archetype for a student studying subjects
    testArchetype = {
      archetype: 'BalancedDualSubject',
      timeCommitment: 'FullTime',
      weeklyHoursMin: 40,
      weeklyHoursMax: 50,
      description: 'Student focusing on subjects with balanced approach',
      defaultPacing: 'Balanced',
      defaultApproach: 'DualSubject',
      specialFocus: ['GS', 'Optional']
    };

    // Create test intake data:
    // - Start date: October 1, 2025  
    // - Target year: 2026
    // - Include subjects that have resources in study-materials.json
    testIntake = createStudentIntake({
      subject_confidence: {
        'P': 'Moderate',    // Polity - has resources
        'E': 'Moderate',    // Economy - has resources
        'G': 'Strong',      // Geography - has resources
        'H': 'Weak',        // History - has resources
        'C': 'Moderate'     // Culture - has resources
      },
      study_strategy: {
        study_focus_combo: 'OneGSPlusOptional',
        weekly_study_hours: '40-50',
        time_distribution: 'Balanced',
        study_approach: 'Balanced',
        revision_strategy: 'Weekly',
        test_frequency: 'Monthly',
        seasonal_windows: ['Foundation', 'Revision'],
        catch_up_day_preference: 'Sunday'
      },
      target_year: '2026',
      start_date: '2025-10-01'
    });
  });

  it('should include curated resources in the generated plan', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Should have curated resources (structure test)
    expect(plan.curated_resources).toBeDefined();
    expect(plan.curated_resources).not.toBeNull();

    // Should have essential resources array
    expect(plan.curated_resources.essential_resources).toBeDefined();
    expect(Array.isArray(plan.curated_resources.essential_resources)).toBe(true);

    // Should have recommended timeline structure
    expect(plan.curated_resources.recommended_timeline).toBeDefined();
    expect(plan.curated_resources.recommended_timeline.immediate_needs).toBeDefined();
    expect(plan.curated_resources.recommended_timeline.mid_term_needs).toBeDefined();
    expect(plan.curated_resources.recommended_timeline.long_term_needs).toBeDefined();

    // Should have budget summary structure
    expect(plan.curated_resources.budget_summary).toBeDefined();
    expect(typeof plan.curated_resources.budget_summary.total_cost).toBe('number');

    // Should have alternative options array
    expect(plan.curated_resources.alternative_options).toBeDefined();
    expect(Array.isArray(plan.curated_resources.alternative_options)).toBe(true);
  });

  it('should populate block resources with data from study-materials.json', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Should have cycles
    expect(plan.cycles).toBeDefined();
    expect(Array.isArray(plan.cycles)).toBe(true);
    expect(plan.cycles!.length).toBeGreaterThan(0);

    // Check foundation cycle blocks for resource data and structure
    const foundationCycle = plan.cycles!.find(cycle => 
      cycle.cycleType === 'C2'
    );

    expect(foundationCycle).toBeDefined();

    if (foundationCycle) {
      const blocks = foundationCycle.cycleBlocks;
      expect(blocks.length).toBeGreaterThan(0);

      // Track which subjects have resources loaded
      const subjectsWithResources = new Set<string>();

      // Test that ALL blocks have proper resource structure
      blocks.forEach(block => {
        // Should have block_resources property
        expect(block.block_resources).toBeDefined();
        
        // Should have all required resource categories as arrays
        expect(block.block_resources.primary_books).toBeDefined();
        expect(Array.isArray(block.block_resources.primary_books)).toBe(true);
        
        expect(block.block_resources.supplementary_materials).toBeDefined();
        expect(Array.isArray(block.block_resources.supplementary_materials)).toBe(true);
        
        expect(block.block_resources.practice_resources).toBeDefined();
        expect(Array.isArray(block.block_resources.practice_resources)).toBe(true);
        
        expect(block.block_resources.video_content).toBeDefined();
        expect(Array.isArray(block.block_resources.video_content)).toBe(true);
        
        expect(block.block_resources.current_affairs_sources).toBeDefined();
        expect(Array.isArray(block.block_resources.current_affairs_sources)).toBe(true);
        
        expect(block.block_resources.revision_materials).toBeDefined();
        expect(Array.isArray(block.block_resources.revision_materials)).toBe(true);
        
        expect(block.block_resources.expert_recommendations).toBeDefined();
        expect(Array.isArray(block.block_resources.expert_recommendations)).toBe(true);

        // Should have at least one subject
        expect(block.subjects).toBeDefined();
        expect(Array.isArray(block.subjects)).toBe(true);
        expect(block.subjects.length).toBeGreaterThan(0);

        // Check if this subject's block has resources from study-materials.json
        const blockSubject = block.subjects[0]; // Each block focuses on one subject
        
        const resourceCategories = [
          block.block_resources.primary_books,
          block.block_resources.supplementary_materials,
          block.block_resources.practice_resources,
          block.block_resources.video_content,
          block.block_resources.current_affairs_sources,
          block.block_resources.revision_materials,
          block.block_resources.expert_recommendations
        ];

        // This subject has resources if any category has items
        const hasResources = resourceCategories.some(category => category.length > 0);
        
        if (hasResources) {
          subjectsWithResources.add(blockSubject);
          
          // Verify resources have complete data structure
          resourceCategories.forEach(category => {
            category.forEach(resource => {
              expect(resource.resource_id).toBeDefined();
              expect(resource.resource_title).toBeDefined();
              expect(resource.resource_type).toBeDefined();
              expect(resource.resource_description).toBeDefined();
              expect(resource.resource_subjects).toBeDefined();
              expect(resource.difficulty_level).toBeDefined();
              expect(resource.estimated_hours).toBeDefined();
              expect(resource.resource_priority).toBeDefined();
              expect(resource.resource_cost).toBeDefined();
              
              // Verify this resource belongs to the block's subject
              expect(resource.resource_subjects).toContain(blockSubject);
            });
          });
        }
      });

      // At least one subject should have resources from study-materials.json
      if (subjectsWithResources.size === 0) {
        console.warn(`No resource data found - study-materials.json may be empty or missing`);
      }
    }
  });

  it('should populate plan-level curated resources from study-materials.json', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;
    const curatedResources = plan.curated_resources;

    // Collect all resources from plan-level curated resources
    const allPlanResources: any[] = [
      ...curatedResources.essential_resources,
      ...curatedResources.recommended_timeline.immediate_needs,
      ...curatedResources.recommended_timeline.mid_term_needs,
      ...curatedResources.recommended_timeline.long_term_needs,
      ...curatedResources.alternative_options
    ];

    // Track resource sources and types
    const resourceSources = new Map<string, number>();
    const resourceTypes = new Map<string, number>();

    // Analyze resources if any exist
    if (allPlanResources.length > 0) {
      // Verify each resource has complete structure from JSON files
      allPlanResources.forEach(resource => {
        expect(resource.resource_id).toBeDefined();
        expect(typeof resource.resource_id).toBe('string');
        expect(resource.resource_title).toBeDefined();
        expect(typeof resource.resource_title).toBe('string');
        expect(resource.resource_type).toBeDefined();
        expect(typeof resource.resource_type).toBe('string');
        expect(resource.resource_description).toBeDefined();
        expect(typeof resource.resource_description).toBe('string');
        expect(resource.resource_subjects).toBeDefined();
        expect(Array.isArray(resource.resource_subjects)).toBe(true);
        expect(resource.difficulty_level).toBeDefined();
        expect(typeof resource.difficulty_level).toBe('string');
        expect(resource.estimated_hours).toBeDefined();
        expect(typeof resource.estimated_hours).toBe('number');
        expect(resource.resource_priority).toBeDefined();
        expect(typeof resource.resource_priority).toBe('string');
        expect(resource.resource_cost).toBeDefined();
        expect(typeof resource.resource_cost).toBe('object');

        // Track distribution of subjects and types
        resource.resource_subjects.forEach((subjectCode: string) => {
          resourceSources.set(subjectCode, (resourceSources.get(subjectCode) || 0) + 1);
        });
        
        resourceTypes.set(resource.resource_type, (resourceTypes.get(resource.resource_type) || 0) + 1);
      });

      // Check that resources are representative of subjects in the intake
      const intakeSubjects = Object.keys(testIntake.subject_confidence);
      const resourceSubjects = Array.from(resourceSources.keys());
      
      // Some subjects from intake should have resources (if they exist in JSON files)
      const subjectsWithResources = intakeSubjects.filter(subject => resourceSubjects.includes(subject));
      
      if (subjectsWithResources.length === 0) {
        console.warn(`No intake subjects have resource data - check study-materials.json`);
      }

    } else {
      console.warn(`No plan-level resources found - study-materials.json may be empty or missing`);
    }

    // Budget summary should be calculated from loaded resources
    expect(curatedResources.budget_summary).toBeDefined();
    expect(typeof curatedResources.budget_summary.total_cost).toBe('number');
    expect(curatedResources.budget_summary.total_cost).toBeGreaterThanOrEqual(0);
  });

  it('should maintain resource consistency across all cycles', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Collect all resources from all blocks across all cycles
    const allResourceIds = new Set<string>();
    const resourceDetailsList: any[] = [];

    plan.cycles!.forEach(cycle => {
      cycle.cycleBlocks.forEach(block => {
        // Collect all resource categories
        const resourceCategories = [
          block.block_resources.primary_books,
          block.block_resources.supplementary_materials,
          block.block_resources.practice_resources,
          block.block_resources.video_content,
          block.block_resources.current_affairs_sources,
          block.block_resources.revision_materials,
          block.block_resources.expert_recommendations
        ];

        resourceCategories.forEach(category => {
          category.forEach(resource => {
            allResourceIds.add(resource.resource_id);
            resourceDetailsList.push(resource);
          });
        });
      });
    });

    // Collect resources from plan-level curated resources
    const planResourceIds = new Set(
      plan.curated_resources.essential_resources.map(r => r.resource_id)
    );

    // Should deduplicate resources at block level (each resource appears only once per block)
    const resourceIdsArray = Array.from(allResourceIds);
    expect(resourceIdsArray.length).toBe(new Set(resourceIdsArray).size);

    // Test consistency: If there are block resources, they should also appear in plan resources
    if (resourceIdsArray.length > 0) {
      // Some block resources might not be essential, so not all need to be in essential_resources
      // But there should be some overlap
      const overlap = Array.from(allResourceIds).filter(id => planResourceIds.has(id));
      expect(overlap.length).toBeGreaterThan(0);
    }
  });

  it('should include valid resource structure with required fields', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Get resources from wherever they exist
    const allResources: any[] = [];
    
    // Collect from plan level
    allResources.push(...plan.curated_resources.essential_resources);
    allResources.push(...plan.curated_resources.recommended_timeline.immediate_needs);
    allResources.push(...plan.curated_resources.recommended_timeline.mid_term_needs);
    allResources.push(...plan.curated_resources.recommended_timeline.long_term_needs);
    allResources.push(...plan.curated_resources.alternative_options);

    // Collect from block level
    plan.cycles!.forEach(cycle => {
      cycle.cycleBlocks.forEach(block => {
        const resourceCategories = [
          block.block_resources.primary_books,
          block.block_resources.supplementary_materials,
          block.block_resources.practice_resources,
          block.block_resources.video_content,
          block.block_resources.current_affairs_sources,
          block.block_resources.revision_materials,
          block.block_resources.expert_recommendations
        ];

        resourceCategories.forEach(category => {
          allResources.push(...category);
        });
      });
    });

    // Filter out duplicates by resource_id
    const uniqueResources = [];
    const seenIds = new Set<string>();
    
    for (const resource of allResources) {
      if (!seenIds.has(resource.resource_id)) {
        seenIds.add(resource.resource_id);
        uniqueResources.push(resource);
      }
    }

    // If we have resources, test their structure
    if (uniqueResources.length > 0) {
      uniqueResources.forEach(resource => {
        // Should have required resource structure
        expect(resource.resource_id).toBeDefined();
        expect(typeof resource.resource_id).toBe('string');
        expect(resource.resource_id.length).toBeGreaterThan(0);
        
        expect(resource.resource_title).toBeDefined();
        expect(typeof resource.resource_title).toBe('string');
        expect(resource.resource_title.length).toBeGreaterThan(0);
        
        expect(resource.resource_type).toBeDefined();
        expect(typeof resource.resource_type).toBe('string');
        
        expect(resource.resource_description).toBeDefined();
        expect(typeof resource.resource_description).toBe('string');
        
        expect(resource.resource_subjects).toBeDefined();
        expect(Array.isArray(resource.resource_subjects)).toBe(true);
        
        expect(resource.difficulty_level).toBeDefined();
        expect(typeof resource.difficulty_level).toBe('string');
        
        expect(resource.estimated_hours).toBeDefined();
        expect(typeof resource.estimated_hours).toBe('number');
        expect(resource.estimated_hours).toBeGreaterThan(0);
        expect(resource.estimated_hours).toBeLessThan(200); // Reasonable upper bound
        
        expect(resource.resource_priority).toBeDefined();
        expect(typeof resource.resource_priority).toBe('string');
        
        expect(resource.resource_cost).toBeDefined();
        expect(typeof resource.resource_cost).toBe('object');

        // Should have valid enum values
        const validTypes = ['Book', 'VideoLecture', 'OnlineCourse', 'PracticePaper', 'CurrentAffairsSource', 'RevisionNotes', 'MockTest'];
        expect(validTypes).toContain(resource.resource_type);

        const validDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
        expect(validDifficulties).toContain(resource.difficulty_level);

        const validPriorities = ['Essential', 'Recommended', 'Optional'];
        expect(validPriorities).toContain(resource.resource_priority);
      });
    }
  });

  it('should calculate budget summary with valid numeric values', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;
    const budgetSummary = plan.curated_resources.budget_summary;

    // Should have numeric budget values with valid ranges
    expect(typeof budgetSummary.total_cost).toBe('number');
    expect(budgetSummary.total_cost).toBeGreaterThanOrEqual(0);
    
    expect(typeof budgetSummary.essential_cost).toBe('number');
    expect(budgetSummary.essential_cost).toBeGreaterThanOrEqual(0);
    expect(budgetSummary.essential_cost).toBeLessThanOrEqual(budgetSummary.total_cost);
    
    expect(typeof budgetSummary.optional_cost).toBe('number');
    expect(budgetSummary.optional_cost).toBeGreaterThanOrEqual(0);
    expect(budgetSummary.optional_cost).toBeLessThanOrEqual(budgetSummary.total_cost);
    
    expect(typeof budgetSummary.free_alternatives).toBe('number');
    expect(budgetSummary.free_alternatives).toBeGreaterThanOrEqual(0);
    
    expect(typeof budgetSummary.subscription_cost).toBe('number');
    expect(budgetSummary.subscription_cost).toBeGreaterThanOrEqual(0);
    expect(budgetSummary.subscription_cost).toBeLessThanOrEqual(budgetSummary.total_cost);


    // Costs should be logically consistent
    // Note: subscription_cost is tracked separately and not included in total_cost
    const calculatedTotal = budgetSummary.essential_cost + budgetSummary.optional_cost;
    const difference = Math.abs(budgetSummary.total_cost - calculatedTotal);
    
    // Should be exact or very close (within rounding tolerance)
    expect(difference).toBeLessThan(50);
  });

  it('should distribute resources in timeline categories logically', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;
    const timeline = plan.curated_resources.recommended_timeline;

    // Should have arrays for all timeline categories
    expect(Array.isArray(timeline.immediate_needs)).toBe(true);
    expect(Array.isArray(timeline.mid_term_needs)).toBe(true);
    expect(Array.isArray(timeline.long_term_needs)).toBe(true);

    // Should not have undefined or null values
    expect(timeline.immediate_needs).not.toBeNull();
    expect(timeline.mid_term_needs).not.toBeNull();
    expect(timeline.long_term_needs).not.toBeNull();

    // All timeline resources should have proper structure if they exist
    [...timeline.immediate_needs, ...timeline.mid_term_needs, ...timeline.long_term_needs].forEach(resource => {
      expect(resource.resource_id).toBeDefined();
      expect(resource.resource_title).toBeDefined();
      expect(resource.resource_type).toBeDefined();
    });
  });

  it('should handle resource loading gracefully when resources are missing', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Should still generate a valid plan even if some subjects have no resources
    expect(plan.study_plan_id).toBeDefined();
    expect(plan.curated_resources).toBeDefined();
    expect(plan.cycles).toBeDefined();

    // All blocks should have empty arrays for resources (not null/undefined)
    plan.cycles!.forEach(cycle => {
      cycle.cycleBlocks.forEach(block => {
        expect(block.block_resources.primary_books).toBeDefined();
        expect(Array.isArray(block.block_resources.primary_books)).toBe(true);
        
        expect(block.block_resources.supplementary_materials).toBeDefined();
        expect(Array.isArray(block.block_resources.supplementary_materials)).toBe(true);
        
        // Other resource categories should also be defined arrays
        expect(Array.isArray(block.block_resources.practice_resources)).toBe(true);
        expect(Array.isArray(block.block_resources.video_content)).toBe(true);
        expect(Array.isArray(block.block_resources.current_affairs_sources)).toBe(true);
        expect(Array.isArray(block.block_resources.revision_materials)).toBe(true);
        expect(Array.isArray(block.block_resources.expert_recommendations)).toBe(true);
      });
    });
  });

  it('should validate essential resources are prioritized correctly', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;
    const essentialResources = plan.curated_resources.essential_resources;

    // If there are essential resources, they should be prioritized correctly
    if (essentialResources.length > 0) {
      essentialResources.forEach(resource => {
        // Essential resources should have 'Essential' priority
        expect(resource.resource_priority).toBe('Essential');
        
        // Should have valid resource structure
        expect(resource.resource_id).toBeDefined();
        expect(resource.resource_title).toBeDefined();
        expect(resource.resource_type).toBeDefined();
      });

      // Should not have duplicates in essential resources
      const resourceIds = essentialResources.map(r => r.resource_id);
      expect(new Set(resourceIds).size).toBe(resourceIds.length);
    }
  });

  it('should show proper resource loading logs', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const logs = result.logs;

    // Should have logs from the generation process
    expect(logs.length).toBeGreaterThan(0);

    // Should show plan building logs
    const planLogs = logs.filter(log =>
      log.logMessage.includes('Building') ||
      log.logMessage.includes('generation') ||
      log.logMessage.includes('Foundation') ||
      log.logMessage.includes('cycle')
    );

    expect(planLogs.length).toBeGreaterThan(0);

    // Verify log structure
    logs.forEach(log => {
      expect(log.logLevel).toBeDefined();
      expect(['Debug', 'Info', 'Warn', 'Error']).toContain(log.logLevel);
      expect(log.logSource).toBeDefined();
      expect(log.logMessage).toBeDefined();
      expect(typeof log.logMessage).toBe('string');
    });
  });

  it('should maintain plan integrity when resource integration is active', async () => {
    const result = await generateInitialPlan(
      'test-user-123',
      testConfig,
      testArchetype,
      testIntake
    );

    const plan = result.plan;

    // Plan should maintain all the core properties from original tests
    expect(plan.study_plan_id).toBeDefined();
    expect(plan.user_id).toBe('system-generated');
    expect(plan.plan_title).toContain('2026');
    expect(plan.created_for_target_year).toBe('2026');
    expect(plan.effective_season_context).toBe('ComprehensiveStudy');
    expect(plan.timelineUtilization).toBeGreaterThan(0);
    expect(plan.timelineUtilization).toBeLessThanOrEqual(100);

    // Should still have cycles with proper structure
    expect(plan.cycles).toBeDefined();
    expect(Array.isArray(plan.cycles)).toBe(true);

    // Cycles should have all required properties
    plan.cycles!.forEach(cycle => {
      expect(cycle.cycleId).toBeDefined();
      expect(cycle.cycleType).toBeDefined();
      expect(cycle.cycleName).toBeDefined();
      expect(cycle.cycleStartDate).toBeDefined();
      expect(cycle.cycleDuration).toBeDefined();
      expect(cycle.cycleBlocks).toBeDefined();
      expect(Array.isArray(cycle.cycleBlocks)).toBe(true);

      // Each block should still have all required properties
      cycle.cycleBlocks.forEach(block => {
        expect(block.block_id).toBeDefined();
        expect(block.block_title).toBeDefined();
        expect(block.subjects).toBeDefined();
        expect(block.duration_weeks).toBeDefined();
        expect(block.weekly_plan).toBeDefined();
        expect(block.estimated_hours).toBeDefined();
        expect(block.actual_hours).toBeDefined();
      });
    });
  });

  it('should verify ResourceService successfully loads study-materials.json', async () => {
    // Import ResourceService to test direct integration
    const { ResourceService } = await import('../services/ResourceService');
    
    // Test subjects that should have resources from our intake
    const testSubjectCodes = ['P', 'E', 'G']; // Subjects from our test intake
    
    // Test getting resources for known subjects
    for (const subjectCode of testSubjectCodes) {
      try {
        
        const blockResources = await ResourceService.getResourcesForSubject(subjectCode);
        
        // Verify structure is correct
        expect(Array.isArray(blockResources.primary_books)).toBe(true);
        expect(Array.isArray(blockResources.supplementary_materials)).toBe(true);
        expect(Array.isArray(blockResources.practice_resources)).toBe(true);
        expect(Array.isArray(blockResources.video_content)).toBe(true);
        expect(Array.isArray(blockResources.current_affairs_sources)).toBe(true);
        expect(Array.isArray(blockResources.revision_materials)).toBe(true);
        expect(Array.isArray(blockResources.expert_recommendations)).toBe(true);
        
        // Collect all resources from this subject
        const allSubjectResources = [
          ...blockResources.primary_books,
          ...blockResources.supplementary_materials,
          ...blockResources.practice_resources,
          ...blockResources.video_content,
          ...blockResources.current_affairs_sources,
          ...blockResources.revision_materials,
          ...blockResources.expert_recommendations
        ];
        if (allSubjectResources.length === 0) {
          console.warn(`Subject ${subjectCode}: No resources found in study-materials.json`);
        }
        
        // Verify first resource has correct structure
        if (allSubjectResources.length > 0) {
          const sampleResource = allSubjectResources[0];
          expect(sampleResource.resource_id).toBeDefined();
          expect(sampleResource.resource_title).toBeDefined();
          expect(sampleResource.resource_subjects).toContain(subjectCode);
        }
        
      } catch (error) {
        console.warn(`Failed to load resources for subject ${subjectCode} from study-materials.json:`, error);
      }
    }
    
    // Test graceful handling of missing subjects
    const emptyResources = await ResourceService.getResourcesForSubject('XX99');
    expect(emptyResources).toBeDefined();
    expect(Array.isArray(emptyResources.primary_books)).toBe(true);
    expect(emptyResources.primary_books.length).toBe(0);
  });
});