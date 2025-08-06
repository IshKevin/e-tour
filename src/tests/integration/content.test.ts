import { describe, test, expect } from '@jest/globals';
import {
  makeRequest,
  testTokens,
  expectSuccessResponse,
  expectErrorResponse,
  expectAuthError,
  expectValidationError,
  expectForbiddenError
} from '../setup';

describe('Content Management System Tests', () => {
  describe('GET /api/v1/content/blog', () => {
    test('should get blog posts successfully (public)', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/blog');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('posts');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('blogInfo');
      expect(response.body.data).toHaveProperty('contentStats');
      expect(response.body.data).toHaveProperty('features');
    });

    test('should support pagination', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/blog?page=1&limit=5');

      expectSuccessResponse(response);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    test('should support search', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/blog?search=travel');

      expectSuccessResponse(response);
      expect(response.body.data.blogInfo.hasSearch).toBe(true);
      expect(response.body.data.blogInfo.searchTerm).toBe('travel');
    });

    test('should support category filtering', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/blog?category=Travel Tips');

      expectSuccessResponse(response);
    });

    test('should support status filtering', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/blog?status=published');

      expectSuccessResponse(response);
    });
  });

  describe('GET /api/v1/content/blog/:slug', () => {
    test('should get single blog post successfully (public)', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/blog/test-blog-post');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('postInfo');
      expect(response.body.data).toHaveProperty('engagement');
      expect(response.body.data).toHaveProperty('seoInfo');
      expect(response.body.data).toHaveProperty('navigation');
      expect(response.body.data.postInfo).toHaveProperty('readingTime');
    });

    test('should track view when user is authenticated', async () => {
      const response = await makeRequest(testTokens.client)
        .get('/api/v1/content/blog/test-blog-post');

      expectSuccessResponse(response);
      expect(response.body.data.engagement.hasUserViewed).toBe(true);
    });

    test('should handle non-existent blog post', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/blog/non-existent-post');

      expectErrorResponse(response, 404);
    });

    test('should handle invalid slug format', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/blog/');

      expectErrorResponse(response, 404); // Route not found
    });
  });

  describe('POST /api/v1/content/admin/blog', () => {
    const validBlogPostData = {
      title: 'Top 10 Travel Destinations 2024',
      slug: 'top-10-travel-destinations-2024',
      excerpt: 'Discover the most amazing places to visit this year',
      content: 'This is the full content of the blog post with detailed information about travel destinations...',
      featuredImage: 'https://example.com/featured-image.jpg',
      tags: ['travel', 'destinations', '2024'],
      categories: ['Travel Tips', 'Destinations'],
      status: 'published',
      seoTitle: 'Best Travel Destinations 2024 | E-Tour',
      seoDescription: 'Explore the top 10 travel destinations for 2024 with our comprehensive guide',
      seoKeywords: ['travel', 'destinations', 'vacation', '2024']
    };

    test('should create blog post successfully (admin)', async () => {
      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/content/admin/blog')
        .send(validBlogPostData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('postInfo');
      expect(response.body.data.postInfo).toHaveProperty('slug', 'top-10-travel-destinations-2024');
      expect(response.body.data.postInfo).toHaveProperty('status', 'published');
      expect(response.body.data).toHaveProperty('contentInfo');
      expect(response.body.data).toHaveProperty('seoInfo');
    });

    test('should create draft blog post', async () => {
      const draftData = {
        ...validBlogPostData,
        title: 'Draft Blog Post',
        slug: 'draft-blog-post',
        status: 'draft'
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/content/admin/blog')
        .send(draftData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.postInfo.status).toBe('draft');
      expect(response.body.data.postInfo.isPublished).toBe(false);
    });

    test('should require admin authentication', async () => {
      const response = await makeRequest(testTokens.client)
        .post('/api/v1/content/admin/blog')
        .send(validBlogPostData);

      expectForbiddenError(response);
    });

    test('should require authentication', async () => {
      const response = await makeRequest()
        .post('/api/v1/content/admin/blog')
        .send(validBlogPostData);

      expectAuthError(response);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        title: 'Test Post'
        // Missing required fields
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/content/admin/blog')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate title length', async () => {
      const invalidData = {
        ...validBlogPostData,
        title: 'a'.repeat(256) // Too long
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/content/admin/blog')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate featured image URL', async () => {
      const invalidData = {
        ...validBlogPostData,
        featuredImage: 'invalid-url'
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/content/admin/blog')
        .send(invalidData);

      expectValidationError(response);
    });

    test('should validate status enum', async () => {
      const invalidData = {
        ...validBlogPostData,
        status: 'invalid_status'
      };

      const response = await makeRequest(testTokens.admin)
        .post('/api/v1/content/admin/blog')
        .send(invalidData);

      expectValidationError(response);
    });
  });

  describe('GET /api/v1/content/faq', () => {
    test('should get FAQ items successfully (public)', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/faq');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('faqs');
      expect(response.body.data).toHaveProperty('groupedFaqs');
      expect(response.body.data).toHaveProperty('categories');
      expect(response.body.data).toHaveProperty('faqInfo');
      expect(response.body.data).toHaveProperty('helpfulnessStats');
      expect(response.body.data).toHaveProperty('features');
    });

    test('should support category filtering', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/faq?category=Booking');

      expectSuccessResponse(response);
      expect(response.body.data.faqInfo.filteredByCategory).toBe(true);
      expect(response.body.data.faqInfo.currentCategory).toBe('Booking');
    });

    test('should group FAQs by category', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/faq');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('groupedFaqs');
      expect(typeof response.body.data.groupedFaqs).toBe('object');
    });
  });

  describe('GET /api/v1/content/legal', () => {
    test('should get legal documents successfully (public)', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/legal');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('documents');
      expect(response.body.data).toHaveProperty('documentTypes');
      expect(response.body.data).toHaveProperty('legalInfo');
      expect(response.body.data).toHaveProperty('complianceInfo');
      expect(response.body.data).toHaveProperty('features');
    });

    test('should support document type filtering', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/legal?type=terms');

      expectSuccessResponse(response);
      expect(response.body.data.legalInfo.filteredByType).toBe(true);
      expect(response.body.data.legalInfo.currentType).toBe('terms');
    });

    test('should validate document type filter', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/legal?type=invalid_type');

      expectSuccessResponse(response); // Should still work, just no results
    });
  });

  describe('GET /api/v1/content/legal/:slug', () => {
    test('should get single legal document successfully (public)', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/legal/terms-of-service');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('documentType');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('effectiveDate');
    });

    test('should handle non-existent legal document', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/legal/non-existent-document');

      expectErrorResponse(response, 404);
    });
  });

  describe('GET /api/v1/content/search', () => {
    test('should search content successfully (public)', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/search?q=travel');

      expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('searchInfo');
      expect(response.body.data.searchInfo).toHaveProperty('query', 'travel');
      expect(response.body.data).toHaveProperty('resultBreakdown');
    });

    test('should support content type filtering', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/search?q=booking&types=blog,faq');

      expectSuccessResponse(response);
      expect(response.body.data.searchInfo.searchedTypes).toEqual(['blog', 'faq']);
    });

    test('should support result limit', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/search?q=travel&limit=5');

      expectSuccessResponse(response);
      expect(response.body.data.results.length).toBeLessThanOrEqual(5);
    });

    test('should require minimum query length', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/search?q=a');

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('at least 2 characters');
    });

    test('should handle empty query', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/search?q=');

      expectErrorResponse(response, 400);
    });

    test('should handle no results', async () => {
      const response = await makeRequest()
        .get('/api/v1/content/search?q=nonexistentquery12345');

      expectSuccessResponse(response);
      expect(response.body.data.totalResults).toBe(0);
      expect(response.body.data.searchTips.length).toBeGreaterThan(0);
    });
  });

  describe('Content Integration Tests', () => {
    test('should handle complete content workflow', async () => {
      // 1. Admin creates a blog post
      const createPostResponse = await makeRequest(testTokens.admin)
        .post('/api/v1/content/admin/blog')
        .send({
          title: 'Integration Test Blog Post',
          slug: 'integration-test-blog-post',
          excerpt: 'This is a test blog post for integration testing',
          content: 'Full content of the integration test blog post with detailed information...',
          tags: ['test', 'integration'],
          categories: ['Testing'],
          status: 'published'
        });

      expectSuccessResponse(createPostResponse, 201);

      // 2. Public user views blog posts list
      const blogListResponse = await makeRequest()
        .get('/api/v1/content/blog');

      expectSuccessResponse(blogListResponse);

      // 3. Public user reads the specific blog post
      const blogPostResponse = await makeRequest()
        .get('/api/v1/content/blog/integration-test-blog-post');

      expectSuccessResponse(blogPostResponse);

      // 4. Authenticated user reads the post (should track view)
      const authenticatedReadResponse = await makeRequest(testTokens.client)
        .get('/api/v1/content/blog/integration-test-blog-post');

      expectSuccessResponse(authenticatedReadResponse);
      expect(authenticatedReadResponse.body.data.engagement.hasUserViewed).toBe(true);

      // 5. User searches for content
      const searchResponse = await makeRequest()
        .get('/api/v1/content/search?q=integration');

      expectSuccessResponse(searchResponse);
      expect(searchResponse.body.data.totalResults).toBeGreaterThanOrEqual(0);

      // 6. User views FAQ
      const faqResponse = await makeRequest()
        .get('/api/v1/content/faq');

      expectSuccessResponse(faqResponse);

      // 7. User views legal documents
      const legalResponse = await makeRequest()
        .get('/api/v1/content/legal');

      expectSuccessResponse(legalResponse);
    });

    test('should handle content search across different types', async () => {
      // Search in blog only
      const blogSearchResponse = await makeRequest()
        .get('/api/v1/content/search?q=travel&types=blog');

      expectSuccessResponse(blogSearchResponse);
      expect(response.body.data.searchInfo.searchedTypes).toEqual(['blog']);

      // Search in FAQ only
      const faqSearchResponse = await makeRequest()
        .get('/api/v1/content/search?q=booking&types=faq');

      expectSuccessResponse(faqSearchResponse);

      // Search in both
      const combinedSearchResponse = await makeRequest()
        .get('/api/v1/content/search?q=help&types=blog,faq');

      expectSuccessResponse(combinedSearchResponse);
      expect(combinedSearchResponse.body.data.searchInfo.searchedTypes).toEqual(['blog', 'faq']);
    });
  });
});
