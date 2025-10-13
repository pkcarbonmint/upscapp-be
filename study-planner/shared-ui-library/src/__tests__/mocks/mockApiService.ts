// Mock API service for testing
import { ApiResponse, LoginResponse, OTPResponse, User, StudentCreationResponse, PaymentLinkResponse, PaymentStatus } from '../../auth/types';

export class MockApiService {
  private mockUsers: User[] = [
    {
      id: 1,
      email: 'faculty@test.com',
      name: 'Test Faculty',
      full_name: 'Test Faculty User',
      phone_number: '+911234567890',
      user_type: 'faculty',
      is_active: true,
      phone_verified: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_faculty: true,
      roles: ['faculty', 'reviewer']
    },
    {
      id: 2,
      email: 'student@test.com',
      name: 'Test Student',
      full_name: 'Test Student User',
      phone_number: '+911234567891',
      user_type: 'student',
      is_active: true,
      phone_verified: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  private mockStudents = [
    {
      id: 1,
      student_id: 'STU_001',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+911234567890',
      created_at: '2024-01-01T00:00:00Z',
      last_login: '2024-01-15T00:00:00Z',
      plan_count: 2,
      referral_count: 1
    },
    {
      id: 2,
      student_id: 'STU_002',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+911234567891',
      created_at: '2024-01-02T00:00:00Z',
      plan_count: 1,
      referral_count: 0
    }
  ];

  private mockToken = 'mock_jwt_token_123';
  private isAuthenticatedFlag = false;

  // Simulate network delay
  private async delay(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Authentication mocks
  async loginWithCredentials(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    await this.delay();
    
    if (email === 'faculty@test.com' && password === 'password123') {
      const user = this.mockUsers.find(u => u.email === email)!;
      this.isAuthenticatedFlag = true;
      return {
        success: true,
        data: {
          user,
          token: this.mockToken
        }
      };
    }
    
    return {
      success: false,
      data: { user: {} as User, token: '' },
      message: 'Invalid credentials'
    };
  }

  async sendOTP(phoneNumber: string): Promise<ApiResponse<OTPResponse>> {
    await this.delay();
    
    if (phoneNumber.includes('1234567890') || phoneNumber.includes('1234567891')) {
      return {
        success: true,
        data: {
          success: true,
          verification_id: `mock_verification_${Date.now()}`,
          message: 'OTP sent successfully',
          test_otp: '123456'
        }
      };
    }
    
    return {
      success: false,
      data: {
        success: false,
        verification_id: '',
        message: 'Failed to send OTP'
      },
      message: 'Invalid phone number'
    };
  }

  async verifyOTP(_verificationId: string, otpCode: string): Promise<ApiResponse<LoginResponse>> {
    await this.delay();
    
    if (otpCode === '123456') {
      const user = this.mockUsers.find(u => u.phone_number.includes('1234567890'))!;
      this.isAuthenticatedFlag = true;
      return {
        success: true,
        data: {
          user,
          token: this.mockToken
        }
      };
    }
    
    return {
      success: false,
      data: { user: {} as User, token: '' },
      message: 'Invalid OTP'
    };
  }

  async getProfile(): Promise<ApiResponse<User>> {
    await this.delay();
    
    if (this.isAuthenticatedFlag) {
      return {
        success: true,
        data: this.mockUsers[0] // Return faculty user
      };
    }
    
    return {
      success: false,
      data: {} as User,
      message: 'Not authenticated'
    };
  }

  // Student service mocks
  async createStudent(studentData: any): Promise<ApiResponse<StudentCreationResponse>> {
    await this.delay();
    
    const newStudent = {
      id: this.mockStudents.length + 1,
      student_id: `STU_${String(this.mockStudents.length + 1).padStart(3, '0')}`,
      name: studentData.name,
      email: studentData.email,
      phone: studentData.phone,
      created_at: new Date().toISOString(),
      plan_count: 0,
      referral_count: 0
    };
    
    this.mockStudents.push(newStudent);
    
    return {
      success: true,
      data: {
        student_id: newStudent.student_id,
        created: true,
        message: 'Student created successfully'
      }
    };
  }

  async getStudents(page: number = 1, search?: string): Promise<ApiResponse<any>> {
    await this.delay();
    
    let filteredStudents = this.mockStudents;
    
    if (search) {
      filteredStudents = this.mockStudents.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.student_id.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    const per_page = 10;
    const total = filteredStudents.length;
    const pages = Math.ceil(total / per_page);
    const start = (page - 1) * per_page;
    const items = filteredStudents.slice(start, start + per_page);
    
    return {
      success: true,
      data: {
        items,
        total,
        page,
        per_page,
        pages
      }
    };
  }

  async getStudentDetails(studentId: string): Promise<ApiResponse<any>> {
    await this.delay();
    
    const student = this.mockStudents.find(s => s.student_id === studentId);
    
    if (student) {
      return {
        success: true,
        data: student
      };
    }
    
    return {
      success: false,
      data: null,
      message: 'Student not found'
    };
  }

  // Payment service mocks
  async createPaymentLink(studentId: string, _amount: number, _description: string): Promise<ApiResponse<PaymentLinkResponse>> {
    await this.delay();
    
    const paymentLinkId = `pl_${Date.now()}`;
    
    return {
      success: true,
      data: {
        payment_link_id: paymentLinkId,
        payment_url: `https://mock-razorpay.com/pay/${paymentLinkId}`,
        status: 'created',
        reference_id: `ref_${studentId}_${Date.now()}`
      }
    };
  }

  async checkPaymentStatus(paymentId: string): Promise<ApiResponse<PaymentStatus>> {
    await this.delay();
    
    return {
      success: true,
      data: {
        payment_id: paymentId,
        status: 'paid',
        amount: 2999,
        created_at: new Date().toISOString(),
        paid_at: new Date().toISOString()
      }
    };
  }

  // Utility methods for testing
  reset(): void {
    this.isAuthenticatedFlag = false;
    this.mockStudents.splice(2); // Keep only the first 2 mock students
  }

  setAuthenticated(authenticated: boolean): void {
    this.isAuthenticatedFlag = authenticated;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedFlag;
  }

  addMockStudent(student: any): void {
    this.mockStudents.push(student);
  }
}

export const mockApiService = new MockApiService();