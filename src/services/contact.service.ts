import { db } from '../db';
import { contactMessages, ContactMessage, NewContactMessage } from '../db/schema/contactMessages.schema';
import { users } from '../db/schema/user.schema';
import { eq, and, desc, sql, like, or } from 'drizzle-orm';

export const contactService = {
  // Submit a contact message
  async submitContactMessage(messageData: NewContactMessage): Promise<ContactMessage> {
    const [message] = await db.insert(contactMessages).values(messageData).returning();
    
    // In a real application, you might want to:
    // 1. Send email notification to admin
    // 2. Create a notification for admin users
    // 3. Send auto-reply to the user
    
    return message;
  },

  // Get all contact messages (admin)
  async getAllContactMessages(limit: number = 50, status?: 'new' | 'in_progress' | 'resolved' | 'closed') {
    let query = db
      .select({
        id: contactMessages.id,
        userId: contactMessages.userId,
        name: contactMessages.name,
        email: contactMessages.email,
        subject: contactMessages.subject,
        message: contactMessages.message,
        status: contactMessages.status,
        assignedAdminId: contactMessages.assignedAdminId,
        createdAt: contactMessages.createdAt,
        updatedAt: contactMessages.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(contactMessages)
      .leftJoin(users, eq(contactMessages.userId, users.id));

    if (status) {
      query = query.where(eq(contactMessages.status, status));
    }

    return await query
      .orderBy(desc(contactMessages.createdAt))
      .limit(limit);
  },

  // Get contact message by ID
  async getContactMessageById(messageId: number): Promise<ContactMessage | null> {
    const [message] = await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.id, messageId));

    return message || null;
  },

  // Update contact message status
  async updateMessageStatus(messageId: number, status: 'new' | 'in_progress' | 'resolved' | 'closed', assignedAdminId?: number): Promise<ContactMessage | null> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (assignedAdminId !== undefined) {
      updateData.assignedAdminId = assignedAdminId;
    }

    const [updatedMessage] = await db
      .update(contactMessages)
      .set(updateData)
      .where(eq(contactMessages.id, messageId))
      .returning();

    return updatedMessage || null;
  },

  // Assign message to admin
  async assignMessageToAdmin(messageId: number, adminId: number): Promise<ContactMessage | null> {
    const [updatedMessage] = await db
      .update(contactMessages)
      .set({
        assignedAdminId: adminId,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(contactMessages.id, messageId))
      .returning();

    return updatedMessage || null;
  },

  // Get messages assigned to admin
  async getAdminAssignedMessages(adminId: number, limit: number = 50) {
    return await db
      .select({
        id: contactMessages.id,
        userId: contactMessages.userId,
        name: contactMessages.name,
        email: contactMessages.email,
        subject: contactMessages.subject,
        message: contactMessages.message,
        status: contactMessages.status,
        createdAt: contactMessages.createdAt,
        updatedAt: contactMessages.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(contactMessages)
      .leftJoin(users, eq(contactMessages.userId, users.id))
      .where(eq(contactMessages.assignedAdminId, adminId))
      .orderBy(desc(contactMessages.createdAt))
      .limit(limit);
  },

  // Get contact message statistics
  async getContactMessageStats() {
    const [stats] = await db
      .select({
        totalMessages: sql<number>`COUNT(*)`,
        newMessages: sql<number>`COUNT(CASE WHEN ${contactMessages.status} = 'new' THEN 1 END)`,
        inProgressMessages: sql<number>`COUNT(CASE WHEN ${contactMessages.status} = 'in_progress' THEN 1 END)`,
        resolvedMessages: sql<number>`COUNT(CASE WHEN ${contactMessages.status} = 'resolved' THEN 1 END)`,
        closedMessages: sql<number>`COUNT(CASE WHEN ${contactMessages.status} = 'closed' THEN 1 END)`,
      })
      .from(contactMessages);

    return stats;
  },

  // Search contact messages
  async searchContactMessages(query: string, limit: number = 20) {
    const searchTerm = `%${query}%`;

    return await db
      .select({
        id: contactMessages.id,
        userId: contactMessages.userId,
        name: contactMessages.name,
        email: contactMessages.email,
        subject: contactMessages.subject,
        message: contactMessages.message,
        status: contactMessages.status,
        createdAt: contactMessages.createdAt,
        userName: users.name,
      })
      .from(contactMessages)
      .leftJoin(users, eq(contactMessages.userId, users.id))
      .where(
        or(
          like(contactMessages.name, searchTerm),
          like(contactMessages.email, searchTerm),
          like(contactMessages.subject, searchTerm),
          like(contactMessages.message, searchTerm)
        )
      )
      .orderBy(desc(contactMessages.createdAt))
      .limit(limit);
  },
};
