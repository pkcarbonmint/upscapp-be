import React from 'react';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div 
      style={{
        background: 'var(--ms-white)',
        borderBottom: '1px solid var(--ms-gray-30)',
        padding: '16px 0'
      }}
    >
      <div className="container">
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}
        >
          <span 
            className="ms-font-body" 
            style={{ fontWeight: '600' }}
          >
            Setup Progress
          </span>
          <span className="ms-font-caption">
            {Math.round(progress)}%
          </span>
        </div>
        <div 
          style={{
            width: '100%',
            height: '4px',
            background: 'var(--ms-gray-30)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}
        >
          <div 
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--ms-blue) 0%, var(--ms-purple) 100%)',
              width: `${progress}%`,
              borderRadius: '2px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;