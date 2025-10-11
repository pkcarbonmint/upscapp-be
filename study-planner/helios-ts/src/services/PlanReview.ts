import { StudyPlan, StudentIntake, PlanReviewResult } from '../types/models';
import { Config } from '../engine/engine-types';

/**
 * Review a study plan for issues and improvements
 * This mirrors the Haskell PlanReview module functionality
 */
export async function reviewPlan(
  _userId: string,
  _config: Config,
  plan: StudyPlan,
  intake: StudentIntake
): Promise<PlanReviewResult> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const warnings: string[] = [];

  // Review timeline alignment
  reviewTimelineAlignment(plan, intake, issues, suggestions, warnings);

  // Review study hours distribution
  reviewStudyHoursDistribution(plan, intake, issues, suggestions, warnings);

  // Review subject coverage
  reviewSubjectCoverage(plan, intake, issues, suggestions, warnings);

  // Review block structure
  reviewBlockStructure(plan, intake, issues, suggestions, warnings);

  // Review resource allocation
  reviewResourceAllocation(plan, intake, issues, suggestions, warnings);

  // Calculate overall score
  const score = calculateReviewScore(issues, suggestions, warnings);

  return {
    review_id: `review-${Date.now()}`,
    plan_id: plan.study_plan_id,
    overall_score: score,
    is_executable: score >= 70,
    validation_issues: issues.map((issue, index) => ({
      issue_id: `issue-${index}`,
      severity: 'Warning' as any,
      category: 'General' as any,
      title: issue,
      description: issue,
      affected_blocks: [],
      recommended_action: 'Review and adjust plan'
    })),
    fix_suggestions: suggestions.map((suggestion, index) => ({
      fix_id: `fix-${index}`,
      related_issue_id: `issue-${index}`,
      fix_title: suggestion,
      fix_description: suggestion,
      confidence_score: 0.7,
      estimated_impact: 'Medium',
      auto_applicable: false
    })),
    summary: `Plan review completed with score ${score}/100. ${issues.length} issues found, ${suggestions.length} suggestions provided.`,
    detailed_feedback: {
      'TimeManagement': [...issues, ...suggestions, ...warnings],
      'BlockStructure': [],
      'ArchetypeAlignment': [],
      'SubjectProgression': [],
      'ResourceQuality': [],
      'WorkloadBalance': []
    }
  };
}

/**
 * Review timeline alignment with target year
 */
function reviewTimelineAlignment(
  plan: StudyPlan,
  intake: StudentIntake,
  issues: string[],
  _suggestions: string[],
  warnings: string[]
): void {
  if (!plan.timelineAnalysis) {
    issues.push('Missing timeline analysis in plan');
    return;
  }

  const { weeksAvailable, targetYear } = plan.timelineAnalysis;
  
  if (weeksAvailable < 20) {
    issues.push(`Very limited time available (${weeksAvailable} weeks) - plan may be too ambitious`);
  } else if (weeksAvailable < 40) {
    warnings.push(`Limited time available (${weeksAvailable} weeks) - consider focusing on key areas`);
  }

  if (targetYear && intake.target_year && targetYear.toString() !== intake.target_year) {
    issues.push(`Plan target year (${targetYear}) doesn't match student target year (${intake.target_year})`);
  }

  // Check cycle distribution
  if (plan.cycles && plan.cycles.length > 1) {
    const totalCycleWeeks = plan.cycles.reduce((sum, cycle) => sum + cycle.cycleDuration, 0);
    if (totalCycleWeeks > weeksAvailable) {
      issues.push(`Total cycle duration (${totalCycleWeeks} weeks) exceeds available time (${weeksAvailable} weeks)`);
    }
  }
}

/**
 * Review study hours distribution
 */
function reviewStudyHoursDistribution(
  plan: StudyPlan,
  intake: StudentIntake,
  issues: string[],
  _suggestions: string[],
  warnings: string[]
): void {
  const declaredHours = parseInt(intake.study_strategy.weekly_study_hours) || 0;
  
  if (declaredHours < 15) {
    issues.push('Very low study hours declared - may not be sufficient for UPSC preparation');
  } else if (declaredHours > 60) {
    warnings.push('Very high study hours declared - risk of burnout');
  }

  // Check if plan respects declared hours
  if (plan.cycles) {
    plan.cycles.forEach((cycle, index) => {
      cycle.cycleBlocks.forEach((block, blockIndex) => {
        if (block.weekly_plan) {
          block.weekly_plan.forEach((week, weekIndex) => {
            const weekHours = week.daily_plans.reduce((total, day) => {
              return total + day.tasks.reduce((dayTotal, task) => {
                return dayTotal + (task.duration_minutes / 60);
              }, 0);
            }, 0);

            if (weekHours > declaredHours * 1.2) {
              warnings.push(`Week ${weekIndex + 1} in cycle ${index + 1}, block ${blockIndex + 1} exceeds declared hours by more than 20%`);
            }
          });
        }
      });
    });
  }
}

