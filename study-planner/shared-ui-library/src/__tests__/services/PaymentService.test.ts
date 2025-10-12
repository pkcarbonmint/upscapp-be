import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentService } from '../../services/PaymentService';
import { mockFetch, mockLocalStorage } from '../mocks/testUtils';
import type { PaymentLinkRequest, PaymentLinkResponse, PaymentStatus } from '../../auth/types';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  const mockFetchFn = vi.fn();

  beforeEach(() => {
    // Reset mocks
    mockFetch.reset();
    mockLocalStorage.clear();
    
    // Setup global mocks
    global.fetch = mockFetchFn;
    global.localStorage = mockLocalStorage as any;
    global.window = { 
      location: { origin: 'http://localhost:3000' },
      open: vi.fn()
    } as any;
    
    // Initialize service
    paymentService = new PaymentService('/api/studyplanner');
    
    vi.clearAllMocks();
  });

  describe('Payment Amount Calculation', () => {
    it('should calculate correct amounts for different plan types', () => {
      expect(paymentService.calculatePaymentAmount('basic')).toBe(2999);
      expect(paymentService.calculatePaymentAmount('premium')).toBe(4999);
      expect(paymentService.calculatePaymentAmount('enterprise')).toBe(9999);
    });

    it('should default to basic plan pricing', () => {
      expect(paymentService.calculatePaymentAmount()).toBe(2999);
    });

    it('should format amounts correctly', () => {
      expect(paymentService.formatAmount(2999)).toBe('₹2,999');
      expect(paymentService.formatAmount(4999)).toBe('₹4,999');
      expect(paymentService.formatAmount(9999)).toBe('₹9,999');
      expect(paymentService.formatAmount(10000)).toBe('₹10,000');
    });
  });

  describe('Payment Link Generation', () => {
    it('should create payment link successfully', async () => {
      const request: PaymentLinkRequest = {
        student_id: 'STU_001',
        amount: 2999,
        description: 'UPSC Study Plan',
        callback_url: 'http://localhost:3000/payment/success',
        expire_by: Math.floor(Date.now() / 1000) + 86400
      };

      const expectedResponse: PaymentLinkResponse = {
        payment_link_id: 'pl_test_123',
        payment_url: 'https://razorpay.com/pay/pl_test_123',
        status: 'created',
        reference_id: 'ref_STU_001_123'
      };

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: expectedResponse
        })
      });

      const result = await paymentService.createPaymentLink(request);

      expect(result).toEqual(expectedResponse);
      
      expect(mockFetchFn).toHaveBeenCalledWith(
        '/api/studyplanner/onboarding/payment/create-link',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request)
        })
      );
    });

    it('should generate Razorpay link with correct parameters', async () => {
      const studentId = 'STU_001';
      const amount = 2999;
      const description = 'Test Payment';

      const mockPaymentLink: PaymentLinkResponse = {
        payment_link_id: 'pl_test_456',
        payment_url: 'https://razorpay.com/pay/pl_test_456',
        status: 'created',
        reference_id: 'ref_test_456'
      };

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPaymentLink
        })
      });

      const result = await paymentService.generateRazorpayLink(studentId, amount, description);

      expect(result).toBe(mockPaymentLink.payment_url);
      
      // Verify the request includes callback URL and expiry
      expect(mockFetchFn).toHaveBeenCalledWith(
        '/api/studyplanner/onboarding/payment/create-link',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"callback_url":"http://localhost:3000/onboarding/payment/success"')
        })
      );
    });

    it('should handle payment link generation failure', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          message: 'Payment gateway error'
        })
      });

      await expect(
        paymentService.generateRazorpayLink('STU_001', 2999)
      ).rejects.toThrow('Failed to generate payment link. Please try again.');
    });
  });

  describe('Payment Processing', () => {
    beforeEach(() => {
      mockLocalStorage.setItem('shared_auth_token', 'valid_token');
    });

    it('should submit payment successfully', async () => {
      const studentId = 'STU_001';
      const paymentData = {
        name_on_card: 'John Doe',
        card_last4: '4242',
        expiry: '12/29',
        cvv_dummy: '***'
      };

      const expectedResponse = {
        student_id: studentId,
        payment_status: 'accepted',
        reference: 'PMT-REF-7-4242'
      };

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: expectedResponse
        })
      });

      const result = await paymentService.submitPayment(studentId, paymentData);

      expect(result).toEqual(expectedResponse);
      
      expect(mockFetchFn).toHaveBeenCalledWith(
        `/api/studyplanner/onboarding/students/${studentId}/payment`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(paymentData)
        })
      );
    });

    it('should check payment status', async () => {
      const paymentId = 'pay_test_123';
      const mockStatus: PaymentStatus = {
        payment_id: paymentId,
        status: 'paid',
        amount: 2999,
        created_at: '2024-01-01T00:00:00Z',
        paid_at: '2024-01-01T01:00:00Z'
      };

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockStatus
        })
      });

      const result = await paymentService.checkPaymentStatus(paymentId);

      expect(result).toEqual(mockStatus);
      
      expect(mockFetchFn).toHaveBeenCalledWith(
        `/api/studyplanner/onboarding/payment/${paymentId}/status`,
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should handle payment callback', async () => {
      const paymentData = {
        payment_id: 'pay_test_123',
        status: 'captured',
        amount: 2999
      };

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { processed: true }
        })
      });

      const result = await paymentService.handlePaymentCallback(paymentData);

      expect(result).toBe(true);
      
      expect(mockFetchFn).toHaveBeenCalledWith(
        '/api/studyplanner/onboarding/payment/callback',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(paymentData)
        })
      );
    });

    it('should get payment history', async () => {
      const studentId = 'STU_001';
      const mockHistory: PaymentStatus[] = [
        {
          payment_id: 'pay_001',
          status: 'paid',
          amount: 2999,
          created_at: '2024-01-01T00:00:00Z',
          paid_at: '2024-01-01T01:00:00Z'
        }
      ];

      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockHistory
        })
      });

      const result = await paymentService.getPaymentHistory(studentId);

      expect(result).toEqual(mockHistory);
      
      expect(mockFetchFn).toHaveBeenCalledWith(
        `/api/studyplanner/onboarding/students/${studentId}/payments`,
        expect.objectContaining({
          method: 'GET'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetchFn.mockRejectedValueOnce(new Error('Network failed'));

      const request: PaymentLinkRequest = {
        student_id: 'STU_001',
        amount: 2999,
        description: 'Test payment'
      };

      await expect(paymentService.createPaymentLink(request)).rejects.toThrow('Network failed');
    });

    it('should handle API errors', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          message: 'Invalid payment data'
        })
      });

      await expect(
        paymentService.submitPayment('STU_001', {})
      ).rejects.toThrow('HTTP error! status: 400');
    });

    it('should return empty array for failed payment history', async () => {
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          message: 'Student not found'
        })
      });

      const result = await paymentService.getPaymentHistory('INVALID_ID');

      expect(result).toEqual([]);
    });
  });
});