import { User, AuthState, LoginCredentials, OTPRequest, OTPVerification, LoginResponse, OTPResponse, ApiResponse } from './types';

export class SharedAuthService {
  private baseUrl: string;
  private storageKey = 'shared_auth_token';

  constructor(baseUrl: string = '/api/studyplanner') {
    this.baseUrl = baseUrl;
  }

  // Common API call method
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getStoredToken();
    
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

  // Token management
  getStoredToken(): string | null {
    return localStorage.getItem(this.storageKey);
  }

  setStoredToken(token: string): void {
    localStorage.setItem(this.storageKey, token);
  }

  clearStoredToken(): void {
    localStorage.removeItem(this.storageKey);
  }

  // Faculty authentication (email/password)
  async loginWithCredentials(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.makeRequest<LoginResponse>('/faculty/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.success && response.data) {
      this.setStoredToken(response.data.token);
      return response.data;
    }
    
    throw new Error('Login failed');
  }

  // OTP-based authentication (for both onboarding and faculty)
  async sendOTP(phoneNumber: string, userType: 'onboarding' | 'faculty' = 'onboarding'): Promise<OTPResponse> {
    const endpoint = userType === 'faculty' ? '/faculty/auth/send-otp' : '/onboarding/auth/send-otp';
    
    const response = await this.makeRequest<OTPResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to send OTP');
  }

  async verifyOTP(verificationId: string, otpCode: string, userType: 'onboarding' | 'faculty' = 'onboarding'): Promise<LoginResponse> {
    const endpoint = userType === 'faculty' ? '/faculty/auth/verify-otp' : '/onboarding/auth/verify-otp';
    
    const response = await this.makeRequest<LoginResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ 
        verification_id: verificationId, 
        otp_code: otpCode 
      }),
    });
    
    if (response.success && response.data) {
      this.setStoredToken(response.data.token);
      return response.data;
    }
    
    throw new Error('OTP verification failed');
  }

  // Get user profile
  async getProfile(userType: 'onboarding' | 'faculty' = 'faculty'): Promise<User> {
    const endpoint = userType === 'faculty' ? '/faculty/auth/profile' : '/onboarding/auth/profile';
    
    const response = await this.makeRequest<User>(endpoint, {
      method: 'GET',
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to get profile');
  }

  // Logout
  async logout(userType: 'onboarding' | 'faculty' = 'faculty'): Promise<void> {
    const endpoint = userType === 'faculty' ? '/faculty/auth/logout' : '/onboarding/auth/logout';
    
    try {
      await this.makeRequest(endpoint, {
        method: 'POST',
      });
    } catch (error) {
      // Ignore logout errors
      console.warn('Logout error:', error);
    } finally {
      this.clearStoredToken();
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  // Initialize auth state from stored token
  async initializeAuth(): Promise<AuthState> {
    const token = this.getStoredToken();
    
    if (!token) {
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    }

    try {
      // Try to get profile to validate token
      const user = await this.getProfile('faculty');
      return {
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      };
    } catch (error) {
      // Token is invalid, clear it
      this.clearStoredToken();
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    }
  }

  // Cross-app navigation helpers
  getOnboardingUrl(): string {
    return window.location.origin + '/onboarding';
  }

  getFacultyUrl(): string {
    return window.location.origin + '/faculty';
  }

  navigateToOnboarding(): void {
    window.location.href = this.getOnboardingUrl();
  }

  navigateToFaculty(): void {
    window.location.href = this.getFacultyUrl();
  }

  // App detection
  getCurrentApp(): 'onboarding' | 'faculty' | 'unknown' {
    const path = window.location.pathname;
    if (path.startsWith('/onboarding') || path === '/') {
      return 'onboarding';
    }
    if (path.startsWith('/faculty')) {
      return 'faculty';
    }
    return 'unknown';
  }
}

// Export singleton instance
export const sharedAuthService = new SharedAuthService();
export default sharedAuthService;