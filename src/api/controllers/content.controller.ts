import { Request, Response } from 'express';
import { contentService } from '../../services/content.service';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse,
  adminSuccessResponse
} from '../../utils/response';
import { z } from 'zod';

// Enhanced validation schemas
const createBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug cannot exceed 255 characters'),
  excerpt: z.string().max(500, 'Excerpt cannot exceed 500 characters').optional(),
  content: z.string().min(1, 'Content is required'),
  featuredImage: z.string().url('Invalid featured image URL').optional(),
  tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters')).optional(),
  categories: z.array(z.string().max(100, 'Category cannot exceed 100 characters')).optional(),
  status: z.enum(['draft', 'published'], {
    errorMap: () => ({ message: 'Status must be draft or published' })
  }).optional(),
  seoTitle: z.string().max(255, 'SEO title cannot exceed 255 characters').optional(),
  seoDescription: z.string().max(500, 'SEO description cannot exceed 500 characters').optional(),
  seoKeywords: z.array(z.string().max(50, 'SEO keyword cannot exceed 50 characters')).optional()
});

const createFaqSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question cannot exceed 500 characters'),
  answer: z.string().min(1, 'Answer is required').max(2000, 'Answer cannot exceed 2000 characters'),
  category: z.string().min(1, 'Category is required').max(100, 'Category cannot exceed 100 characters'),
  sortOrder: z.coerce.number().min(0, 'Sort order cannot be negative').optional(),
  tags: z.array(z.string().max(50, 'Tag cannot exceed 50 characters')).optional()
});

const createLegalDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug cannot exceed 255 characters'),
  content: z.string().min(1, 'Content is required'),
  documentType: z.enum(['terms', 'privacy', 'about', 'help'], {
    errorMap: () => ({ message: 'Document type must be terms, privacy, about, or help' })
  }),
  version: z.string().min(1, 'Version is required').max(20, 'Version cannot exceed 20 characters'),
  effectiveDate: z.string().datetime('Invalid effective date format'),
  requiresAcceptance: z.boolean().optional()
});

