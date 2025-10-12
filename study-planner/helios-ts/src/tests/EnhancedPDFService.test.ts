/**
 * Test suite for EnhancedPDFService
 */
import { describe, it, expect, vi } from 'vitest';
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

describe('EnhancedPDFService', () => {
  const mockStudyPlan = {
    study_plan_id: 'test-123',
    plan_title: 'Test Plan',
    targeted_year: 2025,
    cycles: [{
      cycleId: 'c1',
      cycleName: 'Test Cycle',
      cycleDuration: 4,
      cycleBlocks: [{
        block_id: 'b1',
        block_title: 'Test Block',
        subjects: ['Math'],
        duration_weeks: 2
      }]
    }]
  };

  const mockStudentIntake = {
    start_date: '2024-01-01',
    personal_details: { full_name: 'Test Student' }
  };

  it('should have required methods', () => {
    expect(typeof EnhancedPDFService.generateEnhancedStudyPlanPDF).toBe('function');
    expect(typeof EnhancedPDFService.generateWeeklySchedulePDF).toBe('function');
  });

  it('should calculate basic statistics', () => {
    const service = EnhancedPDFService as any;
    const weeks = service.calculateTotalWeeks(mockStudyPlan);
    const blocks = service.countTotalBlocks(mockStudyPlan);
    const subjects = service.getUniqueSubjects(mockStudyPlan);
    
    expect(weeks).toBe(4);
    expect(blocks).toBe(1);
    expect(subjects).toEqual(['Math']);
  });

  it('should generate HTML content', () => {
    const service = EnhancedPDFService as any;
    const html = service.createEnhancedStudyPlanHTML(mockStudyPlan, mockStudentIntake);
    
    expect(html).toContain('Test Plan');
    expect(html).toContain('Test Student');
    expect(html).toContain('Test Cycle');
  });
});