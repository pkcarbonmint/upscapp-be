import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import type { StudyPlan, StudyCycle, Block, BlockResources, StudentIntake } from '../types/models';
import { ResourceService } from './ResourceService';
import { SubjectLoader } from './SubjectLoader';
import dayjs from 'dayjs';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Extend jsPDF type to include lastAutoTable property
declare module 'jspdf' {
  interface jsPDF {
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
  },
  chartColors: {
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6',
    pink: '#ec4899',
    indigo: '#6366f1',
    teal: '#14b8a6'
  },
  table: {
    pageWidth: 210, // A4 width in mm
    margins: { left: 15, right: 15 },
    availableWidth: 180, // pageWidth - left margin - right margin
    profileTable: {
      columnWidths: [35, 30, 35, 30] // Total: 130mm (fits within 180mm)
    },
    cycleTable: {
      columnWidths: [45, 40, 50] // Total: 135mm (fits within 180mm)
    },
    resourceTable: {
      columnWidths: [20, 50, 18, 18] // Total: 106mm (fits within 180mm)
    }
  }
} as const;

/**
 * Unified PDF generation service for Helios Study Planner
 * Provides both structured (Word-like) and visual (chart-based) PDF generation
 */
export class PDFService {
  
  /**
   * Generate structured PDF that matches Word document format
   * This is the RECOMMENDED method for professional study plan PDFs
   */
  static async generateStructuredPDF(
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
      
      // Save the PDF (browser download or filesystem based on environment)
      const finalFilename = filename || `study-plan-${studyPlan.study_plan_id || 'plan'}.pdf`;
      
      if (typeof window !== 'undefined') {
        // Browser environment - trigger download
        pdf.save(finalFilename);
        console.log(`📁 PDF download triggered: ${finalFilename}`);
      } else {
        // Node.js environment - save to filesystem
        const fs = await import('fs');
        const path = await import('path');
        
        const outputDir = path.join(process.cwd(), 'generated-docs');
        
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputPath = path.join(outputDir, finalFilename);
        const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
        fs.writeFileSync(outputPath, pdfBuffer);
        
        console.log(`✅ PDF saved: ${finalFilename}`);
        console.log(`   📁 Location: ${outputPath}`);
      }
      
    } catch (error) {
      console.error('Failed to generate structured PDF:', error);
      throw new Error('Structured PDF generation failed');
    }
  }

  /**
   * Generate visual PDF with charts and modern design
   * Use this for presentation-style PDFs with visualizations
   */
  static async generateVisualPDF(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    filename?: string
  ): Promise<void> {
    try {
      // Create HTML document for PDF generation
      const htmlContent = this.createEnhancedStudyPlanHTML(studyPlan, studentIntake);
      
      // Create temporary container for rendering
      const container = this.createTemporaryContainer(htmlContent);
      
      // Generate charts and insert them
      await this.generateAndInsertCharts(container, studyPlan);
      
      // Generate PDF from HTML
      const pdf = await this.generatePDFFromHTML(container);
      
      // Save the PDF (browser download or filesystem based on environment)
      const finalFilename = filename || `visual-study-plan-${studyPlan.study_plan_id || 'plan'}.pdf`;
      
      if (typeof window !== 'undefined') {
        // Browser environment - trigger download
        pdf.save(finalFilename);
        console.log(`📁 PDF download triggered: ${finalFilename}`);
      } else {
        // Node.js environment - save to filesystem
        const fs = await import('fs');
        const path = await import('path');
        
        const outputDir = path.join(process.cwd(), 'generated-docs');
        
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputPath = path.join(outputDir, finalFilename);
        const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
        fs.writeFileSync(outputPath, pdfBuffer);
        
        console.log(`✅ PDF saved: ${finalFilename}`);
        console.log(`   📁 Location: ${outputPath}`);
      }
      
      // Cleanup
      this.cleanupTemporaryContainer(container);
      
    } catch (error) {
      console.error('Failed to generate visual PDF:', error);
      throw new Error('Visual PDF generation failed');
    }
  }

  /**
   * Main entry point - defaults to structured PDF (recommended)
   */
  static async generateStudyPlanPDF(
    studyPlan: StudyPlan, 
    studentIntake: StudentIntake, 
    options?: {
      filename?: string;
      type?: 'structured' | 'visual';
    }
  ): Promise<void> {
    const type = options?.type || 'structured';
    
    if (type === 'visual') {
      return this.generateVisualPDF(studyPlan, studentIntake, options?.filename);
    } else {
      return this.generateStructuredPDF(studyPlan, studentIntake, options?.filename);
    }
  }

  // ===== STRUCTURED PDF METHODS =====

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
    autoTable(pdf, {
      startY: currentY,
      head: [], // No headers for profile table
      body: profileData,
      theme: 'plain',
      styles: {
        fontSize: DOCUMENT_STYLES.fonts.body,
        cellPadding: 3,
        textColor: [...DOCUMENT_STYLES.colors.text]
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: DOCUMENT_STYLES.table.profileTable.columnWidths[0] },
        1: { cellWidth: DOCUMENT_STYLES.table.profileTable.columnWidths[1] },
        2: { fontStyle: 'bold', cellWidth: DOCUMENT_STYLES.table.profileTable.columnWidths[2] },
        3: { cellWidth: DOCUMENT_STYLES.table.profileTable.columnWidths[3] }
      },
      margin: DOCUMENT_STYLES.table.margins,
      tableWidth: 'wrap'
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
    autoTable(pdf, {
      startY: currentY,
      head: [['Block', 'Time Frame', 'Resources']],
      body: tableData.rows,
      theme: 'striped',
      styles: {
        fontSize: DOCUMENT_STYLES.fonts.body,
        cellPadding: 5,
        textColor: [...DOCUMENT_STYLES.colors.text]
      },
      headStyles: {
        fillColor: [...DOCUMENT_STYLES.colors.primary],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: DOCUMENT_STYLES.table.cycleTable.columnWidths[0] },
        1: { cellWidth: DOCUMENT_STYLES.table.cycleTable.columnWidths[1] },
        2: { cellWidth: DOCUMENT_STYLES.table.cycleTable.columnWidths[2] }
      },
      margin: DOCUMENT_STYLES.table.margins,
      tableWidth: 'wrap',
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
            autoTable(pdf, {
              startY: currentY,
              head: [['Type', 'Resource', 'Priority', 'Cost']],
              body: resourceTableData,
              theme: 'striped',
              styles: {
                fontSize: DOCUMENT_STYLES.fonts.small,
                cellPadding: 3
              },
              headStyles: {
                fillColor: [...DOCUMENT_STYLES.colors.secondary],
                textColor: [255, 255, 255],
                fontSize: DOCUMENT_STYLES.fonts.small
              },
              columnStyles: {
                0: { cellWidth: DOCUMENT_STYLES.table.resourceTable.columnWidths[0] },
                1: { cellWidth: DOCUMENT_STYLES.table.resourceTable.columnWidths[1] },
                2: { cellWidth: DOCUMENT_STYLES.table.resourceTable.columnWidths[2] },
                3: { cellWidth: DOCUMENT_STYLES.table.resourceTable.columnWidths[3] }
              },
              margin: DOCUMENT_STYLES.table.margins,
              tableWidth: 'wrap'
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

  // ===== VISUAL PDF METHODS =====

  /**
   * Create enhanced HTML template for study plan overview
   */
  private static createEnhancedStudyPlanHTML(studyPlan: StudyPlan, studentIntake: StudentIntake): string {
    const totalWeeks = this.calculateTotalWeeks(studyPlan);
    const totalBlocks = this.countTotalBlocks(studyPlan);
    const uniqueSubjects = this.getUniqueSubjects(studyPlan);
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${studyPlan.plan_title || 'Study Plan'}</title>
        ${this.getEnhancedCSS()}
    </head>
    <body>
        <div class="page">
            <!-- Header Section -->
            <div class="header">
                <h1>${studyPlan.plan_title || 'Comprehensive Study Plan'}</h1>
                <div class="subtitle">Strategic UPSC ${studyPlan.targeted_year || '2025'} Preparation Plan</div>
            </div>
            
            <!-- Plan Information Grid -->
            <div class="info-grid">
                <div class="info-card">
                    <h3>📋 Plan Details</h3>
                    <div class="info-item">
                        <span class="info-label">Student:</span>
                        <span class="info-value">${studentIntake.personal_details?.full_name || 'Student'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Target Year:</span>
                        <span class="info-value">${studyPlan.targeted_year || '2025'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Start Date:</span>
                        <span class="info-value">${studentIntake.start_date || 'TBD'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Generated:</span>
                        <span class="info-value">${dayjs().format('MMMM DD, YYYY')}</span>
                    </div>
                </div>
                
                <div class="info-card">
                    <h3>📊 Plan Statistics</h3>
                    <div class="info-item">
                        <span class="info-label">Total Duration:</span>
                        <span class="info-value">${totalWeeks} weeks</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Study Cycles:</span>
                        <span class="info-value">${studyPlan.cycles?.length || 0}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Study Blocks:</span>
                        <span class="info-value">${totalBlocks}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Subjects:</span>
                        <span class="info-value">${uniqueSubjects.length}</span>
                    </div>
                </div>
            </div>
            
            <!-- Statistics Cards -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${totalWeeks}</div>
                    <div class="stat-label">Total Weeks</div>
                </div>
                <div class="stat-card accent">
                    <div class="stat-number">${studyPlan.cycles?.length || 0}</div>
                    <div class="stat-label">Study Cycles</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-number">${totalBlocks}</div>
                    <div class="stat-label">Study Blocks</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-number">${uniqueSubjects.length}</div>
                    <div class="stat-label">Subjects</div>
                </div>
            </div>
            
            <!-- Charts Container -->
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">📊 Visual Analytics</h2>
                </div>
                
                <div class="charts-row">
                    <div class="chart-container" id="subjects-pie-chart">
                        <h3>Subjects Time Distribution</h3>
                        <canvas id="subjectsChart" width="400" height="200"></canvas>
                    </div>
                    
                    <div class="chart-container" id="cycles-timeline-chart">
                        <h3>Cycles Timeline</h3>
                        <canvas id="cyclesChart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Study Plan Cycles -->
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">🗓️ Study Plan by Cycles</h2>
                </div>
                
                ${this.generateCyclesHTML(studyPlan)}
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <div class="footer-content">
                    <div class="footer-left">
                        Generated on ${dayjs().format('MMMM DD, YYYY')} | Helios Study Planner
                    </div>
                    <div class="footer-right">
                        Your Path to Excellence
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>`;
  }

  /**
   * Generate and insert charts into the HTML container
   */
  private static async generateAndInsertCharts(container: HTMLElement, studyPlan: StudyPlan): Promise<void> {
    const subjectsCanvas = container.querySelector('#subjectsChart') as HTMLCanvasElement;
    const cyclesCanvas = container.querySelector('#cyclesChart') as HTMLCanvasElement;

    if (subjectsCanvas) {
      await this.createSubjectsPieChart(subjectsCanvas, studyPlan);
    }

    if (cyclesCanvas) {
      await this.createCyclesTimelineChart(cyclesCanvas, studyPlan);
    }
  }

  /**
   * Create subjects pie chart
   */
  private static async createSubjectsPieChart(canvas: HTMLCanvasElement, studyPlan: StudyPlan): Promise<Chart> {
    const subjects = this.getUniqueSubjects(studyPlan);
    const subjectHours = this.calculateSubjectHours(studyPlan);
    
    const data = subjects.map(subject => subjectHours[subject] || 0);
    const colors = subjects.map((_, index) => Object.values(DOCUMENT_STYLES.chartColors)[index % Object.values(DOCUMENT_STYLES.chartColors).length]);

    return new Chart(canvas, {
      type: 'pie',
      data: {
        labels: subjects,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                family: 'Inter, sans-serif',
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const percentage = ((value / data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                return `${label}: ${value}h (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Create cycles timeline chart
   */
  private static async createCyclesTimelineChart(canvas: HTMLCanvasElement, studyPlan: StudyPlan): Promise<Chart> {
    const cycles = studyPlan.cycles || [];
    const cycleNames = cycles.map(cycle => cycle.cycleName || cycle.cycleType || 'Cycle');
    const cycleDurations = cycles.map(cycle => cycle.cycleDuration || 0);

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: cycleNames,
        datasets: [{
          label: 'Duration (Weeks)',
          data: cycleDurations,
          backgroundColor: DOCUMENT_STYLES.chartColors.primary,
          borderColor: DOCUMENT_STYLES.chartColors.primary,
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Weeks'
            }
          }
        }
      }
    });
  }

  /**
   * Generate PDF from HTML container
   */
  private static async generatePDFFromHTML(container: HTMLElement): Promise<jsPDF> {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: container.scrollWidth,
      height: container.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;
    
    const x = (pdfWidth - scaledWidth) / 2;
    const y = (pdfHeight - scaledHeight) / 2;
    
    pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
    
    return pdf;
  }

  /**
   * Create temporary container for HTML rendering
   */
  private static createTemporaryContainer(htmlContent: string): HTMLElement {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('DOM methods not available in Node.js environment. Use generateStructuredPDF instead.');
    }
    
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    container.style.backgroundColor = 'white';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Cleanup temporary container
   */
  private static cleanupTemporaryContainer(container: HTMLElement): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  // ===== HELPER METHODS =====
  
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
  private static calculateBlockDates(_cycle: StudyCycle, block: Block, _blockIndex: number): { start: string; end: string } {
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
   * Calculate subject hours distribution
   */
  private static calculateSubjectHours(studyPlan: StudyPlan): Record<string, number> {
    const subjectHours: Record<string, number> = {};
    const uniqueSubjects = this.getUniqueSubjects(studyPlan);
    
    uniqueSubjects.forEach(subject => {
      let totalHours = 0;
      studyPlan.cycles?.forEach(cycle => {
        cycle.cycleBlocks?.forEach(block => {
          if (block.subjects?.includes(subject)) {
            // Estimate hours based on block duration and subject count
            const blockHours = (block.duration_weeks || 0) * 35; // 35 hours per week
            const subjectHours = blockHours / (block.subjects?.length || 1);
            totalHours += subjectHours;
          }
        });
      });
      subjectHours[subject] = Math.round(totalHours);
    });
    
    return subjectHours;
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

  /**
   * Generate cycles HTML for visual PDF
   */
  private static generateCyclesHTML(studyPlan: StudyPlan): string {
    if (!studyPlan.cycles) return '<p>No cycles available</p>';
    
    return studyPlan.cycles.map(cycle => `
      <div class="cycle-container">
        <div class="cycle-header">
          ${cycle.cycleName || cycle.cycleType} (${cycle.cycleDuration || 0} weeks)
        </div>
        <div class="cycle-content">
          ${cycle.cycleBlocks?.map(block => `
            <div class="block-item">
              <div class="block-title">${block.block_title || 'Untitled Block'}</div>
              <div class="block-duration">${block.duration_weeks || 0} weeks</div>
              <div class="block-subjects">${block.subjects?.join(', ') || 'No subjects'}</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.random() * 100}%"></div>
              </div>
            </div>
          `).join('') || '<p>No blocks in this cycle</p>'}
        </div>
      </div>
    `).join('');
  }

  /**
   * Get enhanced CSS for visual PDF
   */
  private static getEnhancedCSS(): string {
    return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #1e293b;
        background: #f8fafc;
      }
      
      .page {
        width: 210mm;
        min-height: 297mm;
        background: white;
        padding: 0;
      }
      
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px 30px;
        text-align: center;
      }
      
      .header h1 {
        font-size: 3.5em;
        font-weight: 800;
        margin-bottom: 10px;
      }
      
      .header .subtitle {
        font-size: 1.2em;
        font-weight: 300;
        opacity: 0.9;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        padding: 30px;
        margin-bottom: 20px;
      }
      
      .info-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .info-card h3 {
        color: #2563eb;
        font-weight: 600;
        margin-bottom: 15px;
        font-size: 1.1em;
      }
      
      .info-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        padding: 8px 0;
        border-bottom: 1px solid #f1f5f9;
      }
      
      .info-label {
        font-weight: 500;
        color: #64748b;
      }
      
      .info-value {
        font-weight: 600;
        color: #1e293b;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        padding: 0 30px;
        margin-bottom: 30px;
      }
      
      .stat-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #2563eb;
      }
      
      .stat-card.accent {
        border-left-color: #06b6d4;
      }
      
      .stat-card.success {
        border-left-color: #10b981;
      }
      
      .stat-card.warning {
        border-left-color: #f59e0b;
      }
      
      .stat-number {
        font-size: 2.5em;
        font-weight: 800;
        color: #2563eb;
        margin-bottom: 5px;
      }
      
      .stat-label {
        font-size: 0.9em;
        color: #64748b;
        font-weight: 500;
      }
      
      .section {
        margin: 40px 30px;
      }
      
      .section-header {
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #e2e8f0;
      }
      
      .section-title {
        font-size: 1.8em;
        font-weight: 700;
        color: #0f172a;
      }
      
      .charts-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .chart-container {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .chart-container h3 {
        color: #2563eb;
        font-weight: 600;
        margin-bottom: 15px;
        text-align: center;
      }
      
      .cycle-container {
        margin-bottom: 25px;
      }
      
      .cycle-header {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 8px 8px 0 0;
        font-weight: 600;
        font-size: 1.1em;
      }
      
      .cycle-content {
        background: white;
        border: 1px solid #e2e8f0;
        border-top: none;
        border-radius: 0 0 8px 8px;
      }
      
      .block-item {
        padding: 15px 20px;
        border-bottom: 1px solid #f1f5f9;
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 2fr;
        gap: 15px;
        align-items: center;
      }
      
      .block-title {
        font-weight: 600;
        color: #1e293b;
      }
      
      .block-duration {
        background: #06b6d4;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8em;
        font-weight: 600;
        text-align: center;
      }
      
      .block-subjects {
        color: #64748b;
        font-size: 0.9em;
      }
      
      .progress-bar {
        width: 100%;
        height: 6px;
        background: #f1f5f9;
        border-radius: 3px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        border-radius: 3px;
      }
      
      .footer {
        background: #0f172a;
        color: white;
        padding: 20px 30px;
        margin-top: 40px;
      }
      
      .footer-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .footer-left {
        font-size: 0.9em;
        opacity: 0.8;
      }
      
      .footer-right {
        font-weight: 600;
      }
    </style>`;
  }
}

export default PDFService;