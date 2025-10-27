import React, { useEffect, useState } from 'react';
import { StepProps, SubjectCategory } from '@/types';
import StepLayout from './StepLayout';
import { SubjectLoader } from '@helios/helios-ts/src/services/SubjectLoader';

const ConfidenceStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const [subjectCategories, setSubjectCategories] = useState<SubjectCategory[]>([]);

  useEffect(() => {
    // Load subjects from helios-ts
    const gsSubjects = SubjectLoader.loadAllSubjects();
    
    // Group subjects by category
    const macroSubjects = gsSubjects
      .filter(s => s.category === 'Macro')
      .map(s => ({ key: s.subjectCode, name: s.subjectName }));
    
    const microSubjects = gsSubjects
      .filter(s => s.category === 'Micro')
      .map(s => ({ key: s.subjectCode, name: s.subjectName }));

    const categories: SubjectCategory[] = [
      {
        name: 'Core GS Subjects (Macro)',
        subjects: macroSubjects
      },
      {
        name: 'Additional Areas (Micro)',
        subjects: microSubjects
      }
    ];

    setSubjectCategories(categories);

    // Initialize all subjects with "average" (3) rating if not already set
    const initialConfidence: { [key: string]: number } = {};
    [...macroSubjects, ...microSubjects].forEach(subject => {
      if (!(subject.key in formData.confidenceLevel)) {
        initialConfidence[subject.key] = 3; // Default to "average"
      }
    });
    
    if (Object.keys(initialConfidence).length > 0) {
      updateFormData({
        confidenceLevel: {
          ...formData.confidenceLevel,
          ...initialConfidence
        }
      });
    }
  }, []);

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

  return (
    <StepLayout
      icon="📊"
      title="Subject Confidence Assessment"
      description="Rate your confidence level in key UPSC subjects"
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
                <div 
                  style={{
                    display: 'flex',
                    gap: '4px',
                    marginTop: '8px',
                    alignItems: 'center'
                  }}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '24px',
                        transition: 'transform 0.1s ease',
                        lineHeight: '1'
                      }}
                      onClick={() => handleConfidenceChange(subject.key, star)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {(formData.confidenceLevel[subject.key] || 3) >= star ? '⭐' : '☆'}
                    </button>
                  ))}
                  <span 
                    style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      color: 'var(--ms-gray-90)',
                      fontWeight: '500'
                    }}
                  >
                    {['', 'Beginner', 'Basic', 'Average', 'Good', 'Expert'][formData.confidenceLevel[subject.key] || 3]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {Object.keys(formData.confidenceLevel).length > 0 && (
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