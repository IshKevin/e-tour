import { Request, Response } from 'express';
import { contactService } from '../../services/contact.service';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  contactSuccessResponse
} from '../../utils/response';
import { z } from 'zod';

// Helper function to get estimated response time based on category
function getEstimatedResponseTime(category: string): string {
  const responseTimes: Record<string, string> = {
    'general': '24-48 hours',
    'booking': '2-4 hours',
    'technical': '4-8 hours',
    'complaint': '1-2 hours',
    'suggestion': '48-72 hours'
  };
  return responseTimes[category] || '24-48 hours';
}

// Enhanced validation schemas
const contactMessageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Please provide a valid email address').max(255, 'Email cannot exceed 255 characters'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject cannot exceed 200 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message cannot exceed 2000 characters'),
  phone: z.string().max(20, 'Phone number cannot exceed 20 characters').optional(),
  category: z.enum(['general', 'booking', 'technical', 'complaint', 'suggestion'], {
    errorMap: () => ({ message: 'Category must be one of: general, booking, technical, complaint, suggestion' })
  }).optional().default('general'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium')
});

const updateMessageStatusSchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved', 'closed']),
  assignedAdminId: z.string().uuid('Invalid admin ID format').optional(),
});

export const contactController = {
  async submitContactMessage(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email, subject, message, phone, category, priority } = contactMessageSchema.parse(req.body);

      const messageData = {
        userId: req.user?.id || null,
        name,
        email,
        subject,
        message,
        phone,
        category: category || 'general',
        priority: priority || 'medium'
      };

      const contactMessage = await contactService.submitContactMessage(messageData);

      // Enhanced contact message response
      const enhancedMessage = {
        ...contactMessage,
        ticketNumber: `CTK-${contactMessage.id.substring(0, 8).toUpperCase()}`,
        messageInfo: {
          category: messageData.category,
          priority: messageData.priority,
          status: 'new',
          estimatedResponseTime: getEstimatedResponseTime(messageData.category)
        },
        contactInfo: {
          supportEmail: 'support@etour-rwanda.com',
          supportPhone: '+250 788 123 456',
          businessHours: 'Monday - Friday: 8:00 AM - 6:00 PM (CAT)'
        }
      };

      return contactSuccessResponse(
        res,
        201,
        `Thank you for contacting us! Your message has been received and assigned ticket number ${enhancedMessage.ticketNumber}.`,
        enhancedMessage
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res,
          'The contact information provided is invalid. Please check your input and try again.',
          error.errors
        );
      }
      console.error('Error submitting contact message:', error);
      return errorResponse(
        res,
        500,
        'Unable to submit your message at this time. Please try again later or contact us directly.',
        error,
        {
          operation: 'submit_contact_message',
          suggestion: 'Please try again or call our support line at +250 788 123 456'
        }
      );
    }
  },

  
  async getAllContactMessages(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as 'new' | 'in_progress' | 'resolved' | 'closed' | undefined;

    const messages = await contactService.getAllContactMessages(limit, status);
    return successResponse(res, 200, 'Contact messages fetched successfully', messages);
  },

  
  async getContactMessageById(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const messageId = req.params.id;
    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const message = await contactService.getContactMessageById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    return successResponse(res, 200, 'Contact message fetched successfully', message);
  },


  async updateMessageStatus(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const messageId = req.params.id;
    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    try {
      const { status, assignedAdminId } = updateMessageStatusSchema.parse(req.body);
      const updatedMessage = await contactService.updateMessageStatus(messageId, status, assignedAdminId);
      
      if (!updatedMessage) {
        return res.status(404).json({ error: 'Contact message not found' });
      }

      return successResponse(res, 200, 'Message status updated successfully', updatedMessage);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

 
  async assignMessageToAdmin(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const messageId = req.params.id;
    const adminId = req.user?.id;

    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updatedMessage = await contactService.assignMessageToAdmin(messageId, adminId);
    if (!updatedMessage) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    return successResponse(res, 200, 'Message assigned successfully', updatedMessage);
  },


  async getMyAssignedMessages(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await contactService.getAdminAssignedMessages(adminId, limit);
    return successResponse(res, 200, 'Assigned messages fetched successfully', messages);
  },

  
  async getContactMessageStats(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const stats = await contactService.getContactMessageStats();
    return successResponse(res, 200, 'Contact message statistics fetched successfully', stats);
  },

  
  async searchContactMessages(req: Request, res: Response): Promise<Response> {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const query = req.query.q as string;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const results = await contactService.searchContactMessages(query.trim(), limit);
    return successResponse(res, 200, 'Search completed successfully', results);
  },
};
