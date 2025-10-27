import React from 'react';

interface HeaderProps {
  currentStep: number;
  totalSteps: number;
}

const Header: React.FC<HeaderProps> = ({ currentStep, totalSteps }) => {
  return (
    <header 
      style={{
        background: 'linear-gradient(135deg, var(--ms-blue) 0%, var(--ms-purple) 100%)',
        color: 'var(--ms-white)',
        padding: '24px 0'
      }}
    >
      <div className="container">
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '32px',
                height: '32px',
                background: 'var(--ms-white)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ms-blue)',
                fontWeight: '600',
                fontSize: '18px'
              }}
            >
              LM
            </div>
            <div>
              <div className="ms-font-subtitle">La Mentory UPSC Study Planner</div>
              <div 
                className="ms-font-caption" 
                style={{ opacity: 0.9 }}
              >
                Personalized UPSC Preparation
              </div>
            </div>
          </div>
          <div className="ms-font-body">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;