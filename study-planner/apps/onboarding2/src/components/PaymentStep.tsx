import React from 'react';
import { StepProps } from '@/types';
import StepLayout from './StepLayout';

const PaymentStep: React.FC<StepProps> = ({ formData }) => {
  const { payment } = formData;

  return (
    <StepLayout
      icon="💳"
      title="Complete Your Payment"
      description="One-time purchase. Price: ₹499"
    >
      <div
        style={{
          background: 'var(--ms-blue-light)',
          border: '1px solid var(--ms-blue)',
          borderRadius: '12px',
          padding: '24px'
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
          <span>Helios Study Planner</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--ms-white)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid var(--ms-blue)'
          }}
        >
          <div>
            <div style={{ fontSize: '14px', color: 'var(--ms-gray-90)' }}>Total</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ms-gray-130)' }}>₹{(payment.amount || 499).toLocaleString()}</div>
          </div>

          {payment.paymentLink ? (
            <a
              href={payment.paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'var(--ms-blue)',
                color: 'var(--ms-white)',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              <span>🔒</span>
              <span>Pay ₹{(payment.amount || 499).toLocaleString()}</span>
              <span>→</span>
            </a>
          ) : (
            <button
              className="ms-button ms-button-primary"
              disabled
              style={{ padding: '10px 16px', minHeight: '40px' }}
            >
              Generating payment link…
            </button>
          )}
        </div>
      </div>

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