import { Request, Response } from 'express';
import { paymentService } from '../../services/payment.service';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse
} from '../../utils/response';
import { z } from 'zod';

// Enhanced validation schemas
const processPaymentSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
  paymentMethod: z.enum(['card', 'mobile_money', 'bank_transfer'], {
    errorMap: () => ({ message: 'Payment method must be card, mobile_money, or bank_transfer' })
  }),
  paymentDetails: z.object({
    cardNumber: z.string().regex(/^\d{16}$/, 'Card number must be 16 digits').optional(),
    expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Invalid expiry month').optional(),
    expiryYear: z.string().regex(/^\d{4}$/, 'Invalid expiry year').optional(),
    cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits').optional(),
    cardholderName: z.string().max(100, 'Cardholder name cannot exceed 100 characters').optional(),
    phoneNumber: z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number format').optional(),
    provider: z.enum(['mtn', 'airtel', 'tigo']).optional()
  }).optional(),
  mobileMoneyDetails: z.object({
    phoneNumber: z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number format'),
    provider: z.enum(['mtn', 'airtel', 'tigo'], {
      errorMap: () => ({ message: 'Provider must be mtn, airtel, or tigo' })
    })
  }).optional(),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('RWF')
});

const requestRefundSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason cannot exceed 500 characters'),
  refundAmount: z.coerce.number().min(1, 'Refund amount must be greater than 0').optional(),
  refundMethod: z.enum(['original', 'bank_transfer', 'mobile_money'], {
    errorMap: () => ({ message: 'Refund method must be original, bank_transfer, or mobile_money' })
  })
});

const generateInvoiceSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
  includeDetails: z.boolean().optional().default(true),
  format: z.enum(['pdf', 'html'], {
    errorMap: () => ({ message: 'Format must be pdf or html' })
  }).optional().default('pdf')
});

