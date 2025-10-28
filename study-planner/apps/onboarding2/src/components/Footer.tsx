import React from 'react';

interface FooterProps {
  currentStep: number;
  totalSteps: number;
}

const Footer: React.FC<FooterProps> = ({ currentStep, totalSteps }) => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="header-logo">
              LM
            </div>
            <div>
              <div className="ms-font-caption">La Mentora</div>
              <div className="ms-font-caption footer-subtitle">
                Your UPSC Journey Starts Here
              </div>
            </div>
          </div>
          <div className="footer-copyright">
            <div className="ms-font-caption">
              © {currentYear} La Mentora. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

