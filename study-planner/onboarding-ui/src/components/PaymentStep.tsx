import React, { useState } from 'react';
import type { IntakeWizardFormData } from '../types';
import { paymentService, enhancedAuthService } from 'shared-ui-library';
import { Button } from '@/components/ui/button';
import { ExternalLink, CreditCard, Loader2, RefreshCw } from 'lucide-react';

interface PaymentStepProps {
  formData: IntakeWizardFormData;
  onUpdate: (updates: Partial<IntakeWizardFormData>) => void;
}

const PaymentStep: React.FC<PaymentStepProps> = ({ formData, onUpdate }) => {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    paymentUrl?: string;
    paymentLinkId?: string;
    referenceId?: string;
    purchaseIds?: number[];
  } | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentAmount] = useState(() => paymentService.calculatePaymentAmount('basic'));

  // Get current user data
  const currentUser = enhancedAuthService.getCurrentUser();
  const studentId = currentUser?.id || parseInt(formData.final?.studentId || '1');

  const generatePaymentLink = async () => {
    setIsGeneratingLink(true);
    setPaymentError(null);
    
    try {
      const studentDetails = {
        name: formData.background?.fullName || currentUser?.full_name || 'Student',
        email: formData.background?.email || currentUser?.email || 'student@example.com',
        phone: formData.background?.phoneNumber || currentUser?.phone_number || '+911234567890'
      };

      const result = await paymentService.initiatePayment(
        studentId,
        1, // Default product ID
        paymentAmount,
        studentDetails
      );
      
      setPaymentData(result);
      
      // Update form data with payment info
      onUpdate({
        payment: {
          amount: paymentAmount,
          status: 'link_generated',
          payment_url: result.paymentUrl,
          payment_link_id: result.paymentLinkId,
          reference_id: result.referenceId,
          created_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Failed to generate payment link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handlePaymentClick = () => {
    if (paymentData?.paymentUrl) {
      // Open payment link in new tab
      window.open(paymentData.paymentUrl, '_blank');
      
      // Mark payment as attempted
      onUpdate({
        payment: {
          ...formData.payment,
          status: 'attempted',
          attempted_at: new Date().toISOString()
        }
      });
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentData?.referenceId || !paymentData?.paymentLinkId) return;
    
    setIsCheckingStatus(true);
    
    try {
      const status = await paymentService.checkPaymentStatus(
        paymentData.referenceId,
        paymentData.paymentLinkId,
        "LAEX Education",
        1
      );
      
      if (status.status === 'COMPLETED') {
        // Complete the payment flow
        await paymentService.completePaymentFlow(
          studentId,
          paymentData.purchaseIds || []
        );
        
        onUpdate({
          payment: {
            ...formData.payment,
            status: 'completed',
            completed_at: new Date().toISOString(),
            transaction_id: status.txId
          }
        });
      } else {
        onUpdate({
          payment: {
            ...formData.payment,
            status: status.status.toLowerCase() as any
          }
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setPaymentError('Failed to check payment status');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const simulatePaymentSuccess = () => {
    // For demo purposes - simulate successful payment
    onUpdate({
      payment: {
        ...formData.payment,
        status: 'completed',
        completed_at: new Date().toISOString(),
        transaction_id: `TXN_${Date.now()}`
      }
    });
  };

  const isPaymentCompleted = formData.payment?.status === 'completed';
  const isPaymentPending = formData.payment?.status === 'attempted' || formData.payment?.status === 'pending';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Complete Your Payment</h3>
        <p className="text-gray-600">
          Secure your personalized UPSC study plan with premium features
        </p>
      </div>

      {/* Payment Amount Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-lg">Premium Study Plan</h4>
            <p className="text-sm text-gray-600">Complete access to personalized study resources</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {paymentService.formatAmount(paymentAmount)}
            </div>
          </div>
        </div>
        
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>AI-powered personalized study schedule</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Subject-wise confidence assessment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Resource recommendations and study materials</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Progress tracking and milestone management</span>
          </div>
        </div>
      </div>

      {/* Payment Status Display */}
      {isPaymentCompleted && (
        <div className="border rounded-lg p-6 bg-green-50 border-green-200">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-green-800">Payment Successful!</h4>
              <p className="text-sm text-green-700">
                Your payment has been processed successfully. You now have full access to your study plan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Options */}
      {!isPaymentCompleted && (
        <div className="border rounded-lg p-6">
          {!paymentData ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto">
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Secure Payment Gateway</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Pay securely using UPI, Credit/Debit Cards, or Net Banking through Razorpay
                </p>
              </div>
              
              <Button
                onClick={generatePaymentLink}
                disabled={isGeneratingLink}
                className="px-8 py-3"
                size="lg"
              >
                {isGeneratingLink ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Payment Link...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Proceed to Payment
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
                <ExternalLink className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Payment Link Ready</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Click below to open the secure Razorpay payment page
                </p>
              </div>
              
              <div className="flex gap-3 justify-center flex-wrap">
                <Button
                  onClick={handlePaymentClick}
                  className="px-8 py-3"
                  size="lg"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Payment Page
                </Button>
                
                {isPaymentPending && (
                  <Button
                    onClick={checkPaymentStatus}
                    disabled={isCheckingStatus}
                    variant="outline"
                    className="px-6 py-3"
                    size="lg"
                  >
                    {isCheckingStatus ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Check Status
                      </>
                    )}
                  </Button>
                )}
                
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    onClick={simulatePaymentSuccess}
                    variant="outline"
                    className="px-6 py-3"
                    size="lg"
                  >
                    Simulate Success (Dev)
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-gray-500">
                Complete your payment on the secure Razorpay page and return here to continue
              </p>
            </div>
          )}
          
          {paymentError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{paymentError}</p>
              <Button
                onClick={generatePaymentLink}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Security Note */}
      <div className="text-center text-xs text-gray-500">
        <p>🔒 Your payment is protected by Razorpay's bank-grade encryption</p>
        <p>We do not store any payment information on our servers</p>
      </div>
    </div>
  );
};

export default PaymentStep;
