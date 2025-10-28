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
      <div className="payment">
        {/* Pricing Display */}
        <div className="pricing-card">
          <div className="pricing-card__price">
            ₹{FIXED_AMOUNT}
          </div>
          <div className="pricing-card__subtitle">
            UPSC Preparation Program
          </div>
          
          {/* Features */}
          <div className="text-left mt-24">
            <h4 className="section-heading-sm">
              What you'll get:
            </h4>
            <ul className="feature-list">
              {[
                'Personalized study schedule',
                'Subject-wise preparation plan',
                'Comprehensive study materials',
                'Progress tracking and analytics',
                'Expert mentor support'
              ].map((feature, index) => (
                <li key={index} className="feature-item">
                  <span className="feature-item__check">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="notice-card">
              <div className="notice-card__header">
                <span className="notice-card__title">Payment Link Ready</span>
                <span className="badge">Secure</span>
              </div>
              <div className="payment-footnote__row">Click the link below to complete your payment securely:</div>
              <a
                href={payment.paymentLink||undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-link-btn"
              >
                <span>🔒</span>
                <span>Pay ₹{FIXED_AMOUNT}</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <div className="payment-footnote">
        <div className="payment-footnote__row">🔒 Secure Payment • 💰 Money Back Guarantee • 📞 24/7 Support</div>
        <div className="payment-footnote__small">All payments are processed securely. You can cancel anytime within 7 days for a full refund.</div>
      </div>
    </StepLayout>
  );
};

export default PaymentStep;