import { db } from '../config/database';
import {
  tripAvailability,
  tripCategories,
  tripCategoryAssignments,
  featuredTrips,
  tripTags,
  NewTripAvailability,
  NewTripCategory,
  NewFeaturedTrip
} from '../db/schema/trip-management.schema';
import { trips } from '../db/schema/trips.schema';
import { eq, and, desc, gte, lte, count, inArray } from 'drizzle-orm';

export interface AvailabilityCalendarData {
  date: string;
  availableSeats: number;
  priceAdjustment: number;
  status: 'available' | 'limited' | 'full' | 'blocked';
}

export const tripManagementService = {
  // Get trip availability calendar
  async getTripAvailability(tripId: string, month?: string, year?: string) {
    try {
      let whereConditions = [eq(tripAvailability.tripId, tripId)];

      if (month && year) {
        const startDate = new Date(`${year}-${month.padStart(2, '0')}-01`);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        
        whereConditions.push(
          gte(tripAvailability.date, startDate.toISOString().split('T')[0]),
          lte(tripAvailability.date, endDate.toISOString().split('T')[0])
        );
      }

      const availability = await db
        .select({
          id: tripAvailability.id,
          date: tripAvailability.date,
          availableSeats: tripAvailability.availableSeats,
          priceAdjustment: tripAvailability.priceAdjustment,
          status: tripAvailability.status,
          notes: tripAvailability.notes
        })
        .from(tripAvailability)
        .where(and(...whereConditions))
        .orderBy(tripAvailability.date);

      return availability;
    } catch (error) {
      console.error('Error fetching trip availability:', error);
      throw error;
    }
  },

  // Update trip availability (Agent)
  async updateTripAvailability(agentId: string, tripId: string, availabilityData: AvailabilityCalendarData[]) {
    try {
      // Verify trip belongs to agent
      const trip = await db
        .select()
        .from(trips)
        .where(and(
          eq(trips.id, tripId),
          eq(trips.agentId, agentId)
        ))
        .limit(1);

      if (!trip.length) {
        throw new Error('Trip not found or does not belong to agent');
      }

      // Delete existing availability for the dates being updated
      const dates = availabilityData.map(item => item.date);
      await db
        .delete(tripAvailability)
        .where(and(
          eq(tripAvailability.tripId, tripId),
          inArray(tripAvailability.date, dates)
        ));

      // Insert new availability data
      const newAvailabilityData: NewTripAvailability[] = availabilityData.map(item => ({
        tripId,
        date: item.date,
        availableSeats: item.availableSeats,
        priceAdjustment: item.priceAdjustment.toString(),
        status: item.status
      }));

      const insertedAvailability = await db
        .insert(tripAvailability)
        .values(newAvailabilityData)
        .returning();

      return insertedAvailability;
    } catch (error) {
      console.error('Error updating trip availability:', error);
      throw error;
    }
  },

  // Get all trip categories
  async getTripCategories() {
    try {
      const categories = await db
        .select({
          id: tripCategories.id,
          name: tripCategories.name,
          description: tripCategories.description,
          icon: tripCategories.icon,
          color: tripCategories.color,
          isActive: tripCategories.isActive,
          sortOrder: tripCategories.sortOrder,
          tripCount: count(tripCategoryAssignments.tripId)
        })
        .from(tripCategories)
        .leftJoin(tripCategoryAssignments, eq(tripCategories.id, tripCategoryAssignments.categoryId))
        .where(eq(tripCategories.isActive, true))
        .groupBy(
          tripCategories.id,
          tripCategories.name,
          tripCategories.description,
          tripCategories.icon,
          tripCategories.color,
          tripCategories.isActive,
          tripCategories.sortOrder
        )
        .orderBy(tripCategories.sortOrder, tripCategories.name);

      return categories;
    } catch (error) {
      console.error('Error fetching trip categories:', error);
      throw error;
    }
  },

  // Create trip category (Admin)
  async createTripCategory(adminId: string, categoryData: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    isActive?: boolean;
  }) {
    try {
      const newCategory: NewTripCategory = {
        name: categoryData.name,
        description: categoryData.description,
        icon: categoryData.icon,
        color: categoryData.color,
        isActive: categoryData.isActive ?? true,
        sortOrder: 0 // Will be updated based on existing categories
      };

      // Get the next sort order
      const maxSortOrder = await db
        .select({ maxSort: count() })
        .from(tripCategories);

      newCategory.sortOrder = (maxSortOrder[0].maxSort || 0) + 1;

      const [category] = await db.insert(tripCategories).values(newCategory).returning();
      return category;
    } catch (error) {
      console.error('Error creating trip category:', error);
      throw error;
    }
  },

  // Get featured trips
  async getFeaturedTrips(limit: number = 6, category?: string) {
    try {
      const baseQuery = db
        .select({
          id: trips.id,
          title: trips.title,
          description: trips.description,
          price: trips.price,
          location: trips.location,
          startDate: trips.startDate,
          endDate: trips.endDate,
          images: trips.images,
          averageRating: trips.averageRating,
          totalReviews: trips.totalReviews,
          featuredInfo: {
            priority: featuredTrips.priority,
            reason: featuredTrips.reason,
            featuredUntil: featuredTrips.featuredUntil
          }
        })
        .from(featuredTrips)
        .leftJoin(trips, eq(featuredTrips.tripId, trips.id))
        .where(eq(trips.status, 'active'))
        .orderBy(featuredTrips.priority, desc(featuredTrips.createdAt))
        .limit(limit);

      let query = baseQuery;

      if (category) {
        query = db
          .select({
            id: trips.id,
            title: trips.title,
            description: trips.description,
            price: trips.price,
            location: trips.location,
            startDate: trips.startDate,
            endDate: trips.endDate,
            images: trips.images,
            averageRating: trips.averageRating,
            totalReviews: trips.totalReviews,
            featuredInfo: {
              priority: featuredTrips.priority,
              reason: featuredTrips.reason,
              featuredUntil: featuredTrips.featuredUntil
            }
          })
          .from(featuredTrips)
          .leftJoin(trips, eq(featuredTrips.tripId, trips.id))
          .leftJoin(tripCategoryAssignments, eq(trips.id, tripCategoryAssignments.tripId))
          .leftJoin(tripCategories, eq(tripCategoryAssignments.categoryId, tripCategories.id))
          .where(and(
            eq(trips.status, 'active'),
            eq(tripCategories.name, category)
          ))
          .orderBy(featuredTrips.priority, desc(featuredTrips.createdAt))
          .limit(limit);
      }

      const featuredTripsList = await query;
      return featuredTripsList;
    } catch (error) {
      console.error('Error fetching featured trips:', error);
      throw error;
    }
  },

  // Set featured trips (Admin)
  async setFeaturedTrips(adminId: string, featuredData: {
    tripIds: string[];
    featuredUntil?: string;
    priority?: number;
  }) {
    try {
      // Remove existing featured status for these trips
      await db
        .delete(featuredTrips)
        .where(inArray(featuredTrips.tripId, featuredData.tripIds));

      // Add new featured trips
      const newFeaturedTrips: NewFeaturedTrip[] = featuredData.tripIds.map((tripId, index) => ({
        tripId,
        priority: featuredData.priority || (index + 1),
        featuredUntil: featuredData.featuredUntil ? new Date(featuredData.featuredUntil) : null,
        reason: 'Admin featured',
        createdBy: adminId
      }));

      const insertedFeaturedTrips = await db
        .insert(featuredTrips)
        .values(newFeaturedTrips)
        .returning();

      return insertedFeaturedTrips;
    } catch (error) {
      console.error('Error setting featured trips:', error);
      throw error;
    }
  },

  // Get trip tags
  async getTripTags() {
    try {
      const tags = await db
        .select({
          id: tripTags.id,
          name: tripTags.name,
          description: tripTags.description,
          color: tripTags.color,
          usageCount: tripTags.usageCount
        })
        .from(tripTags)
        .where(eq(tripTags.isActive, true))
        .orderBy(desc(tripTags.usageCount), tripTags.name);

      return tags;
    } catch (error) {
      console.error('Error fetching trip tags:', error);
      throw error;
    }
  },

  // Assign categories to trip
  async assignCategoriesToTrip(tripId: string, categoryIds: string[]) {
    try {
      // Remove existing category assignments
      await db
        .delete(tripCategoryAssignments)
        .where(eq(tripCategoryAssignments.tripId, tripId));

      // Add new category assignments
      if (categoryIds.length > 0) {
        const assignments = categoryIds.map(categoryId => ({
          tripId,
          categoryId
        }));

        await db.insert(tripCategoryAssignments).values(assignments);
      }

      return { success: true, assignedCategories: categoryIds.length };
    } catch (error) {
      console.error('Error assigning categories to trip:', error);
      throw error;
    }
  },

  // Get trips by category
  async getTripsByCategory(categoryId: string, limit: number = 20, offset: number = 0) {
    try {
      const tripsInCategory = await db
        .select({
          id: trips.id,
          title: trips.title,
          description: trips.description,
          price: trips.price,
          location: trips.location,
          startDate: trips.startDate,
          endDate: trips.endDate,
          images: trips.images,
          averageRating: trips.averageRating,
          totalReviews: trips.totalReviews,
          availableSeats: trips.availableSeats
        })
        .from(trips)
        .leftJoin(tripCategoryAssignments, eq(trips.id, tripCategoryAssignments.tripId))
        .where(and(
          eq(trips.status, 'active'),
          eq(tripCategoryAssignments.categoryId, categoryId)
        ))
        .orderBy(desc(trips.createdAt))
        .limit(limit)
        .offset(offset);

      return tripsInCategory;
    } catch (error) {
      console.error('Error fetching trips by category:', error);
      throw error;
    }
  },

  // Get trip statistics for dashboard
  async getTripStatistics(agentId?: string) {
    try {
      let whereCondition;
      if (agentId) {
        whereCondition = and(eq(trips.status, 'active'), eq(trips.agentId, agentId));
      } else {
        whereCondition = eq(trips.status, 'active');
      }

      const [totalTrips] = await Promise.all([
        db.select({ count: count() }).from(trips).where(whereCondition)
      ]);

      return {
        totalTrips: totalTrips[0].count,
        averagePrice: 0, // TODO: Implement average price calculation
        totalSeats: 0, // TODO: Implement total seats calculation
        activeTrips: totalTrips[0].count // Since we're filtering by active status
      };
    } catch (error) {
      console.error('Error fetching trip statistics:', error);
      throw error;
    }
  }
};
