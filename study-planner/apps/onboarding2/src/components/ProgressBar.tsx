import React from 'react';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="progress-container">
      <div className="container">
        <div className="progress-header">
          <span className="ms-font-body progress-title">
            Setup Progress
          </span>
          <span className="ms-font-caption">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;