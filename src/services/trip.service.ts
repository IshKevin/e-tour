import { db } from '../db';
import { trips, Trip, NewTrip } from '../db/schema/trips.schema';
import { bookings, Booking, NewBooking } from '../db/schema/booking.schema';
import { reviews, Review, NewReview } from '../db/schema/reviews.schema';
import { customTripRequests, CustomTripRequest, NewCustomTripRequest } from '../db/schema/customTripRequests.schema';
import { users } from '../db/schema/user.schema';
import { eq, and, gte, lte, desc, asc, sql, like, or } from 'drizzle-orm';

export interface TripFilters {
  location?: string;
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export const tripService = {
  // Get trips with filters and pagination
  async getTrips(filters: TripFilters = {}) {
    const { location, startDate, endDate, minPrice, maxPrice, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    // Apply filters
    const conditions = [eq(trips.status, 'active')];

    if (location) {
      conditions.push(like(trips.location, `%${location}%`));
    }
    if (startDate) {
      conditions.push(gte(trips.startDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(trips.endDate, endDate));
    }
    if (minPrice) {
      conditions.push(gte(trips.price, minPrice.toString()));
    }
    if (maxPrice) {
      conditions.push(lte(trips.price, maxPrice.toString()));
    }

    const query = db
      .select({
        id: trips.id,
        agentId: trips.agentId,
        title: trips.title,
        description: trips.description,
        price: trips.price,
        maxSeats: trips.maxSeats,
        availableSeats: trips.availableSeats,
        location: trips.location,
        startDate: trips.startDate,
        endDate: trips.endDate,
        averageRating: trips.averageRating,
        totalReviews: trips.totalReviews,
        images: trips.images,
        createdAt: trips.createdAt,
        agentName: users.name,
      })
      .from(trips)
      .leftJoin(users, eq(trips.agentId, users.id))
      .where(and(...conditions));

    const result = await query
      .orderBy(desc(trips.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);
    
    const [{ count: total }] = await totalQuery;

    return {
      trips: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // Get trip by ID with details
  async getTripById(id: number) {
    const [trip] = await db
      .select({
        id: trips.id,
        agentId: trips.agentId,
        title: trips.title,
        description: trips.description,
        itinerary: trips.itinerary,
        price: trips.price,
        maxSeats: trips.maxSeats,
        availableSeats: trips.availableSeats,
        location: trips.location,
        startDate: trips.startDate,
        endDate: trips.endDate,
        averageRating: trips.averageRating,
        totalReviews: trips.totalReviews,
        images: trips.images,
        createdAt: trips.createdAt,
        agentName: users.name,
        agentEmail: users.email,
      })
      .from(trips)
      .leftJoin(users, eq(trips.agentId, users.id))
      .where(and(eq(trips.id, id), eq(trips.status, 'active')));

    if (!trip) return null;

    // Get reviews for this trip
    const tripReviews = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        clientName: users.name,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.clientId, users.id))
      .where(and(eq(reviews.tripId, id), eq(reviews.status, 'active')))
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    return {
      ...trip,
      reviews: tripReviews,
    };
  },

  // Get trending trips (top-rated or popular)
  async getTrendingTrips(limit: number = 10) {
    return await db
      .select({
        id: trips.id,
        title: trips.title,
        description: trips.description,
        price: trips.price,
        location: trips.location,
        startDate: trips.startDate,
        endDate: trips.endDate,
        averageRating: trips.averageRating,
        totalReviews: trips.totalReviews,
        images: trips.images,
        agentName: users.name,
      })
      .from(trips)
      .leftJoin(users, eq(trips.agentId, users.id))
      .where(eq(trips.status, 'active'))
      .orderBy(desc(trips.averageRating), desc(trips.totalReviews))
      .limit(limit);
  },

  // Book a trip
  async bookTrip(tripId: number, clientId: number, seatsBooked: number) {
    // Check if trip exists and has available seats
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.status, 'active')));

    if (!trip) {
      throw new Error('Trip not found');
    }

    if (trip.availableSeats < seatsBooked) {
      throw new Error('Not enough seats available');
    }

    const totalPrice = parseFloat(trip.price) * seatsBooked;

    // Create booking
    const bookingData: NewBooking = {
      clientId,
      tripId,
      seatsBooked,
      totalPrice: totalPrice.toString(),
      status: 'pending',
      paymentStatus: 'pending',
    };

    const [booking] = await db.insert(bookings).values(bookingData).returning();

    // Update available seats
    await db
      .update(trips)
      .set({ 
        availableSeats: trip.availableSeats - seatsBooked,
        updatedAt: new Date()
      })
      .where(eq(trips.id, tripId));

    return booking;
  },

  // Get user bookings
  async getUserBookings(clientId: number) {
    return await db
      .select({
        id: bookings.id,
        seatsBooked: bookings.seatsBooked,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        bookingDate: bookings.bookingDate,
        tripId: trips.id,
        tripTitle: trips.title,
        tripLocation: trips.location,
        tripStartDate: trips.startDate,
        tripEndDate: trips.endDate,
        agentName: users.name,
      })
      .from(bookings)
      .leftJoin(trips, eq(bookings.tripId, trips.id))
      .leftJoin(users, eq(trips.agentId, users.id))
      .where(eq(bookings.clientId, clientId))
      .orderBy(desc(bookings.bookingDate));
  },

  // Cancel booking (soft delete)
  async cancelBooking(bookingId: number, clientId: number, reason?: string) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.clientId, clientId)));

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Booking already cancelled');
    }

    // Update booking status
    const [cancelledBooking] = await db
      .update(bookings)
      .set({
        status: 'cancelled',
        cancellationDate: new Date(),
        cancellationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Restore available seats
    await db
      .update(trips)
      .set({
        availableSeats: sql`${trips.availableSeats} + ${booking.seatsBooked}`,
        updatedAt: new Date(),
      })
      .where(eq(trips.id, booking.tripId));

    return cancelledBooking;
  },

  // Submit review for completed trip
  async submitReview(clientId: number, tripId: number, bookingId: number, rating: number, comment?: string) {
    // Check if booking exists and is completed
    const [booking] = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.clientId, clientId),
          eq(bookings.tripId, tripId),
          eq(bookings.status, 'completed')
        )
      );

    if (!booking) {
      throw new Error('Booking not found or not completed');
    }

    // Check if review already exists
    const [existingReview] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.bookingId, bookingId), eq(reviews.clientId, clientId)));

    if (existingReview) {
      throw new Error('Review already submitted for this booking');
    }

    // Create review
    const reviewData: NewReview = {
      clientId,
      tripId,
      bookingId,
      rating,
      comment,
    };

    const [review] = await db.insert(reviews).values(reviewData).returning();

    // Update trip's average rating and review count
    const [{ avgRating, reviewCount }] = await db
      .select({
        avgRating: sql<number>`AVG(${reviews.rating})`,
        reviewCount: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(and(eq(reviews.tripId, tripId), eq(reviews.status, 'active')));

    await db
      .update(trips)
      .set({
        averageRating: avgRating.toFixed(2),
        totalReviews: reviewCount,
        updatedAt: new Date(),
      })
      .where(eq(trips.id, tripId));

    return review;
  },
};
