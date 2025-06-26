import { db } from '../db';
import { trips } from '../db/schema/trips.schema';
import { users } from '../db/schema/user.schema';
import { customTripRequests } from '../db/schema/customTripRequests.schema';
import { eq, like, or, and, desc, lte, sql } from 'drizzle-orm';

export interface SearchFilters {
  query?: string;
  type?: 'trips' | 'agents' | 'all';
  limit?: number;
}

export interface ActivitySuggestion {
  location: string;
  interests: string[];
  budget?: number;
}

export const searchService = {
  // General search functionality
  async search(filters: SearchFilters = {}) {
    const { query, type = 'all', limit = 20 } = filters;
    const results: any = {
      trips: [],
      agents: [],
    };

    if (!query) {
      return results;
    }

    const searchTerm = `%${query}%`;

    // Search trips
    if (type === 'trips' || type === 'all') {
      results.trips = await db
        .select({
          id: trips.id,
          title: trips.title,
          description: trips.description,
          location: trips.location,
          price: trips.price,
          startDate: trips.startDate,
          endDate: trips.endDate,
          averageRating: trips.averageRating,
          totalReviews: trips.totalReviews,
          images: trips.images,
          type: 'trip' as const,
        })
        .from(trips)
        .where(
          and(
            eq(trips.status, 'active'),
            or(
              like(trips.title, searchTerm),
              like(trips.description, searchTerm),
              like(trips.location, searchTerm)
            )
          )
        )
        .orderBy(desc(trips.averageRating))
        .limit(type === 'trips' ? limit : Math.floor(limit / 2));
    }

    // Search agents
    if (type === 'agents' || type === 'all') {
      results.agents = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          profileImage: users.profileImage,
          type: 'agent' as const,
        })
        .from(users)
        .where(
          and(
            eq(users.role, 'agent'),
            eq(users.status, 'active'),
            like(users.name, searchTerm)
          )
        )
        .limit(type === 'agents' ? limit : Math.floor(limit / 2));
    }

    return results;
  },

  // Activity suggestions based on user inputs
  async getActivitySuggestions(params: ActivitySuggestion) {
    const { location, interests, budget } = params;

    // This is a simplified implementation
    // In a real application, you might integrate with external APIs
    // or have a more sophisticated recommendation system

    let query = db
      .select({
        id: trips.id,
        title: trips.title,
        description: trips.description,
        location: trips.location,
        price: trips.price,
        startDate: trips.startDate,
        endDate: trips.endDate,
        averageRating: trips.averageRating,
        images: trips.images,
      })
      .from(trips)
      .where(eq(trips.status, 'active'));

    const conditions = [eq(trips.status, 'active')];

    // Filter by location
    if (location) {
      conditions.push(like(trips.location, `%${location}%`));
    }

    // Filter by interests (check if any interest matches description)
    if (interests && interests.length > 0) {
      const interestConditions = interests.map(interest =>
        or(
          like(trips.description, `%${interest}%`),
          like(trips.title, `%${interest}%`)
        )
      );
      conditions.push(or(...interestConditions));
    }

    // Filter by budget
    if (budget) {
      conditions.push(lte(trips.price, budget.toString()));
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions));
    }

    const suggestions = await query
      .orderBy(desc(trips.averageRating), desc(trips.totalReviews))
      .limit(10);

    return suggestions;
  },

  // Get popular destinations
  async getPopularDestinations(limit: number = 10) {
    const destinations = await db
      .select({
        location: trips.location,
        tripCount: sql<number>`COUNT(*)`,
        averageRating: sql<number>`AVG(${trips.averageRating})`,
        minPrice: sql<number>`MIN(${trips.price})`,
        maxPrice: sql<number>`MAX(${trips.price})`,
      })
      .from(trips)
      .where(eq(trips.status, 'active'))
      .groupBy(trips.location)
      .orderBy(sql`COUNT(*) DESC`, sql`AVG(${trips.averageRating}) DESC`)
      .limit(limit);

    return destinations;
  },

  // Search custom trip requests (for admin/agents)
  async searchCustomTripRequests(query: string, limit: number = 20) {
    if (!query) return [];

    const searchTerm = `%${query}%`;

    return await db
      .select({
        id: customTripRequests.id,
        destination: customTripRequests.destination,
        budget: customTripRequests.budget,
        interests: customTripRequests.interests,
        status: customTripRequests.status,
        createdAt: customTripRequests.createdAt,
        clientName: users.name,
        clientEmail: users.email,
      })
      .from(customTripRequests)
      .leftJoin(users, eq(customTripRequests.clientId, users.id))
      .where(
        or(
          like(customTripRequests.destination, searchTerm),
          like(customTripRequests.interests, searchTerm),
          like(users.name, searchTerm)
        )
      )
      .orderBy(desc(customTripRequests.createdAt))
      .limit(limit);
  },
};
