import { useState, useEffect } from 'react';
import { Phone, Check } from 'lucide-react';

interface PhoneInputProps {
  value: string | null;
  onChange: (value: string) => void;
  onNext: () => void;
  disabled?: boolean;
  error?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onNext,
  disabled = false,
  error
}) => {
  // @ts-ignore
  const [isValid, setIsValid] = useState(false);

  // Update validation state when value prop changes
  useEffect(() => {
    const valid = value !== null && value.length === 10 && /^\d{10}$/.test(value);
    setIsValid(valid);
  }, [value]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const phone = e.target.value.replace(/\D/g, ''); // Only allow digits
      onChange(phone);
    } catch (error) {
      console.error('Error in handlePhoneChange:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    try {
      // Remove auto-submit on Enter - require explicit button click
      if (e.key === 'Enter') {
        e.preventDefault();
        // Don't auto-submit, just prevent default form submission
      }
    } catch (error) {
      console.error('Error in handleKeyDown:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    try {
      e.preventDefault();
      // Only submit when button is explicitly clicked and phone is valid
      if (isValid && value !== null && value.length === 10) {
        onNext();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6">
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Phone className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Enter Phone Number
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            We'll send a verification code to your phone
          </p>
        </div>

        {/* Phone Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">+91</span>
              </div>
              <input
                type="tel"
                value={value || ''}
                onChange={handlePhoneChange}
                onKeyDown={handleKeyDown}
                placeholder="9876543210"
                maxLength={10}
                disabled={disabled}
                className={`
                  block w-full pl-12 pr-10 py-3 border rounded-md shadow-sm placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  sm:text-sm
                  ${error ? 'border-red-500' : isValid ? 'border-green-500' : 'border-gray-300'}
                  ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
                `}
              />
              {/* Green checkmark when valid */}
              {isValid && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
              )}
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            {!error && value && value.length > 0 && (
              <p className={`text-sm ${isValid ? 'text-green-600' : 'text-gray-500'}`}>
                {isValid ? '✓ Valid phone number' : `${value.length}/10 digits`}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid || disabled}
            className={`
              w-full h-12 px-4 py-2 rounded-md font-medium transition-colors
              ${isValid && !disabled
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {disabled ? 'Sending...' : 'Send OTP'}
          </button>
        </form>

        {/* Info */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <Phone className="w-4 h-4 text-green-600 mr-2" />
            <p className="text-xs sm:text-sm text-green-800">
              Test Mode: Use any 10-digit number for testing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneInput;
