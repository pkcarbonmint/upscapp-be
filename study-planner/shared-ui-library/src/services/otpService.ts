// OTP Service - handles both Firebase and dummy OTP verification
export interface OTPServiceResponse {
  success: boolean;
  error?: string;
  verificationId?: string;
  data?: any;
}

export interface SendOTPRequest {
  phoneNumber: string;
  recaptchaContainerId?: string;
}

export interface VerifyOTPRequest {
  verificationId: string;
  otpCode: string;
}

class OTPService {
  private recaptchaVerifier: any = null;
  private confirmationResult: any = null;

  // Format phone number to international format
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add +91 prefix if not present for Indian numbers
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    // Add + prefix if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  // Send OTP using Firebase (if available)
  private async sendFirebaseOTP(phoneNumber: string, recaptchaContainerId: string = 'recaptcha-container'): Promise<OTPServiceResponse> {
    try {
      // Dynamic import to avoid errors when Firebase is not available
      const { signInWithPhoneNumber, RecaptchaVerifier } = await import('firebase/auth');
      const { auth } = await import('./firebase');

      if (!auth) {
        throw new Error('Firebase auth not initialized');
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Initialize reCAPTCHA verifier
      this.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });

      // Send SMS
      this.confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, this.recaptchaVerifier);

      return {
        success: true,
        verificationId: this.confirmationResult.verificationId,
        data: {
          message: 'OTP sent successfully',
          phoneNumber: formattedPhone
        }
      };
    } catch (error) {
      console.error('Firebase OTP Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send OTP'
      };
    }
  }

  // Verify OTP using Firebase (if available)
  private async verifyFirebaseOTP(_verificationId: string, otpCode: string): Promise<OTPServiceResponse> {
    try {
      if (!this.confirmationResult) {
        throw new Error('No confirmation result available. Please send OTP first.');
      }

      const result = await this.confirmationResult.confirm(otpCode);
      const user = result.user;

      return {
        success: true,
        data: {
          message: 'Phone number verified successfully',
          user: {
            uid: user.uid,
            phoneNumber: user.phoneNumber
          }
        }
      };
    } catch (error) {
      console.error('Firebase OTP Verification Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid OTP code'
      };
    }
  }

  // Send OTP using dummy service (for testing)
  private async sendDummyOTP(phoneNumber: string): Promise<OTPServiceResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    
    // Simulate success for valid phone numbers
    if (formattedPhone.length >= 10) {
      return {
        success: true,
        verificationId: 'dummy-verification-id-' + Date.now(),
        data: {
          message: 'Dummy OTP sent successfully',
          phoneNumber: formattedPhone,
          testOTP: '123456' // For testing purposes
        }
      };
    }

    return {
      success: false,
      error: 'Invalid phone number format'
    };
  }

  // Verify OTP using dummy service (for testing)
  private async verifyDummyOTP(verificationId: string, otpCode: string): Promise<OTPServiceResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Accept specific test codes
    const validTestCodes = ['123456', '000000', '111111'];
    
    if (validTestCodes.includes(otpCode)) {
      return {
        success: true,
        data: {
          message: 'OTP verified successfully (dummy mode)',
          verificationId,
          testMode: true
        }
      };
    }

    return {
      success: false,
      error: 'Invalid OTP code. Use 123456, 000000, or 111111 for testing.'
    };
  }

  // Public method to send OTP
  async sendOTP(request: SendOTPRequest, useFirebase: boolean = false): Promise<OTPServiceResponse> {
    if (useFirebase) {
      return this.sendFirebaseOTP(request.phoneNumber, request.recaptchaContainerId);
    } else {
      return this.sendDummyOTP(request.phoneNumber);
    }
  }

  // Public method to verify OTP
  async verifyOTP(request: VerifyOTPRequest, useFirebase: boolean = false): Promise<OTPServiceResponse> {
    if (useFirebase) {
      return this.verifyFirebaseOTP(request.verificationId, request.otpCode);
    } else {
      return this.verifyDummyOTP(request.verificationId, request.otpCode);
    }
  }

  // Clean up reCAPTCHA verifier
  cleanup(): void {
    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      } catch (error) {
        console.warn('Error clearing reCAPTCHA verifier:', error);
      }
    }
    this.confirmationResult = null;
  }

  // Get current mode (for debugging)
  getCurrentMode(useFirebase: boolean): string {
    return useFirebase ? 'firebase' : 'dummy';
  }
}

// Export singleton instance
export const otpService = new OTPService();
export default otpService;


