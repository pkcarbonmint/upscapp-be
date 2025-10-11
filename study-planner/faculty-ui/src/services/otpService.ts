import { facultyApi } from './api';

export interface SendOTPRequest {
  phoneNumber: string;
  recaptchaContainerId?: string;
}

export interface VerifyOTPRequest {
  verificationId: string;
  otpCode: string;
}

export interface OTPServiceResponse {
  success: boolean;
  verificationId?: string;
  error?: string;
  data?: {
    testOTP?: string;
  };
}

class FacultyOTPService {
  // Send OTP using backend API
  async sendOTP(request: SendOTPRequest): Promise<OTPServiceResponse> {
    try {
      const result = await facultyApi.sendOTP(request.phoneNumber);
      return {
        success: true,
        verificationId: result.verificationId,
        data: {
          testOTP: result.testOTP
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send OTP'
      };
    }
  }

  // Verify OTP using backend API
  async verifyOTP(request: VerifyOTPRequest): Promise<OTPServiceResponse> {
    try {
      await facultyApi.verifyOTP(request.verificationId, request.otpCode);
      return {
        success: true,
        verificationId: request.verificationId
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to verify OTP'
      };
    }
  }
}

export const facultyOTPService = new FacultyOTPService();
