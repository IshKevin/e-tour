import { db } from '../config/database';
import { payments, refunds, invoices, NewPayment, NewRefund, NewInvoice } from '../db/schema/payments.schema';
import { bookings } from '../db/schema/booking.schema';
import { users } from '../db/schema/user.schema';
import { eq, and, desc, gte, lte, count } from 'drizzle-orm';

export interface PaymentDetails {
  bookingId: string;
  paymentMethod: 'card' | 'mobile_money' | 'bank_transfer';
  paymentDetails?: {
    cardNumber?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cvv?: string;
    cardholderName?: string;
    phoneNumber?: string;
    provider?: string;
  };
  mobileMoneyDetails?: {
    phoneNumber: string;
    provider: 'mtn' | 'airtel' | 'tigo';
  };
  amount: number;
  currency: string;
}

export interface RefundRequest {
  bookingId: string;
  reason: string;
  refundAmount?: number;
  refundMethod: 'original' | 'bank_transfer' | 'mobile_money';
}

export interface PaymentFilters {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const paymentService = {
  // Process payment for booking
  async processPayment(userId: string, paymentData: PaymentDetails) {
    try {
      // Verify booking exists and belongs to user
      const booking = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.id, paymentData.bookingId),
          eq(bookings.clientId, userId)
        ))
        .limit(1);

      if (!booking.length) {
        throw new Error('Booking not found or does not belong to user');
      }

      // Check if booking is already paid
      const existingPayment = await db
        .select()
        .from(payments)
        .where(and(
          eq(payments.bookingId, paymentData.bookingId),
          eq(payments.status, 'completed')
        ))
        .limit(1);

      if (existingPayment.length) {
        throw new Error('Booking has already been paid for');
      }

      // Generate payment reference
      const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create payment record
      const newPayment: NewPayment = {
        userId,
        bookingId: paymentData.bookingId,
        referenceType: 'booking',
        referenceId: paymentData.bookingId,
        amount: paymentData.amount.toString(),
        currency: paymentData.currency,
        paymentMethod: paymentData.paymentMethod,
        paymentReference,
        paymentDetails: paymentData.paymentDetails,
        status: 'pending'
      };

      const [payment] = await db.insert(payments).values(newPayment).returning();

      // In a real implementation, you would integrate with payment gateway here
      // For now, we'll simulate payment processing
      await this.simulatePaymentProcessing(payment.id);

