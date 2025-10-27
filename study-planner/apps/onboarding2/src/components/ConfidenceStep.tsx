import React, { useEffect, useMemo, useState } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';
import { type Subject } from 'helios-ts';

const starStyle: React.CSSProperties = {
  cursor: 'pointer',
  color: 'var(--ms-gray-90)',
  fontSize: '18px',
};

const activeStarStyle: React.CSSProperties = {
  color: 'var(--ms-yellow, #f5a623)'
};

const ConfidenceStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { loadAllSubjects } = await import('helios-ts');
        const subs = await loadAllSubjects(formData.commitment.upscOptionalSubject);
        if (mounted) setSubjects(subs);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [formData.commitment.upscOptionalSubject]);

  const handleConfidenceChange = (subjectCode: string, level: number) => {
    updateFormData({
      confidenceLevel: {
        ...formData.confidenceLevel,
        [subjectCode]: level
      }
    });
  };

  const grouped = useMemo(() => {
    const macro = subjects.filter(s => s.category === 'Macro');
    const micro = subjects.filter(s => s.category === 'Micro' || s.category === 'Optional');
    return [
      { name: 'GS Subjects', list: macro },
      { name: 'Additional Areas', list: micro }
    ];
  }, [subjects]);

  const getAverageConfidence = () => {
    const values = Object.values(formData.confidenceLevel);
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / values.length).toFixed(1);
  };

  const getWeakestSubject = () => {
    let minCode: string | null = null;
    let minVal = 6;
    for (const [code, val] of Object.entries(formData.confidenceLevel)) {
      if (val < minVal) { minVal = val; minCode = code; }
    }
    const subj = subjects.find(s => s.subjectCode === minCode);
    return subj ? subj.subjectName : 'Not determined';
  };

  const renderStars = (current: number, onChange: (v: number) => void) => (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1,2,3,4,5].map(n => (
        <span
          key={n}
          role="button"
          aria-label={`${n} star`}
          style={{ ...starStyle, ...(current >= n ? activeStarStyle : {}) }}
          onClick={() => onChange(n)}
        >
          ★
        </span>
      ))}
    </div>
  );

  return (
    <StepLayout
      icon="📊"
      title="Subject Confidence Assessment"
      description="Rate your confidence level in UPSC subjects"
    >
      {loading ? (
        <div>Loading subjects…</div>
      ) : (
        grouped.map(group => (
          <div key={group.name} style={{ marginBottom: '24px' }}>
            <h3 className="ms-font-subtitle" style={{ marginBottom: '12px', color: 'var(--ms-blue)' }}>
              {group.name}
            </h3>
            <div className="form-grid form-grid-2">
              {group.list.map(subject => (
                <div key={subject.subjectCode}>
                  <label className="ms-label">{subject.subjectName}</label>
                  <div style={{ marginTop: 8 }}>
                    {renderStars(formData.confidenceLevel[subject.subjectCode] || 3, (v) => handleConfidenceChange(subject.subjectCode, v))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {Object.keys(formData.confidenceLevel).length >= 12 && (
        <div 
          style={{
            background: 'var(--ms-blue-light)',
            border: '1px solid var(--ms-blue)',
            borderRadius: '12px',
            padding: '24px',
            marginTop: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, color: 'var(--ms-blue)', fontWeight: 600, fontSize: 18 }}>
            <span>📈</span>
            <span>Your Confidence Profile</span>
          </div>
          <div className="form-grid form-grid-2" style={{ marginTop: 12 }}>
            <div style={{ background: 'var(--ms-white)', padding: 12, borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--ms-blue)', marginBottom: 4 }}>{getAverageConfidence()}/5</div>
              <div style={{ fontSize: 12, color: 'var(--ms-gray-90)', fontWeight: 500 }}>Average Confidence</div>
            </div>
            <div style={{ background: 'var(--ms-white)', padding: 12, borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ms-blue)', marginBottom: 4 }}>{getWeakestSubject()}</div>
              <div style={{ fontSize: 12, color: 'var(--ms-gray-90)', fontWeight: 500 }}>Focus Area</div>
            </div>
          </div>
        </div>
      )}
    </StepLayout>
  );
};

export default ConfidenceStep;