// Enhanced Authentication Service that combines Firebase and Backend APIs
import { firebasePhoneAuth, FirebasePhoneAuthService } from './firebase';
import { backendAuthService, BackendAuthService } from './BackendAuthService';
import { User, AuthState } from '../auth/types';

export interface PhoneAuthResult {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  isNewUser?: boolean;
  needsOnboarding?: boolean;
  error?: string;
}

export interface AuthFlowOptions {
  useFirebase?: boolean;
  recaptchaContainerId?: string;
}

export class EnhancedAuthService {
  private firebaseAuth: FirebasePhoneAuthService;
  private backendAuth: BackendAuthService;
  private storageKey = 'enhanced_auth_data';

  constructor() {
    this.firebaseAuth = firebasePhoneAuth;
    this.backendAuth = backendAuthService;
  }

  // Phone Authentication Flow (Firebase + Backend)
  async sendPhoneOTP(phoneNumber: string, options: AuthFlowOptions = {}): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    try {
      const { useFirebase = true, recaptchaContainerId } = options;

      if (useFirebase) {
        // Use Firebase phone auth
        const result = await this.firebaseAuth.sendOTP(phoneNumber, recaptchaContainerId);
        return result;
      } else {
        // Fallback to backend OTP (if implemented)
        // For now, we'll simulate a successful send for testing
        return {
          success: true,
          verificationId: `test_verification_${Date.now()}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send OTP'
      };
    }
  }

  async verifyPhoneOTP(otpCode: string, phoneNumber: string, options: AuthFlowOptions = {}): Promise<PhoneAuthResult> {
    try {
      const { useFirebase = true } = options;

      if (useFirebase) {
        // Step 1-5: Firebase verification
        const firebaseResult = await this.firebaseAuth.verifyOTP(otpCode);
        
        if (!firebaseResult.success || !firebaseResult.idToken) {
          return {
            success: false,
            error: firebaseResult.error || 'Firebase verification failed'
          };
        }

        // Step 6-10: Backend integration
        const backendResult = await this.backendAuth.completePhoneAuth(phoneNumber, firebaseResult.idToken);
        
        // Store auth data
        this.storeAuthData({
          user: backendResult.user,
          accessToken: backendResult.accessToken,
          refreshToken: backendResult.refreshToken,
          idToken: firebaseResult.idToken
        });

        return {
          success: true,
          user: backendResult.user,
          accessToken: backendResult.accessToken,
          refreshToken: backendResult.refreshToken,
          isNewUser: backendResult.isNewUser,
          needsOnboarding: backendResult.needsOnboarding
        };
      } else {
        // Fallback to test mode
        return {
          success: true,
          user: this.createTestUser(phoneNumber),
          accessToken: `test_token_${Date.now()}`,
          refreshToken: `test_refresh_${Date.now()}`,
          isNewUser: true,
          needsOnboarding: true
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Verification failed'
      };
    }
  }

  // Password Authentication (Fallback)
  async loginWithPassword(phoneNumber: string, password: string): Promise<PhoneAuthResult> {
    try {
      // Step 1: Check if user exists
      const userExists = await this.backendAuth.checkUserExists(phoneNumber);
      
      if (!userExists.exists) {
        return {
          success: false,
          error: 'User not found. Please register using phone authentication first.'
        };
      }

      // Step 3: Login with password
      const authResult = await this.backendAuth.loginWithPassword(phoneNumber, password);
      
      // Store auth data
      this.storeAuthData({
        user: authResult.user,
        accessToken: authResult.token,
        refreshToken: authResult.refresh_token || ''
      });

      return {
        success: true,
        user: authResult.user,
        accessToken: authResult.token,
        refreshToken: authResult.refresh_token,
        isNewUser: false,
        needsOnboarding: false
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Password login failed'
      };
    }
  }

  // Onboarding completion
  async completeOnboarding(onboardingData: any): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const storedAuth = this.getStoredAuthData();
      
      if (!storedAuth?.accessToken) {
        return {
          success: false,
          error: 'No valid authentication found'
        };
      }

      const updatedUser = await this.backendAuth.onboardUser(onboardingData, storedAuth.accessToken);
      
      // Update stored user data
      this.storeAuthData({
        ...storedAuth,
        user: updatedUser
      });

      return {
        success: true,
        user: updatedUser
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Onboarding failed'
      };
    }
  }

  // Auth state management
  getStoredAuthData(): { user?: User; accessToken?: string; refreshToken?: string; idToken?: string } | null {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  storeAuthData(data: { user?: User; accessToken?: string; refreshToken?: string; idToken?: string }): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  clearAuthData(): void {
    localStorage.removeItem(this.storageKey);
  }

  isAuthenticated(): boolean {
    const data = this.getStoredAuthData();
    return !!(data?.accessToken);
  }

  getCurrentUser(): User | null {
    const data = this.getStoredAuthData();
    return data?.user || null;
  }

  getAccessToken(): string | null {
    const data = this.getStoredAuthData();
    return data?.accessToken || null;
  }

  // Logout
  async logout(): Promise<void> {
    try {
      // Sign out from Firebase if available
      await this.firebaseAuth.signOut();
      
      // Clear stored data
      this.clearAuthData();
    } catch (error) {
      console.error('Logout error:', error);
      // Clear data anyway
      this.clearAuthData();
    }
  }

  // Initialize auth state
  async initializeAuth(): Promise<AuthState> {
    const storedData = this.getStoredAuthData();
    
    if (!storedData?.accessToken) {
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    }

    try {
      // Validate token by fetching user data
      // For now, we'll trust the stored data
      return {
        user: storedData.user || null,
        token: storedData.accessToken,
        isAuthenticated: true,
        isLoading: false,
      };
    } catch (error) {
      // Token is invalid, clear it
      this.clearAuthData();
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    }
  }

  // Helper method to create test user
  private createTestUser(phoneNumber: string): User {
    return {
      id: Math.floor(Math.random() * 1000),
      email: '',
      name: 'Test User',
      full_name: '',
      phone_number: phoneNumber,
      user_type: 'student',
      is_active: true,
      phone_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // Set up auth state listener
  onAuthStateChanged(callback: (user: User | null) => void): (() => void) | null {
    // Set up Firebase auth state listener if available
    const unsubscribe = this.firebaseAuth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        // Firebase user is signed in, get our stored user data
        const storedUser = this.getCurrentUser();
        callback(storedUser);
      } else {
        // Firebase user is signed out, clear our data
        callback(null);
      }
    });

    return unsubscribe;
  }
}

// Export singleton instance
export const enhancedAuthService = new EnhancedAuthService();
export default enhancedAuthService;