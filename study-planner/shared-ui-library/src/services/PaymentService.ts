// Payment Service implementing Razorpay integration per integration.md
import { PaymentLinkRequest, PaymentLinkResponse, PaymentStatus, ApiResponse } from '../auth/types';

// New types from integration.md
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  duration?: number;
  subjects?: Subject[];
}

export interface Subject {
  id: number;
  name: string;
  description: string;
  code: string;
  isOptionalSubject: boolean;
  isLanguage: boolean;
  benchmark: Benchmark[];
}

export interface Benchmark {
  stage: Stage;
  averageMarksPercentage: number;
  aspirationalMarksPercentage: number;
}

export interface Stage {
  id: number;
  name: string;
  description: string;
  stageSeq: number;
}

export interface LegalEntityDetails {
  breakupName: string;
  tenantId: number;
  name: string;
  gstin: string;
  gstRate: number;
}

export interface PurchaseRequest {
  purchases: Purchase[];
}

export interface Purchase {
  productId: number;
  priceId: number;
  studentId: number;
  admissionId?: number;
  purchaseType: "BUY";
  pricingModel: "ONE_TIME";
  installmentsCount?: number;
  quantity: number;
  amount: number;
  purchaseDate: string;
  discountId?: number;
  discountAmount?: number;
  additionalDiscountId?: number;
  additionalDiscAmt?: number;
  purchaseDetails: {
    subjects: Subject[];
    optionalSubject?: Subject;
    duration: number;
    info: string;
  };
  legalEntityDetails: LegalEntityDetails;
}

export interface PurchaseInstallment {
  priceId: number;
  productId: number;
  purchaseId: number;
  installmentDate: string;
  installmentAmount: number;
  installmentStatus: "CREATED";
  isOriginal: boolean;
  legalEntityDetails: LegalEntityDetails;
  productSessions?: any;
  seqId: number;
  price: number;
}

export interface PaymentLinkRequestV2 {
  purchaseIds: number[];
  purchaseInstallmentIds?: number[];
  studentId: number;
  amount: number;
  expireBy: number;
  customer: {
    name: string;
    contact: string;
    email: string;
  };
  callbackUrl: string;
  callbackMethod: "get" | "post";
  notify: {
    sms: boolean;
    email: boolean;
  };
  reminderEnable: boolean;
  notes: Record<string, any>;
  tenantId: number;
  legalentityName: string;
}

export interface PaymentLinkResponseV2 {
  id: string;
  short_url: string;
  reference_id: string;
  status: string;
}

export interface PaymentStatusResponse {
  id: string;
  txId: string;
  status: "COMPLETED" | "FAILED" | "PENDING";
}

export interface AdmissionRequest {
  userId: number;
  walkinId?: number;
  admissionDate: string;
  branchId: number;
  status: "NEW";
  signedAdmissionFormUrl?: string | null;
  admissionDetails: {
    admissionManagerName: string;
    admissionManagerId: number;
  };
}

export interface EnrollmentRequest {
  enrolledAs: "STUDENT";
  enrolledUserId: number;
  admissionId: number;
  batchId: number;
  offeringId: number;
  productId: number;
  enrollmentStatus: "ACTIVE";
}

