import { useOnboarding } from '@/hooks/useOnboarding';
import Header from '@/components/Header';
import ProgressBar from '@/components/ProgressBar';
import PersonalInfoStep from '@/components/PersonalInfoStep';
import TargetYearStep from '@/components/TargetYearStep';
import CommitmentStep from '@/components/StudyPreferencesStep';
import ConfidenceStep from '@/components/ConfidenceStep';
import PreviewStep from '@/components/PreviewStep';
import PaymentStep from '@/components/PaymentStep';
import CompleteStep from '@/components/CompleteStep';
import Navigation from '@/components/Navigation';

function App() {
  const {
    currentStep,
    formData,
    updateFormData,
    goNext,
    goPrevious,
    canGoNext,
    isSubmitting,
    error,
    progress
  } = useOnboarding();

  const renderStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      onNext: goNext,
      onPrevious: goPrevious,
      isValid: canGoNext as boolean
    };

    switch (currentStep) {
      case 'personal-info':
        return <PersonalInfoStep {...stepProps} />;
      case 'commitment':
        return <CommitmentStep {...stepProps} />;
      case 'confidence':
        return <ConfidenceStep {...stepProps} />;
      case 'target-year':
        return <TargetYearStep {...stepProps} />;
      case 'preview':
        return <PreviewStep {...stepProps} />;
      case 'payment':
        return <PaymentStep {...stepProps} />;
      case 'complete':
        return <CompleteStep {...stepProps} />;
      default:
        return <PersonalInfoStep {...stepProps} />;
    }
  };

  const getStepNumber = () => {
    const stepMap = {
      'personal-info': 1,
      'commitment': 2,
      'confidence': 3,
      'target-year': 4,
      'preview': 5,
      'payment': 6,
      'complete': 7
    };
    return stepMap[currentStep] || 1;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ms-gray-10)' }}>
      <Header currentStep={getStepNumber()} totalSteps={7} />
      <ProgressBar progress={progress} />
      
      <main style={{ padding: '24px 0', minHeight: 'calc(100vh - 200px)' }}>
        <div className="container">
          {error && (
            <div 
              style={{
                background: 'var(--ms-red)',
                color: 'var(--ms-white)',
                padding: '12px 16px',
                borderRadius: '4px',
                marginBottom: '24px',
                textAlign: 'center'
              }}
            >
              {error}
            </div>
          )}
          
          {renderStep()}
          
          {currentStep !== 'complete' && (
            <Navigation
              currentStep={getStepNumber()}
              totalSteps={7}
              canGoNext={canGoNext as boolean}
              canGoPrevious={getStepNumber() > 1}
              isSubmitting={isSubmitting}
              onNext={goNext}
              onPrevious={goPrevious}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;