import { Request, Response } from 'express';
import { messagingService } from '../../services/messaging.service';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse
} from '../../utils/response';
import { z } from 'zod';

// Enhanced validation schemas
const sendMessageSchema = z.object({
  recipientId: z.string().uuid('Invalid recipient ID format'),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject cannot exceed 255 characters'),
  message: z.string().min(1, 'Message content is required').max(5000, 'Message cannot exceed 5000 characters'),
  tripId: z.string().uuid('Invalid trip ID format').optional(),
  attachments: z.array(z.string().url('Invalid attachment URL')).max(5, 'Maximum 5 attachments allowed').optional()
});

const markAsReadSchema = z.object({
  messageIds: z.array(z.string().uuid('Invalid message ID format')).min(1, 'At least one message ID is required')
});

export const messagingController = {
  // POST /api/messages/send - Send message
  async sendMessage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to send messages. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const messageData = sendMessageSchema.parse(req.body);
      const result = await messagingService.sendMessage(userId, messageData);

      // Enhanced message response
      const enhancedMessage = {
        ...result,
        messageInfo: {
          messageId: result.message.id,
          conversationId: result.conversation.id,
          sentAt: result.message.createdAt,
          status: result.message.status,
          hasAttachments: (result.message.attachments?.length || 0) > 0
        },
        deliveryInfo: {
          delivered: true,
          recipientNotified: true,
          estimatedReadTime: '2-5 minutes'
        },
        nextSteps: [
          'Message has been sent successfully',
          'The recipient will be notified',
          'You can continue the conversation anytime'
        ]
      };

      return successResponse(
        res, 
        201, 
        'Message sent successfully! The recipient will be notified.',
        enhancedMessage,
        {
          version: 'v1',
          service: 'messaging-service',
          operation: 'send_message'
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The message information provided is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error sending message:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to send message at this time. Please try again later.',
        error,
        { 
          operation: 'send_message',
          userId: req.user?.id,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  },

  // GET /api/messages/conversations - Get conversations
  async getConversations(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to view conversations. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as 'active' | 'closed' | 'archived' | undefined
      };

      const conversationsData = await messagingService.getConversations(userId, filters);

      // Enhanced conversations response
      const enhancedConversations = {
        ...conversationsData,
        conversationInfo: {
          totalConversations: conversationsData.pagination.total,
          activeConversations: conversationsData.conversations.filter(c => c.status === 'active').length,
          unreadConversations: conversationsData.conversations.filter(c => 
            (c.clientUnreadCount > 0 && userId !== c.otherParty.id) || 
            (c.agentUnreadCount > 0 && userId !== c.otherParty.id)
          ).length
        },
        features: {
          canStartNewConversation: true,
          canArchiveConversations: true,
          hasSearchFunction: true,
          supportsAttachments: true
        },
        filters: filters
      };

      return successResponse(
        res, 
        200, 
        `Retrieved ${conversationsData.conversations.length} conversation${conversationsData.conversations.length !== 1 ? 's' : ''}`,
        enhancedConversations,
        {
          version: 'v1',
          service: 'messaging-service',
          operation: 'get_conversations',
          pagination: conversationsData.pagination
        }
      );
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to retrieve conversations at this time. Please try again later.',
        error,
        { 
          operation: 'get_conversations',
          userId: req.user?.id,
          suggestion: 'Please refresh the page or contact support'
        }
      );
    }
  },

  // GET /api/messages/conversations/:id - Get conversation messages
  async getConversationMessages(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to view messages. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const conversationId = req.params.id;
      if (!conversationId) {
        return errorResponse(
          res, 
          400, 
          'Conversation ID is required to fetch messages',
          null,
          { parameter: 'id', received: conversationId }
        );
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const messagesData = await messagingService.getConversationMessages(userId, conversationId, page, limit);

      // Enhanced messages response
      const enhancedMessages = {
        ...messagesData,
        conversationInfo: {
          conversationId: conversationId,
          subject: messagesData.conversation.subject,
          status: messagesData.conversation.status,
          totalMessages: messagesData.pagination.total,
          participantCount: 2
        },
        messageStats: {
          unreadMessages: messagesData.messages.filter(m => m.status !== 'read' && m.sender?.id !== userId).length,
          systemMessages: messagesData.messages.filter(m => m.isSystemMessage).length,
          messagesWithAttachments: messagesData.messages.filter(m => m.attachments && m.attachments.length > 0).length
        },
        features: {
          canReply: messagesData.conversation.status === 'active',
          canAttachFiles: true,
          canMarkAsRead: true,
          canDeleteConversation: true
        }
      };

      return successResponse(
        res, 
        200, 
        `Retrieved ${messagesData.messages.length} message${messagesData.messages.length !== 1 ? 's' : ''} from conversation`,
        enhancedMessages,
        {
          version: 'v1',
          service: 'messaging-service',
          operation: 'get_conversation_messages',
          pagination: messagesData.pagination
        }
      );
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to retrieve messages at this time. Please try again later.',
        error,
        { 
          operation: 'get_conversation_messages',
          userId: req.user?.id,
          conversationId: req.params.id,
          suggestion: 'Please refresh the page or contact support'
        }
      );
    }
  },

  // PUT /api/messages/mark-read - Mark messages as read
  async markMessagesAsRead(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to mark messages as read. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const { messageIds } = markAsReadSchema.parse(req.body);
      const result = await messagingService.markMessagesAsRead(userId, messageIds);

      // Enhanced mark as read response
      const enhancedResult = {
        ...result,
        readInfo: {
          messagesMarked: result.markedAsRead,
          markedAt: new Date().toISOString(),
          userId: userId
        },
        impact: {
          unreadCountReduced: result.markedAsRead,
          conversationsUpdated: true,
          notificationsCleared: true
        },
        nextSteps: [
          `${result.markedAsRead} message${result.markedAsRead !== 1 ? 's' : ''} marked as read`,
          'Unread count has been updated',
          'Conversation status has been refreshed'
        ]
      };

      return successResponse(
        res, 
        200, 
        `${result.markedAsRead} message${result.markedAsRead !== 1 ? 's' : ''} marked as read successfully.`,
        enhancedResult,
        {
          version: 'v1',
          service: 'messaging-service',
          operation: 'mark_messages_as_read'
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The message IDs provided are invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error marking messages as read:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to mark messages as read at this time. Please try again later.',
        error,
        { 
          operation: 'mark_messages_as_read',
          userId: req.user?.id,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  },

  // DELETE /api/messages/conversations/:id - Delete conversation
  async deleteConversation(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to delete conversations. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const conversationId = req.params.id;
      if (!conversationId) {
        return errorResponse(
          res, 
          400, 
          'Conversation ID is required to delete a conversation',
          null,
          { parameter: 'id', received: conversationId }
        );
      }

      const result = await messagingService.deleteConversation(userId, conversationId);

      // Enhanced deletion response
      const enhancedResult = {
        ...result,
        deletionInfo: {
          conversationId: conversationId,
          deletedBy: userId,
          deletedAt: result.deletedAt,
          permanent: true
        },
        impact: {
          messagesDeleted: true,
          conversationRemoved: true,
          cannotBeUndone: true
        },
        nextSteps: [
          'Conversation has been permanently deleted',
          'All messages in this conversation have been removed',
          'This action cannot be undone'
        ]
      };

      return successResponse(
        res, 
        200, 
        'Conversation deleted successfully. This action cannot be undone.',
        enhancedResult,
        {
          version: 'v1',
          service: 'messaging-service',
          operation: 'delete_conversation'
        }
      );
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to delete conversation at this time. Please try again later.',
        error,
        { 
          operation: 'delete_conversation',
          userId: req.user?.id,
          conversationId: req.params.id,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  }
};
