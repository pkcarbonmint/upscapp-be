import React from 'react';

interface HeaderProps {
  currentStep: number;
  totalSteps: number;
}

const Header: React.FC<HeaderProps> = ({ currentStep, totalSteps }) => {
  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="header-branding">
            <div className="header-logo">
              LM
            </div>
            <div>
              <div className="ms-font-body">La Mentory UPSC Study Planner</div>
              <div className="ms-font-caption header-subtitle">
                Personalized UPSC Preparation
              </div>
            </div>
          </div>
          <div className="ms-font-caption header-step-indicator">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;