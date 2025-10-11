import { useState, useEffect, useRef, FC } from 'react';
import { Loader2, Phone, Shield, RefreshCw } from 'lucide-react';
import { cn } from 'shared-ui-library/utils/cn';
import { facultyOTPService } from '../services/otpService';

export interface OTPVerificationData {
  phoneNumber: string | null;
  otpCode: string|null;
  verificationId: string|null;
  isVerified: boolean;
  attempts: 0 | number;
  lastSentAt?: string;
}

export interface OTPVerificationProps {
  data: OTPVerificationData;
  onUpdate: (updater: (prev: OTPVerificationData) => OTPVerificationData) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  maxAttempts?: number;
  resendCooldown?: number;
  className?: string;
}

const FacultyOTPVerification: FC<OTPVerificationProps> = ({
  data,
  onUpdate,
  onValidationChange,
  maxAttempts = 3,
  resendCooldown = 60,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [countdown, setCountdown] = useState(0);
  const [otpInputs, setOtpInputs] = useState<string[]>(['', '', '', '', '', '']);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update validation
  useEffect(() => {
    const isValid = data.isVerified;
    const errors = [];
    
    if (!isValid) {
      if (data.attempts >= maxAttempts) {
        errors.push('Maximum verification attempts exceeded');
      } else if (error) {
        errors.push(error);
      } else if (!data.verificationId) {
        errors.push('Please request OTP first');
      } else if (!data.otpCode || data.otpCode.length !== 6) {
        errors.push('Please enter the 6-digit OTP code');
      }
    }

    onValidationChange?.(isValid, errors);
  }, [data.isVerified, data.attempts, data.verificationId, data.otpCode, error, onValidationChange, maxAttempts]);

  // Countdown timer for resend button
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle OTP input change
  const handleOtpInputChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newOtpInputs = [...otpInputs];
    newOtpInputs[index] = value;
    setOtpInputs(newOtpInputs);
    
    // Update the combined OTP code
    const otpCode = newOtpInputs.join('');
    onUpdate(prev => ({ ...prev, otpCode }));
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-verify when all 6 digits are entered
    if (otpCode.length === 6 && data.verificationId) {
      handleVerifyOTP(otpCode);
    }
  };

  // Handle backspace in OTP inputs
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpInputs[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste in OTP inputs
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) return; // Only allow digits
    
    const newOtpInputs = [...otpInputs];
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtpInputs[i] = pastedData[i];
    }
    setOtpInputs(newOtpInputs);
    
    const otpCode = newOtpInputs.join('');
    onUpdate(prev => ({ ...prev, otpCode }));
    
    // Focus the next empty input or the last input
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // Send OTP
  const handleSendOTP = async () => {
    if (!data.phoneNumber || isSending || countdown > 0) return;
    
    setIsSending(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const response = await facultyOTPService.sendOTP({ 
        phoneNumber: data.phoneNumber
      });
      
      if (response.success) {
        onUpdate(prev => ({
          ...prev,
          verificationId: response.verificationId || '',
          lastSentAt: new Date().toISOString()
        }));
        
        setSuccessMessage(
          `OTP sent! Use ${response.data?.testOTP || '123456'} for testing`
        );
        setCountdown(resendCooldown);
        
        // Focus first OTP input
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setError(response.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (otpCode?: string) => {
    const codeToVerify = otpCode || data.otpCode;
    
    if (!codeToVerify || codeToVerify.length !== 6 || !data.verificationId || isLoading) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await facultyOTPService.verifyOTP({
        verificationId: data.verificationId,
        otpCode: codeToVerify
      });
      
      if (response.success) {
        onUpdate(prev => ({
          ...prev,
          isVerified: true,
          otpCode: codeToVerify
        }));
        setSuccessMessage('Phone number verified successfully!');
      } else {
        const newAttempts = data.attempts + 1;
        onUpdate(prev => ({
          ...prev,
          attempts: newAttempts
        }));
        
        if (newAttempts >= maxAttempts) {
          setError('Maximum attempts exceeded. Please request a new OTP.');
          // Clear verification ID to force new OTP request
          onUpdate(prev => ({
            ...prev,
            verificationId: ''
          }));
        } else {
          setError(response.error || 'Invalid OTP code');
        }
        
        // Clear OTP inputs on error
        setOtpInputs(['', '', '', '', '', '']);
        onUpdate(prev => ({ ...prev, otpCode: '' }));
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset verification (for new OTP request after max attempts)
  const handleReset = () => {
    onUpdate(prev => ({
      ...prev,
      verificationId: '',
      otpCode: '',
      attempts: 0,
      isVerified: false
    }));
    setOtpInputs(['', '', '', '', '', '']);
    setError('');
    setSuccessMessage('');
    setCountdown(0);
  };

  const canResend = countdown === 0 && !isSending && data.attempts < maxAttempts;
  const canVerify = data.otpCode && data.verificationId && data.otpCode.length === 6 && !isLoading;

  return (
    <div className={cn("max-w-md mx-auto p-4 sm:p-6", className)}>
      <div className="bg-white border-gray-200 shadow-sm rounded-lg border p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Phone className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Verify Phone Number
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            We'll send a verification code to
          </p>
          <p className="text-sm sm:text-base font-medium text-gray-700">
            {data.phoneNumber}
          </p>
        </div>

        {/* Test Mode Indicator */}
        <div className="mb-4 p-3 bg-green-50 border-green-200 border rounded-md">
          <div className="flex items-center">
            <Shield className="w-4 h-4 text-blue-600 mr-2" />
            <p className="text-xs sm:text-sm text-green-800">
              Test Mode: Use the OTP code shown after sending
            </p>
          </div>
        </div>

        {/* Send OTP Section */}
        {!data.verificationId ? (
          <div className="space-y-4">
            <button
              onClick={handleSendOTP}
              disabled={isSending || !data.phoneNumber}
              className="w-full h-12 px-4 py-2 rounded-md font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4 inline" />
                  Send Verification Code
                </>
              )}
            </button>
          </div>
        ) : (
          /* OTP Input Section */
          <div className="space-y-6">
            {/* OTP Input Grid */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Enter 6-digit code
              </label>
              <div className="flex gap-2 justify-center">
                {otpInputs.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpInputChange(index, e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className={cn(
                      "w-12 h-12 text-center text-lg font-semibold rounded-md border transition-colors",
                      "bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm",
                      error && !data.isVerified && "border-red-500"
                    )}
                    disabled={isLoading || data.isVerified}
                  />
                ))}
              </div>
            </div>

            {/* Verify Button */}
            <button
              onClick={() => handleVerifyOTP()}
              disabled={!canVerify || data.isVerified}
              className="w-full h-12 px-4 py-2 rounded-md font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  Verifying...
                </>
              ) : data.isVerified ? (
                <>
                  <Shield className="mr-2 h-4 w-4 inline" />
                  Verified ✓
                </>
              ) : (
                'Verify Code'
              )}
            </button>

            {/* Resend Section */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Didn't receive the code?
              </p>
              {data.attempts >= maxAttempts ? (
                <button
                  onClick={handleReset}
                  className="text-sm px-3 py-1 rounded-md border transition-colors border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4 inline" />
                  Start Over
                </button>
              ) : (
                <button
                  onClick={handleSendOTP}
                  disabled={!canResend}
                  className="text-sm px-3 py-1 rounded-md transition-colors text-blue-600 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? (
                    `Resend in ${countdown}s`
                  ) : (
                    'Resend Code'
                  )}
                </button>
              )}
            </div>

            {/* Attempts counter */}
            {data.attempts > 0 && (
              <p className="text-xs text-center text-gray-600">
                Attempts: {data.attempts}/{maxAttempts}
              </p>
            )}
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border-red-200 border rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 bg-green-50 border-green-200 border rounded-md">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyOTPVerification;
