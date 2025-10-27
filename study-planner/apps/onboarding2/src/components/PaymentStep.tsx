import React, { useEffect } from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';

const PaymentStep: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const { payment, targetYear, commitment } = formData;

  // Set the single pricing option on component mount
  useEffect(() => {
    if (!payment.selectedPlan) {
      updateFormData({
        payment: {
          ...payment,
          selectedPlan: 'UPSC Preparation Plan',
          amount: 499
        }
      });
    }
  }, [payment, updateFormData]);

  return (
    <StepLayout
      icon="💳"
      title="Complete Your Payment"
      description="Secure your UPSC preparation journey with our comprehensive study plan"
    >
      {/* Single Pricing Option */}
      <div 
        style={{
          background: 'var(--ms-white)',
          border: '2px solid var(--ms-blue)',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 8px 24px rgba(0, 120, 212, 0.15)',
          marginBottom: '32px'
        }}
      >
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
          Best Value
        </div>

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
        
        <div style={{ marginBottom: '24px' }}>
          <h3 
            style={{
              fontSize: '24px',
              fontWeight: '600',
              margin: '0 0 12px',
              color: 'var(--ms-gray-130)'
            }}
          >
            UPSC Preparation Plan
          </h3>
          <div 
            style={{
              fontSize: '48px',
              fontWeight: '700',
              color: 'var(--ms-blue)',
              marginBottom: '8px'
            }}
          >
            ₹499
          </div>
          <div 
            style={{
              fontSize: '16px',
              color: 'var(--ms-gray-90)',
              marginBottom: '20px'
            }}
          >
            One-time payment • Lifetime access
          </div>
        </div>
        
        <div style={{ textAlign: 'left', marginBottom: '24px' }}>
          <h4 
            style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--ms-gray-130)',
              textAlign: 'center'
            }}
          >
            What's included:
          </h4>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {[
              'Personalized study schedule based on your target year',
              'Subject-wise preparation roadmap',
              'Progress tracking and analytics',
              'Mock test series and practice questions',
              'Current affairs updates and analysis',
              'Mentor support and guidance',
              'Interview preparation resources',
              'Essay writing guidance and templates'
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
                <span style={{ color: 'var(--ms-green)', fontSize: '16px', marginTop: '2px' }}>✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Payment Section */}
      <div 
        style={{
          background: 'var(--ms-blue-light)',
          border: '1px solid var(--ms-blue)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
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
          <span>Ready to Start Your Journey!</span>
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
            Your personalized study plan is ready for your target year ({targetYear.targetYear}) 
            with {commitment.timeCommitment}+ hours daily commitment.
          </p>
          <p style={{ margin: '0' }}>
            Complete your payment to unlock your comprehensive UPSC preparation roadmap and start your journey to success.
          </p>
        </div>
        
        {payment.paymentLink ? (
          <div 
            style={{
              background: 'var(--ms-white)',
              padding: '20px',
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
                marginBottom: '16px'
              }}
            >
              Click the button below to complete your payment securely:
            </div>
            <a
              href={payment.paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 24px',
                background: 'var(--ms-blue)',
                color: 'var(--ms-white)',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'background-color 0.2s ease',
                boxShadow: '0 4px 12px rgba(0, 120, 212, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ms-blue-hover)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ms-blue)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>🔒</span>
              <span>Pay ₹499 Now</span>
              <span>→</span>
            </a>
          </div>
        ) : (
          <div 
            style={{
              background: 'var(--ms-gray-20)',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'var(--ms-gray-90)'
            }}
          >
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>⏳</span>
            </div>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>
              Generating Payment Link...
            </div>
            <div style={{ fontSize: '14px' }}>
              Please wait while we prepare your secure payment link.
            </div>
          </div>
        )}
      </div>
      
      <div 
        style={{
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