import { db } from '../config/database';
import { reviews, agentReviews, reviewReports, agentRatings, NewAgentReview, NewReviewReport } from '../db/schema/reviews.schema';
import { users } from '../db/schema/user.schema';
import { bookings } from '../db/schema/booking.schema';
import { eq, and, desc, count, avg, sql } from 'drizzle-orm';

export interface ReviewFilters {
  page?: number;
  limit?: number;
  rating?: number;
  sortBy?: string; // Allow any string to be more flexible
}

export interface AgentReviewData {
  rating: number;
  comment?: string;
  bookingId: string;
  categories: {
    communication: number;
    professionalism: number;
    knowledge: number;
    responsiveness: number;
  };
}

export const reviewService = {
  // Get trip reviews
  async getTripReviews(tripId: string, filters: ReviewFilters = {}) {
    try {
      const { page = 1, limit = 10, rating, sortBy = 'newest' } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = [
        eq(reviews.tripId, tripId),
        eq(reviews.status, 'active')
      ];

      if (rating) {
        whereConditions.push(eq(reviews.rating, rating));
      }

      // Determine sort order
      let orderBy;
      switch (sortBy) {
        case 'oldest':
          orderBy = reviews.createdAt;
          break;
        case 'rating_high':
          orderBy = desc(reviews.rating);
          break;
        case 'rating_low':
          orderBy = reviews.rating;
          break;
        case 'helpful':
          orderBy = desc(reviews.helpfulCount);
          break;
        default:
          orderBy = desc(reviews.createdAt);
      }

      const [tripReviews, totalCount, averageRating] = await Promise.all([
        db
          .select({
            id: reviews.id,
            rating: reviews.rating,
            comment: reviews.comment,
            helpfulCount: reviews.helpfulCount,
            isVerified: reviews.isVerified,
            createdAt: reviews.createdAt,
            user: {
              id: users.id,
              name: users.name,
              profileImage: users.profileImage
            }
          })
          .from(reviews)
          .leftJoin(users, eq(reviews.clientId, users.id))
          .where(and(...whereConditions))
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),

        db
          .select({ count: count() })
          .from(reviews)
          .where(and(...whereConditions)),

        db
          .select({ avg: avg(reviews.rating) })
          .from(reviews)
          .where(and(eq(reviews.tripId, tripId), eq(reviews.status, 'active')))
      ]);

      const totalPages = Math.ceil(totalCount[0].count / limit);

      return {
        reviews: tripReviews,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        summary: {
          averageRating: averageRating[0].avg ? parseFloat(averageRating[0].avg) : 0,
          totalReviews: totalCount[0].count
        }
      };
    } catch (error) {
      console.error('Error fetching trip reviews:', error);
      throw error;
    }
  },

  // Get agent reviews
  async getAgentReviews(agentId: string, filters: ReviewFilters = {}) {
    try {
      const { page = 1, limit = 10, rating, sortBy = 'newest' } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = [
        eq(agentReviews.agentId, agentId),
        eq(agentReviews.status, 'active')
      ];

      if (rating) {
        whereConditions.push(eq(agentReviews.rating, rating));
      }

      // Determine sort order
      let orderBy;
      switch (sortBy) {
        case 'oldest':
          orderBy = agentReviews.createdAt;
          break;
        case 'rating_high':
          orderBy = desc(agentReviews.rating);
          break;
        case 'rating_low':
          orderBy = agentReviews.rating;
          break;
        case 'helpful':
          orderBy = desc(agentReviews.helpfulCount);
          break;
        default:
          orderBy = desc(agentReviews.createdAt);
      }

      const [agentReviewsList, totalCount, ratingStats] = await Promise.all([
        db
          .select({
            id: agentReviews.id,
            rating: agentReviews.rating,
            comment: agentReviews.comment,
            categories: agentReviews.categories,
            helpfulCount: agentReviews.helpfulCount,
            isVerified: agentReviews.isVerified,
            createdAt: agentReviews.createdAt,
            user: {
              id: users.id,
              name: users.name,
              profileImage: users.profileImage
            }
          })
          .from(agentReviews)
          .leftJoin(users, eq(agentReviews.userId, users.id))
          .where(and(...whereConditions))
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),

        db
          .select({ count: count() })
          .from(agentReviews)
          .where(and(...whereConditions)),

        db
          .select()
          .from(agentRatings)
          .where(eq(agentRatings.agentId, agentId))
          .limit(1)
      ]);

      const totalPages = Math.ceil(totalCount[0].count / limit);

      return {
        reviews: agentReviewsList,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        summary: ratingStats[0] ? {
          averageRating: parseFloat(ratingStats[0].averageRating),
          totalReviews: ratingStats[0].totalReviews,
          categoryRatings: {
            communication: parseFloat(ratingStats[0].communicationRating),
            professionalism: parseFloat(ratingStats[0].professionalismRating),
            knowledge: parseFloat(ratingStats[0].knowledgeRating),
            responsiveness: parseFloat(ratingStats[0].responsivenessRating)
          },
          ratingDistribution: {
            5: ratingStats[0].fiveStarCount,
            4: ratingStats[0].fourStarCount,
            3: ratingStats[0].threeStarCount,
            2: ratingStats[0].twoStarCount,
            1: ratingStats[0].oneStarCount
          }
        } : null
      };
    } catch (error) {
      console.error('Error fetching agent reviews:', error);
      throw error;
    }
  },

  // Rate agent
  async rateAgent(userId: string, agentId: string, reviewData: AgentReviewData) {
    try {
      // Verify booking exists and belongs to user
      const booking = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.id, reviewData.bookingId),
          eq(bookings.clientId, userId)
        ))
        .limit(1);

      if (!booking.length) {
        throw new Error('Booking not found or does not belong to user');
      }

      // Check if review already exists
      const existingReview = await db
        .select()
        .from(agentReviews)
        .where(and(
          eq(agentReviews.userId, userId),
          eq(agentReviews.agentId, agentId),
          eq(agentReviews.bookingId, reviewData.bookingId)
        ))
        .limit(1);

      if (existingReview.length) {
        throw new Error('You have already reviewed this agent for this booking');
      }

      const newReview: NewAgentReview = {
        userId,
        agentId,
        bookingId: reviewData.bookingId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        categories: reviewData.categories,
        status: 'active',
        isVerified: true // Since it's from a verified booking
      };

      const [review] = await db.insert(agentReviews).values(newReview).returning();

      // Update agent ratings
      await this.updateAgentRatings(agentId);

      return review;
    } catch (error) {
      console.error('Error rating agent:', error);
      throw error;
    }
  },

  // Update agent ratings (aggregate function)
  async updateAgentRatings(agentId: string) {
    try {
      // Calculate aggregate ratings
      const stats = await db
        .select({
          totalReviews: count(),
          averageRating: avg(agentReviews.rating),
          fiveStarCount: sql<number>`COUNT(CASE WHEN rating = 5 THEN 1 END)`,
          fourStarCount: sql<number>`COUNT(CASE WHEN rating = 4 THEN 1 END)`,
          threeStarCount: sql<number>`COUNT(CASE WHEN rating = 3 THEN 1 END)`,
          twoStarCount: sql<number>`COUNT(CASE WHEN rating = 2 THEN 1 END)`,
          oneStarCount: sql<number>`COUNT(CASE WHEN rating = 1 THEN 1 END)`
        })
        .from(agentReviews)
        .where(and(
          eq(agentReviews.agentId, agentId),
          eq(agentReviews.status, 'active')
        ));

      // Calculate category averages
      const categoryStats = await db
        .select({
          avgCommunication: sql<number>`AVG((categories->>'communication')::numeric)`,
          avgProfessionalism: sql<number>`AVG((categories->>'professionalism')::numeric)`,
          avgKnowledge: sql<number>`AVG((categories->>'knowledge')::numeric)`,
          avgResponsiveness: sql<number>`AVG((categories->>'responsiveness')::numeric)`
        })
        .from(agentReviews)
        .where(and(
          eq(agentReviews.agentId, agentId),
          eq(agentReviews.status, 'active')
        ));

      const ratingData = {
        agentId,
        totalReviews: stats[0].totalReviews,
        averageRating: stats[0].averageRating ? parseFloat(stats[0].averageRating).toFixed(2) : '0',
        communicationRating: categoryStats[0].avgCommunication ? parseFloat(categoryStats[0].avgCommunication.toString()).toFixed(2) : '0',
        professionalismRating: categoryStats[0].avgProfessionalism ? parseFloat(categoryStats[0].avgProfessionalism.toString()).toFixed(2) : '0',
        knowledgeRating: categoryStats[0].avgKnowledge ? parseFloat(categoryStats[0].avgKnowledge.toString()).toFixed(2) : '0',
        responsivenessRating: categoryStats[0].avgResponsiveness ? parseFloat(categoryStats[0].avgResponsiveness.toString()).toFixed(2) : '0',
        fiveStarCount: stats[0].fiveStarCount,
        fourStarCount: stats[0].fourStarCount,
        threeStarCount: stats[0].threeStarCount,
        twoStarCount: stats[0].twoStarCount,
        oneStarCount: stats[0].oneStarCount
      };

      // Upsert agent ratings
      await db
        .insert(agentRatings)
        .values(ratingData)
        .onConflictDoUpdate({
          target: agentRatings.agentId,
          set: ratingData
        });

    } catch (error) {
      console.error('Error updating agent ratings:', error);
      throw error;
    }
  },

  // Report review
  async reportReview(reporterId: string, reviewId: string, reason: string, description?: string) {
    try {
      // Check if review exists
      const review = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1);

      if (!review.length) {
        throw new Error('Review not found');
      }

      // Check if user already reported this review
      const existingReport = await db
        .select()
        .from(reviewReports)
        .where(and(
          eq(reviewReports.reviewId, reviewId),
          eq(reviewReports.reporterId, reporterId)
        ))
        .limit(1);

      if (existingReport.length) {
        throw new Error('You have already reported this review');
      }

      const newReport: NewReviewReport = {
        reviewId,
        reporterId,
        reason,
        description
      };

      const [report] = await db.insert(reviewReports).values(newReport).returning();

      // Increment report count on review
      await db
        .update(reviews)
        .set({ 
          reportCount: sql`${reviews.reportCount} + 1`
        })
        .where(eq(reviews.id, reviewId));

      return report;
    } catch (error) {
      console.error('Error reporting review:', error);
      throw error;
    }
  },

  // Moderate review (Admin)
  async moderateReview(adminId: string, reviewId: string, action: 'approve' | 'reject' | 'hide', notes?: string) {
    try {
      let status: string;
      if (action === 'approve') {
        status = 'active';
      } else if (action === 'reject') {
        status = 'rejected';
      } else {
        status = 'hidden';
      }

      await db
        .update(reviews)
        .set({
          status: status as any,
          moderatorNotes: notes,
          moderatedBy: adminId,
          moderatedAt: new Date()
        })
        .where(eq(reviews.id, reviewId));

      return await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1);
    } catch (error) {
      console.error('Error moderating review:', error);
      throw error;
    }
  }
};
