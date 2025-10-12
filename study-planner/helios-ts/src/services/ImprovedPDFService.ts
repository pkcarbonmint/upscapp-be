import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { StudyPlan, StudyCycle, Block, BlockResources, Resource, StudentIntake } from '../types/models';
import { ResourceService } from './ResourceService';
import { SubjectLoader } from './SubjectLoader';
import dayjs from 'dayjs';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

// Color mapping for different cycle types (matching DocumentService)
const CYCLE_TYPE_COLORS = {
  'C1': [227, 242, 253], // Very light blue
  'C2': [232, 245, 232], // Very light green  
  'C3': [252, 228, 236], // Very light pink
  'C4': [255, 235, 238], // Very light red
  'C5': [243, 229, 245], // Very light purple
  'C6': [225, 245, 254], // Very light cyan
  'C7': [255, 243, 224], // Very light orange
  'C8': [241, 248, 233], // Very light lime
} as const;

// Document styles matching DocumentService
const DOCUMENT_STYLES = {
  colors: {
    primary: [46, 91, 186], // #2E5BBA
    secondary: [102, 102, 102], // #666666
    text: [51, 51, 51], // #333333
    success: [40, 167, 69], // #28A745
    warning: [255, 193, 7], // #FFC107
  },
  fonts: {
    title: 20,
    subtitle: 14,
    heading1: 16,
    heading2: 14,
    body: 11,
    small: 9
  }
} as const;

/**
 * Improved PDF generation service that matches Word document structure
 * Creates structured PDFs with tables and proper formatting like DocumentService
 */
export class ImprovedPDFService {
  
  /**
   * Generate and download a PDF document from StudyPlan data
   * Structure matches DocumentService Word generation
   */
  static async generateStudyPlanPDF(
    studyPlan: StudyPlan, 
    studentIntake: StudentIntake, 
    filename?: string
  ): Promise<void> {
    try {
      const pdf = new jsPDF();
      let currentY = 20;

      // Add title and subtitle
      currentY = this.addTitle(pdf, studyPlan, studentIntake, currentY);
      
      // Add study plan overview
      currentY = this.addStudyPlanOverview(pdf, studyPlan, studentIntake, currentY);
      
      // Add student profile table
      currentY = this.addStudentProfileSection(pdf, studentIntake, currentY);
      
      // Add study blocks section (main content)
      currentY = await this.addStudyBlocksSection(pdf, studyPlan, currentY);
      
      // Add resources section
      await this.addResourcesSection(pdf, studyPlan, currentY);
      
      // Add footer to all pages
      this.addFooterToAllPages(pdf);
      
      // Download the PDF
      const finalFilename = filename || `study-plan-${studyPlan.study_plan_id || 'plan'}.pdf`;
      pdf.save(finalFilename);
      
    } catch (error) {
      console.error('Failed to generate improved PDF:', error);
      throw new Error('PDF generation failed');
    }
  }

  /**
   * Add title and subtitle matching Word document format
   */
  private static addTitle(
    pdf: jsPDF, 
    studyPlan: StudyPlan, 
    studentIntake: StudentIntake, 
    startY: number
  ): number {
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Title
    pdf.setFontSize(DOCUMENT_STYLES.fonts.title);
    pdf.setTextColor(...DOCUMENT_STYLES.colors.primary);
    pdf.setFont('helvetica', 'bold');
    const title = studyPlan.plan_title || 'Study Plan';
    pdf.text(title, pageWidth / 2, startY, { align: 'center' });
    
    // Subtitle
    const startDate = dayjs(studentIntake.start_date);
    const targetYear = studyPlan.targeted_year || new Date().getFullYear() + 1;
    const planDuration = this.calculateDuration(startDate, targetYear);
    
    pdf.setFontSize(DOCUMENT_STYLES.fonts.subtitle);
    pdf.setTextColor(...DOCUMENT_STYLES.colors.secondary);
    pdf.setFont('helvetica', 'italic');
    const subtitle = `Start Date: ${startDate.format('DD/MM/YYYY')} | Target Year: ${targetYear} (${planDuration})`;
    pdf.text(subtitle, pageWidth / 2, startY + 15, { align: 'center' });
    
    return startY + 35;
  }

