import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Phone, Shield, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { otpService } from '../services/otpService';
import { isFeatureEnabled } from '../config/featureFlags';
import { useTheme } from '../hooks/useTheme';
import type { IWFOTPVerification } from '../types';

interface OTPVerificationStepProps {
  data: IWFOTPVerification;
  phoneNumber: string; // Phone number from background step
  onUpdate: (updater: (prev: IWFOTPVerification) => IWFOTPVerification) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

const OTPVerificationStep: React.FC<OTPVerificationStepProps> = ({
  data,
  phoneNumber,
  onUpdate,
  onValidationChange
}) => {
  const { getClasses } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [countdown, setCountdown] = useState(0);
  const [otpInputs, setOtpInputs] = useState<string[]>(['', '', '', '', '', '']);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  const useFirebase = isFeatureEnabled('useFirebaseOTP');
  const maxAttempts = 3;
  const resendCooldown = 60; // seconds

  // Initialize OTP data if not present
  useEffect(() => {
    if (!data.phoneNumber && phoneNumber) {
      onUpdate(prev => ({
        ...prev,
        phoneNumber: phoneNumber,
        otpCode: '',
        isVerified: false,
        attempts: 0
      }));
    }
  }, [phoneNumber, data.phoneNumber, onUpdate]);

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
  }, [data.isVerified, data.attempts, data.verificationId, data.otpCode, error, onValidationChange]);

  // Countdown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout;
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
    if (!phoneNumber || isSending || countdown > 0) return;
    
    setIsSending(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const response = await otpService.sendOTP({ 
        phoneNumber,
        recaptchaContainerId: 'recaptcha-container'
      });
      
      if (response.success) {
        onUpdate(prev => ({
          ...prev,
          verificationId: response.verificationId || '',
          lastSentAt: new Date().toISOString()
        }));
        
        setSuccessMessage(
          useFirebase 
            ? 'OTP sent to your phone number'
            : `OTP sent! Use ${response.data?.testOTP || '123456'} for testing`
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
      const response = await otpService.verifyOTP({
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
  const canVerify = data.otpCode.length === 6 && data.verificationId && !isLoading;

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6">
      <div className={`${getClasses('cardBackground')} ${getClasses('cardBorder')} ${getClasses('cardShadow')} rounded-lg border p-4 sm:p-6`}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`mx-auto w-12 h-12 ${getClasses('sectionHeaderBackground')} rounded-full flex items-center justify-center mb-4`}>
            <Phone className={`w-6 h-6 ${getClasses('sectionHeaderIcon')}`} />
          </div>
          <h2 className={`text-lg sm:text-xl font-semibold ${getClasses('headerTitle')} mb-2`}>
            Verify Phone Number
          </h2>
          <p className={`text-sm sm:text-base ${getClasses('headerSubtitle')}`}>
            We'll send a verification code to
          </p>
          <p className={`text-sm sm:text-base font-medium ${getClasses('labelText')}`}>
            {phoneNumber}
          </p>
        </div>

        {/* Mode indicator (for testing) */}
        {!useFirebase && (
          <div className={`mb-4 p-3 ${getClasses('successBackground')} ${getClasses('successBorder')} border rounded-md`}>
            <div className="flex items-center">
              <Shield className={`w-4 h-4 ${getClasses('sectionHeaderIcon')} mr-2`} />
              <p className={`text-xs sm:text-sm ${getClasses('successText')}`}>
                Test Mode: Use OTP codes 123456, 000000, or 111111
              </p>
            </div>
          </div>
        )}

        {/* Send OTP Section */}
        {!data.verificationId ? (
          <div className="space-y-4">
            <Button
              onClick={handleSendOTP}
              disabled={isSending || !phoneNumber}
              className={`w-full h-12 ${getClasses('primaryButton')} ${getClasses('primaryButtonHover')}`}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Send Verification Code
                </>
              )}
            </Button>
            
            {/* reCAPTCHA container for Firebase */}
            {useFirebase && (
              <div id="recaptcha-container" ref={recaptchaRef} className="flex justify-center"></div>
            )}
          </div>
        ) : (
          /* OTP Input Section */
          <div className="space-y-6">
            {/* OTP Input Grid */}
            <div className="space-y-2">
              <Label className={`text-sm font-medium ${getClasses('labelText')}`}>
                Enter 6-digit code
              </Label>
              <div className="flex gap-2 justify-center">
                {otpInputs.map((digit, index) => (
                  <Input
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
                      `w-12 h-12 text-center text-lg font-semibold ${getClasses('inputBackground')} ${getClasses('inputBorder')} ${getClasses('inputFocus')} ${getClasses('inputShadow')}`,
                      error && !data.isVerified && "border-red-500"
                    )}
                    disabled={isLoading || data.isVerified}
                  />
                ))}
              </div>
            </div>

            {/* Verify Button */}
            <Button
              onClick={() => handleVerifyOTP()}
              disabled={!canVerify || data.isVerified}
              className={`w-full h-12 ${getClasses('primaryButton')} ${getClasses('primaryButtonHover')}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : data.isVerified ? (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Verified ✓
                </>
              ) : (
                'Verify Code'
              )}
            </Button>

            {/* Resend Section */}
            <div className="text-center space-y-2">
              <p className={`text-sm ${getClasses('headerSubtitle')}`}>
                Didn't receive the code?
              </p>
              {data.attempts >= maxAttempts ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className={`text-sm ${getClasses('secondaryButton')} ${getClasses('secondaryButtonHover')}`}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Start Over
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendOTP}
                  disabled={!canResend}
                  className={`text-sm ${getClasses('sectionHeaderIcon')} hover:opacity-80`}
                >
                  {countdown > 0 ? (
                    `Resend in ${countdown}s`
                  ) : (
                    'Resend Code'
                  )}
                </Button>
              )}
            </div>

            {/* Attempts counter */}
            {data.attempts > 0 && (
              <p className={`text-xs text-center ${getClasses('headerSubtitle')}`}>
                Attempts: {data.attempts}/{maxAttempts}
              </p>
            )}
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className={`mt-4 p-3 ${getClasses('errorBackground')} ${getClasses('errorBorder')} border rounded-md`}>
            <p className={`text-sm ${getClasses('errorText')}`}>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className={`mt-4 p-3 ${getClasses('successBackground')} ${getClasses('successBorder')} border rounded-md`}>
            <p className={`text-sm ${getClasses('successText')}`}>{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OTPVerificationStep;
