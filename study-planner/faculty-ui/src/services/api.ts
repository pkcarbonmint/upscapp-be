import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  FacultyUser, 
  PlanReviewItem, 
  StudentInfo, 
  DashboardStats, 
  LoginForm, 
  PaginatedResponse,
  ApiResponse 
} from '../types';

class FacultyApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: '/api/studyplanner/faculty',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('faculty_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('faculty_token');
          window.location.href = '/faculty/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(credentials: LoginForm): Promise<{ user: FacultyUser; token: string }> {
    const response: AxiosResponse<ApiResponse<{ user: FacultyUser; token: string }>> = 
      await this.api.post('/auth/login', credentials);
    return response.data.data;
  }

  // OTP Authentication
  async sendOTP(phoneNumber: string): Promise<{ verificationId: string; testOTP?: string }> {
    // Add +91 prefix for Indian phone numbers if not already present
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    
    const response: AxiosResponse<ApiResponse<{ verification_id: string; test_otp?: string }>> = 
      await this.api.post('/auth/send-otp', { phone_number: formattedPhone });
    
    // Map snake_case to camelCase
    return {
      verificationId: response.data.data.verification_id,
      testOTP: response.data.data.test_otp
    };
  }

  async verifyOTP(verificationId: string, otpCode: string): Promise<{ user: FacultyUser; token: string }> {
    const response: AxiosResponse<ApiResponse<{ user: FacultyUser; token: string }>> = 
      await this.api.post('/auth/verify-otp', { 
        verification_id: verificationId, 
        otp_code: otpCode 
      });
    return response.data.data;
  }

  async getProfile(): Promise<FacultyUser> {
    const response: AxiosResponse<ApiResponse<FacultyUser>> = 
      await this.api.get('/auth/profile');
    return response.data.data;
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout');
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const response: AxiosResponse<ApiResponse<DashboardStats>> = 
      await this.api.get('/dashboard/stats');
    return response.data.data;
  }

  // Plan Review
  async getPlansForReview(page = 1, filters?: any): Promise<PaginatedResponse<PlanReviewItem>> {
    const response: AxiosResponse<ApiResponse<PaginatedResponse<PlanReviewItem>>> = 
      await this.api.get('/plans/review', { 
        params: { page, ...filters } 
      });
    return response.data.data;
  }

  async getPlanDetails(planId: number): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = 
      await this.api.get(`/plans/${planId}`);
    return response.data.data;
  }

  async approvePlan(planId: number, notes?: string): Promise<void> {
    await this.api.put(`/plans/${planId}/approve`, { notes });
  }

  async rejectPlan(planId: number, reason: string): Promise<void> {
    await this.api.put(`/plans/${planId}/reject`, { reason });
  }

  async submitPlanForReview(planId: number): Promise<void> {
    await this.api.post(`/plans/${planId}/submit-review`);
  }

  // Student Management
  async getStudents(page = 1, search?: string): Promise<PaginatedResponse<StudentInfo>> {
    const response: AxiosResponse<ApiResponse<PaginatedResponse<StudentInfo>>> = 
      await this.api.get('/students', { 
        params: { page, search } 
      });
    return response.data.data;
  }

  async getStudentDetails(studentId: string): Promise<StudentInfo> {
    const response: AxiosResponse<ApiResponse<StudentInfo>> = 
      await this.api.get(`/students/${studentId}`);
    return response.data.data;
  }

  async getStudentPlans(studentId: string): Promise<PlanReviewItem[]> {
    const response: AxiosResponse<ApiResponse<PlanReviewItem[]>> = 
      await this.api.get(`/students/${studentId}/plans`);
    return response.data.data;
  }

  // Plan Editor Integration
  async savePlanDraft(planId: number, planData: any): Promise<void> {
    await this.api.post(`/plans/${planId}/draft`, planData);
  }

  async loadPlanDraft(planId: number): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = 
      await this.api.get(`/plans/${planId}/draft`);
    return response.data.data;
  }

  async validatePlan(planData: any): Promise<any[]> {
    const response: AxiosResponse<ApiResponse<any[]>> = 
      await this.api.post('/plans/validate', planData);
    return response.data.data;
  }
}

export const facultyApi = new FacultyApiService();
export default facultyApi;
