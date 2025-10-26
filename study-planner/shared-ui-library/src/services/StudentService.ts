import { StudentCreationData, StudentCreationResponse, ApiResponse } from '../auth/types';

export class StudentService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/studyplanner') {
    this.baseUrl = baseUrl;
  }

  // Common API call method
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem('shared_auth_token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Create student from onboarding data
  async createStudent(studentData: StudentCreationData): Promise<StudentCreationResponse> {
    const response = await this.makeRequest<any>('/onboarding/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
    // Support both wrapped { success, data } and direct payloads
    if (response && typeof response === 'object') {
      if ('success' in response) {
        if (response.success && response.data) return response.data as StudentCreationResponse;
        throw new Error('Failed to create student');
      }
      if ('student_id' in response) {
        return response as StudentCreationResponse;
      }
    }
    throw new Error('Failed to create student: unexpected response shape');
  }

  // Update student target year
  async updateStudentTarget(studentId: string, targetData: { target_year: number; start_date?: string }): Promise<void> {
    const response = await this.makeRequest<any>(`/onboarding/students/${studentId}/target`, {
      method: 'PATCH',
      body: JSON.stringify(targetData),
    });
    // Accept either { success: true } or { updated: true }
    if (response && typeof response === 'object') {
      if ('success' in response) {
        if (response.success) return;
        throw new Error('Failed to update student target');
      }
      if ('updated' in response) {
        if (response.updated) return;
        throw new Error('Failed to update student target');
      }
    }
    throw new Error('Failed to update student target: unexpected response');
  }

  // Update student commitment
  async updateStudentCommitment(studentId: string, commitmentData: any): Promise<void> {
    const response = await this.makeRequest<any>(`/onboarding/students/${studentId}/commitment`, {
      method: 'PATCH',
      body: JSON.stringify(commitmentData),
    });
    if (response && typeof response === 'object') {
      if ('success' in response && response.success) return;
      if ('updated' in response && response.updated) return;
    }
    throw new Error('Failed to update student commitment');
  }

  // Update student confidence levels
  async updateStudentConfidence(studentId: string, confidenceData: any): Promise<void> {
    const response = await this.makeRequest<any>(`/onboarding/students/${studentId}/confidence`, {
      method: 'PATCH',
      body: JSON.stringify(confidenceData),
    });
    if (response && typeof response === 'object') {
      if ('success' in response && response.success) return;
      if ('updated' in response && response.updated) return;
    }
    throw new Error('Failed to update student confidence');
  }

  // Get student preview/plan
  async getStudentPreview(studentId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/onboarding/students/${studentId}/preview`, {
      method: 'GET',
    });
    // Preview endpoint may return direct payload
    if (response && typeof response === 'object') {
      if ('success' in response && response.success && response.data) return response.data;
      if ('preview' in response) return response;
    }
    throw new Error('Failed to get student preview');
  }

  // Submit final application
  async submitStudentApplication(studentId: string): Promise<any> {
    const response = await this.makeRequest<any>(`/onboarding/students/${studentId}/submit`, {
      method: 'POST',
    });
    if (response && typeof response === 'object') {
      if ('success' in response && response.success && response.data) return response.data;
      if ('submitted' in response) return response;
    }
    throw new Error('Failed to submit student application');
  }

  // Faculty endpoints for student management
  async getStudents(page: number = 1, search?: string): Promise<any> {
    const params = new URLSearchParams({ page: page.toString() });
    if (search) params.append('search', search);
    
    const response = await this.makeRequest(`/faculty/students?${params}`, {
      method: 'GET',
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to get students');
  }

  async getStudentDetails(studentId: string): Promise<any> {
    const response = await this.makeRequest(`/faculty/students/${studentId}`, {
      method: 'GET',
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to get student details');
  }

  async getStudentPlans(studentId: string): Promise<any> {
    const response = await this.makeRequest(`/faculty/students/${studentId}/plans`, {
      method: 'GET',
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to get student plans');
  }
}

// Export singleton instance
export const studentService = new StudentService();
export default studentService;