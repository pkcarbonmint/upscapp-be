import React from 'react';

interface HeaderProps {
  currentStep: number;
  totalSteps: number;
}

const Header: React.FC<HeaderProps> = ({ currentStep, totalSteps }) => {
  return (
    <header className="onb-header">
      <div className="container">
        <div className="onb-header__inner">
          <div className="onb-header__brand">
            <div className="onb-header__logo">LM</div>
            <div>
              <div className="ms-font-body">La Mentory UPSC Study Planner</div>
              <div className="ms-font-caption onb-header__subtitle">Personalized UPSC Preparation</div>
            </div>
          </div>
          <div className="ms-font-caption onb-header__step">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;