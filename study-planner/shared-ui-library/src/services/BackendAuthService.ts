// Backend Authentication Service following integration.md specifications
import { User, LoginResponse, ApiResponse } from '../auth/types';

export interface UserExistsRequest {
  user_name: string; // phone number
}

export interface UserExistsResponse {
  exists: boolean;
  active: boolean;
  tenantId: number;
  admin: boolean;
  domain: string;
}

export interface RegisterRequest {
  phoneNumber: string;
}

export interface TokenRequest {
  provider: string; // "PHONE_NUMBER"
}

export interface OnboardingData {
  email: string;
  fullName: string;
  gender: "Male" | "Female" | "Other";
  password: string;
  aboutMe: string;
  userType: "STUDENT";
  photo?: string;
  referredById?: number;
  referredByPhone?: string;
}

export interface PasswordLoginRequest {
  phoneNumber: string;
  password: string;
}

export class BackendAuthService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = '/api/v2') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // Common API call method
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        ...this.defaultHeaders,
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

  // Step 6: Check if user exists in the database
  async checkUserExists(phoneNumber: string): Promise<UserExistsResponse> {
    const response = await this.makeRequest<UserExistsResponse>('/exists/new', {
      method: 'POST',
      body: JSON.stringify({ user_name: phoneNumber }),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to check if user exists');
  }

  // Step 7: Register user (if user does not exist)
  async registerUser(phoneNumber: string, idToken: string): Promise<LoginResponse> {
    const response = await this.makeRequest<LoginResponse>('/register', {
      method: 'POST',
      headers: {
        'idToken': idToken,
        'tenant': '1', // Fixed tenant as per integration.md
      },
      body: JSON.stringify({ phoneNumber }),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to register user');
  }

  // Step 8: Get JWT token from server (if user exists)
  async getAuthToken(idToken: string): Promise<LoginResponse> {
    const response = await this.makeRequest<LoginResponse>('/auth/token?provider=PHONE_NUMBER', {
      method: 'POST',
      headers: {
        'idToken': idToken,
      },
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to get auth token');
  }

  // Step 9: Fetch user details
  async getUserDetails(userId: string, accessToken: string): Promise<User> {
    const response = await this.makeRequest<User>(`/user/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to get user details');
  }

  // Step 10: Onboard user (if not onboarded)
  async onboardUser(onboardingData: OnboardingData, accessToken: string): Promise<User> {
    const response = await this.makeRequest<User>('/users/onboard', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(onboardingData),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to onboard user');
  }

  // Password-based authentication (Step 3 from password auth section)
  async loginWithPassword(phoneNumber: string, password: string): Promise<LoginResponse> {
    const response = await this.makeRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, password }),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to login with password');
  }

  // Complete Firebase phone auth flow
  async completePhoneAuth(phoneNumber: string, idToken: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
    needsOnboarding: boolean;
  }> {
    try {
      // Step 6: Check if user exists
      const userExists = await this.checkUserExists(phoneNumber);
      
      let authResult: LoginResponse;
      let isNewUser = false;

      if (!userExists.exists) {
        // Step 7: Register new user
        authResult = await this.registerUser(phoneNumber, idToken);
        isNewUser = true;
      } else {
        // Step 8: Get token for existing user
        authResult = await this.getAuthToken(idToken);
      }

      // Step 9: Get user details (we'll need to extract user ID from token or response)
      // For now, we'll assume the response includes user data
      const user = authResult.user;
      
      // Determine if user needs onboarding
      const needsOnboarding = isNewUser || !user.full_name || !user.email;

      return {
        user,
        accessToken: authResult.token,
        refreshToken: authResult.refresh_token || '',
        isNewUser,
        needsOnboarding,
      };
    } catch (error) {
      console.error('Phone auth flow error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const backendAuthService = new BackendAuthService();
export default backendAuthService;