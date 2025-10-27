import React from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';

const PaymentStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const { payment, targetYear, commitment } = formData;

  const handlePlanSelect = (planName: string) => {
    updateFormData({
      payment: {
        ...payment,
        selectedPlan: planName
      }
    });
  };

  const paymentPlans = [
    {
      id: 'basic',
      name: 'Basic Plan',
      amount: 9999,
      duration: '6 months',
      features: [
        'Personalized study schedule',
        'Subject-wise preparation',
        'Progress tracking',
        'Basic mentor support'
      ],
      recommended: commitment.timeCommitment < 6
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      amount: 19999,
      duration: '12 months',
      features: [
        'Everything in Basic',
        'Advanced analytics',
        'Weekly mentor calls',
        'Mock test series',
        'Current affairs updates'
      ],
      recommended: commitment.timeCommitment >= 6 && commitment.timeCommitment < 8
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      amount: 29999,
      duration: '18 months',
      features: [
        'Everything in Premium',
        'Daily mentor support',
        'Interview preparation',
        'Personality development',
        'Essay writing guidance',
        'One-on-one doubt sessions'
      ],
      recommended: commitment.timeCommitment >= 8
    }
  ];

  return (
    <StepLayout
      icon="💳"
      title="Choose Your Plan"
      description="Select the plan that best fits your UPSC preparation needs"
    >
      <div className="choice-grid choice-grid-3">
        {paymentPlans.map((plan) => (
          <div
            key={plan.id}
            style={{
              background: 'var(--ms-white)',
              border: payment.selectedPlan === plan.name 
                ? '2px solid var(--ms-blue)' 
                : '2px solid var(--ms-gray-40)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              transform: payment.selectedPlan === plan.name 
                ? 'translateY(-4px)' 
                : 'translateY(0)',
              boxShadow: payment.selectedPlan === plan.name 
                ? '0 8px 24px rgba(0, 120, 212, 0.15)' 
                : '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
            onClick={() => handlePlanSelect(plan.name)}
          >
            {plan.recommended && (
              <div
                style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--ms-green)',
                  color: 'var(--ms-white)',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                Recommended
              </div>
            )}

            {payment.selectedPlan === plan.name && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'var(--ms-blue)',
                  color: 'var(--ms-white)',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ✓
              </div>
            )}
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h3 
                style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  margin: '0 0 8px',
                  color: 'var(--ms-gray-130)'
                }}
              >
                {plan.name}
              </h3>
              <div 
                style={{
                  fontSize: '32px',
                  fontWeight: '600',
                  color: 'var(--ms-blue)',
                  marginBottom: '4px'
                }}
              >
                ₹{plan.amount.toLocaleString()}
              </div>
              <div 
                style={{
                  fontSize: '12px',
                  color: 'var(--ms-gray-90)'
                }}
              >
                {plan.duration}
              </div>
            </div>
            
            <div style={{ textAlign: 'left' }}>
              <h4 
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: 'var(--ms-gray-130)'
                }}
              >
                What's included:
              </h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {plan.features.map((feature, index) => (
                  <li 
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '8px',
                      fontSize: '13px',
                      color: 'var(--ms-gray-90)'
                    }}
                  >
                    <span style={{ color: 'var(--ms-green)', fontSize: '14px' }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      
      {payment.selectedPlan && (
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
            <span>🎯</span>
            <span>Perfect Choice for Your Goals!</span>
          </div>
          <div 
            style={{
              color: 'var(--ms-gray-130)',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '20px'
            }}
          >
            <p style={{ margin: '0 0 12px' }}>
              The <strong>{payment.selectedPlan}</strong> is perfectly aligned with your target year 
              ({targetYear.targetYear}) and daily commitment ({commitment.timeCommitment}+ hours).
            </p>
            <p style={{ margin: '0' }}>
              You'll get comprehensive support throughout your UPSC preparation journey with 
              personalized guidance and proven study methodologies.
            </p>
          </div>
          
          {payment.paymentLink && (
            <div 
              style={{
                background: 'var(--ms-white)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--ms-blue)'
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}
              >
                <span style={{ fontWeight: '600', color: 'var(--ms-gray-130)' }}>
                  Payment Link Ready
                </span>
                <span 
                  style={{
                    background: 'var(--ms-green)',
                    color: 'var(--ms-white)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  Secure
                </span>
              </div>
              <div 
                style={{
                  fontSize: '12px',
                  color: 'var(--ms-gray-90)',
                  marginBottom: '12px'
                }}
              >
                Click the link below to complete your payment securely:
              </div>
              <a
                href={payment.paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'var(--ms-blue)',
                  color: 'var(--ms-white)',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ms-blue-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ms-blue)';
                }}
              >
                <span>🔒</span>
                <span>Pay ₹{payment.amount.toLocaleString()}</span>
                <span>→</span>
              </a>
            </div>
          )}
        </div>
      )}
      
      <div 
        style={{
          marginTop: '24px',
          padding: '16px',
          background: 'var(--ms-gray-20)',
          borderRadius: '8px',
          textAlign: 'center'
        }}
      >
        <div 
          style={{
            fontSize: '12px',
            color: 'var(--ms-gray-90)',
            marginBottom: '8px'
          }}
        >
          🔒 Secure Payment • 💰 Money Back Guarantee • 📞 24/7 Support
        </div>
        <div 
          style={{
            fontSize: '11px',
            color: 'var(--ms-gray-80)'
          }}
        >
          All payments are processed securely. You can cancel anytime within 7 days for a full refund.
        </div>
      </div>
    </StepLayout>
  );
};

export default PaymentStep;