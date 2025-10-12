/**
 * Test suite for ImprovedPDFService
 * Tests the new structured PDF generation that matches Word document format
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImprovedPDFService } from '../services/ImprovedPDFService';

// Mock jsPDF and autoTable
const mockPDF = {
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setFont: vi.fn(),
  text: vi.fn(),
  addPage: vi.fn(),
  autoTable: vi.fn(),
  save: vi.fn(),
  getNumberOfPages: vi.fn(() => 1),
  setPage: vi.fn(),
  internal: {
    pageSize: {
      getWidth: vi.fn(() => 210),
      getHeight: vi.fn(() => 297)
    }
  },
  splitTextToSize: vi.fn((text: string) => [text]),
  lastAutoTable: {
    finalY: 100
  }
};

vi.mock('jspdf', () => ({
  default: vi.fn(() => mockPDF),
  jsPDF: vi.fn(() => mockPDF)
}));

vi.mock('jspdf-autotable', () => ({}));

// Mock ResourceService
vi.mock('../services/ResourceService', () => ({
  ResourceService: {
    getResourcesForSubject: vi.fn(() => Promise.resolve({
      primary_books: [{
        resource_title: 'Sample Book',
        resource_priority: 'High',
        resource_cost: { type: 'Paid', amount: 500 }
      }],
      current_affairs_sources: [],
      practice_resources: [],
      supplementary_materials: [],
      video_content: [],
      revision_materials: [],
      expert_recommendations: []
    }))
  }
}));

// Mock SubjectLoader
vi.mock('../services/SubjectLoader', () => ({
  SubjectLoader: {
    getSubjectByCode: vi.fn((code: string) => ({
      subjectName: `Subject ${code}`
    }))
  }
}));

describe('ImprovedPDFService - Structured PDF Generation', () => {
  let mockStudyPlan: any;
  let mockStudentIntake: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockStudyPlan = {
      study_plan_id: 'test-plan-improved',
      plan_title: 'Comprehensive UPSC Study Plan 2025',
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
              block_title: 'NCERT Foundation - Mathematics',
              subjects: ['MAT', 'STA'],
              duration_weeks: 6,
              block_start_date: '2024-01-01',
              block_end_date: '2024-02-12',
              block_resources: {
                primary_books: [{
                  resource_title: 'NCERT Mathematics Class XII',
                  resource_priority: 'High',
                  resource_cost: { type: 'Free' }
                }],
                supplementary_materials: [],
                video_content: [],
                practice_resources: [],
                current_affairs_sources: [],
                revision_materials: [],
                expert_recommendations: []
              }
            },
            {
              block_id: 'block-2',
              block_title: 'NCERT Foundation - Social Sciences',
              subjects: ['HIS', 'GEO', 'POL'],
              duration_weeks: 6,
              block_start_date: '2024-02-13',
              block_end_date: '2024-03-24',
              block_resources: {
                primary_books: [
                  {
                    resource_title: 'NCERT History Class XI',
                    resource_priority: 'High',
                    resource_cost: { type: 'Free' }
                  },
                  {
                    resource_title: 'NCERT Geography Class XI',
                    resource_priority: 'High', 
                    resource_cost: { type: 'Free' }
                  }
                ],
                supplementary_materials: [],
                video_content: [],
                practice_resources: [],
                current_affairs_sources: [],
                revision_materials: [],
                expert_recommendations: []
              }
            }
          ]
        },
        {
          cycleId: 'cycle-2',
          cycleName: 'Prelims Revision Cycle',
          cycleType: 'C4',
          cycleDuration: 8,
          cycleStartDate: '2024-03-25',
          cycleEndDate: '2024-05-19',
          cycleBlocks: [
            {
              block_id: 'block-3',
              block_title: 'Prelims Mock Tests & Revision',
              subjects: ['GS1', 'GS2', 'CSAT'],
              duration_weeks: 8,
              block_start_date: '2024-03-25',
              block_end_date: '2024-05-19',
              block_resources: {
                primary_books: [],
                supplementary_materials: [],
                video_content: [],
                practice_resources: [{
                  resource_title: 'UPSC Prelims Mock Test Series',
                  resource_priority: 'High',
                  resource_cost: { type: 'Paid', amount: 2000 }
                }],
                current_affairs_sources: [],
                revision_materials: [],
                expert_recommendations: []
              }
            }
          ]
        }
      ]
    };

    mockStudentIntake = {
      start_date: '2024-01-01',
      target_year: '2025',
      personal_details: {
        full_name: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        phone_number: '+91-9876543210',
        present_location: 'Delhi',
        student_archetype: 'Focused Achiever',
        graduation_stream: 'Commerce',
        college_university: 'Delhi University',
        year_of_passing: 2023
      },
      preparation_background: {
        preparing_since: '2023',
        number_of_attempts: '1st Attempt',
        highest_stage_per_attempt: 'Prelims',
        last_attempt_gs_prelims_score: 85,
        last_attempt_csat_score: 78
      },
      coaching_details: {
        prior_coaching: 'Yes',
        coaching_institute_name: 'Vajiram & Ravi',
        prior_mentorship: 'No',
        place_of_preparation: 'Delhi'
      },
      study_strategy: {
        weekly_study_hours: '50-60 hours',
        study_approach: 'Structured & Disciplined',
        time_distribution: '70% Study, 20% Practice, 10% Current Affairs',
        revision_strategy: 'Weekly & Monthly Cycles',
        test_frequency: 'Twice a week',
        catch_up_day_preference: 'Sunday'
      }
    };
  });

  describe('Basic PDF Generation', () => {
    it('should generate PDF without errors', async () => {
      await expect(
        ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake, 'test-improved.pdf')
      ).resolves.not.toThrow();
    });

    it('should call jsPDF methods for document structure', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      // Verify basic PDF setup calls
      expect(mockPDF.setFontSize).toHaveBeenCalled();
      expect(mockPDF.setTextColor).toHaveBeenCalled();
      expect(mockPDF.setFont).toHaveBeenCalled();
      expect(mockPDF.text).toHaveBeenCalled();
      expect(mockPDF.save).toHaveBeenCalled();
    });

    it('should include study plan title in the PDF', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      // Check that the title was added to the PDF
      expect(mockPDF.text).toHaveBeenCalledWith(
        expect.stringContaining('Comprehensive UPSC Study Plan 2025'),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should include student name and details', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      // Check for subtitle with student info
      expect(mockPDF.text).toHaveBeenCalledWith(
        expect.stringContaining('01/01/2024'),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
      expect(mockPDF.text).toHaveBeenCalledWith(
        expect.stringContaining('2025'),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('Student Profile Table', () => {
    it('should generate student profile table', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      // Check that autoTable was called for student profile
      expect(mockPDF.autoTable).toHaveBeenCalledWith(
        expect.objectContaining({
          head: [],
          body: expect.any(Array),
          theme: 'plain'
        })
      );
    });

    it('should include student personal details in profile table', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      // Verify autoTable was called with student data
      const autoTableCall = mockPDF.autoTable.mock.calls.find(call => 
        call[0].theme === 'plain' // Student profile table uses plain theme
      );
      
      expect(autoTableCall).toBeDefined();
      expect(autoTableCall[0].body).toBeDefined();
      
      // Check that the body contains student information
      const tableBody = autoTableCall[0].body;
      const flattenedData = tableBody.flat();
      
      expect(flattenedData).toContain('Priya Sharma');
      expect(flattenedData).toContain('priya.sharma@example.com');
      expect(flattenedData).toContain('Delhi');
    });
  });

  describe('Study Blocks Section', () => {
    it('should create tables for each cycle', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      // Should call autoTable for cycle tables (in addition to profile table and resource tables)
      const cycleTableCalls = mockPDF.autoTable.mock.calls.filter(call => 
        call[0].theme === 'striped' // Cycle tables use striped theme
      );
      
      expect(cycleTableCalls.length).toBeGreaterThanOrEqual(2); // At least two cycles in mock data
    });

    it('should include cycle names as headings', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      expect(mockPDF.text).toHaveBeenCalledWith(
        'Foundation Building Phase',
        expect.any(Number),
        expect.any(Number)
      );
      
      expect(mockPDF.text).toHaveBeenCalledWith(
        'Prelims Revision Cycle',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should include block information in cycle tables', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      const cycleTableCalls = mockPDF.autoTable.mock.calls.filter(call => 
        call[0].theme === 'striped'
      );
      
      expect(cycleTableCalls.length).toBeGreaterThan(0);
      
      // Check first cycle table
      const firstCycleTable = cycleTableCalls[0];
      expect(firstCycleTable[0].head).toEqual([['Block', 'Time Frame', 'Resources']]);
      
      const tableBody = firstCycleTable[0].body;
      expect(tableBody).toBeDefined();
      expect(tableBody.length).toBe(2); // Two blocks in first cycle
      
      // Check block titles are included
      const blockTitles = tableBody.map((row: string[]) => row[0]);
      expect(blockTitles).toContain('NCERT Foundation - Mathematics');
      expect(blockTitles).toContain('NCERT Foundation - Social Sciences');
    });
  });

  describe('Resources Section', () => {
    it('should include resources section with subject summary', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      expect(mockPDF.text).toHaveBeenCalledWith(
        'Resources',
        expect.any(Number),
        expect.any(Number)
      );
      
      // Should mention subjects covered
      expect(mockPDF.text).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('MAT, STA, HIS, GEO, POL, GS1, GS2, CSAT')]),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should create sample resource tables for some subjects', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      // Should include subject names
      expect(mockPDF.text).toHaveBeenCalledWith(
        'Subject MAT',
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('Footer Generation', () => {
    it('should add footer to all pages', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      // Check that footer text was added
      expect(mockPDF.text).toHaveBeenCalledWith(
        expect.stringContaining('Generated by Study Planner'),
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ align: 'center' })
      );
      
      expect(mockPDF.text).toHaveBeenCalledWith(
        expect.stringContaining('Page 1 of 1'),
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ align: 'center' })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing cycle data gracefully', async () => {
      const planWithoutCycles = { ...mockStudyPlan, cycles: [] };
      
      await expect(
        ImprovedPDFService.generateStudyPlanPDF(planWithoutCycles, mockStudentIntake)
      ).resolves.not.toThrow();
    });

    it('should handle missing student details gracefully', async () => {
      const studentWithoutDetails = { 
        ...mockStudentIntake, 
        personal_details: null,
        preparation_background: null,
        study_strategy: null
      };
      
      await expect(
        ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, studentWithoutDetails)
      ).resolves.not.toThrow();
    });

    it('should handle resource loading failures', async () => {
      // Mock ResourceService to throw error
      const { ResourceService } = await import('../services/ResourceService');
      vi.mocked(ResourceService.getResourcesForSubject).mockRejectedValueOnce(new Error('Resource load failed'));
      
      await expect(
        ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake)
      ).resolves.not.toThrow();
    });
  });

  describe('PDF Structure Validation', () => {
    it('should create proper document structure with sections', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      // Verify section headings are added
      expect(mockPDF.text).toHaveBeenCalledWith('Study Plan Overview', 20, expect.any(Number));
      expect(mockPDF.text).toHaveBeenCalledWith('Student Profile', 20, expect.any(Number));
      expect(mockPDF.text).toHaveBeenCalledWith('Study Blocks', 20, expect.any(Number));
      expect(mockPDF.text).toHaveBeenCalledWith('Resources', 20, expect.any(Number));
    });

    it('should use consistent formatting styles', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      // Check font settings were called consistently
      expect(mockPDF.setFont).toHaveBeenCalledWith('helvetica', 'bold');
      expect(mockPDF.setFont).toHaveBeenCalledWith('helvetica', 'normal');
      expect(mockPDF.setFont).toHaveBeenCalledWith('helvetica', 'italic');
    });

    it('should save PDF with correct filename', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake, 'custom-filename.pdf');
      
      expect(mockPDF.save).toHaveBeenCalledWith('custom-filename.pdf');
    });

    it('should use default filename when none provided', async () => {
      await ImprovedPDFService.generateStudyPlanPDF(mockStudyPlan, mockStudentIntake);
      
      expect(mockPDF.save).toHaveBeenCalledWith(`study-plan-${mockStudyPlan.study_plan_id}.pdf`);
    });
  });
});