import { useState, useEffect, useRef, FC } from 'react';
import { Loader2, Phone, Shield, RefreshCw } from 'lucide-react';
import { cn } from '../utils/cn';
import { otpService } from '../services/otpService';

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
  useFirebase?: boolean;
  maxAttempts?: number;
  resendCooldown?: number;
  className?: string;
  // Theme classes (optional - for styling flexibility)
  themeClasses?: {
    cardBackground?: string;
    cardBorder?: string;
    cardShadow?: string;
    sectionHeaderBackground?: string;
    sectionHeaderIcon?: string;
    headerTitle?: string;
    headerSubtitle?: string;
    labelText?: string;
    successBackground?: string;
    successBorder?: string;
    successText?: string;
    errorBackground?: string;
    errorBorder?: string;
    errorText?: string;
    primaryButton?: string;
    primaryButtonHover?: string;
    secondaryButton?: string;
    secondaryButtonHover?: string;
    inputBackground?: string;
    inputBorder?: string;
    inputFocus?: string;
    inputShadow?: string;
  };
}

const OTPVerification: FC<OTPVerificationProps> = ({
  data,
  onUpdate,
  onValidationChange,
  useFirebase = false,
  maxAttempts = 3,
  resendCooldown = 60,
  className = '',
  themeClasses = {}
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [countdown, setCountdown] = useState(0);
  const [otpInputs, setOtpInputs] = useState<string[]>(['', '', '', '', '', '']);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  // Default theme classes
  const defaultTheme = {
    cardBackground: 'bg-white',
    cardBorder: 'border-gray-200',
    cardShadow: 'shadow-sm',
    sectionHeaderBackground: 'bg-blue-100',
    sectionHeaderIcon: 'text-blue-600',
    headerTitle: 'text-gray-900',
    headerSubtitle: 'text-gray-600',
    labelText: 'text-gray-700',
    successBackground: 'bg-green-50',
    successBorder: 'border-green-200',
    successText: 'text-green-800',
    errorBackground: 'bg-red-50',
    errorBorder: 'border-red-200',
    errorText: 'text-red-800',
    primaryButton: 'bg-blue-600 text-white',
    primaryButtonHover: 'hover:bg-blue-700',
    secondaryButton: 'border-gray-300 text-gray-700',
    secondaryButtonHover: 'hover:bg-gray-50',
    inputBackground: 'bg-white',
    inputBorder: 'border-gray-300',
    inputFocus: 'focus:border-blue-500 focus:ring-blue-500',
    inputShadow: 'shadow-sm',
  };

  const theme = { ...defaultTheme, ...themeClasses };
  const { isVerified, attempts, verificationId, otpCode, } = data;
  console.log("in OTPVerification", data);
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
  }, [isVerified, attempts, verificationId, otpCode, error, onValidationChange, maxAttempts]);

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
    if (!data.phoneNumber || isSending || countdown > 0) return;
    
    setIsSending(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const response = await otpService.sendOTP({ 
        phoneNumber: data.phoneNumber,
        recaptchaContainerId: 'recaptcha-container'
      }, useFirebase);
      
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
      }, useFirebase);
      
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
  const canVerify = otpCode && verificationId && otpCode.length === 6 && !isLoading;

  return (
    <div className={cn("max-w-md mx-auto p-4 sm:p-6", className)}>
      <div className={cn(
        theme.cardBackground,
        theme.cardBorder,
        theme.cardShadow,
        "rounded-lg border p-4 sm:p-6"
      )}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className={cn(
            "mx-auto w-12 h-12",
            theme.sectionHeaderBackground,
            "rounded-full flex items-center justify-center mb-4"
          )}>
            <Phone className={cn("w-6 h-6", theme.sectionHeaderIcon)} />
          </div>
          <h2 className={cn("text-lg sm:text-xl font-semibold", theme.headerTitle, "mb-2")}>
            Verify Phone Number
          </h2>
          <p className={cn("text-sm sm:text-base", theme.headerSubtitle)}>
            We'll send a verification code to
          </p>
          <p className={cn("text-sm sm:text-base font-medium", theme.labelText)}>
            {data.phoneNumber}
          </p>
        </div>

        {/* Mode indicator (for testing) */}
        {!useFirebase && (
          <div className={cn(
            "mb-4 p-3",
            theme.successBackground,
            theme.successBorder,
            "border rounded-md"
          )}>
            <div className="flex items-center">
              <Shield className={cn("w-4 h-4", theme.sectionHeaderIcon, "mr-2")} />
              <p className={cn("text-xs sm:text-sm", theme.successText)}>
                Test Mode: Use OTP codes 123456, 000000, or 111111
              </p>
            </div>
          </div>
        )}

        {/* Send OTP Section */}
        {!data.verificationId ? (
          <div className="space-y-4">
            <button
              onClick={handleSendOTP}
              disabled={isSending || !data.phoneNumber}
              className={cn(
                "w-full h-12 px-4 py-2 rounded-md font-medium transition-colors",
                theme.primaryButton,
                theme.primaryButtonHover,
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
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
              <label className={cn("text-sm font-medium", theme.labelText)}>
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
                      theme.inputBackground,
                      theme.inputBorder,
                      theme.inputFocus,
                      theme.inputShadow,
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
              className={cn(
                "w-full h-12 px-4 py-2 rounded-md font-medium transition-colors",
                theme.primaryButton,
                theme.primaryButtonHover,
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
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
              <p className={cn("text-sm", theme.headerSubtitle)}>
                Didn't receive the code?
              </p>
              {data.attempts >= maxAttempts ? (
                <button
                  onClick={handleReset}
                  className={cn(
                    "text-sm px-3 py-1 rounded-md border transition-colors",
                    theme.secondaryButton,
                    theme.secondaryButtonHover
                  )}
                >
                  <RefreshCw className="mr-2 h-4 w-4 inline" />
                  Start Over
                </button>
              ) : (
                <button
                  onClick={handleSendOTP}
                  disabled={!canResend}
                  className={cn(
                    "text-sm px-3 py-1 rounded-md transition-colors",
                    theme.sectionHeaderIcon,
                    "hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
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
              <p className={cn("text-xs text-center", theme.headerSubtitle)}>
                Attempts: {data.attempts}/{maxAttempts}
              </p>
            )}
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className={cn(
            "mt-4 p-3",
            theme.errorBackground,
            theme.errorBorder,
            "border rounded-md"
          )}>
            <p className={cn("text-sm", theme.errorText)}>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className={cn(
            "mt-4 p-3",
            theme.successBackground,
            theme.successBorder,
            "border rounded-md"
          )}>
            <p className={cn("text-sm", theme.successText)}>{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OTPVerification;


