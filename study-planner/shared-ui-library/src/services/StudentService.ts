import { StudentCreationData, StudentCreationResponse, ApiResponse } from '../auth/types';

export class StudentService {
  private baseUrl: string;
  private pendingCommitmentData: { studentId: string; commitmentData: any } | null = null;
  private pendingConfidenceData: { studentId: string; confidenceData: any } | null = null;

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
    const response: unknown = await this.makeRequest<any>('/onboarding/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
    console.log('** Create Student Response from server:', response);
    const { student_id, created }: {student_id: string, created: boolean} = response as any;
    if (student_id && created !== undefined) {
      return { student_id, created };
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
        if ((response as any).updated) return;
        throw new Error('Failed to update student target');
      }
    }
    throw new Error('Failed to update student target: unexpected response');
  }

  // Update student commitment - store locally, will be sent on final submission
  async updateStudentCommitment(studentId: string, commitmentData: any): Promise<void> {
    // Store commitment data locally to be sent later
    this.pendingCommitmentData = { studentId, commitmentData };
    // Return success immediately without making API call
    return Promise.resolve();
  }

  // Update student confidence levels - store locally, will be sent on final submission
  async updateStudentConfidence(studentId: string, confidenceData: any): Promise<void> {
    // Store confidence data locally to be sent later
    this.pendingConfidenceData = { studentId, confidenceData };
    // Return success immediately without making API call
    return Promise.resolve();
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
    // First, send any pending commitment data
    if (this.pendingCommitmentData && this.pendingCommitmentData.studentId === studentId) {
      await this.sendCommitmentData(studentId, this.pendingCommitmentData.commitmentData);
      // Clear the pending data after sending
      this.pendingCommitmentData = null;
    }
    
    // Also send any pending confidence data
    if (this.pendingConfidenceData && this.pendingConfidenceData.studentId === studentId) {
      await this.sendConfidenceData(studentId, this.pendingConfidenceData.confidenceData);
      // Clear the pending data after sending
      this.pendingConfidenceData = null;
    }
    
    const response = await this.makeRequest<any>(`/onboarding/students/${studentId}/submit`, {
      method: 'POST',
    });
    if (response && typeof response === 'object') {
      if ('success' in response && response.success && response.data) return response.data;
      if ('submitted' in response) return response;
    }
    throw new Error('Failed to submit student application');
  }

  // Send commitment data to the server
  private async sendCommitmentData(studentId: string, commitmentData: any): Promise<void> {
    // Transform frontend field names to match Python schema
    // Collect performance data for constraints
    const performanceEntries = Object.entries(commitmentData.performance || {})
      .filter(([_, value]) => value !== "")
      .map(([subject, level]) => `${subject}: ${level}`);
    
    const performanceText = performanceEntries.length > 0 
      ? `Performance - ${performanceEntries.join(', ')}` 
      : '';
    
    const constraintsText = [
      `Study Preference: ${commitmentData.studyPreference || ''}`,
      `Subject Approach: ${commitmentData.subjectApproach || ''}`,
      performanceText
    ].filter(text => text !== '').join('; ');
    
    const transformedData = {
      weekly_hours: commitmentData.timeCommitment ? commitmentData.timeCommitment * 7 : 0, // Convert daily to weekly
      available_days: null,
      constraints: constraintsText
    };
    
    const response = await this.makeRequest<any>(`/onboarding/students/${studentId}/commitment`, {
      method: 'PATCH',
      body: JSON.stringify(transformedData),
    });
    if (response && typeof response === 'object') {
      if ('success' in response && response.success) return;
      if ('updated' in response && response.updated) return;
    }
    throw new Error('Failed to update student commitment');
  }

  // Send confidence data to the server
  private async sendConfidenceData(studentId: string, confidenceData: any): Promise<void> {
    // Transform helios-ts confidence levels to numeric values for backend
    const levelToNum = (level: string): number => {
      switch (level) {
        case 'NotStarted': return 20;
        case 'VeryWeak': return 30;
        case 'Weak': return 40;
        case 'Moderate': return 60;
        case 'Strong': return 80;
        case 'VeryStrong': return 100;
        default: return 60;
      }
    };
    
    // Calculate average confidence from all subjects
    const subjectValues = Object.values(confidenceData).filter(val => val && typeof val === 'string') as string[];
    const avgConfidence = subjectValues.length > 0 
      ? Math.round(subjectValues.reduce((sum: number, level: string) => sum + levelToNum(level), 0) / subjectValues.length)
      : 60;
    
    // Collect areas of concern (subjects with low confidence)
    const areasOfConcern: string[] = [];
    Object.entries(confidenceData).forEach(([subjectCode, level]) => {
      if (level === 'NotStarted' || level === 'VeryWeak' || level === 'Weak') {
        areasOfConcern.push(subjectCode);
      }
    });
    
    const transformedData = {
      confidence: avgConfidence,
      areas_of_concern: areasOfConcern.length > 0 ? areasOfConcern : null
    };
    
    const response = await this.makeRequest<any>(`/onboarding/students/${studentId}/confidence`, {
      method: 'PATCH',
      body: JSON.stringify(transformedData),
    });
    if (response && typeof response === 'object') {
      if ('success' in response && response.success) return;
      if ('updated' in response && response.updated) return;
    }
    throw new Error('Failed to update student confidence');
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