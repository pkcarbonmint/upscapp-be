import React from 'react';

interface StepLayoutProps {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

const StepLayout: React.FC<StepLayoutProps> = ({ icon, title, description, children }) => {
  return (
    <div className="step-layout">
      <div className="step-layout__intro">
        <div className="step-layout__icon">{icon}</div>
        <h1 className="ms-font-title step-layout__title">{title}</h1>
        <p className="ms-font-body step-layout__desc">{description}</p>
      </div>

      <div className="ms-card step-layout__card">
        {children}
      </div>
    </div>
  );
};

export default StepLayout;