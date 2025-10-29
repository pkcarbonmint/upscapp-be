import React from 'react';

interface FooterProps {
  currentStep?: number;
  totalSteps?: number;
}

const Footer: React.FC<FooterProps> = () => {
  const currentYear = new Date().getFullYear();
  
  // Try to load version from generated file
  const [version, setVersion] = React.useState<string>('');
  
  React.useEffect(() => {
    // Load version from generated file if it exists
    fetch('/version.json')
      .then(res => res.json())
      .then(data => setVersion(data.version))
      .catch(() => {
        // Fallback if version file doesn't exist
        setVersion('dev');
      });
  }, []);
  
  return (
    <footer className="footer">
      <div className="container">
        {/* Desktop Layout */}
        <div className="footer-content footer-content-desktop">
          <div className="footer-brand">
            <div className="header-logo">
              <img src="/helios-logo.png" alt="Helios Logo" />
            </div>
            <div>
              <div className="ms-font-caption">La Mentora</div>
              <div className="ms-font-caption footer-subtitle">
                Your UPSC Journey Starts Here
              </div>
            </div>
          </div>
          <div className="footer-right">
            {version && (
              <div className="ms-font-caption footer-version">
                v{version}
              </div>
            )}
            <div className="ms-font-caption footer-copyright">
              © {currentYear} La Mentora. All rights reserved.
            </div>
          </div>
        </div>
        
        {/* Mobile Layout */}
        <div className="footer-content footer-content-mobile">
          <div className="header-logo">
            <img src="/helios-logo.png" alt="Helios Logo" />
          </div>
          <div className="footer-mobile-text">
            <span className="ms-font-caption footer-copyright">
              © {currentYear} La Mentora. All rights reserved.
            </span>
            {version && (
              <span className="ms-font-caption footer-version">
                v{version}
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

