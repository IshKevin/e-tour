import { db } from '../config/database';
import { 
  discountCodes, 
  discountCodeUsage,
  promotionalCampaigns,
  campaignMetrics,
  NewDiscountCode,
  NewDiscountCodeUsage,
  NewPromotionalCampaign
} from '../db/schema/promotions.schema';
import { users } from '../db/schema/user.schema';
import { eq, and, desc, count, gte, lte, sql } from 'drizzle-orm';

export interface DiscountValidationResult {
  isValid: boolean;
  discountAmount: number;
  finalAmount: number;
  message: string;
  discountCode?: any;
}

export interface CampaignFilters {
  page?: number;
  limit?: number;
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
}

export const promotionalService = {
  // Validate discount code
  async validateDiscountCode(code: string, userId: string, tripAmount: number, tripId?: string): Promise<DiscountValidationResult> {
    try {
      // Find the discount code
      const discountCode = await db
        .select()
        .from(discountCodes)
        .where(and(
          eq(discountCodes.code, code.toUpperCase()),
          eq(discountCodes.status, 'active')
        ))
        .limit(1);

      if (!discountCode.length) {
        return {
          isValid: false,
          discountAmount: 0,
          finalAmount: tripAmount,
          message: 'Invalid or expired discount code'
        };
      }

      const discount = discountCode[0];

      // Check if code is within valid date range
      const now = new Date();
      if (now < new Date(discount.validFrom) || now > new Date(discount.validUntil)) {
        return {
          isValid: false,
          discountAmount: 0,
          finalAmount: tripAmount,
          message: 'Discount code has expired or is not yet active'
        };
      }

      // Check usage limits
      if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
        return {
          isValid: false,
          discountAmount: 0,
          finalAmount: tripAmount,
          message: 'Discount code usage limit has been reached'
        };
      }

      // Check user usage limit
      const userUsageCount = await db
        .select({ count: count() })
        .from(discountCodeUsage)
        .where(and(
          eq(discountCodeUsage.discountCodeId, discount.id),
          eq(discountCodeUsage.userId, userId)
        ));

      if (userUsageCount[0].count >= discount.userUsageLimit) {
        return {
          isValid: false,
          discountAmount: 0,
          finalAmount: tripAmount,
          message: 'You have already used this discount code the maximum number of times'
        };
      }

      // Check minimum order amount
      if (tripAmount < parseFloat(discount.minimumOrderAmount || '0')) {
        return {
          isValid: false,
          discountAmount: 0,
          finalAmount: tripAmount,
          message: `Minimum order amount of $${discount.minimumOrderAmount} required`
        };
      }

      // Check if first-time user only
      if (discount.isFirstTimeUserOnly) {
        const previousBookings = await db
          .select({ count: count() })
          .from(discountCodeUsage)
          .where(eq(discountCodeUsage.userId, userId));

        if (previousBookings[0].count > 0) {
          return {
            isValid: false,
            discountAmount: 0,
            finalAmount: tripAmount,
            message: 'This discount code is only available for first-time users'
          };
        }
      }

      // Check if applicable to specific trips
      if (discount.applicableToTrips && discount.applicableToTrips.length > 0 && tripId) {
        if (!discount.applicableToTrips.includes(tripId)) {
          return {
            isValid: false,
            discountAmount: 0,
            finalAmount: tripAmount,
            message: 'This discount code is not applicable to the selected trip'
          };
        }
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (discount.discountType === 'percentage') {
        discountAmount = (tripAmount * parseFloat(discount.discountValue)) / 100;
      } else {
        discountAmount = parseFloat(discount.discountValue);
      }

      // Apply maximum discount limit if set
      if (discount.maximumDiscountAmount && discountAmount > parseFloat(discount.maximumDiscountAmount)) {
        discountAmount = parseFloat(discount.maximumDiscountAmount);
      }

      const finalAmount = Math.max(0, tripAmount - discountAmount);

      return {
        isValid: true,
        discountAmount,
        finalAmount,
        message: `Discount of $${discountAmount.toFixed(2)} applied successfully`,
        discountCode: discount
      };
    } catch (error) {
      console.error('Error validating discount code:', error);
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: tripAmount,
        message: 'Error validating discount code'
      };
    }
  },

  // Apply discount code
  async applyDiscountCode(code: string, userId: string, tripAmount: number, tripId?: string) {
    try {
      const validation = await this.validateDiscountCode(code, userId, tripAmount, tripId);
      
      if (!validation.isValid || !validation.discountCode) {
        throw new Error(validation.message);
      }

      // Record the usage
      const usage: NewDiscountCodeUsage = {
        discountCodeId: validation.discountCode.id,
        userId,
        tripId,
        originalAmount: tripAmount.toString(),
        discountAmount: validation.discountAmount.toString(),
        finalAmount: validation.finalAmount.toString()
      };

      const [discountUsage] = await db.insert(discountCodeUsage).values(usage).returning();

      // Update usage count
      await db
        .update(discountCodes)
        .set({
          usedCount: sql`${discountCodes.usedCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(discountCodes.id, validation.discountCode.id));

      return {
        ...validation,
        usageId: discountUsage.id,
        appliedAt: discountUsage.usedAt
      };
    } catch (error) {
      console.error('Error applying discount code:', error);
      throw error;
    }
  },

  // Create discount code (Admin)
  async createDiscountCode(adminId: string, discountData: {
    code: string;
    name: string;
    description?: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    minimumOrderAmount?: number;
    maximumDiscountAmount?: number;
    usageLimit?: number;
    userUsageLimit?: number;
    validFrom: string;
    validUntil: string;
    isFirstTimeUserOnly?: boolean;
    applicableToTrips?: string[];
  }) {
    try {
      const newDiscountCode: NewDiscountCode = {
        code: discountData.code.toUpperCase(),
        name: discountData.name,
        description: discountData.description,
        discountType: discountData.discountType,
        discountValue: discountData.discountValue.toString(),
        minimumOrderAmount: discountData.minimumOrderAmount?.toString() || '0',
        maximumDiscountAmount: discountData.maximumDiscountAmount?.toString(),
        usageLimit: discountData.usageLimit,
        userUsageLimit: discountData.userUsageLimit || 1,
        validFrom: new Date(discountData.validFrom),
        validUntil: new Date(discountData.validUntil),
        isFirstTimeUserOnly: discountData.isFirstTimeUserOnly || false,
        applicableToTrips: discountData.applicableToTrips || [],
        createdBy: adminId
      };

      const [discountCode] = await db.insert(discountCodes).values(newDiscountCode).returning();
      return discountCode;
    } catch (error) {
      console.error('Error creating discount code:', error);
      throw error;
    }
  },

  // Get discount codes (Admin)
  async getDiscountCodes(adminId: string, filters: { page?: number; limit?: number; status?: string } = {}) {
    try {
      const { page = 1, limit = 20, status } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      if (status) {
        whereConditions.push(eq(discountCodes.status, status as any));
      }

      const [codes, totalCount] = await Promise.all([
        db
          .select({
            id: discountCodes.id,
            code: discountCodes.code,
            name: discountCodes.name,
            description: discountCodes.description,
            discountType: discountCodes.discountType,
            discountValue: discountCodes.discountValue,
            usageLimit: discountCodes.usageLimit,
            usedCount: discountCodes.usedCount,
            validFrom: discountCodes.validFrom,
            validUntil: discountCodes.validUntil,
            status: discountCodes.status,
            createdAt: discountCodes.createdAt
          })
          .from(discountCodes)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
          .orderBy(desc(discountCodes.createdAt))
          .limit(limit)
          .offset(offset),

        db
          .select({ count: count() })
          .from(discountCodes)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      ]);

      const totalPages = Math.ceil(totalCount[0].count / limit);

      return {
        discountCodes: codes,
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
      console.error('Error fetching discount codes:', error);
      throw error;
    }
  },

  // Create promotional campaign (Admin)
  async createPromotionalCampaign(adminId: string, campaignData: {
    name: string;
    description?: string;
    campaignType: string;
    targetAudience?: any;
    discountCodeIds?: string[];
    startDate: string;
    endDate: string;
    budget?: number;
    targetReach?: number;
  }) {
    try {
      const newCampaign: NewPromotionalCampaign = {
        name: campaignData.name,
        description: campaignData.description,
        campaignType: campaignData.campaignType,
        targetAudience: campaignData.targetAudience,
        discountCodeIds: campaignData.discountCodeIds || [],
        startDate: new Date(campaignData.startDate),
        endDate: new Date(campaignData.endDate),
        budget: campaignData.budget?.toString(),
        targetReach: campaignData.targetReach,
        createdBy: adminId
      };

      const [campaign] = await db.insert(promotionalCampaigns).values(newCampaign).returning();
      return campaign;
    } catch (error) {
      console.error('Error creating promotional campaign:', error);
      throw error;
    }
  },

  // Get promotional campaigns (Admin)
  async getPromotionalCampaigns(adminId: string, filters: CampaignFilters = {}) {
    try {
      const { page = 1, limit = 20, status } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      if (status) {
        whereConditions.push(eq(promotionalCampaigns.status, status));
      }

      const [campaigns, totalCount] = await Promise.all([
        db
          .select({
            id: promotionalCampaigns.id,
            name: promotionalCampaigns.name,
            description: promotionalCampaigns.description,
            campaignType: promotionalCampaigns.campaignType,
            startDate: promotionalCampaigns.startDate,
            endDate: promotionalCampaigns.endDate,
            budget: promotionalCampaigns.budget,
            actualSpent: promotionalCampaigns.actualSpent,
            targetReach: promotionalCampaigns.targetReach,
            actualReach: promotionalCampaigns.actualReach,
            status: promotionalCampaigns.status,
            createdAt: promotionalCampaigns.createdAt
          })
          .from(promotionalCampaigns)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
          .orderBy(desc(promotionalCampaigns.createdAt))
          .limit(limit)
          .offset(offset),

        db
          .select({ count: count() })
          .from(promotionalCampaigns)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      ]);

      const totalPages = Math.ceil(totalCount[0].count / limit);

      return {
        campaigns,
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
      console.error('Error fetching promotional campaigns:', error);
      throw error;
    }
  }
};
