import React from 'react';

interface NavigationProps {
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isSubmitting: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

const Navigation: React.FC<NavigationProps> = ({
  currentStep,
  totalSteps,
  canGoNext,
  canGoPrevious,
  isSubmitting,
  onNext,
  onPrevious
}) => {
  return (
    <div 
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '40px',
        paddingTop: '24px',
        borderTop: '1px solid var(--ms-gray-30)'
      }}
    >
      <div>
        {canGoPrevious && (
          <button 
            className="ms-button ms-button-secondary"
            onClick={onPrevious}
            disabled={isSubmitting}
            style={{
              padding: '12px 24px',
              minHeight: '40px'
            }}
          >
            ← Previous Step
          </button>
        )}
      </div>
      
      <button 
        className="ms-button ms-button-primary"
        onClick={onNext}
        disabled={!canGoNext || isSubmitting}
        style={{
          padding: '12px 24px',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {isSubmitting && (
          <div 
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid var(--ms-white)',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
        )}
        {currentStep === totalSteps - 1 
          ? 'Complete Setup' 
          : `Continue to Step ${currentStep + 1} →`}
      </button>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default Navigation;