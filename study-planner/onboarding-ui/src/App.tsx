import { useState, useEffect } from 'react'
import './App.css'
import { getStepSequence } from './types'
import type { Step, IntakeWizardFormData, IWFBackground, IWFOTPVerification, IWFConfidenceLevelAssessment } from './types'
import { apiService } from './services/api'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { isFeatureEnabled } from './config/featureFlags'
import { useTheme } from './hooks/useTheme'
import { initializeAnalytics, analytics } from './services/analytics'
import { usePageTracking, useConversionTracking } from './hooks/useAnalytics'
import { SharedAuthProvider, studentService } from 'shared-ui-library'
import Header from './components/Header';
import BackgroundStep from './components/BackgroundStep';
import OTPVerificationStep from './components/OTPVerificationStep';
import CommitmentStep from './components/CommitmentStep';
import ConfidenceLevelStep from './components/ConfidenceLevelStep';
import TargetYearStep from './components/TargetYearStep';
import PreviewStep from './components/PreviewStep';
import PaymentStep from './components/PaymentStep';
import FinalStep from './components/FinalStep';
import ThemeDebugger from './components/ThemeDebugger';

// Initial data matching Elm app
const initialBackground: IWFBackground = {
  fullName: "",
  email: "",
  phoneNumber: "",
  phoneVerified: false,
  presentLocation: "",
  graduationStream: "",
  collegeUniversity: "",
  yearOfPassing: 2024,
  about: ""
}

const initialOTPVerification: IWFOTPVerification = {
  phoneNumber: "",
  otpCode: "",
  verificationId: "",
  isVerified: false,
  attempts: 0,
  lastSentAt: undefined
}

const initialFormData: IntakeWizardFormData = {
  background: initialBackground,
  otpVerification: initialOTPVerification,
  targetYear: { targetYear: "2026", startDate: undefined },
  commitment: {
    timeCommitment: 6,
    performance: {
      history: "",
      polity: "",
      economy: "",
      geography: "",
      environment: "",
      scienceTech: ""
    },
    studyPreference: "WeakSubjectsFirst",
    subjectApproach: "DualSubject",
    upscOptionalSubject: 'OPT-SOC',
    optionalFirst: false,
    weeklyTestDayPreference: "Sunday"
  },
  confidenceLevel: {} as IWFConfidenceLevelAssessment,
  preview: {
    raw_helios_data: {},
    milestones: {
      foundationToPrelimsDate: null,
      prelimsToMainsDate: null
    },
    studyPlanId: null
  },
  payment: {},
  final: {
    submitted: false,
    message: null,
    studentId: null
  }
}

