import { db } from '../config/database';
import { 
  blogPosts, 
  faqItems,
  legalDocuments,
  contentCategories,
  blogComments,
  contentViews,
  NewBlogPost,
  NewFaqItem,
  NewLegalDocument,
  NewContentView
} from '../db/schema/content.schema';
import { users } from '../db/schema/user.schema';
import { eq, and, desc, count, like, sql, or } from 'drizzle-orm';

export interface ContentFilters {
  page?: number;
  limit?: number;
  status?: 'draft' | 'published' | 'archived';
  category?: string;
  search?: string;
}

export const contentService = {
  // Get blog posts
  async getBlogPosts(filters: ContentFilters = {}) {
    try {
      const { page = 1, limit = 10, status, category, search } = filters;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      
      if (status) {
        whereConditions.push(eq(blogPosts.status, status));
      } else {
        whereConditions.push(eq(blogPosts.status, 'published'));
      }

      if (search) {
        whereConditions.push(
          or(
            like(blogPosts.title, `%${search}%`),
            like(blogPosts.content, `%${search}%`),
            like(blogPosts.excerpt, `%${search}%`)
          )
        );
      }

      const [posts, totalCount] = await Promise.all([
        db
          .select({
            id: blogPosts.id,
            title: blogPosts.title,
            slug: blogPosts.slug,
            excerpt: blogPosts.excerpt,
            featuredImage: blogPosts.featuredImage,
            tags: blogPosts.tags,
            categories: blogPosts.categories,
            status: blogPosts.status,
            publishedAt: blogPosts.publishedAt,
            viewCount: blogPosts.viewCount,
            likeCount: blogPosts.likeCount,
            commentCount: blogPosts.commentCount,
            createdAt: blogPosts.createdAt,
            author: {
              id: users.id,
              name: users.name,
              profileImage: users.profileImage
            }
          })
          .from(blogPosts)
          .leftJoin(users, eq(blogPosts.authorId, users.id))
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
          .orderBy(desc(blogPosts.publishedAt))
          .limit(limit)
          .offset(offset),

        db
          .select({ count: count() })
          .from(blogPosts)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      ]);

      const totalPages = Math.ceil(totalCount[0].count / limit);

      return {
        posts,
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
      console.error('Error fetching blog posts:', error);
      throw error;
    }
  },

  // Get single blog post
  async getBlogPost(slug: string, userId?: string) {
    try {
      const post = await db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          excerpt: blogPosts.excerpt,
          content: blogPosts.content,
          featuredImage: blogPosts.featuredImage,
          tags: blogPosts.tags,
          categories: blogPosts.categories,
          status: blogPosts.status,
          publishedAt: blogPosts.publishedAt,
          viewCount: blogPosts.viewCount,
          likeCount: blogPosts.likeCount,
          commentCount: blogPosts.commentCount,
          seoTitle: blogPosts.seoTitle,
          seoDescription: blogPosts.seoDescription,
          seoKeywords: blogPosts.seoKeywords,
          createdAt: blogPosts.createdAt,
          updatedAt: blogPosts.updatedAt,
          author: {
            id: users.id,
            name: users.name,
            profileImage: users.profileImage,
            role: users.role
          }
        })
        .from(blogPosts)
        .leftJoin(users, eq(blogPosts.authorId, users.id))
        .where(and(
          eq(blogPosts.slug, slug),
          eq(blogPosts.status, 'published')
        ))
        .limit(1);

      if (!post.length) {
        throw new Error('Blog post not found');
      }

      // Record view if user provided
      if (userId) {
        const newView: NewContentView = {
          contentId: post[0].id,
          contentType: 'blog',
          userId,
          viewedAt: new Date()
        };
        await db.insert(contentViews).values(newView);

        // Update view count
        await db
          .update(blogPosts)
          .set({
            viewCount: sql`${blogPosts.viewCount} + 1`,
            updatedAt: new Date()
          })
          .where(eq(blogPosts.id, post[0].id));
      }

      return post[0];
    } catch (error) {
      console.error('Error fetching blog post:', error);
      throw error;
    }
  },

  // Create blog post (Admin)
  async createBlogPost(authorId: string, postData: {
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    featuredImage?: string;
    tags?: string[];
    categories?: string[];
    status?: 'draft' | 'published';
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
  }) {
    try {
      const newPost: NewBlogPost = {
        title: postData.title,
        slug: postData.slug,
        excerpt: postData.excerpt,
        content: postData.content,
        featuredImage: postData.featuredImage,
        tags: postData.tags || [],
        categories: postData.categories || [],
        status: postData.status || 'draft',
        publishedAt: postData.status === 'published' ? new Date() : null,
        seoTitle: postData.seoTitle,
        seoDescription: postData.seoDescription,
        seoKeywords: postData.seoKeywords || [],
        authorId
      };

      const [post] = await db.insert(blogPosts).values(newPost).returning();
      return post;
    } catch (error) {
      console.error('Error creating blog post:', error);
      throw error;
    }
  },

  // Get FAQ items
  async getFaqItems(category?: string) {
    try {
      let whereConditions = [eq(faqItems.isPublished, true)];
      
      if (category) {
        whereConditions.push(eq(faqItems.category, category));
      }

      const faqs = await db
        .select({
          id: faqItems.id,
          question: faqItems.question,
          answer: faqItems.answer,
          category: faqItems.category,
          sortOrder: faqItems.sortOrder,
          viewCount: faqItems.viewCount,
          helpfulCount: faqItems.helpfulCount,
          notHelpfulCount: faqItems.notHelpfulCount,
          tags: faqItems.tags,
          createdAt: faqItems.createdAt,
          updatedAt: faqItems.updatedAt
        })
        .from(faqItems)
        .where(and(...whereConditions))
        .orderBy(faqItems.sortOrder, faqItems.createdAt);

      // Group by category
      const groupedFaqs = faqs.reduce((acc, faq) => {
        if (!acc[faq.category]) {
          acc[faq.category] = [];
        }
        acc[faq.category].push(faq);
        return acc;
      }, {} as Record<string, typeof faqs>);

      return {
        faqs,
        groupedFaqs,
        categories: Object.keys(groupedFaqs),
        totalItems: faqs.length
      };
    } catch (error) {
      console.error('Error fetching FAQ items:', error);
      throw error;
    }
  },

  // Create FAQ item (Admin)
  async createFaqItem(creatorId: string, faqData: {
    question: string;
    answer: string;
    category: string;
    sortOrder?: number;
    tags?: string[];
  }) {
    try {
      const newFaq: NewFaqItem = {
        question: faqData.question,
        answer: faqData.answer,
        category: faqData.category,
        sortOrder: faqData.sortOrder || 0,
        tags: faqData.tags || [],
        createdBy: creatorId
      };

      const [faq] = await db.insert(faqItems).values(newFaq).returning();
      return faq;
    } catch (error) {
      console.error('Error creating FAQ item:', error);
      throw error;
    }
  },

  // Get legal documents
  async getLegalDocuments(documentType?: string) {
    try {
      let whereConditions = [eq(legalDocuments.isActive, true)];
      
      if (documentType) {
        whereConditions.push(eq(legalDocuments.documentType, documentType as any));
      }

      const documents = await db
        .select({
          id: legalDocuments.id,
          title: legalDocuments.title,
          slug: legalDocuments.slug,
          content: legalDocuments.content,
          documentType: legalDocuments.documentType,
          version: legalDocuments.version,
          effectiveDate: legalDocuments.effectiveDate,
          lastReviewDate: legalDocuments.lastReviewDate,
          nextReviewDate: legalDocuments.nextReviewDate,
          requiresAcceptance: legalDocuments.requiresAcceptance,
          acceptanceCount: legalDocuments.acceptanceCount,
          createdAt: legalDocuments.createdAt,
          updatedAt: legalDocuments.updatedAt
        })
        .from(legalDocuments)
        .where(and(...whereConditions))
        .orderBy(desc(legalDocuments.effectiveDate));

      return {
        documents,
        documentTypes: [...new Set(documents.map(doc => doc.documentType))],
        totalDocuments: documents.length
      };
    } catch (error) {
      console.error('Error fetching legal documents:', error);
      throw error;
    }
  },

  // Get single legal document
  async getLegalDocument(slug: string) {
    try {
      const document = await db
        .select()
        .from(legalDocuments)
        .where(and(
          eq(legalDocuments.slug, slug),
          eq(legalDocuments.isActive, true)
        ))
        .limit(1);

      if (!document.length) {
        throw new Error('Legal document not found');
      }

      return document[0];
    } catch (error) {
      console.error('Error fetching legal document:', error);
      throw error;
    }
  },

  // Create legal document (Admin)
  async createLegalDocument(creatorId: string, documentData: {
    title: string;
    slug: string;
    content: string;
    documentType: 'terms' | 'privacy' | 'about' | 'help';
    version: string;
    effectiveDate: string;
    requiresAcceptance?: boolean;
  }) {
    try {
      const newDocument: NewLegalDocument = {
        title: documentData.title,
        slug: documentData.slug,
        content: documentData.content,
        documentType: documentData.documentType,
        version: documentData.version,
        effectiveDate: new Date(documentData.effectiveDate),
        requiresAcceptance: documentData.requiresAcceptance || false,
        createdBy: creatorId
      };

      const [document] = await db.insert(legalDocuments).values(newDocument).returning();
      return document;
    } catch (error) {
      console.error('Error creating legal document:', error);
      throw error;
    }
  },

  // Search content
  async searchContent(query: string, contentTypes: string[] = ['blog', 'faq'], limit: number = 20) {
    try {
      const results = [];

      // Search blog posts
      if (contentTypes.includes('blog')) {
        const blogResults = await db
          .select({
            id: blogPosts.id,
            title: blogPosts.title,
            slug: blogPosts.slug,
            excerpt: blogPosts.excerpt,
            type: sql`'blog'`.as('type'),
            publishedAt: blogPosts.publishedAt,
            viewCount: blogPosts.viewCount
          })
          .from(blogPosts)
          .where(and(
            eq(blogPosts.status, 'published'),
            or(
              like(blogPosts.title, `%${query}%`),
              like(blogPosts.content, `%${query}%`),
              like(blogPosts.excerpt, `%${query}%`)
            )
          ))
          .limit(limit);

        results.push(...blogResults.map(r => ({ ...r, type: 'blog' })));
      }

      // Search FAQ items
      if (contentTypes.includes('faq')) {
        const faqResults = await db
          .select({
            id: faqItems.id,
            title: faqItems.question,
            slug: sql`''`.as('slug'),
            excerpt: faqItems.answer,
            type: sql`'faq'`.as('type'),
            publishedAt: faqItems.createdAt,
            viewCount: faqItems.viewCount
          })
          .from(faqItems)
          .where(and(
            eq(faqItems.isPublished, true),
            or(
              like(faqItems.question, `%${query}%`),
              like(faqItems.answer, `%${query}%`)
            )
          ))
          .limit(limit);

        results.push(...faqResults);
      }

      return {
        results: results.slice(0, limit),
        totalResults: results.length,
        query,
        searchedTypes: contentTypes
      };
    } catch (error) {
      console.error('Error searching content:', error);
      throw error;
    }
  }
};
