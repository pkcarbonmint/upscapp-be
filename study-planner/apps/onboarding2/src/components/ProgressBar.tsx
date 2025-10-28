import React from 'react';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="progress-bar-container">
      <div className="container">
        <div className="progress-bar-header">
          <span className="ms-font-body progress-bar-label">
            Setup Progress
          </span>
          <span className="ms-font-caption">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="progress-bar-track">
          <div 
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;