      return await this.getPaymentById(payment.id);
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  },

  // Simulate payment processing (replace with real gateway integration)
  async simulatePaymentProcessing(paymentId: string) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Randomly succeed or fail for demo purposes
    const success = Math.random() > 0.1; // 90% success rate

    const updateData = success ? {
      status: 'completed' as const,
      processedAt: new Date(),
      gatewayReference: `GW-${Date.now()}`
    } : {
      status: 'failed' as const,
      failureReason: 'Insufficient funds or card declined'
    };

    await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, paymentId));
  },

  // Request refund
  async requestRefund(userId: string, refundData: RefundRequest) {
    try {
      // Find the payment for this booking
      const payment = await db
        .select()
        .from(payments)
        .where(and(
          eq(payments.bookingId, refundData.bookingId),
          eq(payments.userId, userId),
          eq(payments.status, 'completed')
        ))
        .limit(1);

      if (!payment.length) {
        throw new Error('No completed payment found for this booking');
      }

      // Check if refund already exists
      const existingRefund = await db
        .select()
        .from(refunds)
        .where(eq(refunds.paymentId, payment[0].id))
        .limit(1);

      if (existingRefund.length) {
        throw new Error('Refund request already exists for this payment');
      }

      const refundAmount = refundData.refundAmount || parseFloat(payment[0].amount);
      const refundMethod = refundData.refundMethod === 'original' ? payment[0].paymentMethod : 'bank_transfer';

      const newRefund: NewRefund = {
        paymentId: payment[0].id,
        userId,
        amount: refundAmount.toString(),
        reason: refundData.reason,
        refundMethod: refundMethod as 'card' | 'mobile_money' | 'bank_transfer',
        refundReference: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      };

      const [refund] = await db.insert(refunds).values(newRefund).returning();
      return refund;
    } catch (error) {
      console.error('Error requesting refund:', error);
      throw error;
    }
  },

  // Get payment history for user
  async getPaymentHistory(userId: string, filters: PaymentFilters = {}) {
    try {
      const { page = 1, limit = 20, status, startDate, endDate } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = [eq(payments.userId, userId)];

      if (status) {
        whereConditions.push(eq(payments.status, status as any));
      }

      if (startDate) {
        whereConditions.push(gte(payments.createdAt, new Date(startDate)));
      }

      if (endDate) {
        whereConditions.push(lte(payments.createdAt, new Date(endDate)));
      }

      const [paymentHistory, totalCount] = await Promise.all([
        db
          .select({
            id: payments.id,
            amount: payments.amount,
            currency: payments.currency,
            paymentMethod: payments.paymentMethod,
            status: payments.status,
            paymentReference: payments.paymentReference,
            bookingId: payments.bookingId,
            createdAt: payments.createdAt,
            processedAt: payments.processedAt
          })
          .from(payments)
          .where(and(...whereConditions))
          .orderBy(desc(payments.createdAt))
          .limit(limit)
          .offset(offset),
        
        db
          .select({ count: count() })
          .from(payments)
          .where(and(...whereConditions))
      ]);

      const totalPages = Math.ceil(totalCount[0].count / limit);

      return {
        payments: paymentHistory,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  },

  // Generate invoice
  async generateInvoice(userId: string, bookingId: string, format: 'pdf' | 'html' = 'pdf') {
    try {
      // Find the payment for this booking
      const payment = await db
        .select()
        .from(payments)
        .where(and(
          eq(payments.bookingId, bookingId),
          eq(payments.userId, userId),
          eq(payments.status, 'completed')
        ))
        .limit(1);

      if (!payment.length) {
        throw new Error('No completed payment found for this booking');
      }

      // Check if invoice already exists
      const existingInvoice = await db
        .select()
        .from(invoices)
        .where(eq(invoices.paymentId, payment[0].id))
        .limit(1);

      if (existingInvoice.length) {
        return existingInvoice[0];
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const amount = parseFloat(payment[0].amount);
      const taxAmount = amount * 0.18; // 18% VAT
      const totalAmount = amount + taxAmount;

      const invoiceData = {
        invoiceNumber,
        paymentReference: payment[0].paymentReference,
        bookingId,
        amount,
        taxAmount,
        totalAmount,
        currency: payment[0].currency,
        paymentMethod: payment[0].paymentMethod,
        paymentDate: payment[0].processedAt
      };

      const newInvoice: NewInvoice = {
        paymentId: payment[0].id,
        userId,
        invoiceNumber,
        amount: amount.toString(),
        currency: payment[0].currency,
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        invoiceData,
        format,
        fileUrl: `https://etour-invoices.com/${invoiceNumber}.${format}` // Mock URL
      };

      const [invoice] = await db.insert(invoices).values(newInvoice).returning();
      return invoice;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  },

  // Get payment by ID
  async getPaymentById(paymentId: string) {
    try {
      const payment = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      return payment[0] || null;
    } catch (error) {
      console.error('Error fetching payment by ID:', error);
      throw error;
    }
  },

  // Get payment status
  async getPaymentStatus(paymentId: string, userId: string) {
    try {
      const payment = await db
        .select({
          id: payments.id,
          status: payments.status,
          amount: payments.amount,
          currency: payments.currency,
          paymentReference: payments.paymentReference,
          failureReason: payments.failureReason,
          processedAt: payments.processedAt,
          createdAt: payments.createdAt
        })
        .from(payments)
        .where(and(
          eq(payments.id, paymentId),
          eq(payments.userId, userId)
        ))
        .limit(1);

      return payment[0] || null;
    } catch (error) {
      console.error('Error fetching payment status:', error);
      throw error;
    }
  }
};
