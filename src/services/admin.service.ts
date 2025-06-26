import { db } from '../db';
import { users, User } from '../db/schema/user.schema';
import { trips } from '../db/schema/trips.schema';
import { bookings } from '../db/schema/booking.schema';
import { customTripRequests } from '../db/schema/customTripRequests.schema';
import { eq, desc, sql, and } from 'drizzle-orm';

export const adminService = {
  // Get all users
  async getAllUsers() {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  },

  // Get user by ID with detailed info
  async getUserById(userId: number) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return null;

    // Get user statistics based on role
    let stats = {};
    
    if (user.role === 'client') {
      const [clientStats] = await db
        .select({
          totalBookings: sql<number>`COUNT(${bookings.id})`,
          totalSpent: sql<number>`SUM(CAST(${bookings.totalPrice} AS DECIMAL))`,
          confirmedBookings: sql<number>`COUNT(CASE WHEN ${bookings.status} = 'confirmed' THEN 1 END)`,
          cancelledBookings: sql<number>`COUNT(CASE WHEN ${bookings.status} = 'cancelled' THEN 1 END)`,
        })
        .from(bookings)
        .where(eq(bookings.clientId, userId));

      stats = clientStats;
    } else if (user.role === 'agent') {
      const [agentStats] = await db
        .select({
          totalTrips: sql<number>`COUNT(${trips.id})`,
          activeTrips: sql<number>`COUNT(CASE WHEN ${trips.status} = 'active' THEN 1 END)`,
          totalBookings: sql<number>`COUNT(${bookings.id})`,
          totalRevenue: sql<number>`SUM(CAST(${bookings.totalPrice} AS DECIMAL))`,
        })
        .from(trips)
        .leftJoin(bookings, eq(trips.id, bookings.tripId))
        .where(eq(trips.agentId, userId));

      stats = agentStats;
    }

    return {
      ...user,
      stats,
    };
  },

  // Suspend user
  async suspendUser(userId: number, reason?: string) {
    const [suspendedUser] = await db
      .update(users)
      .set({ 
        status: 'suspended',
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    // In a real application, you might want to log this action
    // and send notification to the user
    
    return suspendedUser;
  },

  // Reactivate user
  async reactivateUser(userId: number) {
    const [reactivatedUser] = await db
      .update(users)
      .set({ 
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    return reactivatedUser;
  },

  // Get all trips (admin view)
  async getAllTrips() {
    return await db
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
        status: trips.status,
        averageRating: trips.averageRating,
        totalReviews: trips.totalReviews,
        createdAt: trips.createdAt,
        updatedAt: trips.updatedAt,
        agentName: users.name,
        agentEmail: users.email,
        bookingsCount: sql<number>`COUNT(${bookings.id})`,
      })
      .from(trips)
      .leftJoin(users, eq(trips.agentId, users.id))
      .leftJoin(bookings, eq(trips.id, bookings.tripId))
      .groupBy(trips.id, users.id)
      .orderBy(desc(trips.createdAt));
  },

  // Update trip (admin can override agent restrictions)
  async updateTrip(tripId: number, updateData: Partial<typeof trips.$inferSelect>) {
    const [updatedTrip] = await db
      .update(trips)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(trips.id, tripId))
      .returning();

    return updatedTrip;
  },

  // Get all bookings
  async getAllBookings() {
    return await db
      .select({
        id: bookings.id,
        clientId: bookings.clientId,
        tripId: bookings.tripId,
        seatsBooked: bookings.seatsBooked,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        bookingDate: bookings.bookingDate,
        cancellationDate: bookings.cancellationDate,
        cancellationReason: bookings.cancellationReason,
        clientName: users.name,
        clientEmail: users.email,
        tripTitle: trips.title,
        tripLocation: trips.location,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.clientId, users.id))
      .leftJoin(trips, eq(bookings.tripId, trips.id))
      .orderBy(desc(bookings.bookingDate));
  },

  // Get all custom trip requests
  async getAllCustomTripRequests() {
    return await db
      .select({
        id: customTripRequests.id,
        clientId: customTripRequests.clientId,
        assignedAgentId: customTripRequests.assignedAgentId,
        destination: customTripRequests.destination,
        budget: customTripRequests.budget,
        interests: customTripRequests.interests,
        preferredStartDate: customTripRequests.preferredStartDate,
        preferredEndDate: customTripRequests.preferredEndDate,
        groupSize: customTripRequests.groupSize,
        status: customTripRequests.status,
        clientNotes: customTripRequests.clientNotes,
        agentResponse: customTripRequests.agentResponse,
        quotedPrice: customTripRequests.quotedPrice,
        createdAt: customTripRequests.createdAt,
        updatedAt: customTripRequests.updatedAt,
        clientName: users.name,
        clientEmail: users.email,
      })
      .from(customTripRequests)
      .leftJoin(users, eq(customTripRequests.clientId, users.id))
      .orderBy(desc(customTripRequests.createdAt));
  },

  // Assign agent to custom trip request
  async assignAgentToCustomTrip(requestId: number, agentId: number) {
    // Verify agent exists and has agent role
    const [agent] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, agentId), eq(users.role, 'agent'), eq(users.status, 'active')));

    if (!agent) {
      throw new Error('Agent not found or inactive');
    }

    const [updatedRequest] = await db
      .update(customTripRequests)
      .set({
        assignedAgentId: agentId,
        status: 'assigned',
        updatedAt: new Date(),
      })
      .where(eq(customTripRequests.id, requestId))
      .returning();

    return updatedRequest;
  },

  // Get system statistics
  async getSystemStats() {
    const [userStats] = await db
      .select({
        totalUsers: sql<number>`COUNT(*)`,
        activeUsers: sql<number>`COUNT(CASE WHEN ${users.status} = 'active' THEN 1 END)`,
        suspendedUsers: sql<number>`COUNT(CASE WHEN ${users.status} = 'suspended' THEN 1 END)`,
        totalClients: sql<number>`COUNT(CASE WHEN ${users.role} = 'client' THEN 1 END)`,
        totalAgents: sql<number>`COUNT(CASE WHEN ${users.role} = 'agent' THEN 1 END)`,
      })
      .from(users);

    const [tripStats] = await db
      .select({
        totalTrips: sql<number>`COUNT(*)`,
        activeTrips: sql<number>`COUNT(CASE WHEN ${trips.status} = 'active' THEN 1 END)`,
        inactiveTrips: sql<number>`COUNT(CASE WHEN ${trips.status} = 'inactive' THEN 1 END)`,
      })
      .from(trips);

    const [bookingStats] = await db
      .select({
        totalBookings: sql<number>`COUNT(*)`,
        confirmedBookings: sql<number>`COUNT(CASE WHEN ${bookings.status} = 'confirmed' THEN 1 END)`,
        pendingBookings: sql<number>`COUNT(CASE WHEN ${bookings.status} = 'pending' THEN 1 END)`,
        cancelledBookings: sql<number>`COUNT(CASE WHEN ${bookings.status} = 'cancelled' THEN 1 END)`,
        totalRevenue: sql<number>`SUM(CAST(${bookings.totalPrice} AS DECIMAL))`,
      })
      .from(bookings);

    const [customTripStats] = await db
      .select({
        totalCustomRequests: sql<number>`COUNT(*)`,
        pendingRequests: sql<number>`COUNT(CASE WHEN ${customTripRequests.status} = 'pending' THEN 1 END)`,
        assignedRequests: sql<number>`COUNT(CASE WHEN ${customTripRequests.status} = 'assigned' THEN 1 END)`,
        completedRequests: sql<number>`COUNT(CASE WHEN ${customTripRequests.status} = 'completed' THEN 1 END)`,
      })
      .from(customTripRequests);

    return {
      users: userStats,
      trips: tripStats,
      bookings: bookingStats,
      customTrips: customTripStats,
    };
  },
};
