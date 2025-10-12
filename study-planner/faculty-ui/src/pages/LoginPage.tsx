import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Phone, ArrowLeft } from 'lucide-react';
import { useSharedAuth } from 'shared-ui-library';
import PhoneInput from '../components/PhoneInput';
import FacultyOTPVerification from '../components/FacultyOTPVerification';

interface LoginForm {
  email: string;
  password: string;
}

interface OTPData {
  phoneNumber: string;
  otpCode: string;
  verificationId: string;
  isVerified: boolean;
  attempts: number;
}

type LoginMode = 'email' | 'phone';
type PhoneMode = 'phone-entry' | 'otp-verification';

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<LoginMode>('phone');
  const [phoneMode, setPhoneMode] = useState<PhoneMode>('phone-entry');
  const [phoneNumber, setPhoneNumber] = useState<string|null>('1234567890');
  const [otpData, setOtpData] = useState<OTPData>({
    phoneNumber: '',
    otpCode: '',
    verificationId: '',
    isVerified: false,
    attempts: 0
  });
  
  const { login, loginWithOTP, verifyOTP, isLoading } = useSharedAuth();
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const handlePhoneLogin = useCallback(async () => {
    try {
      setLoginError(null);
      // Use shared auth service for OTP verification
      const result = await verifyOTP(otpData.verificationId, otpData.otpCode, 'faculty');
      
      if (result.success) {
        // Navigate to dashboard using React Router
        navigate('/faculty/dashboard');
      } else {
        setLoginError(result.error || 'OTP verification failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Error in handlePhoneLogin:', error);
      setLoginError('OTP verification failed. Please try again.');
    }
  }, [otpData.verificationId, otpData.otpCode, verifyOTP, navigate]);

  // Watch for OTP verification changes and trigger login
  useEffect(() => {
    if (otpData.isVerified && phoneMode === 'otp-verification') {
      handlePhoneLogin();
    }
  }, [otpData.isVerified, phoneMode, handlePhoneLogin]);

  const onSubmit = async (data: LoginForm) => {
    setLoginError(null);
    const result = await login(data);
    if (!result.success) {
      setLoginError(result.error);
    }
  };

  const handleBackToPhoneEntry = () => {
    try {
      setPhoneMode('phone-entry');
      setPhoneNumber(null);
      setOtpData({
        phoneNumber: '',
        otpCode: '',
        verificationId: '',
        isVerified: false,
        attempts: 0
      });
      setLoginError(null);
    } catch (error) {
      console.error('Error in handleBackToPhoneEntry:', error);
    }
  };

  const handlePhoneSubmit = async (phone: string | null) => {
    if (!phone) {
      return;
    }
    try {
      setLoginError(null);
      // Send OTP using shared auth service
      const result = await loginWithOTP(phone, 'faculty');
      
      if (result.success && result.verificationId) {
        setPhoneNumber(phone);
        setOtpData((prev) => ({ 
          ...prev, 
          phoneNumber: phone,
          verificationId: result.verificationId! 
        }));
        setPhoneMode('otp-verification'); // Switch to OTP mode
      } else {
        setLoginError(result.error || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error in handlePhoneSubmit:', error);
      setLoginError('Failed to send OTP. Please try again.');
    }
  };

  const handleOTPUpdate = (updater: (prev: OTPData) => OTPData) => {
    try {
      setOtpData(updater);
    } catch (error) {
      console.error('Error in handleOTPUpdate:', error);
    }
  };

  const handleOTPValidation = (_isValid: boolean, _errors: string[]) => {
    try {
      // Check if OTP is verified regardless of validation state
      if (otpData.isVerified) {
        // OTP verified, proceed with phone login
        handlePhoneLogin();
      }
    } catch (error) {
      console.error('Error in handleOTPValidation:', error);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Faculty Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the faculty dashboard
          </p>
        </div>

        {/* Login Mode Toggle */}
        <div className="flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setLoginMode('phone')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-md border-t border-r border-b ${
              loginMode === 'phone'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Phone className="w-4 h-4 inline mr-2" />
            Phone
          </button>
          <button
            type="button"
            onClick={() => setLoginMode('email')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md border ${
              loginMode === 'email'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Email
          </button>
        </div>

        {/* Email Login Form */}
        {loginMode === 'email' && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="label">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    type="email"
                    className="input pl-10"
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                      },
                    })}
                    type={showPassword ? 'text' : 'password'}
                    className="input pl-10 pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            {loginError && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Login Failed
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{loginError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full flex justify-center py-2 px-4"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Phone Login Flow */}
        {loginMode === 'phone' && (
          <div className="mt-8">
            {/* Mode Indicator */}
            <div className="mb-4 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  phoneMode === 'phone-entry' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  📱 Phone Number
                </div>
                <div className="text-gray-400">→</div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  phoneMode === 'otp-verification' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  🔐 OTP Verification
                </div>
              </div>
            </div>
            
            {phoneMode === 'phone-entry' ? (
              <PhoneInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                onNext={() => handlePhoneSubmit(phoneNumber)}
                disabled={isLoading}
                error={loginError || undefined}
              />
            ) : (
              <div>
                <button
                  onClick={handleBackToPhoneEntry}
                  className="mb-4 flex items-center text-sm text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Change phone number
                </button>
                <FacultyOTPVerification
                  data={otpData}
                  onUpdate={handleOTPUpdate}
                  onValidationChange={handleOTPValidation}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
