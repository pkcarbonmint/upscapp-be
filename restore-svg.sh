#!/bin/bash

# Script to restore SVG timeline functionality

FILE="study-planner/helios-ts/src/services/DocumentService.ts"

# Add the SVG methods at the end of the class, before the closing brace

cat >> "$FILE" << 'EOF'

  /**
   * Generate elegant SVG timeline for study cycles
   */
  private static generateTimelineSVG(studyPlan: StudyPlan): string {
    const cycles = studyPlan.cycles || [];
    if (cycles.length === 0) return '';

    // Timeline dimensions
    const width = 700;
    const cycleHeight = 60;
    const padding = 40;
    const timelineWidth = 4;
    const markerRadius = 8;
    const totalHeight = cycles.length * cycleHeight + padding * 2;

    // Cycle colors mapping - much lighter backgrounds
    const cycleColors: Record<string, string> = {
      'C1': '#e3f2fd', // Very light blue
      'C2': '#e8f5e8', // Very light green  
      'C3': '#fce4ec', // Very light pink
      'C4': '#ffebee', // Very light red
      'C5': '#f3e5f5', // Very light purple
      'C6': '#e1f5fe', // Very light cyan
      'C7': '#fff3e0', // Very light orange
      'C8': '#f1f8e9', // Very light lime
    };

    // Border colors for contrast
    const borderColors: Record<string, string> = {
      'C1': '#2196f3', // Blue border
      'C2': '#4caf50', // Green border
      'C3': '#e91e63', // Pink border
      'C4': '#f44336', // Red border
      'C5': '#9c27b0', // Purple border
      'C6': '#00bcd4', // Cyan border
      'C7': '#ff9800', // Orange border
      'C8': '#8bc34a', // Lime border
    };

    let svg = `<svg width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Timeline axis - centered horizontally
    const axisX = width / 2;
    svg += `<line x1="${axisX}" y1="${padding}" x2="${axisX}" y2="${totalHeight - padding}" stroke="#667eea" stroke-width="${timelineWidth}" stroke-linecap="round"/>`;
    
    // Generate cycle elements
    cycles.forEach((cycle, index) => {
      const y = padding + (index * cycleHeight) + (cycleHeight / 2);
      const backgroundColor = cycleColors[cycle.cycleType] || '#f5f5f5';
      const borderColor = borderColors[cycle.cycleType] || '#666666';
      
      // Timeline marker
      svg += `<circle cx="${axisX}" cy="${y}" r="${markerRadius}" fill="${borderColor}" stroke="white" stroke-width="2"/>`;
      
      // Cycle card background - centered around timeline
      const cardWidth = width * 0.8; // 80% of total width
      const cardX = (width - cardWidth) / 2; // Center the card
      const cardY = y - 20;
      
      svg += `<rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="40" fill="${backgroundColor}" stroke="${borderColor}" stroke-width="1.5" rx="6"/>`;
      
      // Cycle type badge - positioned to the left of center
      const badgeX = cardX + 20;
      svg += `<rect x="${badgeX}" y="${cardY + 6}" width="24" height="12" fill="${borderColor}" rx="2"/>`;
      svg += `<text x="${badgeX + 12}" y="${cardY + 14}" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="bold" fill="white" text-anchor="middle">${cycle.cycleType}</text>`;
      
      // Cycle name - positioned to the right of badge
      svg += `<text x="${badgeX + 35}" y="${cardY + 16}" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="600" fill="#1a1a1a">${cycle.cycleName}</text>`;
      
      // Duration info - below cycle name
      const durationText = `${cycle.cycleDuration} weeks`;
      svg += `<text x="${badgeX + 35}" y="${cardY + 30}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#4a4a4a">${durationText}</text>`;
      
      // Date range (compact) - positioned to the right
      const startDate = cycle.cycleStartDate ? new Date(cycle.cycleStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
      const endDate = cycle.cycleEndDate ? new Date(cycle.cycleEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
      const dateText = `${startDate} - ${endDate}`;
      svg += `<text x="${cardX + cardWidth - 20}" y="${cardY + 16}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#4a4a4a" text-anchor="end">${dateText}</text>`;
      
      // Subject count - below date range
      const subjectCount = this.getUniqueSubjects(cycle.cycleBlocks).length;
      svg += `<text x="${cardX + cardWidth - 20}" y="${cardY + 30}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#4a4a4a" text-anchor="end">${subjectCount} subjects</text>`;
    });
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * Create SVG image element for Word document
   */
  private static createSVGImage(svgString: string): Paragraph {
    try {
      // Create image run with proper SVG configuration
      const imageRun = new ImageRun({
        data: Buffer.from(svgString),
        type: 'svg',
        fallback: {
          data: Buffer.from(svgString),
          type: 'png',
        },
        transformation: {
          width: 700,
          height: 400,
        },
      });

      return new Paragraph({
        children: [imageRun],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      });
    } catch (error) {
      console.warn('Failed to create SVG image:', error);
      // Fallback to text description
      return new Paragraph({
        children: [new TextRun({ 
          text: '[Timeline visualization would appear here]',
          italics: true,
          color: DOCUMENT_STYLES.colors.secondary
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      });
    }
  }

  /**
   * Get unique subjects from cycle blocks
   */
  private static getUniqueSubjects(cycleBlocks: Block[]): string[] {
    const subjects = new Set<string>();
    cycleBlocks?.forEach(block => {
      if (block.subjects) {
        block.subjects.forEach(subject => subjects.add(subject));
      }
    });
    return Array.from(subjects);
  }
EOF

echo "SVG methods added successfully!"