function App() {
  const [showIntro, setShowIntro] = useState(true)
  const [currentStep, setCurrentStep] = useState<Step>('Background')
  const [formData, setFormData] = useState<IntakeWizardFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const { getClasses } = useTheme()
  
  // Analytics hooks
  usePageTracking()
  const { trackConversion: _, trackStepConversion } = useConversionTracking()
  
  // Initialize Google Analytics
  useEffect(() => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID
    const enableAnalyticsDev = import.meta.env.VITE_ENABLE_ANALYTICS_DEV === 'true'
    
    if (measurementId && (import.meta.env.PROD || enableAnalyticsDev)) {
      initializeAnalytics(measurementId)
      analytics.track('app_initialized')
    }
  }, [])
  
  // Get step sequence based on feature flags
  const enableOTP = isFeatureEnabled('enableOTPVerification')
  const stepSequence = getStepSequence(enableOTP)
  
  // Extract user name for display
  const getUserName = (): string | undefined => {
    const name = formData.background?.fullName?.trim() || undefined
    
    // Track when user name becomes available
    if (name && !showIntro) {
      analytics.track('user_name_displayed', {
        has_name: true,
        name_length: name.length
      })
    }
    
    return name
  }
  
  // Validation state
  const [backgroundValidation, setBackgroundValidation] = useState<{isValid: boolean, errors: string[]}>({
    isValid: false,
    errors: []
  })
  const [otpValidation, setOtpValidation] = useState<{isValid: boolean, errors: string[]}>({
    isValid: false,
    errors: []
  })
  const [showValidationErrors, setShowValidationErrors] = useState(false)

  const handleGetStarted = () => {
    setShowIntro(false)
    analytics.track('onboarding_started')
  }

  const handleShareApp = () => {
    console.log('Share app clicked')
  }

  const getStepTitle = (step: Step): string => {
    switch (step) {
      case 'Background': return "Background Information"
      case 'OTPVerification': return "Phone Verification"
      case 'TargetYear': return "Target Year"
      case 'Commitment': return "Study Commitment & Preferences"
      case 'ConfidenceLevel': return "Confidence Level"
      case 'Preview': return "Review Your Plan"
      case 'Payment': return "Payment"
      case 'Final': return "Your Study Plan"
    }
  }

  const getStepSubtitle = (step: Step): string => {
    switch (step) {
      case 'Background': return "Tell us about yourself"
      case 'OTPVerification': return "Verify your phone number with OTP"
      case 'TargetYear': return "Select when you want to appear for the UPSC exam"
      case 'Commitment': return "Help us understand your study approach"
      case 'ConfidenceLevel': return "Rate your confidence in each subject"
      case 'Preview': return "Review your personalized study plan"
      case 'Payment': return "Complete your enrollment"
      case 'Final': return "Your journey begins now"
    }
  }

  const currentStepIndex = stepSequence.indexOf(currentStep)
  const totalSteps = stepSequence.length

  const handleNext = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    // Validate current step before proceeding
    if (currentStep === 'Background' && !backgroundValidation.isValid) {
      setShowValidationErrors(true)
      setSubmitError(`Please fix the validation errors below before proceeding`)
      setIsSubmitting(false)
      return
    }
    
    if (currentStep === 'OTPVerification' && !otpValidation.isValid) {
      setSubmitError(`Please complete phone verification before proceeding`)
      setIsSubmitting(false)
      return
    }

    try {
      // Submit current step data to server
      let response: any;
      switch (currentStep) {
        case 'Background':
          // Use shared student service for cross-app integration
          const studentData = {
            name: formData.background.fullName,
            email: formData.background.email,
            phone: formData.background.phoneNumber,
            city: formData.background.presentLocation.split(',')[0]?.trim() || formData.background.presentLocation,
            state: formData.background.presentLocation.split(',')[1]?.trim() || '',
            graduation_stream: formData.background.graduationStream,
            college: formData.background.collegeUniversity,
            graduation_year: formData.background.yearOfPassing,
            about: formData.background.about,
            target_year: parseInt(formData.targetYear.targetYear),
            confidence_data: formData.confidenceLevel,
            commitment_data: formData.commitment
          };
          
          response = await studentService.createStudent(studentData)
          if (response.student_id) {
            setStudentId(response.student_id)
          }
          break
        case 'OTPVerification':
          // OTP verification is handled within the component
          // Just proceed to next step if validation passed
          response = { success: true }
          break
        case 'Commitment':
          if (!studentId) throw new Error('Student ID not found')
          await studentService.updateStudentCommitment(studentId, formData.commitment)
          response = { success: true }
          break
        case 'ConfidenceLevel':
          if (!studentId) throw new Error('Student ID not found')
          await studentService.updateStudentConfidence(studentId, formData.confidenceLevel)
          response = { success: true }
          break
        case 'TargetYear':
          if (!studentId) throw new Error('Student ID not found')
          await studentService.updateStudentTarget(studentId, { 
            target_year: parseInt(formData.targetYear.targetYear),
            start_date: formData.targetYear.startDate 
          })
          response = { success: true }
          break
        case 'Preview':
          // Preview data is already fetched when navigating to this step
          // Just proceed to next step without additional API call
          break
        case 'Payment':
          if (!studentId) throw new Error('Student ID not found')
          response = await apiService.submitPayment(studentId, formData.payment)
          break
        case 'Final':
          if (!studentId) throw new Error('Student ID not found')
          const finalResponse = await studentService.submitStudentApplication(studentId)
          if (finalResponse) {
            // Update final step with server response
            setFormData(prev => ({
              ...prev,
              final: {
                submitted: true,
                message: finalResponse?.message || 'Application submitted successfully',
                studentId: studentId
              }
            }))
          }
          setIsSubmitting(false)
          return // Don't navigate away from Final step
        default:
          // For steps without server integration, just navigate
          break
      }

      if (response && !response.success) {
        setSubmitError(response.error || 'Failed to submit step data')
        setIsSubmitting(false)
        return
      }

      // Navigate to next step on successful submission
      const nextIndex = currentStepIndex + 1
      if (nextIndex < stepSequence.length) {
        const nextStep = stepSequence[nextIndex]
        
        // Track step completion and progression
        analytics.trackStepCompletion(currentStep)
        trackStepConversion(currentStep, nextStep)
        
        setCurrentStep(nextStep)
        
        // Track new step view
        analytics.trackPageView(`/step/${nextStep.toLowerCase()}`)
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Network error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrev = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      const prevStep = stepSequence[prevIndex]
      
      // Track backward navigation
      analytics.track('step_back', {
        from_step: currentStep,
        to_step: prevStep
      })
      
      setCurrentStep(prevStep)
      analytics.trackPageView(`/step/${prevStep.toLowerCase()}`)
    }
  }

  // Check if current step is valid and can proceed
  const canProceed = () => {
    switch (currentStep) {
      case 'Background':
        return backgroundValidation.isValid
      case 'OTPVerification':
        return otpValidation.isValid
      default:
        return true // Other steps don't have validation yet
    }
  }

  // Get validation message for current step
  const getValidationMessage = () => {
    switch (currentStep) {
      case 'Background':
        if (!backgroundValidation.isValid && backgroundValidation.errors.length > 0) {
          if (backgroundValidation.errors.length === 1) {
            return backgroundValidation.errors[0]
          }
          return `${backgroundValidation.errors.length} fields need attention: ${backgroundValidation.errors.slice(0, 2).join(', ')}${backgroundValidation.errors.length > 2 ? '...' : ''}`
        }
        return null
      case 'OTPVerification':
        if (!otpValidation.isValid && otpValidation.errors.length > 0) {
          return otpValidation.errors[0]
        }
        return null
      default:
        return null
    }
  }

  const renderProgressBar = () => {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1"></div>
          <div className="flex items-center">
            {stepSequence.map((step, index) => {
              const isActive = index <= currentStepIndex
              const isCurrent = step === currentStep
              
              const dotClass = isCurrent 
                ? "w-2 h-2 bg-blue-500 border border-blue-500"
                : isActive 
                ? "w-1.5 h-1.5 bg-blue-400"
                : "w-1.5 h-1.5 bg-gray-200"
              
              return (
                <div key={step} className="mx-1">
                  <div className={`rounded-full transition-all duration-200 ${dotClass}`}></div>
                </div>
              )
            })}
          </div>
          <div className="flex-1 text-right">
            <div className="text-xs sm:text-sm text-gray-400">
              Step {currentStepIndex + 1} of {totalSteps}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'Background':
        return (
          <BackgroundStep 
            data={formData.background}
            onUpdate={(updater: (prev: typeof formData.background) => typeof formData.background) => 
              setFormData(prev => ({ ...prev, background: updater(prev.background) }))}
            onValidationChange={(isValid, errors) => {
              setBackgroundValidation({ isValid, errors })
              
              // Track validation errors
              if (!isValid && errors.length > 0) {
                errors.forEach(error => {
                  analytics.trackFormError('Background', error)
                })
              }
              
              // Clear validation errors when form becomes valid
              if (isValid && showValidationErrors) {
                setShowValidationErrors(false)
              }
            }}
            forceShowErrors={showValidationErrors}
          />
        )
      case 'OTPVerification':
        return (
          <OTPVerificationStep 
            data={formData.otpVerification || initialOTPVerification}
            phoneNumber={formData.background.phoneNumber}
            onUpdate={(updater: (prev: IWFOTPVerification) => IWFOTPVerification) => 
              setFormData(prev => ({ ...prev, otpVerification: updater(prev.otpVerification || initialOTPVerification) }))}
            onValidationChange={(isValid, errors) => {
              setOtpValidation({ isValid, errors })
            }}
          />
        )
      case 'Commitment':
        return (
          <CommitmentStep 
            data={formData.commitment}
            onUpdate={(updater: (prev: typeof formData.commitment) => typeof formData.commitment) => 
              setFormData(prev => ({ ...prev, commitment: updater(prev.commitment) }))}
          />
        )
      case 'ConfidenceLevel':
        return (
          <ConfidenceLevelStep 
            data={formData.confidenceLevel}
            onUpdate={(updater: (prev: typeof formData.confidenceLevel) => typeof formData.confidenceLevel) => 
              setFormData(prev => ({ ...prev, confidenceLevel: updater(prev.confidenceLevel) }))}
          />
        )
      case 'TargetYear':
        return (
          <TargetYearStep 
            data={formData.targetYear}
            onUpdate={(updater: (prev: typeof formData.targetYear) => typeof formData.targetYear) => 
              setFormData(prev => ({ ...prev, targetYear: updater(prev.targetYear) }))}
          />
        )
      case 'Preview':
        return (
          <PreviewStep 
            formData={formData}
            onUpdate={(updates: Partial<IntakeWizardFormData>) => 
              setFormData(prev => ({ ...prev, ...updates }))}
          />
        )
      case 'Payment':
        return (
          <PaymentStep 
            formData={formData}
            onUpdate={(updates: Partial<IntakeWizardFormData>) => 
              setFormData(prev => ({ ...prev, ...updates }))}
          />
        )
      case 'Final':
        return (
          <FinalStep 
            formData={formData}
            onUpdate={(updates: Partial<IntakeWizardFormData>) => 
              setFormData(prev => ({ ...prev, ...updates }))}
          />
        )
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600">Step "{currentStep}" coming soon...</p>
          </div>
        )
    }
  }

  if (showIntro) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header userName={getUserName()} />
        <div className="flex-1 flex items-start justify-center px-4 pt-16 pb-8">
          <div className="w-full max-w-4xl bg-white border border-gray-200 p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 text-center">
              Welcome to La Mentora
            </h1>
            <p className="text-sm sm:text-base text-gray-600 text-center mb-6">
              Get a personalized UPSC study plan that adapts to your schedule, strengths, and target exam year.
            </p>
            
            <div className="mb-8 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700">
                  Personalized plan aligned to your target year and schedule
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700">
                  AI guidance and expert heuristics to prioritize what matters
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700">
                  Quick setup — get a study blueprint in under 5 minutes
                </span>
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <Button 
                onClick={handleGetStarted}
                size="lg"
                className="px-6 py-6 text-base h-12 min-h-[48px]"
              >
                Get Started
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              
              <div className="text-gray-500 text-sm sm:text-base">
                Takes less than 5 minutes
              </div>
              
              <div className="pt-6">
                <button 
                  onClick={handleShareApp}
                  className="text-xs sm:text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
                >
                  Share with friends
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${getClasses('pageBackground')} flex flex-col`}>
      <Header userName={getUserName()} />
      
      <div className="flex-1 w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6 pb-20">
        {/* Main content card with theme-based styling */}
        <div className={`${getClasses('cardBackground')} ${getClasses('cardBorder')} ${getClasses('cardShadow')} border rounded-xl p-3 sm:p-6 w-full`}>
          {renderProgressBar()}
          <div className="text-center mb-2">
            <h1 className={`text-xl sm:text-2xl font-bold ${getClasses('headerTitle')} mb-2`}>
              {getStepTitle(currentStep)}
            </h1>
            <p className={`text-sm sm:text-base ${getClasses('headerSubtitle')}`}>
              {getStepSubtitle(currentStep)}
            </p>
          </div>
          <div className="min-h-[24rem] transition-opacity duration-200">
            {renderStepContent()}
          </div>
          
          {/* Error message display */}
          {submitError && (
            <div className={`mt-4 p-4 ${getClasses('errorBackground')} ${getClasses('errorBorder')} border rounded-lg shadow-sm`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 flex items-center justify-center ${getClasses('errorIcon')}`}>
                    <i className="fas fa-exclamation text-xs"></i>
                  </div>
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${getClasses('errorText')}`}>{submitError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Fixed footer navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-2 sm:px-4 py-4 z-40">
        <div className="max-w-4xl mx-auto flex justify-center items-center">
          <div className="flex items-center gap-3">
            {currentStep !== 'Background' && currentStep !== (enableOTP ? 'OTPVerification' : 'Commitment') && (
            <Button 
              onClick={handlePrev}
              variant="outline"
              className="gap-1 h-11 px-4 text-sm"
            >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button 
              onClick={handleNext}
              disabled={isSubmitting || !canProceed()}
              className="gap-1 h-11 px-6 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentStep === 'Payment' ? 'Processing...' : 'Saving...'}
                </>
              ) : (
                <>
                  {currentStep === 'Preview' ? 'Proceed to Payment' : currentStep === 'Payment' ? 'Complete Payment' : 'Next'}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          
          {/* Validation feedback */}
          {!canProceed() && getValidationMessage() && (
            <div className="mt-2 text-center">
              <div className="inline-flex items-start text-sm text-amber-600 bg-amber-50 px-3 py-3 rounded-md border border-amber-200 max-w-md">
                <i className="fas fa-exclamation-triangle mr-2 mt-0.5 flex-shrink-0"></i>
                <div className="text-left">
                  {getValidationMessage()}
                  {currentStep === 'Background' && backgroundValidation.errors.length > 1 && (
                    <div className="mt-1 text-xs text-amber-500">
                      Click on fields above to see specific errors
                    </div>
                  )}
                  {currentStep === 'OTPVerification' && otpValidation.errors.length > 0 && (
                    <div className="mt-1 text-xs text-amber-500">
                      Complete phone verification to continue
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Theme debugger for development */}
      <ThemeDebugger />
    </div>
  )
}

const AppWithAuth = () => {
  return (
    <SharedAuthProvider>
      <App />
    </SharedAuthProvider>
  );
};

export default AppWithAuth;
