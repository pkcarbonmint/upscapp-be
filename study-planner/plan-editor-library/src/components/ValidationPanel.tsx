import React from 'react';
import { ValidationError } from '../types/editor';

interface ValidationPanelProps {
  errors: ValidationError[];
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ errors }) => {
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  const infoCount = errors.filter(e => e.severity === 'info').length;

  const getSeverityIcon = (severity: ValidationError['severity']) => {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  const getSeverityColor = (severity: ValidationError['severity']) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="validation-panel">
      <div className="validation-header mb-3">
        <h4 className="text-md font-semibold text-gray-900">Validation Results</h4>
        <div className="text-sm text-gray-600">
          {errorCount > 0 && <span className="text-red-600">{errorCount} errors</span>}
          {errorCount > 0 && warningCount > 0 && <span className="mx-2">•</span>}
          {warningCount > 0 && <span className="text-yellow-600">{warningCount} warnings</span>}
          {(errorCount > 0 || warningCount > 0) && infoCount > 0 && <span className="mx-2">•</span>}
          {infoCount > 0 && <span className="text-blue-600">{infoCount} info</span>}
        </div>
      </div>
      
      <div className="validation-errors space-y-2">
        {errors.map((error, index) => (
          <div
            key={index}
            className={`validation-error p-3 border rounded-lg ${getSeverityColor(error.severity)}`}
          >
            <div className="flex items-start space-x-2">
              <span className="text-sm">{getSeverityIcon(error.severity)}</span>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {error.path}
                </div>
                <div className="text-sm">
                  {error.message}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValidationPanel;