  /**
   * Add study plan overview with narrative description
   */
  private static addStudyPlanOverview(
    pdf: jsPDF, 
    studyPlan: StudyPlan, 
    studentIntake: StudentIntake, 
    startY: number
  ): number {
    let currentY = startY;
    
    // Section heading
    pdf.setFontSize(DOCUMENT_STYLES.fonts.heading2);
    pdf.setTextColor(...DOCUMENT_STYLES.colors.primary);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Study Plan Overview', 20, currentY);
    currentY += 15;
    
    // Overview text
    const cycles = studyPlan.cycles || [];
    const targetYear = studyPlan.targeted_year || new Date().getFullYear() + 1;
    const studentName = studentIntake.personal_details?.full_name || 'you';
    
    pdf.setFontSize(DOCUMENT_STYLES.fonts.body);
    pdf.setTextColor(...DOCUMENT_STYLES.colors.text);
    pdf.setFont('helvetica', 'normal');
    
    const overviewText = `This comprehensive study plan is strategically designed for ${studentName} for UPSC ${targetYear} preparation, structured across multiple specialized cycles to maximize learning efficiency and exam readiness.`;
    
    const splitText = pdf.splitTextToSize(overviewText, 170);
    pdf.text(splitText, 20, currentY);
    currentY += splitText.length * 5 + 10;
    
    // Add cycle descriptions
    cycles.forEach(cycle => {
      if (currentY > 250) {
        pdf.addPage();
        currentY = 20;
      }
      
      const cycleDescription = this.getCycleDescription(cycle);
      if (cycleDescription) {
        const cycleSplit = pdf.splitTextToSize(cycleDescription, 170);
        pdf.text(cycleSplit, 20, currentY);
        currentY += cycleSplit.length * 5 + 8;
      }
    });
    
    // Summary paragraph
    const totalWeeks = this.calculateTotalWeeks(studyPlan);
    const totalBlocks = this.countTotalBlocks(studyPlan);
    
    if (currentY > 240) {
      pdf.addPage();
      currentY = 20;
    }
    
    const summaryText = `The entire study journey spans ${totalWeeks} weeks across ${cycles.length} specialized cycles, broken down into ${totalBlocks} focused study blocks. Each cycle is carefully timed to align with UPSC examination dates and optimal learning patterns.`;
    const summarySplit = pdf.splitTextToSize(summaryText, 170);
    pdf.text(summarySplit, 20, currentY);
    currentY += summarySplit.length * 5 + 20;
    
    return currentY;
  }

  /**
   * Add student profile section with table
   */
  private static addStudentProfileSection(pdf: jsPDF, studentIntake: StudentIntake, startY: number): number {
    let currentY = startY;
    
    // Check if we need a new page
    if (currentY > 200) {
      pdf.addPage();
      currentY = 20;
    }
    
    // Section heading
    pdf.setFontSize(DOCUMENT_STYLES.fonts.heading2);
    pdf.setTextColor(...DOCUMENT_STYLES.colors.primary);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Student Profile', 20, currentY);
    currentY += 10;
    
    // Generate student profile data
    const profileData = this.generateStudentProfileData(studentIntake);
    
    // Create table
    pdf.autoTable({
      startY: currentY,
      head: [], // No headers for profile table
      body: profileData,
      theme: 'plain',
      styles: {
        fontSize: DOCUMENT_STYLES.fonts.body,
        cellPadding: 3,
        textColor: DOCUMENT_STYLES.colors.text
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        1: { cellWidth: 40 },
        2: { fontStyle: 'bold', cellWidth: 45 },
        3: { cellWidth: 40 }
      },
      margin: { left: 20, right: 20 },
      tableWidth: 'auto'
    });
    
    return pdf.lastAutoTable?.finalY ? pdf.lastAutoTable.finalY + 20 : currentY + 80;
  }

