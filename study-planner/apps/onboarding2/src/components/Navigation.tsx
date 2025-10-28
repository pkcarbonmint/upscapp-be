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
      <div className="onb-nav onb-nav--left">
        {canGoPrevious && (
          <button className="onb-nav__btn" onClick={onPrevious} disabled={isSubmitting}>
            <svg className="onb-nav__icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="onb-nav onb-nav--right">
        <button className="onb-nav__btn" onClick={onNext} disabled={!canGoNext || isSubmitting}>
          {isSubmitting ? (
            <div className="onb-nav__spinner" />
          ) : (
            <svg className={`onb-nav__icon ${canGoNext ? 'onb-nav__icon--active' : 'onb-nav__icon--disabled'}`} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
};

export default Navigation;