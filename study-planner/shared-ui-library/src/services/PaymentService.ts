import { PaymentLinkRequest, PaymentLinkResponse, PaymentStatus, ApiResponse } from '../auth/types';

export class PaymentService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/studyplanner') {
    this.baseUrl = baseUrl;
  }

  // Common API call method
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem('shared_auth_token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Create payment link for student onboarding
  async createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    const response = await this.makeRequest<PaymentLinkResponse>('/onboarding/payment/create-link', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to create payment link');
  }

  // Submit payment for onboarding (mock for now)
  async submitPayment(studentId: string, paymentData: any): Promise<any> {
    const response = await this.makeRequest(`/onboarding/students/${studentId}/payment`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to submit payment');
  }

  // Check payment status
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const response = await this.makeRequest<PaymentStatus>(`/onboarding/payment/${paymentId}/status`, {
      method: 'GET',
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to check payment status');
  }

  // Generate payment link with Razorpay integration
  async generateRazorpayLink(
    studentId: string, 
    amount: number, 
    description: string = 'Study Plan Payment'
  ): Promise<string> {
    try {
      const request: PaymentLinkRequest = {
        student_id: studentId,
        amount: amount,
        description: description,
        callback_url: `${window.location.origin}/onboarding/payment/success`,
        expire_by: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
      };

      const paymentLink = await this.createPaymentLink(request);
      return paymentLink.payment_url;
    } catch (error) {
      console.error('Payment link generation failed:', error);
      throw new Error('Failed to generate payment link. Please try again.');
    }
  }

  // Handle payment callback/webhook
  async handlePaymentCallback(paymentData: any): Promise<boolean> {
    try {
      const response = await this.makeRequest('/onboarding/payment/callback', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });
      
      return response.success;
    } catch (error) {
      console.error('Payment callback handling failed:', error);
      return false;
    }
  }

  // Get payment history for a student
  async getPaymentHistory(studentId: string): Promise<PaymentStatus[]> {
    const response = await this.makeRequest<PaymentStatus[]>(`/onboarding/students/${studentId}/payments`, {
      method: 'GET',
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return [];
  }

  // Calculate payment amount based on plan type
  calculatePaymentAmount(planType: 'basic' | 'premium' | 'enterprise' = 'basic'): number {
    const pricing = {
      basic: 2999,    // ₹2,999
      premium: 4999,  // ₹4,999
      enterprise: 9999 // ₹9,999
    };
    
    return pricing[planType];
  }

  // Format amount for display
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;