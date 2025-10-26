import { studyPlan } from "./generated-docs/T1.js";
import type { StudyPlan } from "./src/types/models.js";
import { publishPlanHourReport } from "./scripts/plan-hour-report.js";

function main() {
    const report = publishPlanHourReport(studyPlan as unknown as StudyPlan);
    console.log(report.join('\n'));
}

main();