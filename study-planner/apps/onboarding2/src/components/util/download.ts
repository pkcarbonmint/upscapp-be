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

export async function downloadPlanWithoutWeeklyViews(stepProps: StepProps) {
    const { generatePlan } = await import('helios-ts');
    const intake = map2StudentIntake(stepProps);
    const plan = await generatePlan(map2UserId(stepProps), intake);
    // @ts-ignore - Type definitions haven't been regenerated yet
    const blob = await CalendarDocxService.generateStudyPlanDocxWithoutWeeklyViewsBlob(plan, intake);
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `study-plan-monthly-${stepProps.formData.targetYear.targetYear}.docx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => URL.revokeObjectURL(url), 100);
}

export async function downloadMonthPlan(stepProps: StepProps, monthIndex: number) {
    const { generatePlan } = await import('helios-ts');
    const intake = map2StudentIntake(stepProps);
    const plan = await generatePlan(map2UserId(stepProps), intake);
    
    // Get the month date for the filename
    const dayjsModule = await import('dayjs');
    const dayjs = dayjsModule.default;
    const minDate = dayjs(plan.start_date);
    const maxDate = dayjs(`${plan.targeted_year}-08-31`);
    
    const allMonths: any[] = [];
    for (let currentDate = minDate.startOf('month'); 
         currentDate.isSameOrBefore(maxDate.endOf('month'), 'month'); 
         currentDate = currentDate.add(1, 'month')) {
        allMonths.push(currentDate);
    }
    
    const monthDate = allMonths[monthIndex];
    const monthName = monthDate.format('MMMM');
    
    // @ts-ignore - Type definitions haven't been regenerated yet
    const blob = await CalendarDocxService.generateMonthDocxBlob(plan, intake, monthIndex);
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `study-plan-${monthName}-${stepProps.formData.targetYear.targetYear}.docx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => URL.revokeObjectURL(url), 100);
}

export async function getAvailableMonths(stepProps: StepProps): Promise<Array<{ index: number; label: string; date: Date }>> {
    try {
        // First try to get plan from formData
        let plan = stepProps.formData.preview.raw_helios_data;
        
        // If not available, generate it
        if (!plan || !plan.start_date || !plan.targeted_year) {
            const { generatePlan } = await import('helios-ts');
            const intake = map2StudentIntake(stepProps);
            plan = await generatePlan(map2UserId(stepProps), intake);
        }
        
        if (!plan || !plan.start_date || !plan.targeted_year) {
            return [];
        }

        // Import dayjs dynamically
        const dayjsModule = await import('dayjs');
        const dayjs = dayjsModule.default;
        const minDate = dayjs(plan.start_date);
        const maxDate = dayjs(`${plan.targeted_year}-08-31`);
        
        const allMonths: Array<{ index: number; label: string; date: Date }> = [];
        let index = 0;
        
        for (let currentDate = minDate.startOf('month'); 
             currentDate.isSameOrBefore(maxDate.endOf('month'), 'month'); 
             currentDate = currentDate.add(1, 'month'), index++) {
            allMonths.push({
                index,
                label: currentDate.format('MMMM YYYY'),
                date: currentDate.toDate()
            });
        }
        
        return allMonths;
    } catch (error) {
        console.error('Error getting available months:', error);
        return [];
    }
}
