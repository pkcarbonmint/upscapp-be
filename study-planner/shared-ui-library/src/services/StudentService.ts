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
  ): Promise<T> {
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
    const response = await this.makeRequest<StudentCreationResponse>('/onboarding/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
    
    // The backend returns the data directly, not wrapped in ApiResponse
    if (response && typeof response === 'object' && 'student_id' in response) {
      return response as StudentCreationResponse;
    }
    
    throw new Error('Failed to create student');
  }

  // Update student target year
  async updateStudentTarget(studentId: string, targetData: { target_year: number; start_date?: string }): Promise<void> {
    const response = await this.makeRequest(`/onboarding/students/${studentId}/target`, {
      method: 'PATCH',
      body: JSON.stringify(targetData),
    });
    
    // The backend returns the data directly
    if (!response || typeof response !== 'object' || !('updated' in response)) {
      throw new Error('Failed to update student target');
    }
  }

  // Update student commitment
  async updateStudentCommitment(studentId: string, commitmentData: any): Promise<void> {
    const response = await this.makeRequest(`/onboarding/students/${studentId}/commitment`, {
      method: 'PATCH',
      body: JSON.stringify(commitmentData),
    });
    
    // The backend returns the data directly
    if (!response || typeof response !== 'object' || !('updated' in response)) {
      throw new Error('Failed to update student commitment');
    }
  }

  // Update student confidence levels
  async updateStudentConfidence(studentId: string, confidenceData: any): Promise<void> {
    const response = await this.makeRequest(`/onboarding/students/${studentId}/confidence`, {
      method: 'PATCH',
      body: JSON.stringify(confidenceData),
    });
    
    // The backend returns the data directly
    if (!response || typeof response !== 'object' || !('updated' in response)) {
      throw new Error('Failed to update student confidence');
    }
  }

  // Get student preview/plan
  async getStudentPreview(studentId: string): Promise<any> {
    const response = await this.makeRequest(`/onboarding/students/${studentId}/preview`, {
      method: 'GET',
    });
    
    // The backend returns the data directly
    if (response && typeof response === 'object' && 'preview' in response) {
      return response;
    }
    
    throw new Error('Failed to get student preview');
  }

  // Submit final application
  async submitStudentApplication(studentId: string): Promise<any> {
    const response = await this.makeRequest(`/onboarding/students/${studentId}/submit`, {
      method: 'POST',
    });
    
    // The backend returns the data directly
    if (response && typeof response === 'object' && 'submitted' in response) {
      return response;
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
    
    // The backend returns the data directly
    return response;
  }

  async getStudentDetails(studentId: string): Promise<any> {
    const response = await this.makeRequest(`/faculty/students/${studentId}`, {
      method: 'GET',
    });
    
    // The backend returns the data directly
    return response;
  }

  async getStudentPlans(studentId: string): Promise<any> {
    const response = await this.makeRequest(`/faculty/students/${studentId}/plans`, {
      method: 'GET',
    });
    
    // The backend returns the data directly
    return response;
  }
}

// Export singleton instance
export const studentService = new StudentService();
export default studentService;