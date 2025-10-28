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
      <div className="payment-container">
        {/* Pricing Display */}
        <div className="pricing-card">
          <div className="price-amount">
            ₹{FIXED_AMOUNT}
          </div>
          <div className="price-description">
            UPSC Preparation Program
          </div>
          
          {/* Features */}
          <div style={{ textAlign: 'left', marginTop: '24px' }}>
            <h4 className="features-title">
              What you'll get:
            </h4>
            <ul className="features-list">
              {[
                'Personalized study schedule',
                'Subject-wise preparation plan',
                'Comprehensive study materials',
                'Progress tracking and analytics',
                'Expert mentor support'
              ].map((feature, index) => (
                <li key={index} className="feature-item">
                  <span className="feature-checkmark">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="payment-link-box">
              <div className="payment-link-header">
                <span className="payment-link-title">
                  Payment Link Ready
                </span>
                <span className="payment-badge">
                  Secure
                </span>
              </div>
              <div className="payment-link-instruction">
                Click the link below to complete your payment securely:
              </div>
              <a
                href={payment.paymentLink||undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="payment-button"
              >
                <span>🔒</span>
                <span>Pay ₹{FIXED_AMOUNT}</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      
      </div>
      
      <div className="payment-footer">
        <div className="payment-footer-features">
          🔒 Secure Payment • 💰 Money Back Guarantee • 📞 24/7 Support
        </div>
        <div className="payment-footer-disclaimer">
          All payments are processed securely. You can cancel anytime within 7 days for a full refund.
        </div>
      </div>
    </StepLayout>
  );
};

export default PaymentStep;