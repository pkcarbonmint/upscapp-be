// Shared authentication types for onboarding-ui and faculty-ui integration

export interface User {
  id: number;
  email: string;
  name: string;
  full_name: string;
  phone_number: string;
  user_type: 'student' | 'faculty' | 'admin';
  is_active: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  // Faculty specific fields
  is_faculty?: boolean;
  roles?: string[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface OTPRequest {
  phone_number: string;
}

export interface OTPVerification {
  verification_id: string;
  otp_code: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface OTPResponse {
  success: boolean;
  verification_id: string;
  message: string;
  test_otp?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Student creation from onboarding
export interface StudentCreationData {
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  graduation_stream: string;
  college: string;
  graduation_year: number;
  about: string;
  target_year: number; // Made required - essential for plan generation
  confidence_data: Record<string, any>; // Made required - needed for subject-specific planning
  commitment_data: Record<string, any>; // Made required - needed for time allocation and scheduling
}

export interface StudentCreationResponse {
  student_id: string;
  created: boolean;
  message?: string;
}

// Payment integration types
export interface PaymentLinkRequest {
  student_id: string;
  amount: number;
  description: string;
  callback_url?: string;
  expire_by?: number;
}

export interface PaymentLinkResponse {
  payment_link_id: string;
  payment_url: string;
  status: string;
  reference_id: string;
}

export interface PaymentStatus {
  payment_id: string;
  status: 'created' | 'attempted' | 'paid' | 'cancelled' | 'expired';
  amount: number;
  created_at: string;
  paid_at?: string;
}

// Cross-app navigation
export interface AppConfig {
  onboardingUrl: string;
  facultyUrl: string;
  sharedApiUrl: string;
}