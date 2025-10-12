/**
 * Comprehensive test suite for EnhancedPDFService
 * Tests HTML content generation, data binding, structure, and edge cases
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedPDFService } from '../services/EnhancedPDFService';

// Mock the external dependencies
vi.mock('jspdf');
vi.mock('html2canvas');

// Mock DOM methods
global.document = {
  createElement: vi.fn(() => ({
    style: {},
    innerHTML: '',
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    querySelector: vi.fn(),
    scrollWidth: 800,
    scrollHeight: 600
  })),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
} as any;

global.window = {
  URL: {
    createObjectURL: vi.fn(),
    revokeObjectURL: vi.fn()
  }
} as any;

// Helper function to parse HTML for testing
const parseHTML = (htmlString: string) => {
  // Simple HTML parser for testing (in real browser, would use DOMParser)
  return {
    contains: (selector: string) => htmlString.includes(selector),
    getElementByClass: (className: string) => htmlString.includes(`class="${className}"`),
    getElementById: (id: string) => htmlString.includes(`id="${id}"`),
    innerHTML: htmlString
  };
};

describe('EnhancedPDFService - Comprehensive HTML Content Testing', () => {
  let mockStudyPlan: any;
  let mockStudentIntake: any;
  let service: any;

  beforeEach(() => {
    // Create comprehensive test data
    mockStudyPlan = {
      study_plan_id: 'test-plan-123',
      plan_title: 'Advanced UPSC Preparation Plan',
      targeted_year: 2025,
      cycles: [
        {
          cycleId: 'cycle-1',
          cycleName: 'Foundation Building Phase',
          cycleType: 'C1',
          cycleDuration: 12,
          cycleStartDate: '2024-01-01',
          cycleEndDate: '2024-03-24',
          cycleBlocks: [
            {
              block_id: 'block-1',
              block_title: 'Mathematics & Quantitative Aptitude',
              subjects: ['Mathematics', 'Statistics', 'Data Interpretation'],
              duration_weeks: 4
            },
            {
              block_id: 'block-2', 
              block_title: 'Social Sciences Foundation',
              subjects: ['History', 'Geography', 'Political Science', 'Economics'],
              duration_weeks: 6
            },
            {
              block_id: 'block-3',
              block_title: 'Science & Technology',
              subjects: ['Physics', 'Chemistry', 'Biology', 'Environmental Science'],
              duration_weeks: 2
            }
          ]
        },
        {
          cycleId: 'cycle-2',
          cycleName: 'Advanced Preparation Cycle',
          cycleType: 'C2', 
          cycleDuration: 16,
          cycleStartDate: '2024-03-25',
          cycleEndDate: '2024-07-14',
          cycleBlocks: [
            {
              block_id: 'block-4',
              block_title: 'Current Affairs & General Studies',
              subjects: ['Current Affairs', 'General Studies Paper-1', 'General Studies Paper-2'],
              duration_weeks: 8
            },
            {
              block_id: 'block-5',
              block_title: 'Optional Subject Deep Dive', 
              subjects: ['Psychology', 'Research Methods'],
              duration_weeks: 8
            }
          ]
        }
      ]
    };

    mockStudentIntake = {
      start_date: '2024-01-01',
      personal_details: {
        full_name: 'Arjun Kumar Sharma',
        email: 'arjun.sharma@example.com'
      }
    };

    service = EnhancedPDFService as any;
  });

  describe('Basic Service Methods', () => {
    it('should have required methods available', () => {
      expect(typeof EnhancedPDFService.generateEnhancedStudyPlanPDF).toBe('function');
      expect(typeof EnhancedPDFService.generateWeeklySchedulePDF).toBe('function');
    });
  });

  describe('HTML Structure Validation', () => {
    it('should generate valid HTML5 document structure', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);
      const doc = parseHTML(html);

      // Check basic HTML5 structure
      expect(doc.contains('<!DOCTYPE html>')).toBe(true);
      expect(doc.contains('<html lang="en">')).toBe(true);
      expect(doc.contains('<head>')).toBe(true);
      expect(doc.contains('<meta charset="UTF-8">')).toBe(true);
      expect(doc.contains('<title>')).toBe(true);
      expect(doc.contains('<body>')).toBe(true);
    });

    it('should include proper CSS imports and styles', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);
      
      expect(html).toContain('@import url(\'https://fonts.googleapis.com/css2?family=Inter');
      expect(html).toContain('font-family: \'Inter\', sans-serif');
      expect(html).toContain('--primary-color: #2563eb');
      expect(html).toContain('--gradient-primary: linear-gradient');
    });

    it('should have all required CSS classes', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);
      const doc = parseHTML(html);

      const requiredClasses = [
        'page', 'header', 'info-grid', 'info-card', 'stats-grid', 
        'stat-card', 'section', 'section-title', 'cycle-container',
        'cycle-header', 'cycle-content', 'block-item', 'subjects-distribution',
        'subject-tag', 'timeline', 'chart-container', 'footer'
      ];

      requiredClasses.forEach(className => {
        expect(doc.getElementByClass(className)).toBe(true);
      });
    });

    it('should include all chart container elements with correct IDs', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);
      const doc = parseHTML(html);

      const chartIds = [
        'subjects-pie-chart',
        'cycles-timeline-chart', 
        'weekly-distribution-chart'
      ];

      chartIds.forEach(chartId => {
        expect(doc.getElementById(chartId)).toBe(true);
      });
    });
  });

  describe('Content Data Binding', () => {
    it('should correctly render study plan title and basic info', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      expect(html).toContain(mockStudyPlan.plan_title);
      expect(html).toContain('Advanced UPSC Preparation Plan');
      expect(html).toContain('Strategic UPSC 2025 Preparation Plan');
      expect(html).toContain('2025');
    });

    it('should correctly render student information', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      expect(html).toContain(mockStudentIntake.personal_details.full_name);
      expect(html).toContain('Arjun Kumar Sharma');
      expect(html).toContain('2024-01-01');
    });

    it('should render all cycles with correct information', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      mockStudyPlan.cycles.forEach(cycle => {
        expect(html).toContain(cycle.cycleName);
        expect(html).toContain(cycle.cycleType);
        expect(html).toContain(cycle.cycleDuration.toString());
      });

      expect(html).toContain('Foundation Building Phase');
      expect(html).toContain('Advanced Preparation Cycle');
    });

    it('should render all blocks with titles and subjects', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      mockStudyPlan.cycles.forEach(cycle => {
        cycle.cycleBlocks.forEach(block => {
          expect(html).toContain(block.block_title);
          block.subjects.forEach(subject => {
            expect(html).toContain(subject);
          });
        });
      });

      // Check specific content
      expect(html).toContain('Mathematics & Quantitative Aptitude');
      expect(html).toContain('Social Sciences Foundation');
      expect(html).toContain('Current Affairs & General Studies');
      expect(html).toContain('Psychology');
    });

    it('should render subject tags correctly', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      // Check subjects appear in subject tags section
      expect(html).toContain('<div class="subject-tag">Mathematics</div>');
      expect(html).toContain('<div class="subject-tag">History</div>');
      expect(html).toContain('<div class="subject-tag">Physics</div>');
      expect(html).toContain('<div class="subject-tag">Psychology</div>');
    });
  });

  describe('Statistics Calculation and Display', () => {
    it('should calculate and display correct statistics', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      const totalWeeks = service.calculateTotalWeeks(mockStudyPlan);
      const totalBlocks = service.countTotalBlocks(mockStudyPlan);
      const uniqueSubjects = service.getUniqueSubjects(mockStudyPlan);

      expect(totalWeeks).toBe(28); // 12 + 16
      expect(totalBlocks).toBe(5);  // 3 + 2
      expect(uniqueSubjects.length).toBe(13); // All unique subjects

      // Check these values appear in HTML
      expect(html).toContain(`${totalWeeks}</div>`);
      expect(html).toContain(`${totalBlocks}</div>`);
      expect(html).toContain(`${uniqueSubjects.length}</div>`);
    });

    it('should display statistics in stat cards', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      // Check stat card structure
      expect(html).toContain('<div class="stat-card">');
      expect(html).toContain('<div class="stat-number">28</div>');
      expect(html).toContain('<div class="stat-label">Total Weeks</div>');
      
      expect(html).toContain('<div class="stat-number">2</div>');
      expect(html).toContain('<div class="stat-label">Study Cycles</div>');
      
      expect(html).toContain('<div class="stat-number">5</div>');
      expect(html).toContain('<div class="stat-label">Study Blocks</div>');
    });

    it('should calculate subject hours distribution', () => {
      const subjectHours = service.calculateSubjectHours(mockStudyPlan);
      
      expect(typeof subjectHours).toBe('object');
      expect(Object.keys(subjectHours).length).toBeGreaterThan(0);
      
      // Each subject should have calculated hours
      Object.values(subjectHours).forEach(hours => {
        expect(typeof hours).toBe('number');
        expect(hours).toBeGreaterThan(0);
      });
    });
  });

  describe('Timeline and Visual Elements', () => {
    it('should generate timeline HTML with proper structure', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      expect(html).toContain('<div class="timeline">');
      expect(html).toContain('<div class="timeline-item">');
      
      // Timeline should include cycle information
      mockStudyPlan.cycles.forEach(cycle => {
        expect(html).toContain(`<h4>${cycle.cycleName}</h4>`);
        expect(html).toContain(`<strong>Duration:</strong> ${cycle.cycleBlocks.length} blocks`);
      });
    });

    it('should include chart placeholder content', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      expect(html).toContain('Subjects Distribution Chart');
      expect(html).toContain('Weekly Timeline Chart');
      expect(html).toContain('Interactive pie chart showing time allocation');
      expect(html).toContain('Gantt-style chart showing study blocks');
    });

    it('should generate cycles HTML with block items', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      // Check cycle container structure
      expect(html).toContain('<div class="cycle-container">');
      expect(html).toContain('<div class="cycle-header">');
      expect(html).toContain('<div class="cycle-content">');
      expect(html).toContain('<div class="block-item">');
      
      // Check block duration formatting
      expect(html).toContain('<div class="block-duration">4 weeks</div>');
      expect(html).toContain('<div class="block-duration">6 weeks</div>');
      expect(html).toContain('<div class="block-duration">2 weeks</div>');
    });
  });

  describe('Weekly Schedule HTML Generation', () => {
    it('should generate weekly schedule HTML with correct structure', () => {
      const weeklyData = service.generateDefaultWeeklyData(mockStudyPlan, 1);
      const html = service.createWeeklyScheduleHTML(mockStudyPlan, mockStudentIntake, 1, weeklyData);

      expect(html).toContain('Week 1 Schedule');
      expect(html).toContain(mockStudyPlan.plan_title);
      expect(html).toContain('week-info-grid');
      expect(html).toContain('daily-schedule');
    });

    it('should include all days of the week', () => {
      const weeklyData = service.generateDefaultWeeklyData(mockStudyPlan, 1);
      const html = service.createWeeklyScheduleHTML(mockStudyPlan, mockStudentIntake, 1, weeklyData);

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      days.forEach(day => {
        expect(html).toContain(day);
      });
    });

    it('should include weekly summary and progress sections', () => {
      const weeklyData = service.generateDefaultWeeklyData(mockStudyPlan, 1);
      const html = service.createWeeklyScheduleHTML(mockStudyPlan, mockStudentIntake, 1, weeklyData);

      expect(html).toContain('Weekly Summary');
      expect(html).toContain('Weekly Progress');
      expect(html).toContain('progress-bar');
      expect(html).toContain('Foundation</div>');
      expect(html).toContain('Revision</div>');
      expect(html).toContain('Practice</div>');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty cycles gracefully', () => {
      const emptyPlan = { ...mockStudyPlan, cycles: [] };
      const html = service.createEnhancedStudyPlanHTML(emptyPlan, mockStudentIntake);

      expect(html).not.toContain('undefined');
      expect(html).not.toContain('null');
      expect(html).toContain(mockStudyPlan.plan_title);
      
      // Should show zero statistics
      const totalWeeks = service.calculateTotalWeeks(emptyPlan);
      expect(totalWeeks).toBe(0);
    });

    it('should handle missing student details gracefully', () => {
      const emptyStudent = { start_date: '2024-01-01', personal_details: null };
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, emptyStudent);

      expect(html).not.toContain('undefined');
      expect(html).not.toContain('null');
      expect(html).toContain(mockStudyPlan.plan_title);
    });

    it('should handle blocks with no subjects', () => {
      const planWithEmptyBlocks = {
        ...mockStudyPlan,
        cycles: [{
          ...mockStudyPlan.cycles[0],
          cycleBlocks: [{
            block_id: 'empty-block',
            block_title: 'Empty Block',
            subjects: [],
            duration_weeks: 1
          }]
        }]
      };

      const html = service.createEnhancedStudyPlanHTML(planWithEmptyBlocks, mockStudentIntake);
      expect(html).toContain('Empty Block');
      expect(html).not.toContain('undefined');
    });

    it('should handle special characters in content', () => {
      const specialPlan = {
        ...mockStudyPlan,
        plan_title: 'Test Plan with "Quotes" & Special Characters <script>',
        cycles: [{
          ...mockStudyPlan.cycles[0],
          cycleName: 'Cycle with Émojis 🚀 and Ünicode',
          cycleBlocks: [{
            block_id: 'special-block',
            block_title: 'Block with <tags> & "quotes"',
            subjects: ['Math & Stats', 'History—Ancient & Medieval'],
            duration_weeks: 2
          }]
        }]
      };

      const html = service.createEnhancedStudyPlanHTML(specialPlan, mockStudentIntake);
      
      // Should escape HTML properly (basic check)
      expect(html).toContain('Test Plan with');
      expect(html).toContain('Cycle with');
      expect(html).toContain('Block with');
      expect(html).not.toContain('<script>'); // Should be escaped
    });

    it('should generate default weekly data when none provided', () => {
      const defaultWeeklyData = service.generateDefaultWeeklyData(mockStudyPlan, 1);
      
      expect(defaultWeeklyData.studyDays).toBeDefined();
      expect(defaultWeeklyData.totalHours).toBeDefined();
      expect(defaultWeeklyData.activeSubjects).toBeInstanceOf(Array);
      expect(defaultWeeklyData.progress).toBeDefined();
      expect(defaultWeeklyData.goals).toBeInstanceOf(Array);
    });
  });

  describe('CSS and Styling Validation', () => {
    it('should include responsive design classes', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      expect(html).toContain('display: grid');
      expect(html).toContain('grid-template-columns');
      expect(html).toContain('flex-wrap: wrap');
      expect(html).toContain('@media print');
    });

    it('should include proper color scheme variables', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      const colorVariables = [
        '--primary-color', '--secondary-color', '--accent-color',
        '--success-color', '--warning-color', '--error-color'
      ];

      colorVariables.forEach(variable => {
        expect(html).toContain(variable);
      });
    });

    it('should include gradient backgrounds', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);

      expect(html).toContain('linear-gradient(135deg');
      expect(html).toContain('--gradient-primary');
      expect(html).toContain('--gradient-accent');
    });
  });

  describe('Performance and Size Validation', () => {
    it('should generate HTML within reasonable size limits', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);
      
      // Should be substantial but not excessive
      expect(html.length).toBeGreaterThan(5000);  // Has real content
      expect(html.length).toBeLessThan(100000);   // Not bloated
    });

    it('should not include repeated large content blocks', () => {
      const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);
      
      // Count occurrences of CSS style block
      const styleBlocks = (html.match(/<style>/g) || []).length;
      expect(styleBlocks).toBe(1); // Should only have one style block
    });
  });
});