import { db } from '../db';
import { trips, Trip, NewTrip } from '../db/schema/trips.schema';
import { bookings } from '../db/schema/booking.schema';
import { users } from '../db/schema/user.schema';
import { reviews } from '../db/schema/reviews.schema';
import { eq, and, desc, sql, sum, count } from 'drizzle-orm';

export const agentService = {
  // Create a new trip
  async createTrip(agentId: string, tripData: Omit<NewTrip, 'agentId'>) {
    const newTripData: NewTrip = {
      ...tripData,
      agentId,
      availableSeats: tripData.maxSeats,
    };

    const [trip] = await db.insert(trips).values(newTripData).returning();
    return trip;
  },

  // Get agent's trips
  async getAgentTrips(agentId: string) {
    return await db
      .select({
        id: trips.id,
        title: trips.title,
        description: trips.description,
        itinerary: trips.itinerary,
        price: trips.price,
        maxSeats: trips.maxSeats,
        availableSeats: trips.availableSeats,
        location: trips.location,
        startDate: trips.startDate,
        endDate: trips.endDate,
        status: trips.status,
        averageRating: trips.averageRating,
        totalReviews: trips.totalReviews,
        images: trips.images,
        createdAt: trips.createdAt,
        updatedAt: trips.updatedAt,
        bookingsCount: sql<number>`COUNT(${bookings.id})`,
      })
      .from(trips)
      .leftJoin(bookings, eq(trips.id, bookings.tripId))
      .where(eq(trips.agentId, agentId))
      .groupBy(trips.id)
      .orderBy(desc(trips.createdAt));
  },

  // Get specific trip details for agent
  async getAgentTripById(tripId: string, agentId: string) {
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.agentId, agentId)));

    if (!trip) return null;

    // Get bookings for this trip
    const tripBookings = await db
      .select({
        id: bookings.id,
        clientId: bookings.clientId,
        seatsBooked: bookings.seatsBooked,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        bookingDate: bookings.bookingDate,
        clientName: users.name,
        clientEmail: users.email,
        clientPhone: users.phone,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.clientId, users.id))
      .where(eq(bookings.tripId, tripId))
      .orderBy(desc(bookings.bookingDate));

    return {
      ...trip,
      bookings: tripBookings,
    };
  },

  // Update trip (only if no bookings exist)
  async updateTrip(tripId: string, agentId: string, updateData: Partial<Trip>) {
    // Check if trip belongs to agent
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.agentId, agentId)));

    if (!trip) {
      throw new Error('Trip not found or unauthorized');
    }

    // Check if there are any bookings
    const [bookingCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bookings)
      .where(eq(bookings.tripId, tripId));

    if (bookingCount.count > 0) {
      throw new Error('Cannot update trip with existing bookings');
    }

    // Update available seats if maxSeats is being updated
    if (updateData.maxSeats && updateData.maxSeats !== trip.maxSeats) {
      updateData.availableSeats = updateData.maxSeats;
    }

    const [updatedTrip] = await db
      .update(trips)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(trips.id, tripId))
      .returning();

    return updatedTrip;
  },

  // Soft delete trip (only if no bookings exist)
  async deleteTrip(tripId: string, agentId: string) {
    // Check if trip belongs to agent
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.agentId, agentId)));

    if (!trip) {
      throw new Error('Trip not found or unauthorized');
    }

    // Check if there are any bookings
    const [bookingCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bookings)
      .where(eq(bookings.tripId, tripId));

    if (bookingCount.count > 0) {
      throw new Error('Cannot delete trip with existing bookings');
    }

    const [deletedTrip] = await db
      .update(trips)
      .set({ 
        status: 'deleted',
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(trips.id, tripId))
      .returning();

    return deletedTrip;
  },

  // Get bookings for agent's trips
  async getAgentBookings(agentId: string) {
    return await db
      .select({
        id: bookings.id,
        tripId: bookings.tripId,
        clientId: bookings.clientId,
        seatsBooked: bookings.seatsBooked,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        bookingDate: bookings.bookingDate,
        cancellationDate: bookings.cancellationDate,
        cancellationReason: bookings.cancellationReason,
        tripTitle: trips.title,
        tripLocation: trips.location,
        tripStartDate: trips.startDate,
        tripEndDate: trips.endDate,
        clientName: users.name,
        clientEmail: users.email,
        clientPhone: users.phone,
      })
      .from(bookings)
      .leftJoin(trips, eq(bookings.tripId, trips.id))
      .leftJoin(users, eq(bookings.clientId, users.id))
      .where(eq(trips.agentId, agentId))
      .orderBy(desc(bookings.bookingDate));
  },

  // Get agent performance metrics
  async getAgentPerformance(agentId: string) {
    // Get total bookings and revenue
    const [bookingStats] = await db
      .select({
        totalBookings: sql<number>`COUNT(${bookings.id})`,
        totalRevenue: sql<number>`SUM(CAST(${bookings.totalPrice} AS DECIMAL))`,
        confirmedBookings: sql<number>`COUNT(CASE WHEN ${bookings.status} = 'confirmed' THEN 1 END)`,
        cancelledBookings: sql<number>`COUNT(CASE WHEN ${bookings.status} = 'cancelled' THEN 1 END)`,
      })
      .from(bookings)
      .leftJoin(trips, eq(bookings.tripId, trips.id))
      .where(eq(trips.agentId, agentId));

    // Get trip statistics
    const [tripStats] = await db
      .select({
        totalTrips: sql<number>`COUNT(*)`,
        activeTrips: sql<number>`COUNT(CASE WHEN ${trips.status} = 'active' THEN 1 END)`,
        averageRating: sql<number>`AVG(CAST(${trips.averageRating} AS DECIMAL))`,
        totalReviews: sql<number>`SUM(${trips.totalReviews})`,
      })
      .from(trips)
      .where(eq(trips.agentId, agentId));

    // Get recent reviews
    const recentReviews = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        tripTitle: trips.title,
        clientName: users.name,
      })
      .from(reviews)
      .leftJoin(trips, eq(reviews.tripId, trips.id))
      .leftJoin(users, eq(reviews.clientId, users.id))
      .where(eq(trips.agentId, agentId))
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    // Calculate agent ranking (simplified - based on average rating and total bookings)
    const [rankingData] = await db
      .select({
        rank: sql<number>`
          ROW_NUMBER() OVER (
            ORDER BY 
              AVG(CAST(${trips.averageRating} AS DECIMAL)) DESC,
              COUNT(${bookings.id}) DESC
          )
        `,
      })
      .from(trips)
      .leftJoin(bookings, eq(trips.id, bookings.tripId))
      .leftJoin(users, eq(trips.agentId, users.id))
      .where(and(eq(users.role, 'agent'), eq(trips.agentId, agentId)))
      .groupBy(trips.agentId);

    return {
      bookingStats: {
        totalBookings: bookingStats.totalBookings || 0,
        totalRevenue: bookingStats.totalRevenue || 0,
        confirmedBookings: bookingStats.confirmedBookings || 0,
        cancelledBookings: bookingStats.cancelledBookings || 0,
        confirmationRate: bookingStats.totalBookings > 0 
          ? ((bookingStats.confirmedBookings || 0) / bookingStats.totalBookings * 100).toFixed(2)
          : '0',
      },
      tripStats: {
        totalTrips: tripStats.totalTrips || 0,
        activeTrips: tripStats.activeTrips || 0,
        averageRating: tripStats.averageRating ? parseFloat(tripStats.averageRating.toFixed(2)) : 0,
        totalReviews: tripStats.totalReviews || 0,
      },
      ranking: rankingData?.rank || 0,
      recentReviews,
    };
  },
};
