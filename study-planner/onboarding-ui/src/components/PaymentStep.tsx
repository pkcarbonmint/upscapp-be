import React from 'react';
import type { FormData } from '../types';

interface PaymentStepProps {
  formData: FormData;
  onUpdate: (updates: Partial<FormData>) => void;
}

const PaymentStep: React.FC<PaymentStepProps> = () => {
  const formRow = (labelText: string, value: string, isReadonly: boolean = true) => (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{labelText}</label>
      <input
        className="w-full border rounded p-2 text-gray-700"
        value={value}
        disabled={isReadonly}
        placeholder={labelText}
        readOnly={isReadonly}
      />
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h3 className="text-lg font-semibold">Payment (Dummy)</h3>
      <p className="text-sm text-gray-700">
        This is a placeholder step. No actual payment will be processed.
      </p>
      <p className="text-sm text-gray-700">
        You can safely proceed. The backend will record a mocked acceptance.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {formRow("Name on Card", "John Test", true)}
        {formRow("Card Last 4", "4242", true)}
        {formRow("Expiry", "12/29", true)}
        {formRow("CVV", "***", true)}
      </div>
    </div>
  );
};

export default PaymentStep;
