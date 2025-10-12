// Enhanced Authentication Component combining OTP and Password login
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Phone, Shield, ArrowLeft } from 'lucide-react';
import { enhancedAuthService, backendAuthService } from 'shared-ui-library';
import PasswordLogin from './PasswordLogin';
import { cn } from 'shared-ui-library/utils/cn';

interface AuthResult {
  success: boolean;
  user?: any;
  accessToken?: string;
  refreshToken?: string;
  needsOnboarding?: boolean;
  error?: string;
}

interface EnhancedAuthProps {
  onSuccess: (result: AuthResult) => void;
  onError?: (error: string) => void;
  className?: string;
}

type AuthMode = 'phone_input' | 'otp_verification' | 'password_login';

const EnhancedAuth: React.FC<EnhancedAuthProps> = ({
  onSuccess,
  onError,
  className = ''
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('phone_input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [userExists, setUserExists] = useState<boolean | null>(null);

  // Format phone number
  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  };

  // Check if user exists and handle accordingly
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Check if user exists
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const existsResult = await backendAuthService.checkUserExists(formattedPhone);
      
      setUserExists(existsResult.exists);

      if (existsResult.exists) {
        // User exists - show both OTP and password options
        setAuthMode('otp_verification');
        // Optionally auto-send OTP
        await sendOTP();
      } else {
        // New user - only OTP registration available
        setAuthMode('otp_verification');
        await sendOTP();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check user status';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Send OTP
  const sendOTP = async () => {
    setIsSending(true);
    setError('');

    try {
      const result = await enhancedAuthService.sendPhoneOTP(phoneNumber, {
        useFirebase: true,
        recaptchaContainerId: 'recaptcha-container'
      });

      if (result.success) {
        setVerificationId(result.verificationId || '');
        setAuthMode('otp_verification');
      } else {
        setError(result.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Verify OTP and complete authentication
  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode.trim() || otpCode.length !== 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await enhancedAuthService.verifyPhoneOTP(otpCode, phoneNumber, {
        useFirebase: true
      });

      if (result.success) {
        onSuccess({
          success: true,
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          needsOnboarding: result.needsOnboarding
        });
      } else {
        setError(result.error || 'Invalid OTP code');
      }
    } catch (err) {
      setError('OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password login success
  const handlePasswordSuccess = (result: { user: any; accessToken: string; needsOnboarding?: boolean }) => {
    onSuccess({
      success: true,
      user: result.user,
      accessToken: result.accessToken,
      needsOnboarding: result.needsOnboarding
    });
  };

  // Handle password login error
  const handlePasswordError = (error: string) => {
    setError(error);
    onError?.(error);
  };

  // Reset to phone input
  const resetAuth = () => {
    setAuthMode('phone_input');
    setPhoneNumber('');
    setOtpCode('');
    setVerificationId('');
    setUserExists(null);
    setError('');
  };

  return (
    <div className={cn("max-w-md mx-auto p-4 sm:p-6", className)}>
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 sm:p-6">
        
        {/* Phone Number Input */}
        {authMode === 'phone_input' && (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Sign In / Register
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Enter your mobile number to continue
              </p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Mobile Number
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">+91</span>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit mobile number"
                    className="pl-12"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || phoneNumber.length !== 10}
                className="w-full h-12 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </form>
          </>
        )}

        {/* OTP Verification */}
        {authMode === 'otp_verification' && (
          <>
            <div className="text-center mb-6">
              <button
                onClick={resetAuth}
                className="absolute left-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Verify OTP
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-2">
                Enter the 6-digit code sent to
              </p>
              <p className="text-sm sm:text-base font-medium text-gray-700">
                +91 {phoneNumber}
              </p>
              
              {userExists === false && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    New user registration - OTP verification required
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleOTPVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
                  6-Digit OTP
                </Label>
                <Input
                  id="otp"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter OTP"
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full h-12 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Verify OTP
                  </>
                )}
              </Button>

              <div className="text-center space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={sendOTP}
                  disabled={isSending}
                  className="text-sm text-blue-600 hover:opacity-80"
                >
                  {isSending ? 'Sending...' : 'Resend OTP'}
                </Button>

                {userExists && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">or</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAuthMode('password_login')}
                      className="text-sm"
                    >
                      Use Password Instead
                    </Button>
                  </div>
                )}
              </div>
            </form>

            {/* reCAPTCHA container */}
            <div id="recaptcha-container" className="flex justify-center mt-4"></div>
          </>
        )}

        {/* Password Login */}
        {authMode === 'password_login' && (
          <PasswordLogin
            phoneNumber={`+91${phoneNumber}`}
            onSuccess={handlePasswordSuccess}
            onError={handlePasswordError}
            onSwitchToOTP={() => setAuthMode('otp_verification')}
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedAuth;