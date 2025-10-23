// API service for onboarding wizard
import type { IntakeWizardFormData } from '../types';
import { getPreviewData } from './heliosService';

const API_BASE_URL = '/api/studyplanner/onboarding';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateStudentResponse {
  student_id: string;
  created: boolean;
}

export interface UpdateAck {
  student_id: string;
  updated: boolean;
}

export interface FinalSubmissionResponse {
  studyPlanId: string;
  studentId: string;
  message: string;
  downloadUrls?: {
    docx: string;
    pdf: string;
  };
}

async function makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'POST',
    data?: any
): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

class ApiService {
  

  // Submit background information - creates student record
  async submitBackground(data: IntakeWizardFormData['background']): Promise<ApiResponse<CreateStudentResponse>> {
    // Transform frontend field names to match Python schema
    const transformedData = {
      name: data.fullName,
      phone: data.phoneNumber,
      email: data.email,
      city: data.presentLocation.split(',')[0]?.trim() || data.presentLocation,
      state: data.presentLocation.split(',')[1]?.trim() || '',
      graduation_stream: data.graduationStream,
      college: data.collegeUniversity,
      graduation_year: data.yearOfPassing,
      about: data.about
    };
    
    return makeRequest<CreateStudentResponse>('/students', 'POST', transformedData);
  }

  // Update target year selection
  async updateTarget(studentId: string, data: IntakeWizardFormData['targetYear']): Promise<ApiResponse<UpdateAck>> {
    // Transform frontend field names to match Python schema
    const transformedData = {
      target_year: parseInt(data.targetYear),
      start_date: data.startDate || null,
      attempt_number: null,
      optional_subjects: null,
      study_approach: null
    };
    
    return makeRequest<UpdateAck>(`/students/${studentId}/target`, 'PATCH', transformedData);
  }

  // Update commitment preferences
  async updateCommitment(studentId: string, data: IntakeWizardFormData['commitment']): Promise<ApiResponse<UpdateAck>> {
    // Transform frontend field names to match Python schema
    // Collect performance data for constraints
    const performanceEntries = Object.entries(data.performance)
      .filter(([_, value]) => value !== "")
      .map(([subject, level]) => `${subject}: ${level}`);
    
    const performanceText = performanceEntries.length > 0 
      ? `Performance - ${performanceEntries.join(', ')}` 
      : '';
    
    const constraintsText = [
      `Study Preference: ${data.studyPreference}`,
      `Subject Approach: ${data.subjectApproach}`,
      performanceText
    ].filter(text => text !== '').join('; ');
    
    const transformedData = {
      weekly_hours: data.timeCommitment ? data.timeCommitment * 7 : 0, // Convert daily to weekly
      available_days: null,
      constraints: constraintsText,
      // Include UPSC fields (camelCase) for Python mapper
      upscOptionalSubject: data.upscOptionalSubject || '',
      optionalFirst: Boolean(data.optionalFirst),
      weeklyTestDayPreference: data.weeklyTestDayPreference || 'Sunday'
    };
    
    return makeRequest<UpdateAck>(`/students/${studentId}/commitment`, 'PATCH', transformedData);
  }

  // Update confidence level assessment
  async updateConfidence(studentId: string, data: IntakeWizardFormData['confidenceLevel']): Promise<ApiResponse<UpdateAck>> {
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
    
    // Create topic-level confidence mapping
    const topicConfidence: Record<string, number> = {};
    Object.entries(data).forEach(([subjectCode, level]) => {
      if (level && typeof level === 'string') {
        topicConfidence[subjectCode] = levelToNum(level);
      }
    });
    
    // Calculate average confidence from all subjects
    const subjectValues = Object.values(data).filter(val => val && typeof val === 'string');
    const avgConfidence = subjectValues.length > 0 
      ? Math.round(subjectValues.reduce((sum, level) => sum + levelToNum(level as string), 0) / subjectValues.length)
      : 60;
    
    // Collect areas of concern (subjects with low confidence)
    const areasOfConcern: string[] = [];
    Object.entries(data).forEach(([subjectCode, level]) => {
      if (level === 'NotStarted' || level === 'VeryWeak' || level === 'Weak') {
        areasOfConcern.push(subjectCode);
      }
    });
    
    const transformedData = {
      confidence: avgConfidence,
      areas_of_concern: areasOfConcern.length > 0 ? areasOfConcern : null,
      topic_confidence: topicConfidence
    };
    
    return makeRequest<UpdateAck>(`/students/${studentId}/confidence`, 'PATCH', transformedData);
  }

  // Update preview data
  async updatePreview(studentId: string, data: any): Promise<ApiResponse<UpdateAck>> {
    return makeRequest<UpdateAck>(`/students/${studentId}/preview`, 'PATCH', data);
  }

  // Get study plan preview using helios-ts library
  async getPreview(formData: IntakeWizardFormData): Promise<ApiResponse<any>> {
    try {
      const previewData = await getPreviewData(formData);
      return { success: true, data: previewData };
    } catch (error) {
      console.error('Error generating preview with helios-ts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview'
      };
    }
  }

  // Submit payment information
  async submitPayment(studentId: string, _data: IntakeWizardFormData['payment']): Promise<ApiResponse<any>> {
    // Transform to match Python schema - using dummy data since payment is mocked
    const transformedData = {
      name_on_card: "John Test",
      card_last4: "4242", 
      expiry: "12/29",
      cvv_dummy: "***"
    };
    
    return makeRequest<any>(`/students/${studentId}/payment`, 'POST', transformedData);
  }

  // Final submission - generate complete study plan
  async submitFinal(studentId: string): Promise<ApiResponse<any>> {
    return makeRequest<any>(`/students/${studentId}/submit`, 'POST');
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return makeRequest<{ status: string }>('/api/health', 'GET');
  }
}

export const apiService = new ApiService();