/**
 * Review subject coverage
 */
function reviewSubjectCoverage(
  plan: StudyPlan,
  intake: StudentIntake,
  issues: string[],
  suggestions: string[],
  _warnings: string[]
): void {
  const studentSubjects = Object.keys(intake.subject_confidence);
  const planSubjects = new Set<string>();

  // Collect all subjects in the plan
  if (plan.cycles) {
    plan.cycles.forEach(cycle => {
      cycle.cycleBlocks.forEach(block => {
        block.subjects.forEach(subject => {
          planSubjects.add(subject);
        });
      });
    });
  }

  // Check for missing subjects
  const missingSubjects = studentSubjects.filter(subject => !planSubjects.has(subject));
  if (missingSubjects.length > 0) {
    issues.push(`Missing subjects in plan: ${missingSubjects.join(', ')}`);
  }

  // Check for weak subject coverage
  const weakSubjects = studentSubjects.filter(subject => 
    intake.subject_confidence[subject] === 'Weak' || intake.subject_confidence[subject] === 'NotStarted'
  );

  if (weakSubjects.length > 0) {
    const coveredWeakSubjects = weakSubjects.filter(subject => planSubjects.has(subject));
    if (coveredWeakSubjects.length < weakSubjects.length) {
      suggestions.push('Consider adding more coverage for weak subjects to strengthen foundation');
    }
  }
}

/**
 * Review block structure
 */
function reviewBlockStructure(
  plan: StudyPlan,
  _intake: StudentIntake,
  issues: string[],
  _suggestions: string[],
  warnings: string[]
): void {
  if (!plan.cycles) return;

  plan.cycles.forEach((cycle, cycleIndex) => {
    if (cycle.cycleBlocks.length === 0) {
      issues.push(`Cycle ${cycleIndex + 1} has no blocks`);
      return;
    }

    cycle.cycleBlocks.forEach((block, blockIndex) => {
      // Check block duration
      if (block.duration_weeks < 2) {
        warnings.push(`Block ${blockIndex + 1} in cycle ${cycleIndex + 1} is very short (${block.duration_weeks} weeks)`);
      } else if (block.duration_weeks > 12) {
        warnings.push(`Block ${blockIndex + 1} in cycle ${cycleIndex + 1} is very long (${block.duration_weeks} weeks)`);
      }

      // Check subject count per block
      if (block.subjects.length > 4) {
        warnings.push(`Block ${blockIndex + 1} in cycle ${cycleIndex + 1} has many subjects (${block.subjects.length}) - may be overwhelming`);
      }

      // Check weekly plan structure
      if (block.weekly_plan && block.weekly_plan.length !== block.duration_weeks) {
        issues.push(`Block ${blockIndex + 1} in cycle ${cycleIndex + 1} has ${block.weekly_plan.length} weekly plans but duration is ${block.duration_weeks} weeks`);
      }
    });
  });
}

/**
 * Review resource allocation
 */
function reviewResourceAllocation(
  plan: StudyPlan,
  _intake: StudentIntake,
  issues: string[],
  suggestions: string[],
  warnings: string[]
): void {
  if (!plan.curated_resources) {
    warnings.push('No curated resources provided in plan');
    return;
  }

  const resourceCount = (plan.curated_resources as any)?.length || 0;
  if (resourceCount === 0) {
    issues.push('No resources allocated in plan');
  } else if (resourceCount < 5) {
    warnings.push('Very few resources allocated - consider adding more study materials');
  }

  // Check resource distribution
  const resourceTypes = new Set((plan.curated_resources as any)?.map((resource: any) => resource.resource_type) || []);
  if (resourceTypes.size < 3) {
    suggestions.push('Consider diversifying resource types for better learning');
  }
}

/**
 * Calculate review score based on issues, suggestions, and warnings
 */
function calculateReviewScore(issues: string[], suggestions: string[], warnings: string[]): number {
  let score = 100;
  
  // Deduct points for issues (most severe)
  score -= issues.length * 15;
  
  // Deduct points for warnings (moderate)
  score -= warnings.length * 5;
  
  // Deduct points for suggestions (minor)
  score -= suggestions.length * 2;
  
  return Math.max(0, Math.min(100, score));
}