export const paymentController = {
  // POST /api/payments/process - Process payment
  async processPayment(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to process payments. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const paymentData = processPaymentSchema.parse(req.body);

      // Validate payment method specific details
      if (paymentData.paymentMethod === 'card') {
        if (!paymentData.paymentDetails?.cardNumber || !paymentData.paymentDetails?.expiryMonth || 
            !paymentData.paymentDetails?.expiryYear || !paymentData.paymentDetails?.cvv) {
          return errorResponse(
            res, 
            400, 
            'Card payment requires card number, expiry month, expiry year, and CVV',
            null,
            { paymentMethod: 'card', requiredFields: ['cardNumber', 'expiryMonth', 'expiryYear', 'cvv'] }
          );
        }
      }

      if (paymentData.paymentMethod === 'mobile_money') {
        if (!paymentData.mobileMoneyDetails?.phoneNumber || !paymentData.mobileMoneyDetails?.provider) {
          return errorResponse(
            res, 
            400, 
            'Mobile money payment requires phone number and provider',
            null,
            { paymentMethod: 'mobile_money', requiredFields: ['phoneNumber', 'provider'] }
          );
        }
      }

      const payment = await paymentService.processPayment(userId, paymentData);

      // Enhanced payment response
      const enhancedPayment = {
        ...payment,
        paymentInfo: {
          method: paymentData.paymentMethod,
          amount: paymentData.amount,
          currency: paymentData.currency,
          reference: payment.paymentReference,
          status: payment.status
        },
        securityInfo: {
          encrypted: true,
          pciCompliant: true,
          fraudProtection: true
        },
        nextSteps: payment.status === 'completed' ? [
          'Payment processed successfully',
          'Booking confirmation has been sent',
          'You can view your booking in your profile'
        ] : [
          'Payment is being processed',
          'You will receive confirmation shortly',
          'Check payment status for updates'
        ]
      };

      return successResponse(
        res, 
        payment.status === 'completed' ? 201 : 202,
        payment.status === 'completed' 
          ? 'Payment processed successfully! Your booking is confirmed.' 
          : 'Payment is being processed. You will receive confirmation shortly.',
        enhancedPayment,
        {
          version: 'v1',
          service: 'payment-service',
          operation: 'process_payment'
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The payment information provided is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error processing payment:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to process payment at this time. Please try again later.',
        error,
        { 
          operation: 'process_payment',
          userId: req.user?.id,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  },

  // POST /api/payments/refund - Request refund
  async requestRefund(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to request refunds. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const refundData = requestRefundSchema.parse(req.body);
      const refund = await paymentService.requestRefund(userId, refundData);

      // Enhanced refund response
      const enhancedRefund = {
        ...refund,
        refundInfo: {
          refundReference: refund.refundReference,
          amount: parseFloat(refund.amount),
          currency: 'RWF', // Default currency
          method: refund.refundMethod,
          status: refund.status,
          estimatedProcessingTime: '3-5 business days'
        },
        processInfo: {
          requestedAt: refund.requestedAt,
          expectedCompletion: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
          trackingNumber: `TRK-${refund.id.substring(0, 8).toUpperCase()}`
        },
        nextSteps: [
          'Refund request has been submitted for review',
          'You will receive email updates on the status',
          'Refunds typically process within 3-5 business days'
        ]
      };

      return successResponse(
        res, 
        201, 
        'Refund request submitted successfully! You will receive updates via email.',
        enhancedRefund,
        {
          version: 'v1',
          service: 'payment-service',
          operation: 'request_refund'
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The refund request information is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error requesting refund:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to process refund request at this time. Please try again later.',
        error,
        { 
          operation: 'request_refund',
          userId: req.user?.id,
          suggestion: 'Please try again or contact support for assistance'
        }
      );
    }
  },

  // GET /api/payments/history - Get payment history
  async getPaymentHistory(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to view payment history. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const paymentHistory = await paymentService.getPaymentHistory(userId, filters);

      // Enhanced payment history response
      const enhancedHistory = {
        ...paymentHistory,
        summary: {
          totalPayments: paymentHistory.payments.length,
          totalAmount: paymentHistory.payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0),
          currency: 'RWF',
          completedPayments: paymentHistory.payments.filter(p => p.status === 'completed').length,
          pendingPayments: paymentHistory.payments.filter(p => p.status === 'pending').length,
          failedPayments: paymentHistory.payments.filter(p => p.status === 'failed').length
        },
        filters: filters
      };

      return successResponse(
        res, 
        200, 
        `Retrieved ${paymentHistory.payments.length} payment record${paymentHistory.payments.length !== 1 ? 's' : ''} from your history`,
        enhancedHistory,
        {
          version: 'v1',
          service: 'payment-service',
          operation: 'get_payment_history',
          pagination: paymentHistory.pagination
        }
      );
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to retrieve payment history at this time. Please try again later.',
        error,
        { 
          operation: 'get_payment_history',
          userId: req.user?.id,
          suggestion: 'Please refresh the page or contact support'
        }
      );
    }
  },

  // POST /api/payments/invoice - Generate invoice
  async generateInvoice(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to generate invoices. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const { bookingId, format } = generateInvoiceSchema.parse(req.body);
      const invoice = await paymentService.generateInvoice(userId, bookingId, format);

      // Enhanced invoice response
      const enhancedInvoice = {
        ...invoice,
        invoiceInfo: {
          number: invoice.invoiceNumber,
          amount: parseFloat(invoice.amount),
          taxAmount: parseFloat(invoice.taxAmount),
          totalAmount: parseFloat(invoice.totalAmount),
          currency: invoice.currency,
          format: invoice.format,
          downloadUrl: invoice.fileUrl
        },
        businessInfo: {
          companyName: 'E-Tour Rwanda',
          address: 'Kigali, Rwanda',
          taxId: 'TIN-123456789',
          email: 'billing@etour-rwanda.com'
        },
        nextSteps: [
          'Invoice has been generated successfully',
          'Download link is available above',
          'Invoice has been sent to your email address'
        ]
      };

      return successResponse(
        res, 
        201, 
        'Invoice generated successfully! Download link is now available.',
        enhancedInvoice,
        {
          version: 'v1',
          service: 'payment-service',
          operation: 'generate_invoice'
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The invoice generation request is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error generating invoice:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to generate invoice at this time. Please try again later.',
        error,
        { 
          operation: 'generate_invoice',
          userId: req.user?.id,
          suggestion: 'Please try again or contact support for assistance'
        }
      );
    }
  },

  // GET /api/payments/:paymentId/status - Get payment status
  async getPaymentStatus(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to check payment status. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const paymentId = req.params.paymentId;
      if (!paymentId) {
        return errorResponse(
          res, 
          400, 
          'Payment ID is required to check status',
          null,
          { parameter: 'paymentId', received: paymentId }
        );
      }

      const payment = await paymentService.getPaymentStatus(paymentId, userId);
      if (!payment) {
        return errorResponse(
          res, 
          404, 
          'Payment not found or does not belong to your account',
          null,
          { paymentId, suggestion: 'Verify the payment ID and try again' }
        );
      }

      // Enhanced payment status response
      const enhancedStatus = {
        ...payment,
        statusInfo: {
          current: payment.status,
          description: getStatusDescription(payment.status),
          canRefund: payment.status === 'completed',
          canRetry: payment.status === 'failed'
        },
        timeline: {
          created: payment.createdAt,
          processed: payment.processedAt,
          estimatedCompletion: payment.status === 'pending' 
            ? new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
            : null
        }
      };

      return successResponse(
        res, 
        200, 
        `Payment status retrieved successfully. Current status: ${payment.status}`,
        enhancedStatus,
        {
          version: 'v1',
          service: 'payment-service',
          operation: 'get_payment_status'
        }
      );
    } catch (error) {
      console.error('Error fetching payment status:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to retrieve payment status at this time. Please try again later.',
        error,
        { 
          operation: 'get_payment_status',
          userId: req.user?.id,
          paymentId: req.params.paymentId,
          suggestion: 'Please try again or contact support'
        }
      );
    }
  }
};

// Helper function to get status description
function getStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    'pending': 'Payment is being processed',
    'completed': 'Payment completed successfully',
    'failed': 'Payment failed - please try again',
    'refunded': 'Payment has been refunded'
  };
  return descriptions[status] || 'Unknown status';
}
