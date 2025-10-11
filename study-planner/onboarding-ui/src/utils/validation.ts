// Validation utilities for form fields

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface BackgroundValidation {
  fullName: ValidationResult;
  email: ValidationResult;
  phoneNumber: ValidationResult;
  presentLocation: ValidationResult;
  graduationStream: ValidationResult;
  collegeUniversity: ValidationResult;
  yearOfPassing: ValidationResult;
  about: ValidationResult;
}

// Email validation using RFC 5322 compliant regex
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

// Phone number validation for Indian and international formats
export const validatePhoneNumber = (phoneNumber: string): ValidationResult => {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // International format: starts with + and has 7-15 digits
  const internationalRegex = /^\+[1-9]\d{6,14}$/;
  
  // Indian format: 10 digits, optionally starting with +91 or 91
  const indianRegex = /^(\+91|91)?[6-9]\d{9}$/;
  
  if (internationalRegex.test(cleanPhone) || indianRegex.test(cleanPhone)) {
    return { isValid: true };
  }
  
  return { 
    isValid: false, 
    error: 'Please enter a valid phone number (10 digits for India or international format with country code)' 
  };
};

// Generic required field validation
export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
};

// Year validation
export const validateYear = (year: number, fieldName: string): ValidationResult => {
  const currentYear = new Date().getFullYear();
  
  if (!year || isNaN(year)) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (year < 1950 || year > currentYear + 10) {
    return { isValid: false, error: `Please enter a valid year between 1950 and ${currentYear + 10}` };
  }
  
  return { isValid: true };
};

// Comprehensive background validation
export const validateBackground = (background: any): BackgroundValidation => {
  return {
    fullName: validateRequired(background.fullName, 'Full name'),
    email: validateEmail(background.email),
    phoneNumber: validatePhoneNumber(background.phoneNumber),
    presentLocation: validateRequired(background.presentLocation, 'Present location'),
    graduationStream: validateRequired(background.graduationStream, 'Graduation stream'),
    collegeUniversity: validateRequired(background.collegeUniversity, 'College/University'),
    yearOfPassing: validateYear(background.yearOfPassing, 'Year of passing'),
    about: validateRequired(background.about, 'About yourself')
  };
};

// Check if all validations pass
export const isBackgroundValid = (validation: BackgroundValidation): boolean => {
  return Object.values(validation).every(result => result.isValid);
};

// Get list of validation errors
export const getValidationErrors = (validation: BackgroundValidation): string[] => {
  return Object.values(validation)
    .filter(result => !result.isValid)
    .map(result => result.error!)
    .filter(Boolean);
};
