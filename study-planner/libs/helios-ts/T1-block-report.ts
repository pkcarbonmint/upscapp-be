import { studyPlan } from "./generated-docs/T1.js";
import type { StudyPlan } from "./src/types/models.js";
import { blockReport } from "./scripts/plan-hour-report.js";

function main() {
  const report = blockReport(studyPlan as unknown as StudyPlan);
  console.log(report);
}

main();