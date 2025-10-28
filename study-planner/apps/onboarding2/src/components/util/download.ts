import { StepProps } from '@/types';
import { CalendarDocxService } from 'helios-ts';
import { map2StudentIntake, map2UserId } from './intake-mapper';

export async function downloadPlan(stepProps: StepProps) {
    // generate plan using generateInitialPlan function
    // pass the plan to CalendarDocxService to generate word document
    // the document should be saved in a buffer and downloaded to the user's browser

    const { generatePlan } = await import('helios-ts');
    const intake = map2StudentIntake(stepProps);
    const plan = await generatePlan(map2UserId(stepProps), intake);
    const blob = await CalendarDocxService.generateStudyPlanDocxBlob(plan, intake);
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element to trigger download
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `study-plan-${stepProps.formData.targetYear.targetYear}.docx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Clean up the blob URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
}
