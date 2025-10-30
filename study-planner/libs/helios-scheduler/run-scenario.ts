import * as fs from 'fs';
import * as path from 'path';
import dayjs from 'dayjs';
import { planMain } from './src/plan-main';
import { PlanningContext, BlockSlot, S2Task } from './src/types';

/**
 * Converts Dayjs objects in the result to ISO strings for JSON serialization
 */
function serializeResult(result: { cycles: any[], blocks: BlockSlot[], tasks: S2Task[] }) {
  return {
    cycles: result.cycles,
    blocks: result.blocks.map(block => ({
      ...block,
      from: dayjs(block.from).toISOString(),
      to: dayjs(block.to).toISOString(),
    })),
    tasks: result.tasks.map(task => ({
      ...task,
      date: dayjs(task.date).toISOString(),
    })),
  };
}

/**
 * Loads PlanningContext from JSON and converts date strings to Dayjs objects
 */
function loadPlanningContext(jsonPath: string): PlanningContext {
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(jsonContent);
  
  return {
    ...data,
    startDate: dayjs(data.startDate),
    prelimsExamDate: dayjs(data.prelimsExamDate),
    mainsExamDate: dayjs(data.mainsExamDate),
    constraints: {
      ...data.constraints,
      breaks: data.constraints.breaks.map((breakItem: any) => ({
        from: dayjs(breakItem.from),
        to: dayjs(breakItem.to),
      })),
    },
  };
}

function main() {
  // Get scenario name from command line arguments
  const scenarioName = process.argv[2];
  
  if (!scenarioName) {
    console.error('Usage: tsx run-scenario.ts <scenario-name>');
    console.error('Example: tsx run-scenario.ts T1');
    console.error('Example: tsx run-scenario.ts today-2027');
    process.exit(1);
  }
  
  // Construct the path to the JSON file
  const jsonPath = path.join(__dirname, 'src', 'tests', 'test-contexts', `${scenarioName}-context.json`);
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: File not found: ${jsonPath}`);
    console.error(`Available scenarios: T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, today-2027`);
    process.exit(1);
  }
  
  try {
    console.error(`Loading scenario: ${scenarioName}`);
    const context = loadPlanningContext(jsonPath);
    
    console.error(`Running planMain...`);
    const result = planMain(context);
    
    console.error(`Serializing output...`);
    const serialized = serializeResult(result);
    
    fs.mkdirSync(path.join(__dirname, 'src', 'tests', 'test-results'), { recursive: true });
    // Output JSON to stdout
    fs.writeFileSync(path.join(__dirname, 'src', 'tests', 'test-results', `${scenarioName}-result.json`), JSON.stringify(serialized, null, 2));
    console.error(`Result saved to: ${path.join(__dirname, 'src', 'tests', 'test-results', `${scenarioName}-result.json`)}`);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

