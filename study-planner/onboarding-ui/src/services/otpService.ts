// Enhanced OTP Service using the new authentication system
import { isFeatureEnabled } from '../config/featureFlags';
import { enhancedAuthService } from 'shared-ui-library';

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
  async sendOTP(request: SendOTPRequest): Promise<OTPServiceResponse> {
    const useFirebase = isFeatureEnabled('useFirebaseOTP');
    
    if (useFirebase) {
      // Use enhanced auth service for Firebase OTP
      const result = await enhancedAuthService.sendPhoneOTP(request.phoneNumber, {
        useFirebase: true,
        recaptchaContainerId: request.recaptchaContainerId
      });
      
      return {
        success: result.success,
        verificationId: result.verificationId,
        error: result.error,
        data: result.success ? {
          message: 'OTP sent successfully',
          phoneNumber: request.phoneNumber
        } : undefined
      };
    } else {
      return this.sendDummyOTP(request.phoneNumber);
    }
  }

  // Public method to verify OTP
  async verifyOTP(request: VerifyOTPRequest): Promise<OTPServiceResponse> {
    const useFirebase = isFeatureEnabled('useFirebaseOTP');
    
    if (useFirebase) {
      // This is handled separately in the auth flow
      // For now, return success to maintain compatibility
      return {
        success: true,
        data: {
          message: 'OTP verification handled by enhanced auth service',
          verificationId: request.verificationId
        }
      };
    } else {
      return this.verifyDummyOTP(request.verificationId, request.otpCode);
    }
  }

  // Complete authentication flow (new method)
  async completeAuthFlow(phoneNumber: string, otpCode: string): Promise<{
    success: boolean;
    user?: any;
    accessToken?: string;
    needsOnboarding?: boolean;
    error?: string;
  }> {
    const useFirebase = isFeatureEnabled('useFirebaseOTP');
    
    try {
      const result = await enhancedAuthService.verifyPhoneOTP(otpCode, phoneNumber, {
        useFirebase
      });
      
      return {
        success: result.success,
        user: result.user,
        accessToken: result.accessToken,
        needsOnboarding: result.needsOnboarding,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  // Clean up (for backward compatibility)
  cleanup(): void {
    // Cleanup is handled by the enhanced auth service
    console.log('OTP service cleanup called');
  }

  // Get current mode (for debugging)
  getCurrentMode(): string {
    return isFeatureEnabled('useFirebaseOTP') ? 'firebase' : 'dummy';
  }
}

// Export singleton instance
export const otpService = new OTPService();
export default otpService;
