import React, { useState, useEffect } from 'react';
import { StepProps, SubjectCategory } from '@/types';
import StepLayout from './StepLayout';
import StarRating from './StarRating';
import { SubjectLoader } from 'helios-ts';

const ConfidenceStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const allSubjects = SubjectLoader.loadAllSubjects();
        setSubjects(allSubjects);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load subjects:', error);
        setLoading(false);
      }
    };
    loadSubjects();
  }, []);

  const confidenceLevels = [
    { value: 1, label: 'Beginner' },
    { value: 2, label: 'Basic' },
    { value: 3, label: 'Average' },
    { value: 4, label: 'Good' },
    { value: 5, label: 'Expert' }
  ];

  // Group subjects by category
  const subjectCategories: SubjectCategory[] = [
    {
      name: 'Core GS Subjects',
      subjects: subjects
        .filter(subject => subject.category === 'Macro' && subject.examFocus === 'BothExams')
        .map(subject => ({
          key: subject.subjectCode,
          name: subject.subjectName
        }))
    },
    {
      name: 'Prelims Only Subjects',
      subjects: subjects
        .filter(subject => subject.category === 'Macro' && subject.examFocus === 'PrelimsOnly')
        .map(subject => ({
          key: subject.subjectCode,
          name: subject.subjectName
        }))
    },
    {
      name: 'Mains Only Subjects',
      subjects: subjects
        .filter(subject => subject.category === 'Macro' && subject.examFocus === 'MainsOnly')
        .map(subject => ({
          key: subject.subjectCode,
          name: subject.subjectName
        }))
    }
  ];

  const handleConfidenceChange = (subjectKey: string, level: number) => {
    updateFormData({
      confidenceLevel: {
        ...formData.confidenceLevel,
        [subjectKey]: level
      }
    });
  };

  const getAverageConfidence = () => {
    const values = Object.values(formData.confidenceLevel);
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / values.length).toFixed(1);
  };

  const getWeakestSubject = () => {
    let weakest = null;
    let minConfidence = 6;
    
    for (const [subject, confidence] of Object.entries(formData.confidenceLevel)) {
      if (confidence < minConfidence) {
        minConfidence = confidence;
        weakest = subject;
      }
    }
    
    // Find the subject name
    for (const category of subjectCategories) {
      for (const subject of category.subjects) {
        if (subject.key === weakest) {
          return subject.name;
        }
      }
    }
    
    return 'Not determined';
  };

  if (loading) {
    return (
      <StepLayout
        icon="📊"
        title="Subject Confidence Assessment"
        description="Loading subjects..."
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: 'var(--ms-gray-90)' }}>
            Loading subjects from helios-ts library...
          </div>
        </div>
      </StepLayout>
    );
  }

  return (
    <StepLayout
      icon="📊"
      title="Subject Confidence Assessment"
      description="Rate your confidence level in key UPSC subjects (default: Average)"
    >
      {subjectCategories.map((category) => (
        <div key={category.name} style={{ marginBottom: '32px' }}>
          <h3 
            className="ms-font-subtitle" 
            style={{ 
              marginBottom: '16px', 
              color: 'var(--ms-blue)' 
            }}
          >
            {category.name}
          </h3>
          <div className="form-grid form-grid-2">
            {category.subjects.map((subject) => (
              <div key={subject.key}>
                <label className="ms-label">{subject.name}</label>
                <div style={{ marginTop: '8px' }}>
                  <StarRating
                    value={formData.confidenceLevel[subject.key] || 3} // Default to 3 (Average)
                    onChange={(value) => handleConfidenceChange(subject.key, value)}
                    size="medium"
                  />
                  <div 
                    style={{
                      fontSize: '12px',
                      color: 'var(--ms-gray-90)',
                      marginTop: '4px'
                    }}
                  >
                    {confidenceLevels.find(level => level.value === (formData.confidenceLevel[subject.key] || 3))?.label || 'Average'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {Object.keys(formData.confidenceLevel).length >= 12 && (
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
            <span>📈</span>
            <span>Your Confidence Profile</span>
          </div>
          <div className="form-grid form-grid-2" style={{ marginTop: '12px' }}>
            <div 
              style={{
                background: 'var(--ms-white)',
                padding: '12px',
                borderRadius: '4px',
                textAlign: 'center'
              }}
            >
              <div 
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: 'var(--ms-blue)',
                  marginBottom: '4px'
                }}
              >
                {getAverageConfidence()}/5
              </div>
              <div 
                style={{
                  fontSize: '12px',
                  color: 'var(--ms-gray-90)',
                  fontWeight: '500'
                }}
              >
                Average Confidence
              </div>
            </div>
            <div 
              style={{
                background: 'var(--ms-white)',
                padding: '12px',
                borderRadius: '4px',
                textAlign: 'center'
              }}
            >
              <div 
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--ms-blue)',
                  marginBottom: '4px'
                }}
              >
                {getWeakestSubject()}
              </div>
              <div 
                style={{
                  fontSize: '12px',
                  color: 'var(--ms-gray-90)',
                  fontWeight: '500'
                }}
              >
                Focus Area
              </div>
            </div>
          </div>
        </div>
      )}
    </StepLayout>
  );
};

export default ConfidenceStep;