export const contentController = {
  // GET /api/content/blog - Get blog posts
  async getBlogPosts(req: Request, res: Response): Promise<Response> {
    try {
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        status: req.query.status as 'draft' | 'published' | 'archived' | undefined,
        category: req.query.category as string | undefined,
        search: req.query.search as string | undefined
      };

      const blogData = await contentService.getBlogPosts(filters);

      // Enhanced blog posts response
      const enhancedBlogData = {
        ...blogData,
        blogInfo: {
          totalPosts: blogData.pagination.total,
          currentPage: filters.page,
          postsPerPage: filters.limit,
          hasSearch: !!filters.search,
          searchTerm: filters.search
        },
        contentStats: {
          publishedPosts: blogData.posts.filter(post => post.status === 'published').length,
          draftPosts: blogData.posts.filter(post => post.status === 'draft').length,
          totalViews: blogData.posts.reduce((sum, post) => sum + post.viewCount, 0),
          totalLikes: blogData.posts.reduce((sum, post) => sum + post.likeCount, 0)
        },
        features: {
          canSearch: true,
          canFilter: true,
          hasCategories: true,
          hasTags: true
        }
      };

      return successResponse(
        res, 
        200, 
        `Retrieved ${blogData.posts.length} blog post${blogData.posts.length !== 1 ? 's' : ''}`,
        enhancedBlogData,
        {
          version: 'v1',
          service: 'content-service',
          operation: 'get_blog_posts',
          pagination: blogData.pagination
        }
      );
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to retrieve blog posts at this time. Please try again later.',
        error,
        { 
          operation: 'get_blog_posts',
          suggestion: 'Please refresh the page or contact support'
        }
      );
    }
  },

  // GET /api/content/blog/:slug - Get single blog post
  async getBlogPost(req: Request, res: Response): Promise<Response> {
    try {
      const slug = req.params.slug;
      if (!slug) {
        return errorResponse(
          res, 
          400, 
          'Blog post slug is required',
          null,
          { parameter: 'slug', received: slug }
        );
      }

      const userId = req.user?.id; // Optional for view tracking
      const post = await contentService.getBlogPost(slug, userId);

      // Enhanced blog post response
      const enhancedPost = {
        ...post,
        postInfo: {
          postId: post.id,
          slug: post.slug,
          status: post.status,
          publishedAt: post.publishedAt,
          readingTime: Math.ceil(post.content.length / 200) + ' min read'
        },
        engagement: {
          views: post.viewCount,
          likes: post.likeCount,
          comments: post.commentCount,
          hasUserViewed: !!userId
        },
        seoInfo: {
          title: post.seoTitle || post.title,
          description: post.seoDescription || post.excerpt,
          keywords: post.seoKeywords || []
        },
        navigation: {
          canComment: true,
          canShare: true,
          canLike: !!userId
        }
      };

      return successResponse(
        res, 
        200, 
        'Blog post retrieved successfully',
        enhancedPost,
        {
          version: 'v1',
          service: 'content-service',
          operation: 'get_blog_post'
        }
      );
    } catch (error) {
      console.error('Error fetching blog post:', error);
      return errorResponse(
        res, 
        404, 
        'Blog post not found or is not available',
        error,
        { 
          operation: 'get_blog_post',
          slug: req.params.slug,
          suggestion: 'Please check the URL or browse our latest posts'
        }
      );
    }
  },

  // POST /api/admin/content/blog - Create blog post (Admin)
  async createBlogPost(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to create blog posts. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      if (req.user?.role !== 'admin') {
        return errorResponse(
          res, 
          403, 
          'Access denied. This endpoint requires administrator privileges.',
          null,
          { requiredRole: 'admin', currentRole: req.user?.role }
        );
      }

      const postData = createBlogPostSchema.parse(req.body);
      const post = await contentService.createBlogPost(userId, postData);

      // Enhanced blog post creation response
      const enhancedPost = {
        ...post,
        postInfo: {
          postId: post.id,
          slug: post.slug,
          status: post.status,
          isPublished: post.status === 'published',
          publishedAt: post.publishedAt
        },
        contentInfo: {
          wordCount: post.content.split(' ').length,
          readingTime: Math.ceil(post.content.length / 200) + ' min read',
          hasExcerpt: !!post.excerpt,
          hasFeaturedImage: !!post.featuredImage
        },
        seoInfo: {
          hasCustomSeoTitle: !!post.seoTitle,
          hasCustomSeoDescription: !!post.seoDescription,
          keywordCount: post.seoKeywords?.length || 0
        },
        nextSteps: [
          'Blog post has been created successfully',
          post.status === 'published' ? 'Post is now live and visible to readers' : 'Post is saved as draft - publish when ready',
          'You can edit or update the post anytime'
        ]
      };

      return adminSuccessResponse(
        res, 
        201, 
        `Blog post created successfully! ${post.status === 'published' ? 'It is now live.' : 'It has been saved as a draft.'}`,
        enhancedPost,
        'create_blog_post'
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The blog post information provided is invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error creating blog post:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to create blog post at this time. Please try again later.',
        error,
        { 
          operation: 'create_blog_post',
          userId: req.user?.id,
          suggestion: 'Please try again or contact technical support'
        }
      );
    }
  },

  // GET /api/content/faq - Get FAQ items
  async getFaqItems(req: Request, res: Response): Promise<Response> {
    try {
      const category = req.query.category as string | undefined;
      const faqData = await contentService.getFaqItems(category);

      // Enhanced FAQ response
      const enhancedFaqData = {
        ...faqData,
        faqInfo: {
          totalItems: faqData.totalItems,
          categoriesCount: faqData.categories.length,
          filteredByCategory: !!category,
          currentCategory: category
        },
        helpfulnessStats: {
          totalHelpfulVotes: faqData.faqs.reduce((sum, faq) => sum + faq.helpfulCount, 0),
          totalNotHelpfulVotes: faqData.faqs.reduce((sum, faq) => sum + faq.notHelpfulCount, 0),
          averageHelpfulness: faqData.faqs.length > 0 
            ? (faqData.faqs.reduce((sum, faq) => sum + faq.helpfulCount, 0) / faqData.faqs.length).toFixed(2)
            : '0'
        },
        features: {
          canSearch: true,
          canFilterByCategory: true,
          canVoteHelpful: true,
          hasCategories: faqData.categories.length > 0
        }
      };

      return successResponse(
        res, 
        200, 
        `Retrieved ${faqData.totalItems} FAQ item${faqData.totalItems !== 1 ? 's' : ''} across ${faqData.categories.length} categor${faqData.categories.length !== 1 ? 'ies' : 'y'}`,
        enhancedFaqData,
        {
          version: 'v1',
          service: 'content-service',
          operation: 'get_faq_items'
        }
      );
    } catch (error) {
      console.error('Error fetching FAQ items:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to retrieve FAQ items at this time. Please try again later.',
        error,
        { 
          operation: 'get_faq_items',
          suggestion: 'Please refresh the page or contact support'
        }
      );
    }
  },

  // GET /api/content/legal - Get legal documents
  async getLegalDocuments(req: Request, res: Response): Promise<Response> {
    try {
      const documentType = req.query.type as string | undefined;
      const legalData = await contentService.getLegalDocuments(documentType);

      // Enhanced legal documents response
      const enhancedLegalData = {
        ...legalData,
        legalInfo: {
          totalDocuments: legalData.totalDocuments,
          documentTypesCount: legalData.documentTypes.length,
          filteredByType: !!documentType,
          currentType: documentType
        },
        complianceInfo: {
          hasTermsOfService: legalData.documents.some(doc => doc.documentType === 'terms'),
          hasPrivacyPolicy: legalData.documents.some(doc => doc.documentType === 'privacy'),
          hasAboutPage: legalData.documents.some(doc => doc.documentType === 'about'),
          allDocumentsActive: legalData.documents.every(doc => true) // All returned documents are active
        },
        features: {
          canFilterByType: true,
          hasVersioning: true,
          hasEffectiveDates: true,
          requiresAcceptance: legalData.documents.some(doc => doc.requiresAcceptance)
        }
      };

      return successResponse(
        res, 
        200, 
        `Retrieved ${legalData.totalDocuments} legal document${legalData.totalDocuments !== 1 ? 's' : ''}`,
        enhancedLegalData,
        {
          version: 'v1',
          service: 'content-service',
          operation: 'get_legal_documents'
        }
      );
    } catch (error) {
      console.error('Error fetching legal documents:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to retrieve legal documents at this time. Please try again later.',
        error,
        { 
          operation: 'get_legal_documents',
          suggestion: 'Please refresh the page or contact support'
        }
      );
    }
  },

  // GET /api/content/search - Search content
  async searchContent(req: Request, res: Response): Promise<Response> {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return errorResponse(
          res, 
          400, 
          'Search query must be at least 2 characters long',
          null,
          { parameter: 'q', received: query, minLength: 2 }
        );
      }

      const contentTypes = req.query.types ? (req.query.types as string).split(',') : ['blog', 'faq'];
      const limit = parseInt(req.query.limit as string) || 20;

      const searchResults = await contentService.searchContent(query.trim(), contentTypes, limit);

      // Enhanced search results response
      const enhancedSearchResults = {
        ...searchResults,
        searchInfo: {
          query: query.trim(),
          searchedTypes: contentTypes,
          resultsCount: searchResults.totalResults,
          hasResults: searchResults.totalResults > 0
        },
        resultBreakdown: {
          blogResults: searchResults.results.filter(r => r.type === 'blog').length,
          faqResults: searchResults.results.filter(r => r.type === 'faq').length,
          legalResults: searchResults.results.filter(r => r.type === 'legal').length
        },
        searchTips: searchResults.totalResults === 0 ? [
          'Try using different keywords',
          'Check your spelling',
          'Use more general terms',
          'Browse our categories for related content'
        ] : []
      };

      const message = searchResults.totalResults > 0 
        ? `Found ${searchResults.totalResults} result${searchResults.totalResults !== 1 ? 's' : ''} for "${query}"`
        : `No results found for "${query}"`;

      return successResponse(
        res, 
        200, 
        message,
        enhancedSearchResults,
        {
          version: 'v1',
          service: 'content-service',
          operation: 'search_content'
        }
      );
    } catch (error) {
      console.error('Error searching content:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to search content at this time. Please try again later.',
        error,
        { 
          operation: 'search_content',
          query: req.query.q,
          suggestion: 'Please try again or browse our content categories'
        }
      );
    }
  }
};
