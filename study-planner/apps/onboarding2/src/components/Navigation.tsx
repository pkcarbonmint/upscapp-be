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
      <div className="nav-button-container-left">
        {canGoPrevious && (
          <button 
            onClick={onPrevious}
            disabled={isSubmitting}
            className="nav-button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-button-icon" />
            </svg>
          </button>
        )}
      </div>

      <div className="nav-button-container-right">
        <button 
          onClick={onNext}
          disabled={!canGoNext || isSubmitting}
          className="nav-button"
        >
          {isSubmitting ? (
            <div className="nav-button-spinner" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={canGoNext ? 'nav-button-icon-active' : 'nav-button-icon'} />
            </svg>
          )}
        </button>
      </div>
    </>
  );
};

export default Navigation;