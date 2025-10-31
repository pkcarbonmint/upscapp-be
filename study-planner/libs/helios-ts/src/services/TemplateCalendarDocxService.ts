import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import type { StudyPlan, StudentIntake } from '../types/models';
import { type Writable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { transformStudyPlanToTemplateData } from './template-data-transformers';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

/**
 * TemplateCalendarDocxService - Template-based DOCX generation service
 * 
 * This service uses docxtemplater to populate content from an external Word template,
 * enabling style customization outside of code.
 * 
 * Key Features:
 * - Uses external .docx template for styling
 * - Supports all methods from CalendarDocxService
 * - Template placeholders for dynamic content
 * - Easy style customization via template editing
 */
export class TemplateCalendarDocxService {
  private static DEFAULT_TEMPLATE_PATH = path.join(__dirname, '../templates/study-plan-template.docx');

  /**
   * Load template file and create Docxtemplater instance
   */
  private static loadTemplate(templatePath?: string): Docxtemplater {
    const resolvedPath = templatePath || this.DEFAULT_TEMPLATE_PATH;
    
    try {
      // Load the template file
      const content = fs.readFileSync(resolvedPath, 'binary');
      const zip = new PizZip(content);
      
      // Create docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
      });
      
      return doc;
    } catch (error) {
      throw new Error(`Failed to load template from ${resolvedPath}: ${error}`);
    }
  }

  /**
   * Generate study plan document from template
   */
  static async generateStudyPlanDocx(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    options: {
      filename: string;
      templatePath?: string;
    }
  ): Promise<void> {
    try {
      // Load template
      const doc = this.loadTemplate(options.templatePath);
      
      // Transform data for template
      const templateData = transformStudyPlanToTemplateData(studyPlan, studentIntake);
      
      // Render the document
      doc.render(templateData);
      
      // Generate buffer
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      // Save to filesystem
      const outputDir = path.join(process.cwd(), 'generated-docs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputPath = path.join(outputDir, options.filename);
      fs.writeFileSync(outputPath, buffer);
      
      console.log(`✅ Template-based Word document saved: ${options.filename}`);
      console.log(`   📁 Location: ${outputPath}`);
    } catch (error) {
      console.error('Failed to generate template-based Word document:', error);
      throw new Error('Template-based Word document generation failed');
    }
  }

  /**
   * Generate study plan document and stream to output stream
   */
  static async generateStudyPlanDocxToStream(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    outputStream: Writable,
    options?: {
      filename?: string;
      templatePath?: string;
    }
  ): Promise<void> {
    try {
      // Load template
      const doc = this.loadTemplate(options?.templatePath);
      
      // Transform data for template
      const templateData = transformStudyPlanToTemplateData(studyPlan, studentIntake);
      
      // Render the document
      doc.render(templateData);
      
      // Generate buffer
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      // Stream to output
      outputStream.write(buffer);
      outputStream.end();
      
      console.log(`✅ Template-based Word document streamed to output: ${options?.filename || 'document.docx'}`);
    } catch (error) {
      console.error('Failed to stream template-based Word document:', error);
      throw new Error('Template-based Word document streaming failed');
    }
  }

  /**
   * Generate study plan document as buffer
   */
  static async generateStudyPlanDocxBuffer(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    options?: {
      templatePath?: string;
    }
  ): Promise<Buffer> {
    try {
      // Load template
      const doc = this.loadTemplate(options?.templatePath);
      
      // Transform data for template
      const templateData = transformStudyPlanToTemplateData(studyPlan, studentIntake);
      
      // Render the document
      doc.render(templateData);
      
      // Generate buffer
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      return buffer;
    } catch (error) {
      console.error('Failed to generate template-based Word document buffer:', error);
      throw new Error('Template-based Word document buffer generation failed');
    }
  }

  /**
   * Generate study plan document as Blob (for browser environments)
   */
  static async generateStudyPlanDocxBlob(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    options?: {
      templatePath?: string;
    }
  ): Promise<Blob> {
    try {
      const buffer = await this.generateStudyPlanDocxBuffer(studyPlan, studentIntake, options);
      return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    } catch (error) {
      console.error('Failed to generate template-based Word document blob:', error);
      throw new Error('Template-based Word document blob generation failed');
    }
  }

  /**
   * Generate study plan document without weekly views (monthly view only)
   */
  static async generateStudyPlanDocxWithoutWeeklyViews(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    options?: {
      templatePath?: string;
    }
  ): Promise<Buffer> {
    try {
      // Load template
      const doc = this.loadTemplate(options?.templatePath);
      
      // Transform data for template (without weekly views)
      const templateData = transformStudyPlanToTemplateData(studyPlan, studentIntake, {
        includeWeeklyViews: false
      });
      
      // Render the document
      doc.render(templateData);
      
      // Generate buffer
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      return buffer;
    } catch (error) {
      console.error('Failed to generate template-based Word document without weekly views:', error);
      throw new Error('Template-based Word document generation without weekly views failed');
    }
  }

  /**
   * Generate Word document for a specific month
   */
  static async generateMonthDocx(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    monthIndex: number,
    options?: {
      templatePath?: string;
    }
  ): Promise<Buffer> {
    try {
      // Load template
      const doc = this.loadTemplate(options?.templatePath);
      
      // Transform data for template (specific month only)
      const templateData = transformStudyPlanToTemplateData(studyPlan, studentIntake, {
        monthIndex: monthIndex
      });
      
      // Render the document
      doc.render(templateData);
      
      // Generate buffer
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      return buffer;
    } catch (error) {
      console.error('Failed to generate template-based month Word document:', error);
      throw new Error('Template-based month Word document generation failed');
    }
  }

  /**
   * Generate Blob for a document without weekly views (browser-compatible)
   */
  static async generateStudyPlanDocxWithoutWeeklyViewsBlob(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    options?: {
      templatePath?: string;
    }
  ): Promise<Blob> {
    try {
      const buffer = await this.generateStudyPlanDocxWithoutWeeklyViews(studyPlan, studentIntake, options);
      return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    } catch (error) {
      console.error('Failed to generate template-based Word document without weekly views blob:', error);
      throw new Error('Template-based Word document blob generation without weekly views failed');
    }
  }

  /**
   * Generate Blob for a specific month (browser-compatible)
   */
  static async generateMonthDocxBlob(
    studyPlan: StudyPlan,
    studentIntake: StudentIntake,
    monthIndex: number,
    options?: {
      templatePath?: string;
    }
  ): Promise<Blob> {
    try {
      const buffer = await this.generateMonthDocx(studyPlan, studentIntake, monthIndex, options);
      return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    } catch (error) {
      console.error('Failed to generate template-based month Word document blob:', error);
      throw new Error('Template-based month Word document blob generation failed');
    }
  }
}
