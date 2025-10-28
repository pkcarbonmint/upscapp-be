import React from 'react';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="progress">
      <div className="container">
        <div className="progress__row">
          <span className="ms-font-body progress__label">Setup Progress</span>
          <span className="ms-font-caption">{Math.round(progress)}%</span>
        </div>
        <div className="progress__track">
          <div className="progress__bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;