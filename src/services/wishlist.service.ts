import { db } from '../config/database';
import { wishlist, NewWishlist } from '../db/schema/wishlist.schema';
import { trips } from '../db/schema/trips.schema';

import { eq, and, desc, count } from 'drizzle-orm';

export interface WishlistFilters {
  page?: number;
  limit?: number;
  sortBy?: string; // Allow any string to be more flexible
}

export const wishlistService = {
  // Add trip to wishlist
  async addToWishlist(userId: string, tripId: string, notes?: string) {
    try {
      // Check if trip exists
      const trip = await db
        .select()
        .from(trips)
        .where(eq(trips.id, tripId))
        .limit(1);

      if (!trip.length) {
        throw new Error('Trip not found');
      }

      // Check if already in wishlist
      const existingWishlistItem = await db
        .select()
        .from(wishlist)
        .where(and(
          eq(wishlist.userId, userId),
          eq(wishlist.tripId, tripId)
        ))
        .limit(1);

      if (existingWishlistItem.length) {
        throw new Error('Trip is already in your wishlist');
      }

      const newWishlistItem: NewWishlist = {
        userId,
        tripId,
        notes
      };

      const [wishlistItem] = await db.insert(wishlist).values(newWishlistItem).returning();
      
      // Return wishlist item with trip details
      const wishlistWithTrip = await db
        .select({
          id: wishlist.id,
          notes: wishlist.notes,
          createdAt: wishlist.createdAt,
          trip: {
            id: trips.id,
            title: trips.title,
            description: trips.description,
            price: trips.price,
            location: trips.location,
            startDate: trips.startDate,
            endDate: trips.endDate,
            images: trips.images,
            maxSeats: trips.maxSeats,
            availableSeats: trips.availableSeats,
            status: trips.status
          }
        })
        .from(wishlist)
        .leftJoin(trips, eq(wishlist.tripId, trips.id))
        .where(eq(wishlist.id, wishlistItem.id))
        .limit(1);

      return wishlistWithTrip[0];
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  },

  // Remove trip from wishlist
  async removeFromWishlist(userId: string, tripId: string) {
    try {
      const deletedItems = await db
        .delete(wishlist)
        .where(and(
          eq(wishlist.userId, userId),
          eq(wishlist.tripId, tripId)
        ))
        .returning();

      if (!deletedItems.length) {
        throw new Error('Trip not found in your wishlist');
      }

      return deletedItems[0];
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  },

  // Get user's wishlist
  async getUserWishlist(userId: string, filters: WishlistFilters = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'date_added' } = filters;
      const offset = (page - 1) * limit;

      // Determine sort order
      let orderBy;
      switch (sortBy) {
        case 'trip_name':
          orderBy = trips.title;
          break;
        case 'price':
          orderBy = trips.price;
          break;
        default:
          orderBy = desc(wishlist.createdAt);
      }

      const [wishlistItems, totalCount] = await Promise.all([
        db
          .select({
            id: wishlist.id,
            notes: wishlist.notes,
            createdAt: wishlist.createdAt,
            trip: {
              id: trips.id,
              title: trips.title,
              description: trips.description,
              price: trips.price,
              location: trips.location,
              startDate: trips.startDate,
              endDate: trips.endDate,
              images: trips.images,
              maxSeats: trips.maxSeats,
              availableSeats: trips.availableSeats,
              status: trips.status
            }
          })
          .from(wishlist)
          .leftJoin(trips, eq(wishlist.tripId, trips.id))
          .where(eq(wishlist.userId, userId))
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),

        db
          .select({ count: count() })
          .from(wishlist)
          .where(eq(wishlist.userId, userId))
      ]);

      const totalPages = Math.ceil(totalCount[0].count / limit);

      return {
        wishlistItems,
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
      console.error('Error fetching user wishlist:', error);
      throw error;
    }
  },

  // Clear entire wishlist
  async clearWishlist(userId: string) {
    try {
      const deletedItems = await db
        .delete(wishlist)
        .where(eq(wishlist.userId, userId))
        .returning();

      return {
        deletedCount: deletedItems.length,
        deletedItems
      };
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      throw error;
    }
  },

  // Check if trip is in user's wishlist
  async isInWishlist(userId: string, tripId: string): Promise<boolean> {
    try {
      const wishlistItem = await db
        .select()
        .from(wishlist)
        .where(and(
          eq(wishlist.userId, userId),
          eq(wishlist.tripId, tripId)
        ))
        .limit(1);

      return wishlistItem.length > 0;
    } catch (error) {
      console.error('Error checking wishlist status:', error);
      throw error;
    }
  },

  // Get wishlist statistics for user
  async getWishlistStats(userId: string) {
    try {
      const [totalItems, totalValue, recentItems] = await Promise.all([
        // Total items count
        db
          .select({ count: count() })
          .from(wishlist)
          .where(eq(wishlist.userId, userId)),

        // Total value of wishlist items
        db
          .select({
            totalValue: count()
          })
          .from(wishlist)
          .leftJoin(trips, eq(wishlist.tripId, trips.id))
          .where(eq(wishlist.userId, userId)),

        // Recent items (last 7 days)
        db
          .select({ count: count() })
          .from(wishlist)
          .where(and(
            eq(wishlist.userId, userId),
            // Add date filter for last 7 days
          ))
      ]);

      return {
        totalItems: totalItems[0].count,
        totalValue: totalValue[0].totalValue || 0,
        recentItems: recentItems[0].count,
        averageItemValue: totalItems[0].count > 0 ? (totalValue[0].totalValue || 0) / totalItems[0].count : 0
      };
    } catch (error) {
      console.error('Error fetching wishlist stats:', error);
      throw error;
    }
  },

  // Get popular wishlist items (for recommendations)
  async getPopularWishlistItems(limit: number = 10) {
    try {
      const popularItems = await db
        .select({
          tripId: wishlist.tripId,
          wishlistCount: count(),
          trip: {
            id: trips.id,
            title: trips.title,
            description: trips.description,
            price: trips.price,
            location: trips.location,
            images: trips.images
          }
        })
        .from(wishlist)
        .leftJoin(trips, eq(wishlist.tripId, trips.id))
        .groupBy(wishlist.tripId, trips.id, trips.title, trips.description, trips.price, trips.location, trips.images)
        .orderBy(desc(count()))
        .limit(limit);

      return popularItems;
    } catch (error) {
      console.error('Error fetching popular wishlist items:', error);
      throw error;
    }
  }
};
