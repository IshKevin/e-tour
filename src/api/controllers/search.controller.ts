import { Request, Response } from 'express';
import { searchService, SearchFilters, ActivitySuggestion } from '../../services/search.service';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  searchSuccessResponse
} from '../../utils/response';
import { z } from 'zod';

// Enhanced validation schemas
const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200, 'Search query cannot exceed 200 characters'),
  type: z.enum(['trips', 'agents', 'all'], {
    errorMap: () => ({ message: 'Search type must be trips, agents, or all' })
  }).optional().default('all'),
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').optional().default(20),
  filters: z.object({
    location: z.string().max(100, 'Location filter cannot exceed 100 characters').optional(),
    minPrice: z.coerce.number().min(0, 'Minimum price must be positive').optional(),
    maxPrice: z.coerce.number().min(0, 'Maximum price must be positive').optional(),
    category: z.string().max(50, 'Category filter cannot exceed 50 characters').optional(),
    rating: z.coerce.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5').optional()
  }).optional()
});

const activitySuggestionSchema = z.object({
  location: z.string().min(1, 'Location is required').max(100, 'Location cannot exceed 100 characters'),
  interests: z.array(z.string().max(50, 'Each interest cannot exceed 50 characters')).max(10, 'Maximum 10 interests allowed').optional(),
  budget: z.coerce.number().min(0, 'Budget must be positive').optional(),
  travelDates: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional()
  }).optional(),
  groupSize: z.coerce.number().min(1, 'Group size must be at least 1').max(50, 'Group size cannot exceed 50').optional()
});

export const searchController = {
  // GET /api/search - General search functionality
  async search(req: Request, res: Response): Promise<Response> {
    try {
      const { query, type, limit, filters } = searchSchema.parse(req.query);

      const searchFilters: SearchFilters = {
        query,
        type: type || 'all',
        limit: limit || 20,
        ...filters
      };

      const results = await searchService.search(searchFilters);

      // Enhanced search response
      const enhancedResults = {
        ...results,
        searchInfo: {
          query,
          type: type || 'all',
          totalResults: (results.trips?.length || 0) + (results.agents?.length || 0),
          searchTime: Date.now(), // In production, calculate actual search time
          suggestions: query.length < 3 ? ['Try using more specific terms', 'Use at least 3 characters'] : []
        },
        filters: filters || {},
        pagination: {
          limit: limit || 20,
          hasMore: (results.trips?.length || 0) + (results.agents?.length || 0) >= (limit || 20)
        }
      };

      return searchSuccessResponse(
        res,
        200,
        `Found ${enhancedResults.searchInfo.totalResults} result${enhancedResults.searchInfo.totalResults !== 1 ? 's' : ''} for "${query}"`,
        enhancedResults,
        {
          searchQuery: query,
          searchType: type || 'all',
          resultCount: enhancedResults.searchInfo.totalResults
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res,
          'The search parameters provided are invalid. Please check your input and try again.',
          error.errors
        );
      }
      console.error('Error performing search:', error);
      return errorResponse(
        res,
        500,
        'Unable to perform search at this time. Please try again later.',
        error,
        {
          operation: 'search',
          query: req.query.query,
          suggestion: 'Please try again with different search terms'
        }
      );
    }
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
