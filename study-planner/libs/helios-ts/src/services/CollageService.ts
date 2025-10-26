import { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, HeadingLevel, PageOrientation } from 'docx';
import dayjs from 'dayjs';

interface ScenarioData {
  name: string;
  startDate: string;
  targetYear: number;
  planDuration: string;
  svgTimeline: string;
}

export class CollageService {
  /**
   * Generate a landscape collage document with all scenarios
   */
  static async generateCollageDocument(scenarioData: ScenarioData[]): Promise<Document> {
    const elements: (Paragraph | Table)[] = [];

    // Create title
    elements.push(new Paragraph({
      text: 'Scenario Overview Collage',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 300 }
    }));

    // Create scenario grid
    const gridTable = this.createScenarioGrid(scenarioData);
    elements.push(gridTable);

    // Create document with landscape orientation and minimal margins
    const document = new Document({
      sections: [
        {
          children: elements,
          properties: {
            page: {
              margin: {
                top: 200,    // Minimal margins
                right: 100,
                bottom: 200,
                left: 100,
              },
              size: {
                orientation: PageOrientation.LANDSCAPE, // Landscape orientation
                width: 15840,  // A4 landscape width in twips
                height: 12240  // A4 landscape height in twips
              }
            },
          },
        },
      ],
    });

    return document;
  }

  /**
   * Create 2-column grid table for scenarios
   */
  private static createScenarioGrid(scenarioData: ScenarioData[]): Table {
    const rows: TableRow[] = [];

    // Process scenarios in pairs for 2-column layout
    for (let i = 0; i < scenarioData.length; i += 3) {
      const leftScenario = scenarioData[i];
      const middleScenario = scenarioData[i + 1];
      const rightScenario = scenarioData[i + 2];

      const rowCells: TableCell[] = [];

      // Left column
      rowCells.push(this.createScenarioCell(leftScenario));

      // Middle column (if exists)
      if (middleScenario) {
        rowCells.push(this.createScenarioCell(middleScenario));
      } else {
        // Empty cell for odd number of scenarios
        rowCells.push(new TableCell({
          children: [new Paragraph({ text: '' })],
          width: { size: 33, type: WidthType.PERCENTAGE }
        }));
      }

      // Right column (if exists)
      if (rightScenario) {
        rowCells.push(this.createScenarioCell(rightScenario));
      } else {
        // Empty cell for odd number of scenarios
        rowCells.push(new TableCell({
          children: [new Paragraph({ text: '' })],
          width: { size: 33, type: WidthType.PERCENTAGE }
        }));
      }

      rows.push(new TableRow({ children: rowCells }));
    }

    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: 'single', size: 1 },
        bottom: { style: 'single', size: 1 },
        left: { style: 'single', size: 1 },
        right: { style: 'single', size: 1 },
        insideHorizontal: { style: 'single', size: 1 },
        insideVertical: { style: 'single', size: 1 }
      }
    });
  }

  /**
   * Create individual scenario cell with metadata and SVG
   */
  private static createScenarioCell(scenario: ScenarioData): TableCell {
    return new TableCell({
      children: [
        // Scenario name
        new Paragraph({
          children: [new TextRun({ 
            text: scenario.name, 
            bold: true, 
            size: 20  // Compact size
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        
        // Start date
        new Paragraph({
          children: [new TextRun({ 
            text: `Start: ${scenario.startDate}`, 
            size: 16 
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 }
        }),
        
        // Target year
        new Paragraph({
          children: [new TextRun({ 
            text: `Target: ${scenario.targetYear}`, 
            size: 16 
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 }
        }),
        
        // Plan duration
        new Paragraph({
          children: [new TextRun({ 
            text: `Duration: ${scenario.planDuration}`, 
            size: 16 
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        
        // SVG timeline
        this.createCompactSVGImage(scenario.svgTimeline)
      ],
      width: { size: 50, type: WidthType.PERCENTAGE },
      margins: { 
        top: 100, 
        bottom: 100, 
        left: 100, 
        right: 100 
      }
    });
  }

  /**
   * Create compact SVG image for collage
   */
  private static createCompactSVGImage(svgString: string): Paragraph {
    try {
      const imageRun = new ImageRun({
        data: Buffer.from(svgString),
        type: 'svg',
        fallback: {
          data: Buffer.from(svgString),
          type: 'png',
        },
        transformation: {
          width: 400,  // Smaller for collage
          height: 200  // Smaller for collage
        },
      });

      return new Paragraph({
        children: [imageRun],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      });
    } catch (error) {
      console.warn('Failed to create compact SVG image:', error);
      return new Paragraph({
        children: [new TextRun({
          text: '[Timeline visualization]',
          italics: true,
          size: 14,
          color: '666666'
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      });
    }
  }

  /**
   * Calculate plan duration string (copied from DocumentService)
   */
  static calculatePlanDuration(startDate: string, targetYear: string): string {
    const start = dayjs(startDate);
    const target = dayjs(`${targetYear}-05-19`);
    
    const years = target.diff(start, 'year');
    const months = target.diff(start, 'month') % 12;
    const weeks = Math.floor(target.diff(start, 'day') % 30 / 7);
    
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