export class PaymentService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v2') {
    this.baseUrl = baseUrl;
  }

  // Common API call method with authentication
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem('enhanced_auth_data');
    let accessToken = '';
    
    if (token) {
      try {
        const authData = JSON.parse(token);
        accessToken = authData.accessToken || '';
      } catch (e) {
        console.warn('Failed to parse auth token');
      }
    }
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
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

  // Step 1: Get All Products
  async getAllProducts(filters?: string): Promise<Product[]> {
    const queryParams = filters ? `?filters=${encodeURIComponent(filters)}` : '';
    
    const response = await this.makeRequest<{ data: Product[] }>(`/products${queryParams}`, {
      method: 'GET',
    });
    
    if (response.success && response.data) {
      return response.data.data;
    }
    
    throw new Error('Failed to get products');
  }

  // Step 2: Create Purchase Order
  async createPurchaseOrder(purchaseRequest: PurchaseRequest): Promise<any[]> {
    const response = await this.makeRequest<{ data: any[] }>('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchaseRequest),
    });
    
    if (response.success && response.data) {
      return response.data.data;
    }
    
    throw new Error('Failed to create purchase order');
  }

  // Step 3: Add Installment (if required)
  async addInstallment(installmentData: PurchaseInstallment): Promise<any[]> {
    const response = await this.makeRequest<{ data: any[] }>('/purchaseinstallments', {
      method: 'POST',
      body: JSON.stringify(installmentData),
    });
    
    if (response.success && response.data) {
      return response.data.data;
    }
    
    throw new Error('Failed to add installment');
  }

  // Step 4: Generate Payment Link
  async generatePaymentLink(paymentLinkRequest: PaymentLinkRequestV2): Promise<PaymentLinkResponseV2> {
    const response = await this.makeRequest<PaymentLinkResponseV2>('/purchases/pay/links', {
      method: 'POST',
      body: JSON.stringify(paymentLinkRequest),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to generate payment link');
  }

  // Step 5: Check Payment Status
  async checkPaymentStatus(
    referenceId: string, 
    paymentLinkId: string, 
    legalEntityName: string, 
    tenantId: number
  ): Promise<PaymentStatusResponse> {
    const queryParams = `?paymentlink_id=${paymentLinkId}&legalentity_name=${legalEntityName}&tenant_id=${tenantId}`;
    
    const response = await this.makeRequest<PaymentStatusResponse>(`/purchases/paymentlink/${referenceId}/status${queryParams}`, {
      method: 'GET',
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to check payment status');
  }

  // Step 6: Create Admission
  async createAdmission(admissionData: AdmissionRequest): Promise<any> {
    const response = await this.makeRequest<any>('/admission', {
      method: 'POST',
      body: JSON.stringify(admissionData),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to create admission');
  }

  // Step 7: Create Enrollment
  async createEnrollment(enrollmentData: EnrollmentRequest): Promise<any> {
    const response = await this.makeRequest<any>('/enrollment', {
      method: 'POST',
      body: JSON.stringify(enrollmentData),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to create enrollment');
  }

  // Step 8: Update Purchase Order
  async updatePurchaseOrder(purchaseId: number, updateData: any): Promise<any> {
    const response = await this.makeRequest<any>(`/purchases/${purchaseId}`, {
      method: 'POST',
      body: JSON.stringify(updateData),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to update purchase order');
  }

  // Comprehensive payment flow
  async initiatePayment(
    studentId: number,
    productId: number,
    amount: number,
    studentDetails: {
      name: string;
      email: string;
      phone: string;
    }
  ): Promise<{
    paymentUrl: string;
    paymentLinkId: string;
    referenceId: string;
    purchaseIds: number[];
  }> {
    try {
      // Create default legal entity details
      const legalEntityDetails: LegalEntityDetails = {
        breakupName: "Default Entity",
        tenantId: 1,
        name: "LAEX Education",
        gstin: "29ABCDE1234F1Z5",
        gstRate: 18
      };

      // Step 2: Create purchase order
      const purchaseRequest: PurchaseRequest = {
        purchases: [{
          productId: productId,
          priceId: 1, // Default price ID
          studentId: studentId,
          purchaseType: "BUY",
          pricingModel: "ONE_TIME",
          quantity: 1,
          amount: amount,
          purchaseDate: new Date().toISOString(),
          purchaseDetails: {
            subjects: [], // Will be populated based on product
            duration: 12, // Default 12 months
            info: "UPSC Study Plan Purchase"
          },
          legalEntityDetails
        }]
      };

      const purchases = await this.createPurchaseOrder(purchaseRequest);
      const purchaseIds = purchases.map(p => p.id);

      // Step 4: Generate payment link
      const paymentLinkRequest: PaymentLinkRequestV2 = {
        purchaseIds: purchaseIds,
        studentId: studentId,
        amount: amount,
        expireBy: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        customer: {
          name: studentDetails.name,
          contact: studentDetails.phone,
          email: studentDetails.email
        },
        callbackUrl: `${window.location.origin}/payment/callback`,
        callbackMethod: "get",
        notify: {
          sms: true,
          email: true
        },
        reminderEnable: true,
        notes: {
          description: "UPSC Study Plan Payment",
          order_type: "study_plan"
        },
        tenantId: 1,
        legalentityName: legalEntityDetails.name
      };

      const paymentLink = await this.generatePaymentLink(paymentLinkRequest);

      return {
        paymentUrl: paymentLink.short_url,
        paymentLinkId: paymentLink.id,
        referenceId: paymentLink.reference_id,
        purchaseIds: purchaseIds
      };
    } catch (error) {
      console.error('Payment initiation failed:', error);
      throw new Error('Failed to initiate payment. Please try again.');
    }
  }

  // Complete payment flow after successful payment
  async completePaymentFlow(
    userId: number,
    purchaseIds: number[],
    admissionData?: Partial<AdmissionRequest>
  ): Promise<{
    admissionId: number;
    enrollmentId: number;
  }> {
    try {
      // Step 6: Create admission
      const admission = await this.createAdmission({
        userId: userId,
        admissionDate: new Date().toISOString().split('T')[0],
        branchId: 1, // Default branch
        status: "NEW",
        signedAdmissionFormUrl: null,
        admissionDetails: {
          admissionManagerName: "System",
          admissionManagerId: 1
        },
        ...admissionData
      });

      // Step 7: Create enrollment (for the first product)
      const enrollment = await this.createEnrollment({
        enrolledAs: "STUDENT",
        enrolledUserId: userId,
        admissionId: admission.id,
        batchId: 1, // Default batch
        offeringId: 1, // Default offering
        productId: 1, // Will be updated based on actual purchase
        enrollmentStatus: "ACTIVE"
      });

      // Step 8: Update purchase orders with admission ID
      await Promise.all(
        purchaseIds.map(purchaseId =>
          this.updatePurchaseOrder(purchaseId, {
            admissionId: admission.id
          })
        )
      );

      return {
        admissionId: admission.id,
        enrollmentId: enrollment.id
      };
    } catch (error) {
      console.error('Payment completion flow failed:', error);
      throw new Error('Failed to complete payment flow');
    }
  }

  // Legacy methods for backward compatibility
  async createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    // Convert legacy request to new format
    const newRequest: PaymentLinkRequestV2 = {
      purchaseIds: [], // Will be created
      studentId: parseInt(request.student_id),
      amount: request.amount,
      expireBy: request.expire_by || Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      customer: {
        name: "Student",
        contact: "+911234567890",
        email: "student@example.com"
      },
      callbackUrl: request.callback_url || `${window.location.origin}/payment/callback`,
      callbackMethod: "get",
      notify: {
        sms: true,
        email: true
      },
      reminderEnable: true,
      notes: {},
      tenantId: 1,
      legalentityName: "LAEX Education"
    };

    const result = await this.generatePaymentLink(newRequest);
    
    return {
      payment_link_id: result.id,
      payment_url: result.short_url,
      status: result.status,
      reference_id: result.reference_id
    };
  }

  async submitPayment(studentId: string, paymentData: any): Promise<any> {
    // Legacy method - redirect to new flow
    return { success: true, message: "Use initiatePayment method instead" };
  }

  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    // Legacy method - will need reference_id and other params for new API
    throw new Error("Use checkPaymentStatus with full parameters");
  }

  async generateRazorpayLink(
    studentId: string, 
    amount: number, 
    description: string = 'Study Plan Payment'
  ): Promise<string> {
    try {
      const result = await this.initiatePayment(
        parseInt(studentId),
        1, // Default product ID
        amount,
        {
          name: "Student",
          email: "student@example.com",
          phone: "+911234567890"
        }
      );

      return result.paymentUrl;
    } catch (error) {
      console.error('Payment link generation failed:', error);
      throw new Error('Failed to generate payment link. Please try again.');
    }
  }

  async handlePaymentCallback(paymentData: any): Promise<boolean> {
    try {
      // Handle payment callback/webhook
      console.log('Payment callback received:', paymentData);
      return true;
    } catch (error) {
      console.error('Payment callback handling failed:', error);
      return false;
    }
  }

  async getPaymentHistory(studentId: string): Promise<PaymentStatus[]> {
    // Will need to implement based on backend API
    return [];
  }

  calculatePaymentAmount(planType: 'basic' | 'premium' | 'enterprise' = 'basic'): number {
    const pricing = {
      basic: 2999,    // ₹2,999
      premium: 4999,  // ₹4,999
      enterprise: 9999 // ₹9,999
    };
    
    return pricing[planType];
  }

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