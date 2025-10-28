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
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          left: '20px',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          transition: 'opacity 0.3s ease'
        }}
      >
        {canGoPrevious && (
          <button 
            onClick={onPrevious}
            disabled={isSubmitting}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: 'none',
              background: 'var(--ms-white)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isSubmitting ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = 'var(--ms-gray-10)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--ms-white)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ms-gray-130)' }} />
            </svg>
          </button>
        )}
      </div>

      <div 
        style={{
          position: 'fixed',
          top: '50%',
          right: '20px',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          transition: 'opacity 0.3s ease'
        }}
      >
        <button 
          onClick={onNext}
          disabled={!canGoNext || isSubmitting}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: 'none',
            background: 'var(--ms-white)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            cursor: (!canGoNext || isSubmitting) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: (!canGoNext || isSubmitting) ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (canGoNext && !isSubmitting) {
              e.currentTarget.style.background = 'var(--ms-gray-10)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--ms-white)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isSubmitting ? (
            <div 
              style={{
                width: '20px',
                height: '20px',
                border: '2px solid var(--ms-gray-60)',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: canGoNext ? 'var(--ms-blue)' : 'var(--ms-gray-60)' }} />
            </svg>
          )}
        </button>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};

export default Navigation;