  /**
   * Add study blocks section - the main content with cycle tables
   */
  private static async addStudyBlocksSection(pdf: jsPDF, studyPlan: StudyPlan, startY: number): Promise<number> {
    let currentY = startY;
    
    // Check if we need a new page
    if (currentY > 200) {
      pdf.addPage();
      currentY = 20;
    }
    
    // Section heading
    pdf.setFontSize(DOCUMENT_STYLES.fonts.heading2);
    pdf.setTextColor(...DOCUMENT_STYLES.colors.primary);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Study Blocks', 20, currentY);
    currentY += 15;
    
    // Process each cycle
    if (studyPlan.cycles) {
      for (const cycle of studyPlan.cycles) {
        currentY = await this.addCycleTable(pdf, cycle, currentY);
      }
    }
    
    return currentY;
  }

  /**
   * Add a table for a single cycle with blocks
   */
  private static async addCycleTable(pdf: jsPDF, cycle: StudyCycle, startY: number): Promise<number> {
    let currentY = startY;
    
    // Check if we need a new page
    if (currentY > 220) {
      pdf.addPage();
      currentY = 20;
    }
    
    // Cycle heading
    pdf.setFontSize(DOCUMENT_STYLES.fonts.heading1);
    pdf.setTextColor(...DOCUMENT_STYLES.colors.text);
    pdf.setFont('helvetica', 'bold');
    const cycleName = cycle.cycleName || 'Untitled Cycle';
    pdf.text(cycleName, 20, currentY);
    currentY += 10;
    
    // Cycle duration info
    pdf.setFontSize(DOCUMENT_STYLES.fonts.body);
    pdf.setFont('helvetica', 'normal');
    const durationText = `Duration: ${cycle.cycleStartDate || 'TBD'} to ${cycle.cycleEndDate || 'TBD'} (${cycle.cycleDuration || 0} weeks)`;
    pdf.text(durationText, 20, currentY);
    currentY += 10;
    
    // Generate table data for this cycle
    const tableData = this.generateCycleTableData(cycle);
    
    // Create table with colored rows
    pdf.autoTable({
      startY: currentY,
      head: [['Block', 'Time Frame', 'Resources']],
      body: tableData.rows,
      theme: 'striped',
      styles: {
        fontSize: DOCUMENT_STYLES.fonts.body,
        cellPadding: 5,
        textColor: DOCUMENT_STYLES.colors.text
      },
      headStyles: {
        fillColor: DOCUMENT_STYLES.colors.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 50 },
        2: { cellWidth: 70 }
      },
      margin: { left: 20, right: 20 },
      didParseCell: (data: any) => {
        // Color rows based on cycle type
        if (data.section === 'body' && data.row.index !== undefined) {
          const cycleType = cycle.cycleType;
          if (cycleType && CYCLE_TYPE_COLORS[cycleType as keyof typeof CYCLE_TYPE_COLORS]) {
            const color = CYCLE_TYPE_COLORS[cycleType as keyof typeof CYCLE_TYPE_COLORS];
            data.cell.styles.fillColor = color;
          }
        }
      }
    });
    
