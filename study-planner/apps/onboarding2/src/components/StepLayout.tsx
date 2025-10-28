import React from 'react';

interface StepLayoutProps {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

const StepLayout: React.FC<StepLayoutProps> = ({ icon, title, description, children }) => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div 
        style={{
          textAlign: 'center',
          marginBottom: '12px'
        }}
      >
        <div 
          style={{
            width: '40px',
            height: '40px',
            background: 'var(--ms-blue-light)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px',
            fontSize: '18px'
          }}
        >
          {icon}
        </div>
        <h1 
          className="ms-font-title"
          style={{ 
            margin: '0 0 4px',
            color: 'var(--ms-gray-130)'
          }}
        >
          {title}
        </h1>
        <p 
          className="ms-font-body" 
          style={{ 
            margin: '0',
            color: 'var(--ms-gray-90)'
          }}
        >
          {description}
        </p>
      </div>
      
      <div 
        className="ms-card"
        style={{
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          marginBottom: '24px'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default StepLayout;