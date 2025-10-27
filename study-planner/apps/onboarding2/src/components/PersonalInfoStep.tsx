import React from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';

const PersonalInfoStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const handleInputChange = (field: keyof typeof formData.personalInfo, value: string | number) => {
    updateFormData({
      personalInfo: {
        ...formData.personalInfo,
        [field]: value
      }
    });
  };

  return (
    <StepLayout
      icon="👤"
      title="Welcome to Your UPSC Journey"
      description="Let's start by getting to know you better"
    >
      <div className="form-grid form-grid-2">
        <div>
          <label className="ms-label">Full Name</label>
          <input
            type="text"
            className="ms-input"
            value={formData.personalInfo.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            placeholder="Enter your full name"
          />
        </div>
        <div>
          <label className="ms-label">Email Address</label>
          <input
            type="email"
            className="ms-input"
            value={formData.personalInfo.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your.email@example.com"
          />
        </div>
        <div>
          <label className="ms-label">Phone Number</label>
          <input
            type="tel"
            className="ms-input"
            value={formData.personalInfo.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            placeholder="+91 98765 43210"
          />
        </div>
        <div>
          <label className="ms-label">Current Location</label>
          <input
            type="text"
            className="ms-input"
            value={formData.personalInfo.presentLocation}
            onChange={(e) => handleInputChange('presentLocation', e.target.value)}
            placeholder="City, State"
          />
        </div>
        <div>
          <label className="ms-label">Academic Stream</label>
          <select
            className="ms-select"
            value={formData.personalInfo.graduationStream}
            onChange={(e) => handleInputChange('graduationStream', e.target.value)}
          >
            <option value="">Select Stream</option>
            <option value="engineering">Engineering</option>
            <option value="arts">Arts</option>
            <option value="science">Science</option>
            <option value="commerce">Commerce</option>
          </select>
        </div>
        <div>
          <label className="ms-label">Year of Graduation</label>
          <input
            type="number"
            className="ms-input"
            value={formData.personalInfo.yearOfPassing}
            onChange={(e) => handleInputChange('yearOfPassing', parseInt(e.target.value) || 2024)}
            placeholder="2023"
            min="2000"
            max="2030"
          />
        </div>
      </div>
      
      <div style={{ marginTop: '24px' }}>
        <label className="ms-label">College/University</label>
        <input
          type="text"
          className="ms-input"
          value={formData.personalInfo.collegeUniversity}
          onChange={(e) => handleInputChange('collegeUniversity', e.target.value)}
          placeholder="Institution name"
        />
      </div>
      
      {formData.personalInfo.fullName && formData.personalInfo.presentLocation && (
        <div 
          style={{
            background: 'var(--ms-blue-light)',
            border: '1px solid var(--ms-blue)',
            borderRadius: '12px',
            padding: '24px',
            marginTop: '32px'
          }}
        >
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              color: 'var(--ms-blue)',
              fontWeight: '600',
              fontSize: '18px'
            }}
          >
            <span>💡</span>
            <span>Personalized Insights</span>
          </div>
          <div 
            style={{
              color: 'var(--ms-gray-130)',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
          >
            Welcome <strong>{formData.personalInfo.fullName}</strong>! Based on your location in{' '}
            <strong>{formData.personalInfo.presentLocation}</strong>, we've identified study resources 
            and coaching institutes that might interest you.
          </div>
        </div>
      )}
    </StepLayout>
  );
};

export default PersonalInfoStep;