import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../../db/' // Adjust path to your Drizzle DB client
import { businesses } from './db/schema/business.schema.ts';
import { eq } from 'drizzle-orm';
import { StatusCodes } from 'http-status-codes';

// Define input validation schema for creating a business
const createBusinessSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  categories: z.array(z.string().max(100)).optional(),
  specializations: z.array(z.string().max(100)).optional(),
  business_hours: z.record(z.any()).default({}),
  seasonal_schedules: z.record(z.any()).optional(),
  contact_info: z.record(z.any()).default({}),
  social_media_links: z.record(z.any()).optional(),
  location: z.record(z.any()).default({}),
  service_areas: z.array(z.string().max(255)).optional(),
  photos: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
});

// Define input validation schema for updating a business
const updateBusinessSchema = createBusinessSchema.partial(); // All fields optional for updates

// Create a business
export const createBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate input
    const data = createBusinessSchema.parse(req.body);

    // Get user ID from authenticated user (assuming JWT middleware sets req.user)
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: 'User not authenticated' });
    }

    // Check if user is a service_provider (assuming role is in req.user)
    if (req.user?.role !== 'service_provider') {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: 'Only service providers can create businesses' });
    }

    // Insert business into database
    const [newBusiness] = await db
      .insert(businesses)
      .values({
        user_id: userId,
        name: data.name,
        description: data.description,
        categories: data.categories,
        specializations: data.specializations,
        business_hours: data.business_hours,
        seasonal_schedules: data.seasonal_schedules,
        contact_info: data.contact_info,
        social_media_links: data.social_media_links,
        location: data.location,
        service_areas: data.service_areas,
        photos: data.photos,
        videos: data.videos,
      })
      .returning();

    // Send success response
    res.status(StatusCodes.CREATED).json({
      message: 'Business created successfully',
      data: newBusiness,
    });
  } catch (error) {
    next(error); // Pass errors to error handler
  }
};

// Update a business
export const updateBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate input
    const data = updateBusinessSchema.parse(req.body);

    // Get business ID from URL
    const businessId = req.params.id;

    // Get user ID from authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: 'User not authenticated' });
    }

    // Check if business exists and belongs to user
    const [existingBusiness] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!existingBusiness) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: 'Business not found' });
    }

    if (existingBusiness.user_id !== userId) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: 'Not authorized to update this business' });
    }

    // Update business
    const [updatedBusiness] = await db
      .update(businesses)
      .set({
        name: data.name,
        description: data.description,
        categories: data.categories,
        specializations: data.specializations,
        business_hours: data.business_hours,
        seasonal_schedules: data.seasonal_schedules,
        contact_info: data.contact_info,
        social_media_links: data.social_media_links,
        location: data.location,
        service_areas: data.service_areas,
        photos: data.photos,
        videos: data.videos,
      })
      .where(eq(businesses.id, businessId))
      .returning();

    // Send success response
    res.status(StatusCodes.OK).json({
      message: 'Business updated successfully',
      data: updatedBusiness,
    });
  } catch (error) {
    next(error);
  }
};