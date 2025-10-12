// Firebase configuration based on integration.md
import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Simple function to get environment variables safely
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as any)[key] || defaultValue;
  }
  return defaultValue;
};

// Firebase configuration from integration.md
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', ''),
  authDomain: "laex-upsc-pro.firebaseapp.com",
  projectId: "laex-upsc-pro",
  storageBucket: "laex-upsc-pro.firebasestorage.app",
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', ''),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', ''),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', '')
};

// Initialize Firebase
let app: any = null;
let auth: any = null;
let analytics: any = null;

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Initialize analytics if measurement ID is provided
    if (firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    }
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
}

// Firebase Phone Authentication Service
export class FirebasePhoneAuthService {
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private confirmationResult: ConfirmationResult | null = null;

  constructor() {
    if (!auth) {
      console.warn('Firebase auth not initialized');
    }
  }

  // Initialize reCAPTCHA verifier
  initializeRecaptcha(containerId: string = 'recaptcha-container'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!auth) {
          reject(new Error('Firebase auth not available'));
          return;
        }

        this.recaptchaVerifier = new RecaptchaVerifier(containerId, {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA solved');
            resolve();
          }
        }, auth);

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Send OTP to phone number
  async sendOTP(phoneNumber: string, recaptchaContainerId?: string): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    try {
      if (!auth) {
        return { success: false, error: 'Firebase auth not available' };
      }

      // Ensure phone number has country code
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

      // Initialize reCAPTCHA if container ID is provided
      if (recaptchaContainerId) {
        await this.initializeRecaptcha(recaptchaContainerId);
      }

      if (!this.recaptchaVerifier) {
        return { success: false, error: 'reCAPTCHA verifier not initialized' };
      }

      // Send verification code
      this.confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, this.recaptchaVerifier);
      
      return { 
        success: true, 
        verificationId: this.confirmationResult.verificationId 
      };
    } catch (error: any) {
      console.error('Firebase OTP send error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send OTP' 
      };
    }
  }

  // Verify OTP code
  async verifyOTP(otpCode: string): Promise<{ success: boolean; user?: any; idToken?: string; error?: string }> {
    try {
      if (!this.confirmationResult) {
        return { success: false, error: 'No verification in progress' };
      }

      const result = await this.confirmationResult.confirm(otpCode);
      const user = result.user;
      
      // Get ID token for backend authentication
      const idToken = await user.getIdToken();
      
      return { 
        success: true, 
        user: user,
        idToken: idToken
      };
    } catch (error: any) {
      console.error('Firebase OTP verify error:', error);
      return { 
        success: false, 
        error: error.message || 'Invalid OTP' 
      };
    }
  }

  // Get current user's ID token
  async getCurrentUserToken(): Promise<string | null> {
    try {
      if (!auth || !auth.currentUser) {
        return null;
      }
      return await auth.currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  }

  // Sign out current user
  async signOut(): Promise<void> {
    try {
      if (auth) {
        await auth.signOut();
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  // Set up auth state listener
  onAuthStateChanged(callback: (user: any) => void): (() => void) | null {
    if (!auth) {
      return null;
    }
    
    return auth.onAuthStateChanged(callback);
  }
}

// Export singleton instance
export const firebasePhoneAuth = new FirebasePhoneAuthService();

export { auth, analytics };
