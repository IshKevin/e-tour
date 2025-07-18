import { Request, Response } from 'express';
import { contactService } from '../../services/contact.service';
import { successResponse } from '../../utils/response';
import { z } from 'zod';

// Validation schemas
const contactMessageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
});

const updateMessageStatusSchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved', 'closed']),
  assignedAdminId: z.string().uuid('Invalid admin ID format').optional(),
});

export const contactController = {
  async submitContactMessage(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email, subject, message } = contactMessageSchema.parse(req.body);
      
      const messageData = {
        userId: req.user?.id || null,
        name,
        email,
        subject,
        message,
      };

      const contactMessage = await contactService.submitContactMessage(messageData);
      return successResponse(res, 201, 'Contact message submitted successfully', contactMessage);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
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
