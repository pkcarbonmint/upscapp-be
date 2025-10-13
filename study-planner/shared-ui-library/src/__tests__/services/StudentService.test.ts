import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StudentService } from '../../services/StudentService';
import { mockFetch, mockLocalStorage, createMockStudent } from '../mocks/testUtils';
import type { StudentCreationData, StudentCreationResponse } from '../../auth/types';

describe('StudentService', () => {
  let studentService: StudentService;
  const mockFetchFn = vi.fn();

  beforeEach(() => {
    // Reset mocks
    mockFetch.reset();
    mockLocalStorage.clear();
    
    // Setup global mocks
    global.fetch = mockFetchFn;
    global.localStorage = mockLocalStorage as any;
    
    // Initialize service
    studentService = new StudentService('/api/studyplanner');
    
    vi.clearAllMocks();
  });

  describe('Student Creation', () => {
    it('should create student successfully', async () => {
      const studentData: StudentCreationData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+911234567890',
        city: 'Delhi',
        state: 'Delhi',
        graduation_stream: 'Computer Science',
        college: 'Test University',
        graduation_year: 2023,
        about: 'Aspiring civil servant',
        target_year: 2026
      };

      const expectedResponse: StudentCreationResponse = {
        student_id: 'STU_001',
        created: true,
        message: 'Student created successfully'
      };

      // Mock successful API response
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: expectedResponse
        })
      });

      const result = await studentService.createStudent(studentData);

      expect(result).toEqual(expectedResponse);
      
      // Verify API call
      expect(mockFetchFn).toHaveBeenCalledWith(
        '/api/studyplanner/onboarding/students',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(studentData)
        })
      );
    });

    it('should handle student creation failure', async () => {
      const studentData: StudentCreationData = {
        name: '',
        email: 'invalid-email',
        phone: '123',
        city: '',
        state: '',
        graduation_stream: '',
        college: '',
        graduation_year: 2023,
        about: ''
      };

      // Mock failed API response
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          message: 'Validation error'
        })
      });

      await expect(studentService.createStudent(studentData)).rejects.toThrow('HTTP error! status: 400');
    });
  });

  describe('Student Updates', () => {
    const studentId = 'STU_001';

    beforeEach(() => {
      // Set auth token for authenticated requests
      mockLocalStorage.setItem('shared_auth_token', 'valid_token');
    });

    it('should update student target year', async () => {
      const targetData = { target_year: 2026, start_date: '2024-06-01' };

      // Mock successful update
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { student_id: studentId, updated: true }
        })
      });

      await studentService.updateStudentTarget(studentId, targetData);

      // Verify API call
      expect(mockFetchFn).toHaveBeenCalledWith(
        `/api/studyplanner/onboarding/students/${studentId}/target`,
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid_token'
          }),
          body: JSON.stringify(targetData)
        })
      );
    });

    it('should update student commitment', async () => {
      const commitmentData = {
        weekly_hours: 42,
        constraints: 'Strong in History, weak in Economy'
      };

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { student_id: studentId, updated: true }
        })
      });

      await studentService.updateStudentCommitment(studentId, commitmentData);

      expect(mockFetchFn).toHaveBeenCalledWith(
        `/api/studyplanner/onboarding/students/${studentId}/commitment`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(commitmentData)
        })
      );
    });

    it('should update student confidence levels', async () => {
      const confidenceData = {
        'H01': 'Strong',
        'P01': 'Weak',
        'G01': 'Moderate'
      };

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { student_id: studentId, updated: true }
        })
      });

      await studentService.updateStudentConfidence(studentId, confidenceData);

      expect(mockFetchFn).toHaveBeenCalledWith(
        `/api/studyplanner/onboarding/students/${studentId}/confidence`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(confidenceData)
        })
      );
    });
  });

  describe('Student Data Retrieval', () => {
    beforeEach(() => {
      mockLocalStorage.setItem('shared_auth_token', 'valid_token');
    });

    it('should get student preview', async () => {
      const studentId = 'STU_001';
      const mockPreview = {
        raw_helios_data: { cycles: [] },
        milestones: { foundationToPrelimsDate: null, prelimsToMainsDate: null },
        studyPlanId: `onboarding-${studentId}`
      };

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPreview
        })
      });

      const result = await studentService.getStudentPreview(studentId);

      expect(result).toEqual(mockPreview);
      
      expect(mockFetchFn).toHaveBeenCalledWith(
        `/api/studyplanner/onboarding/students/${studentId}/preview`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid_token'
          })
        })
      );
    });

    it('should submit student application', async () => {
      const studentId = 'STU_001';
      const mockSubmission = {
        student_id: studentId,
        submitted: true,
        message: 'Application submitted successfully'
      };

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockSubmission
        })
      });

      const result = await studentService.submitStudentApplication(studentId);

      expect(result).toEqual(mockSubmission);
      
      expect(mockFetchFn).toHaveBeenCalledWith(
        `/api/studyplanner/onboarding/students/${studentId}/submit`,
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('Faculty Student Management', () => {
    beforeEach(() => {
      mockLocalStorage.setItem('shared_auth_token', 'faculty_token');
    });

    it('should get students list with pagination', async () => {
      const mockStudents = [
        createMockStudent({ student_id: 'STU_001', name: 'Student 1' }),
        createMockStudent({ student_id: 'STU_002', name: 'Student 2' })
      ];

      const mockResponse = {
        items: mockStudents,
        total: 2,
        page: 1,
        per_page: 10,
        pages: 1
      };

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockResponse
        })
      });

      const result = await studentService.getStudents(1, 'test');

      expect(result).toEqual(mockResponse);
      
      expect(mockFetchFn).toHaveBeenCalledWith(
        '/api/studyplanner/faculty/students?page=1&search=test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer faculty_token'
          })
        })
      );
    });

    it('should get student details', async () => {
      const studentId = 'STU_001';
      const mockStudent = createMockStudent({ student_id: studentId });

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStudent
        })
      });

      const result = await studentService.getStudentDetails(studentId);

      expect(result).toEqual(mockStudent);
      
      expect(mockFetchFn).toHaveBeenCalledWith(
        `/api/studyplanner/faculty/students/${studentId}`,
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should get student plans', async () => {
      const studentId = 'STU_001';
      const mockPlans = [
        {
          id: 1,
          student_id: studentId,
          plan_title: 'UPSC 2026 Study Plan',
          approval_status: 'approved',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPlans
        })
      });

      const result = await studentService.getStudentPlans(studentId);

      expect(result).toEqual(mockPlans);
      
      expect(mockFetchFn).toHaveBeenCalledWith(
        `/api/studyplanner/faculty/students/${studentId}/plans`,
        expect.objectContaining({
          method: 'GET'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetchFn.mockRejectedValueOnce(new Error('Network error'));

      const studentData: StudentCreationData = {
        name: 'Test Student',
        email: 'test@example.com',
        phone: '+911234567890',
        city: 'Test City',
        state: 'Test State',
        graduation_stream: 'Engineering',
        college: 'Test College',
        graduation_year: 2023,
        about: 'Test about'
      };

      await expect(studentService.createStudent(studentData)).rejects.toThrow('Network error');
    });

    it('should handle API errors with proper messages', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          message: 'Internal server error'
        })
      });

      await expect(studentService.getStudents()).rejects.toThrow('HTTP error! status: 500');
    });
  });
});