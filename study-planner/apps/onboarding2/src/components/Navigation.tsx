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
  currentStep: _currentStep,
  totalSteps: _totalSteps,
  canGoNext,
  canGoPrevious,
  isSubmitting,
  onNext,
  onPrevious
}) => {
  return (
    <>
      <div className="navigation-button-container navigation-button-container--left">
        {canGoPrevious && (
          <button 
            onClick={onPrevious}
            disabled={isSubmitting}
            className="navigation-button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ms-gray-130)' }} />
            </svg>
          </button>
        )}
      </div>

      <div className="navigation-button-container navigation-button-container--right">
        <button 
          onClick={onNext}
          disabled={!canGoNext || isSubmitting}
          className="navigation-button"
        >
          {isSubmitting ? (
            <div className="navigation-spinner" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: canGoNext ? 'var(--ms-blue)' : 'var(--ms-gray-60)' }} />
            </svg>
          )}
        </button>
      </div>
    </>
  );
};

export default Navigation;