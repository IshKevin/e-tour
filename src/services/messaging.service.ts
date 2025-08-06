import { db } from '../config/database';
import { 
  conversations, 
  messages, 
  messageAttachments,
  NewConversation, 
  NewMessage,
  NewMessageAttachment 
} from '../db/schema/messages.schema';
import { users } from '../db/schema/user.schema';
import { eq, and, desc, count, or, sql } from 'drizzle-orm';

export interface SendMessageData {
  recipientId: string;
  subject: string;
  message: string;
  tripId?: string;
  attachments?: string[];
}

export interface ConversationFilters {
  page?: number;
  limit?: number;
  status?: 'active' | 'closed' | 'archived';
}

export const messagingService = {
  // Send message
  async sendMessage(senderId: string, messageData: SendMessageData) {
    try {
      // Check if conversation already exists between these users
      let conversation = await db
        .select()
        .from(conversations)
        .where(or(
          and(
            eq(conversations.clientId, senderId),
            eq(conversations.agentId, messageData.recipientId)
          ),
          and(
            eq(conversations.clientId, messageData.recipientId),
            eq(conversations.agentId, senderId)
          )
        ))
        .limit(1);

      // Create new conversation if none exists
      if (!conversation.length) {
        // Determine who is client and who is agent based on user roles
        const [sender, recipient] = await Promise.all([
          db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, senderId)).limit(1),
          db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, messageData.recipientId)).limit(1)
        ]);

        if (!sender.length || !recipient.length) {
          throw new Error('Sender or recipient not found');
        }

        const clientId = sender[0].role === 'client' ? senderId : messageData.recipientId;
        const agentId = sender[0].role === 'agent' ? senderId : messageData.recipientId;

        const newConversation: NewConversation = {
          clientId,
          agentId,
          tripId: messageData.tripId,
          subject: messageData.subject,
          status: 'active'
        };

        const [createdConversation] = await db.insert(conversations).values(newConversation).returning();
        conversation = [createdConversation];
      }

      // Create the message
      const newMessage: NewMessage = {
        conversationId: conversation[0].id,
        senderId,
        recipientId: messageData.recipientId,
        message: messageData.message,
        attachments: messageData.attachments || [],
        status: 'sent'
      };

      const [message] = await db.insert(messages).values(newMessage).returning();

      // Update conversation last message time and unread counts
      const isClientSender = conversation[0].clientId === senderId;
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          clientUnreadCount: isClientSender ? 0 : sql`${conversations.clientUnreadCount} + 1`,
          agentUnreadCount: isClientSender ? sql`${conversations.agentUnreadCount} + 1` : 0,
          updatedAt: new Date()
        })
        .where(eq(conversations.id, conversation[0].id));

      // Handle attachments if any
      if (messageData.attachments && messageData.attachments.length > 0) {
        const attachmentData: NewMessageAttachment[] = messageData.attachments.map(url => ({
          messageId: message.id,
          fileName: url.split('/').pop() || 'attachment',
          fileUrl: url,
          fileSize: 0, // TODO: Get actual file size
          mimeType: 'application/octet-stream' // TODO: Detect mime type
        }));

        await db.insert(messageAttachments).values(attachmentData);
      }

      return {
        message,
        conversation: conversation[0]
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Get conversations for user
  async getConversations(userId: string, filters: ConversationFilters = {}) {
    try {
      const { page = 1, limit = 20, status } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = [
        or(
          eq(conversations.clientId, userId),
          eq(conversations.agentId, userId)
        )
      ];

      if (status) {
        whereConditions.push(eq(conversations.status, status));
      }

      const [conversationList, totalCount] = await Promise.all([
        db
          .select({
            id: conversations.id,
            subject: conversations.subject,
            status: conversations.status,
            lastMessageAt: conversations.lastMessageAt,
            clientUnreadCount: conversations.clientUnreadCount,
            agentUnreadCount: conversations.agentUnreadCount,
            tripId: conversations.tripId,
            createdAt: conversations.createdAt,
            otherParty: {
              id: sql`CASE WHEN ${conversations.clientId} = ${userId} THEN ${users.id} ELSE ${users.id} END`,
              name: sql`CASE WHEN ${conversations.clientId} = ${userId} THEN ${users.name} ELSE ${users.name} END`,
              profileImage: sql`CASE WHEN ${conversations.clientId} = ${userId} THEN ${users.profileImage} ELSE ${users.profileImage} END`
            }
          })
          .from(conversations)
          .leftJoin(users, or(
            and(eq(conversations.clientId, userId), eq(users.id, conversations.agentId)),
            and(eq(conversations.agentId, userId), eq(users.id, conversations.clientId))
          ))
          .where(and(...whereConditions))
          .orderBy(desc(conversations.lastMessageAt))
          .limit(limit)
          .offset(offset),

        db
          .select({ count: count() })
          .from(conversations)
          .where(and(...whereConditions))
      ]);

      const totalPages = Math.ceil(totalCount[0].count / limit);

      return {
        conversations: conversationList,
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
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // Get messages in a conversation
  async getConversationMessages(userId: string, conversationId: string, page: number = 1, limit: number = 50) {
    try {
      // Verify user is part of this conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          or(
            eq(conversations.clientId, userId),
            eq(conversations.agentId, userId)
          )
        ))
        .limit(1);

      if (!conversation.length) {
        throw new Error('Conversation not found or access denied');
      }

      const offset = (page - 1) * limit;

      const [messageList, totalCount] = await Promise.all([
        db
          .select({
            id: messages.id,
            message: messages.message,
            attachments: messages.attachments,
            status: messages.status,
            isSystemMessage: messages.isSystemMessage,
            readAt: messages.readAt,
            createdAt: messages.createdAt,
            sender: {
              id: users.id,
              name: users.name,
              profileImage: users.profileImage,
              role: users.role
            }
          })
          .from(messages)
          .leftJoin(users, eq(messages.senderId, users.id))
          .where(eq(messages.conversationId, conversationId))
          .orderBy(desc(messages.createdAt))
          .limit(limit)
          .offset(offset),

        db
          .select({ count: count() })
          .from(messages)
          .where(eq(messages.conversationId, conversationId))
      ]);

      const totalPages = Math.ceil(totalCount[0].count / limit);

      return {
        messages: messageList.reverse(), // Reverse to show oldest first
        conversation: conversation[0],
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
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  },

  // Mark messages as read
  async markMessagesAsRead(userId: string, messageIds: string[]) {
    try {
      // Update messages to read status
      const updatedMessages = await db
        .update(messages)
        .set({
          status: 'read',
          readAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(messages.recipientId, userId),
          sql`${messages.id} = ANY(${messageIds})`
        ))
        .returning();

      // Update conversation unread counts
      if (updatedMessages.length > 0) {
        const conversationIds = [...new Set(updatedMessages.map(msg => msg.conversationId))];
        
        for (const conversationId of conversationIds) {
          const conversation = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, conversationId))
            .limit(1);

          if (conversation.length > 0) {
            const isClient = conversation[0].clientId === userId;
            await db
              .update(conversations)
              .set({
                clientUnreadCount: isClient ? 0 : conversation[0].clientUnreadCount,
                agentUnreadCount: isClient ? conversation[0].agentUnreadCount : 0,
                updatedAt: new Date()
              })
              .where(eq(conversations.id, conversationId));
          }
        }
      }

      return {
        markedAsRead: updatedMessages.length,
        messageIds: updatedMessages.map(msg => msg.id)
      };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },

  // Delete conversation
  async deleteConversation(userId: string, conversationId: string) {
    try {
      // Verify user is part of this conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          or(
            eq(conversations.clientId, userId),
            eq(conversations.agentId, userId)
          )
        ))
        .limit(1);

      if (!conversation.length) {
        throw new Error('Conversation not found or access denied');
      }

      // Delete all messages in the conversation
      await db.delete(messages).where(eq(messages.conversationId, conversationId));

      // Delete the conversation
      const deletedConversation = await db
        .delete(conversations)
        .where(eq(conversations.id, conversationId))
        .returning();

      return {
        deleted: true,
        conversationId,
        deletedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },

  // Get unread message count for user
  async getUnreadMessageCount(userId: string) {
    try {
      const unreadCount = await db
        .select({ count: count() })
        .from(messages)
        .where(and(
          eq(messages.recipientId, userId),
          eq(messages.status, 'sent')
        ));

      return {
        unreadCount: unreadCount[0].count,
        userId
      };
    } catch (error) {
      console.error('Error fetching unread message count:', error);
      throw error;
    }
  }
};
