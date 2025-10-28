import React from 'react';

interface StepLayoutProps {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

const StepLayout: React.FC<StepLayoutProps> = ({ icon, title, description, children }) => {
  return (
    <div className="step-container">
      <div className="step-header">
        <div className="step-icon">
          {icon}
        </div>
        <h1 className="ms-font-title step-title">
          {title}
        </h1>
        <p className="ms-font-body step-description">
          {description}
        </p>
      </div>
      
      <div className="ms-card step-card">
        {children}
      </div>
    </div>
  );
};

export default StepLayout;