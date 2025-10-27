import React, { useEffect } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';

const PaymentStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const { payment } = formData;
  const FIXED_AMOUNT = 499;

  // Set the fixed amount when component mounts
  useEffect(() => {
    if (!payment.selectedPlan || payment.amount !== FIXED_AMOUNT) {
      updateFormData({
        payment: {
          ...payment,
          selectedPlan: 'UPSC Preparation Plan',
          amount: FIXED_AMOUNT
        }
      });
    }
  }, []);

  return (
    <StepLayout
      icon="💳"
      title="Complete Your Payment"
      description="Secure your spot in our UPSC preparation program"
    >
      <div 
        style={{
          maxWidth: '600px',
          margin: '0 auto'
        }}
      >
        {/* Pricing Display */}
        <div
          style={{
            background: 'var(--ms-white)',
            border: '2px solid var(--ms-blue)',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(0, 120, 212, 0.12)'
          }}
        >
          <div 
            style={{
              fontSize: '48px',
              fontWeight: '600',
              color: 'var(--ms-blue)',
              marginBottom: '8px'
            }}
          >
            ₹{FIXED_AMOUNT}
          </div>
          <div 
            style={{
              fontSize: '16px',
              color: 'var(--ms-gray-90)',
              marginBottom: '24px'
            }}
          >
            UPSC Preparation Program
          </div>
          
          {/* Features */}
          <div style={{ textAlign: 'left', marginTop: '24px' }}>
            <h4 
              style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '16px',
                color: 'var(--ms-gray-130)',
                textAlign: 'center'
              }}
            >
              What you'll get:
            </h4>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {[
                'Personalized study schedule',
                'Subject-wise preparation plan',
                'Comprehensive study materials',
                'Progress tracking and analytics',
                'Expert mentor support'
              ].map((feature, index) => (
                <li 
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '12px',
                    fontSize: '14px',
                    color: 'var(--ms-gray-90)'
                  }}
                >
                  <span style={{ color: 'var(--ms-green)', fontSize: '16px' }}>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
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
                href={payment.paymentLink||undefined}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: 'var(--ms-blue)',
                  color: 'var(--ms-white)',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s ease',
                  width: '100%',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ms-blue-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ms-blue)';
                }}
              >
                <span>🔒</span>
                <span>Pay ₹{FIXED_AMOUNT}</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      
      </div>
      
      <div 
        style={{
          marginTop: '24px',
          padding: '16px',
          background: 'var(--ms-gray-20)',
          borderRadius: '8px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '24px auto 0'
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