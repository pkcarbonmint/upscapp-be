// Export all components and services
export { default as OTPVerification } from './components/OTPVerification';
export type { OTPVerificationData, OTPVerificationProps } from './components/OTPVerification';

export { otpService } from './services/otpService';
export type { 
  OTPServiceResponse, 
  SendOTPRequest, 
  VerifyOTPRequest 
} from './services/otpService';

export { cn } from './utils/cn';