    const newY = pdf.lastAutoTable?.finalY ? pdf.lastAutoTable.finalY + 15 : currentY + 60;
    return newY;
  }

  /**
   * Add resources section with tables per subject
   */
  private static async addResourcesSection(pdf: jsPDF, studyPlan: StudyPlan, startY: number): Promise<void> {
    let currentY = startY;
    
    // Check if we need a new page
    if (currentY > 200) {
      pdf.addPage();
      currentY = 20;
    }
    
    // Section heading
    pdf.setFontSize(DOCUMENT_STYLES.fonts.heading2);
    pdf.setTextColor(...DOCUMENT_STYLES.colors.primary);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Resources', 20, currentY);
    currentY += 15;
    
    // Get all unique subjects from the study plan
    const subjects = this.getUniqueSubjects(studyPlan);
    
    // Add a summary table for now (detailed resources would make PDF too long)
    if (subjects.length > 0) {
      pdf.setFontSize(DOCUMENT_STYLES.fonts.body);
      pdf.setTextColor(...DOCUMENT_STYLES.colors.text);
      pdf.setFont('helvetica', 'normal');
      
      const resourceText = `This study plan covers ${subjects.length} subjects: ${subjects.join(', ')}. Detailed resources for each subject include primary books, current affairs sources, practice materials, and expert recommendations as specified in the full resource database.`;
      
      const splitResourceText = pdf.splitTextToSize(resourceText, 170);
      pdf.text(splitResourceText, 20, currentY);
      currentY += splitResourceText.length * 5 + 10;
      
      // Add a sample resources table for the first few subjects
      const sampleSubjects = subjects.slice(0, 3);
      for (const subjectCode of sampleSubjects) {
        if (currentY > 240) {
          pdf.addPage();
          currentY = 20;
        }
        
        try {
          const subjectName = this.getSubjectName(subjectCode);
          pdf.setFont('helvetica', 'bold');
          pdf.text(subjectName, 20, currentY);
          currentY += 8;
          pdf.setFont('helvetica', 'normal');
          
          const resources = await ResourceService.getResourcesForSubject(subjectCode);
          
          // Create a simplified resources table
          const resourceTableData: string[][] = [];
          
          if (resources.primary_books.length > 0) {
            resources.primary_books.slice(0, 3).forEach(book => {
              resourceTableData.push([
                'Primary Book',
                book.resource_title,
                book.resource_priority,
                this.formatResourceCost(book.resource_cost)
              ]);
            });
          }
          
          if (resourceTableData.length > 0) {
            pdf.autoTable({
              startY: currentY,
              head: [['Type', 'Resource', 'Priority', 'Cost']],
              body: resourceTableData,
              theme: 'striped',
              styles: {
                fontSize: DOCUMENT_STYLES.fonts.small,
                cellPadding: 3
              },
              headStyles: {
                fillColor: DOCUMENT_STYLES.colors.secondary,
                textColor: [255, 255, 255],
                fontSize: DOCUMENT_STYLES.fonts.small
              },
              columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 70 },
                2: { cellWidth: 25 },
                3: { cellWidth: 25 }
              },
              margin: { left: 20 }
            });
            
            currentY = pdf.lastAutoTable?.finalY ? pdf.lastAutoTable.finalY + 10 : currentY + 40;
          } else {
            pdf.text('Resources available in full database', 20, currentY);
            currentY += 10;
          }
        } catch (error) {
          console.warn(`Failed to load resources for ${subjectCode}`, error);
          pdf.text(`Resources available for ${subjectCode}`, 20, currentY);
          currentY += 10;
        }
      }
      
      if (subjects.length > 3) {
        pdf.text(`... and ${subjects.length - 3} more subjects with comprehensive resources`, 20, currentY);
      }
    }
  }

  /**
   * Add footer to all pages
   */
  private static addFooterToAllPages(pdf: jsPDF): void {
    const pageCount = pdf.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(DOCUMENT_STYLES.fonts.small);
      pdf.setTextColor(...DOCUMENT_STYLES.colors.secondary);
      pdf.setFont('helvetica', 'normal');
      
      const footerText = `Generated by Study Planner on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })} - Page ${i} of ${pageCount}`;
      
      pdf.text(footerText, pageWidth / 2, 285, { align: 'center' });
    }
  }

  // Helper methods
  
  /**
   * Generate student profile data for table
   */
  private static generateStudentProfileData(studentIntake: StudentIntake): string[][] {
    const rows: string[][] = [];
    
    // Personal Details
    if (studentIntake.personal_details) {
      const pd = studentIntake.personal_details;
      rows.push([
        'Full Name', pd.full_name || 'Not provided',
        'Email', pd.email || 'Not provided'
      ]);
      rows.push([
        'Phone', pd.phone_number || 'Not provided',
        'Location', pd.present_location || 'Not provided'
      ]);
      rows.push([
        'Student Type', pd.student_archetype || 'Not provided',
        'Graduation Stream', pd.graduation_stream || 'Not provided'
      ]);
    }
    
    // Preparation Background
    if (studentIntake.preparation_background) {
      const pb = studentIntake.preparation_background;
      rows.push([
        'Preparing Since', pb.preparing_since || 'Not provided',
        'Number of Attempts', pb.number_of_attempts || 'Not provided'
      ]);
      rows.push([
        'Highest Stage', pb.highest_stage_per_attempt || 'Not provided',
        'Last GS Score', pb.last_attempt_gs_prelims_score > 0 ? pb.last_attempt_gs_prelims_score.toString() : 'N/A'
      ]);
    }
    
    // Study Strategy
    if (studentIntake.study_strategy) {
      const ss = studentIntake.study_strategy;
      rows.push([
        'Weekly Study Hours', ss.weekly_study_hours || 'Not provided',
        'Study Approach', ss.study_approach || 'Not provided'
      ]);
    }
    
    // Target Year and Start Date
    rows.push([
      'Target Year', studentIntake.target_year || 'Not provided',
      'Start Date', studentIntake.start_date || 'Not provided'
    ]);
    
    return rows;
  }

  /**
   * Generate cycle table data
   */
  private static generateCycleTableData(cycle: StudyCycle): { rows: string[][] } {
    const rows: string[][] = [];
    
    cycle.cycleBlocks?.forEach((block, blockIndex) => {
      const blockDates = this.calculateBlockDates(cycle, block, blockIndex);
      const durationText = `${blockDates.start} - ${blockDates.end}\n${block.duration_weeks || 0} week(s)`;
      const resourceSummary = this.summarizeBlockResources(block.block_resources);
      
      rows.push([
        block.block_title || 'Untitled',
        durationText,
        resourceSummary.join(', ')
      ]);
    });
    
    return { rows };
  }

  /**
   * Get cycle description based on cycle type
   */
  private static getCycleDescription(cycle: StudyCycle): string {
    const duration = cycle.cycleDuration || 0;
    const startDate = cycle.cycleStartDate || 'TBD';
    const endDate = cycle.cycleEndDate || 'TBD';
    
    switch (cycle.cycleType) {
      case 'C1':
        return `NCERT Foundation Cycle (${startDate} to ${endDate}, ${duration} weeks): This initial cycle focuses exclusively on NCERT textbooks to build fundamental concepts across all subjects.`;
      case 'C2':
        return `Foundation Cycle (${startDate} to ${endDate}, ${duration} weeks): This cycle establishes a solid conceptual foundation across all subjects through systematic study of core topics.`;
      case 'C3':
        return `Mains Revision Pre-Prelims Cycle (${startDate} to ${endDate}, ${duration} weeks): This cycle prepares you for Mains-specific requirements while maintaining focus on study and analytical thinking skills.`;
      case 'C4':
        return `Prelims Revision Cycle (${startDate} to ${endDate}, ${duration} weeks): This cycle transitions from foundation building to exam-focused preparation with intensive revision and practice tests.`;
      case 'C5':
        return `Prelims Rapid Revision Cycle (${startDate} to ${endDate}, ${duration} weeks): The final sprint before Prelims examination focuses on high-yield topics and intensive practice sessions.`;
      case 'C6':
        return `Mains Revision Cycle (${startDate} to ${endDate}, ${duration} weeks): This cycle focuses on comprehensive Mains examination preparation with answer writing practice and essay development.`;
      case 'C7':
        return `Mains Rapid Revision Phase (${startDate} to ${endDate}, ${duration} weeks): Post-Prelims preparation shifts focus to Mains examination with intensive answer writing practice.`;
      case 'C8':
        return `Mains Foundation Cycle (${startDate} to ${endDate}, ${duration} weeks): This specialized cycle provides comprehensive Mains preparation with focus on analytical thinking and answer writing skills.`;
      default:
        return '';
    }
  }

  /**
   * Calculate block dates from cycle dates and block position
   */
  private static calculateBlockDates(cycle: StudyCycle, block: Block, _blockIndex: number): { start: string; end: string } {
    return {
      start: block.block_start_date || 'TBD',
      end: block.block_end_date || 'TBD'
    };
  }

  /**
   * Summarize block resources for table display
   */
  private static summarizeBlockResources(blockResources?: BlockResources): string[] {
    if (!blockResources) {
      return ['No resources'];
    }

    const resourceNames: string[] = [];
    
    // Add primary books
    if (blockResources.primary_books && blockResources.primary_books.length > 0) {
      resourceNames.push(...blockResources.primary_books.slice(0, 2).map(book => book.resource_title));
    }
    
    // Add supplementary materials
    if (blockResources.supplementary_materials && blockResources.supplementary_materials.length > 0) {
      resourceNames.push(...blockResources.supplementary_materials.slice(0, 1).map(mat => mat.resource_title));
    }
    
    // Limit to reasonable length for table display
    if (resourceNames.length === 0) {
      return ['Resources available'];
    }
    
    if (resourceNames.length > 3) {
      const firstThree = resourceNames.slice(0, 3);
      firstThree.push(`(+${resourceNames.length - 3} more)`);
      return firstThree;
    }
    
    return resourceNames;
  }

  /**
   * Get unique subjects from study plan
   */
  private static getUniqueSubjects(studyPlan: StudyPlan): string[] {
    const subjects = new Set<string>();
    studyPlan.cycles?.forEach(cycle => {
      cycle.cycleBlocks?.forEach(block => {
        block.subjects?.forEach(subject => subjects.add(subject));
      });
    });
    return Array.from(subjects);
  }

  /**
   * Get subject name from subject code
   */
  private static getSubjectName(subjectCode: string): string {
    const subject = SubjectLoader.getSubjectByCode(subjectCode);
    return subject?.subjectName || subjectCode;
  }

  /**
   * Format resource cost for display
   */
  private static formatResourceCost(resourceCost?: any): string {
    if (!resourceCost) return 'Free';
    
    switch (resourceCost.type) {
      case 'Free':
        return 'Free';
      case 'Paid':
        return `₹${resourceCost.amount || 'N/A'}`;
      case 'Subscription':
        return `${resourceCost.plan || 'Subscription'} Sub`;
      default:
        return 'Free';
    }
  }

  /**
   * Calculate total weeks across all cycles
   */
  private static calculateTotalWeeks(studyPlan: StudyPlan): number {
    return studyPlan.cycles?.reduce((total, cycle) => total + (cycle.cycleDuration || 0), 0) || 0;
  }

  /**
   * Count total blocks across all cycles
   */
  private static countTotalBlocks(studyPlan: StudyPlan): number {
    return studyPlan.cycles?.reduce((total, cycle) => total + (cycle.cycleBlocks?.length || 0), 0) || 0;
  }

  /**
   * Calculate duration string
   */
  private static calculateDuration(startDate: dayjs.Dayjs, targetYear: number): string {
    const targetDate = dayjs(`${targetYear}-05-19`);
    
    const years = targetDate.diff(startDate, 'year');
    const months = targetDate.diff(startDate, 'month') % 12;
    const weeks = Math.floor(targetDate.diff(startDate, 'day') % 30 / 7);
    
    const parts: string[] = [];
    
    if (years > 0) {
      parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    }
    if (months > 0) {
      parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    }
    if (weeks > 0) {
      parts.push(`${weeks} week${weeks !== 1 ? 's' : ''}`);
    }
    
    return parts.length > 0 ? parts.join(' ') : '0 days';
  }
}

export default ImprovedPDFService;