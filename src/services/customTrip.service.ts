import { db } from '../db';
import { customTripRequests, CustomTripRequest, NewCustomTripRequest } from '../db/schema/customTripRequests.schema';
import { users } from '../db/schema/user.schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export const customTripService = {
  // Submit a custom trip request
  async createCustomTripRequest(clientId: string, requestData: Omit<NewCustomTripRequest, 'clientId'>) {
    const customTripData: NewCustomTripRequest = {
      clientId,
      ...requestData,
    };

    const [customTrip] = await db.insert(customTripRequests).values(customTripData).returning();
    return customTrip;
  },

  // Get all custom trip requests for a client
  async getClientCustomTripRequests(clientId: string) {
    return await db
      .select({
        id: customTripRequests.id,
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
        assignedAgentName: users.name,
        assignedAgentEmail: users.email,
      })
      .from(customTripRequests)
      .leftJoin(users, eq(customTripRequests.assignedAgentId, users.id))
      .where(eq(customTripRequests.clientId, clientId))
      .orderBy(desc(customTripRequests.createdAt));
  },

  // Get custom trip request by ID
  async getCustomTripRequestById(id: string, clientId?: string) {
    const conditions = [eq(customTripRequests.id, id)];
    if (clientId) {
      conditions.push(eq(customTripRequests.clientId, clientId));
    }

    const [customTrip] = await db
      .select()
      .from(customTripRequests)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    if (!customTrip) return null;

    // Get client info
    const [client] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, customTrip.clientId));

    // Get assigned agent info if exists
    let assignedAgent = null;
    if (customTrip.assignedAgentId) {
      const [agent] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, customTrip.assignedAgentId));
      assignedAgent = agent;
    }

    return {
      ...customTrip,
      clientName: client?.name,
      clientEmail: client?.email,
      assignedAgentName: assignedAgent?.name,
      assignedAgentEmail: assignedAgent?.email,
    };
  },

  // Get all custom trip requests (for admin)
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

  // Assign agent to custom trip request (admin function)
  async assignAgentToCustomTrip(requestId: string, agentId: string) {
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

  // Update custom trip request status
  async updateCustomTripStatus(requestId: string, status: 'pending' | 'assigned' | 'responded' | 'completed' | 'cancelled', agentResponse?: string, quotedPrice?: string) {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (agentResponse) {
      updateData.agentResponse = agentResponse;
    }

    if (quotedPrice) {
      updateData.quotedPrice = quotedPrice;
    }

    const [updatedRequest] = await db
      .update(customTripRequests)
      .set(updateData)
      .where(eq(customTripRequests.id, requestId))
      .returning();

    return updatedRequest;
  },
};
