import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Shield } from 'lucide-react';
import { otpService } from '../services/otpService';
import { isFeatureEnabled } from '../config/featureFlags';
import { useTheme } from '../hooks/useTheme';
import type { IWFOTPVerification } from '../types';

interface OTPVerificationStepProps {
  data: IWFOTPVerification;
  phoneNumber: string; // Phone number from background step
  onUpdate: (updater: (prev: IWFOTPVerification) => IWFOTPVerification) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  onAuthSuccess?: (authResult: any) => void; // New callback for successful auth
}

const OTPVerificationStep: React.FC<OTPVerificationStepProps> = ({
  data,
  phoneNumber,
  onUpdate,
  onValidationChange,
  onAuthSuccess
}) => {
  const { getClasses } = useTheme();
  const [useEnhancedAuth, setUseEnhancedAuth] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const useFirebase = isFeatureEnabled('useFirebaseOTP');

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
      if (error) {
        errors.push(error);
      } else if (!data.isVerified) {
        errors.push('Phone number verification required');
      }
    }

    onValidationChange?.(isValid, errors);
  }, [data.isVerified, error, onValidationChange]);

  // Handle enhanced auth success (currently unused but kept for future use)
  // const handleEnhancedAuthSuccess = (result: any) => {
  //   // Update local verification state
  //   onUpdate(prev => ({
  //     ...prev,
  //     isVerified: true,
  //     verificationId: 'enhanced-auth-success',
  //     otpCode: '******'
  //   }));
  //   
  //   setSuccessMessage('Authentication successful!');
  //   setError('');
  //   
  //   // Pass result to parent component
  //   onAuthSuccess?.(result);
  // };

  // Handle enhanced auth error (currently unused but kept for future use)
  // const handleEnhancedAuthError = (error: string) => {
  //   setError(error);
  //   setSuccessMessage('');
  // };

  // Legacy OTP completion (for backward compatibility)
  const handleLegacyAuthComplete = async () => {
    try {
      const result = await otpService.completeAuthFlow(phoneNumber, data.otpCode);
      
      if (result.success) {
        onUpdate(prev => ({
          ...prev,
          isVerified: true
        }));
        setSuccessMessage('Phone number verified successfully!');
        onAuthSuccess?.(result);
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (error) {
      setError('Authentication failed. Please try again.');
    }
  };

  // Check if we should auto-complete verification if OTP is already verified
  useEffect(() => {
    if (data.isVerified && data.otpCode && !useEnhancedAuth) {
      handleLegacyAuthComplete();
    }
  }, [data.isVerified, data.otpCode, useEnhancedAuth]);

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6">
      {useEnhancedAuth ? (
        // Use new enhanced authentication service
        <div className={`${getClasses('cardBackground')} ${getClasses('cardBorder')} ${getClasses('cardShadow')} rounded-lg border p-4 sm:p-6`}>
          <div className="text-center mb-6">
            <h2 className={`text-lg sm:text-xl font-semibold ${getClasses('headerTitle')} mb-2`}>
              Enhanced Authentication
            </h2>
            <p className={`text-sm sm:text-base ${getClasses('headerSubtitle')}`}>
              Please use the enhanced authentication service for verification
            </p>
          </div>
          <Button
            onClick={() => setUseEnhancedAuth(false)}
            variant="outline"
            className="w-full"
          >
            Back to Standard Authentication
          </Button>
        </div>
      ) : (
        // Legacy OTP verification interface
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
              Authenticating phone number
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
                  Test Mode: Authentication will be simulated
                </p>
              </div>
            </div>
          )}

          {data.isVerified ? (
            /* Success State */
            <div className="text-center space-y-4">
              <div className={`mx-auto w-16 h-16 ${getClasses('successBackground')} rounded-full flex items-center justify-center`}>
                <Shield className={`w-8 h-8 ${getClasses('sectionHeaderIcon')}`} />
              </div>
              <div>
                <h4 className={`font-semibold mb-2 ${getClasses('labelText')}`}>Verification Complete!</h4>
                <p className={`text-sm ${getClasses('headerSubtitle')}`}>
                  Your phone number has been successfully verified.
                </p>
              </div>
            </div>
          ) : (
            /* Verification Options */
            <div className="space-y-4">
              <div className="text-center">
                <p className={`text-sm ${getClasses('headerSubtitle')} mb-4`}>
                  Choose your preferred authentication method:
                </p>
              </div>

              {/* Use Enhanced Auth Button */}
              <Button
                onClick={() => setUseEnhancedAuth(true)}
                className={`w-full h-12 ${getClasses('primaryButton')} ${getClasses('primaryButtonHover')}`}
              >
                <Phone className="mr-2 h-4 w-4" />
                Use Enhanced Authentication
              </Button>

              {/* Legacy mode info */}
              <div className={`p-3 ${getClasses('cardBackground')} ${getClasses('cardBorder')} border rounded-md`}>
                <p className={`text-xs ${getClasses('headerSubtitle')}`}>
                  Enhanced authentication supports both OTP verification and password login for existing users.
                </p>
              </div>
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
      )}
    </div>
  );
};

export default OTPVerificationStep;
