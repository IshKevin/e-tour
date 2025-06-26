import { Request, Response } from 'express';
import { searchService, SearchFilters, ActivitySuggestion } from '../../services/search.service';
import { successResponse } from '../../utils/response';
import { z } from 'zod';

// Validation schemas
const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: z.enum(['trips', 'agents', 'all']).optional(),
  limit: z.number().min(1).max(100).optional(),
});

const activitySuggestionSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  interests: z.array(z.string()).optional(),
  budget: z.number().min(0).optional(),
});

export const searchController = {
  // GET /api/search - General search functionality
  async search(req: Request, res: Response): Promise<Response> {
    const { query, type, limit } = searchSchema.parse(req.query);
    
    const filters: SearchFilters = {
      query,
      type,
      limit,
    };

    const results = await searchService.search(filters);
    return successResponse(res, 200, 'Search completed successfully', results);
  },

  // POST /api/suggestions/activities - Get activity suggestions
  async getActivitySuggestions(req: Request, res: Response): Promise<Response> {
    const params = activitySuggestionSchema.parse(req.body);
    
    const suggestions = await searchService.getActivitySuggestions(params as ActivitySuggestion);
    return successResponse(res, 200, 'Activity suggestions fetched successfully', suggestions);
  },

  // GET /api/destinations/popular - Get popular destinations
  async getPopularDestinations(req: Request, res: Response): Promise<Response> {
    const limit = parseInt(req.query.limit as string) || 10;
    const destinations = await searchService.getPopularDestinations(limit);
    return successResponse(res, 200, 'Popular destinations fetched successfully', destinations);
  },
};
