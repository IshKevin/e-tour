import { Request, Response } from 'express';
import { UploadService } from '../../services/upload.service';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse,
  uploadSuccessResponse
} from '../../utils/response';
import { z } from 'zod';

// Enhanced validation schemas
const uploadImageSchema = z.object({
  folder: z.string().max(50, 'Folder name cannot exceed 50 characters').optional().default('general'),
  width: z.coerce.number().min(50, 'Width must be at least 50px').max(2000, 'Width cannot exceed 2000px').optional(),
  height: z.coerce.number().min(50, 'Height must be at least 50px').max(2000, 'Height cannot exceed 2000px').optional(),
  quality: z.enum(['auto', 'best', 'good', 'eco', 'low']).optional().default('auto')
});

const deleteImageSchema = z.object({
  publicId: z.string().min(1, 'Public ID is required').max(200, 'Public ID cannot exceed 200 characters')
});

export const uploadController = {
  // POST /api/upload/image - Upload single image
  async uploadImage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to upload images. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      if (!req.file) {
        return errorResponse(
          res, 
          400, 
          'No image file provided. Please select an image file to upload.',
          null,
          { 
            field: 'image', 
            allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
            maxSize: '10MB'
          }
        );
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (req.file.size > maxSize) {
        return errorResponse(
          res, 
          400, 
          'File size exceeds the 10MB limit. Please choose a smaller image.',
          null,
          { 
            fileSize: `${(req.file.size / (1024 * 1024)).toFixed(2)}MB`,
            maxSize: '10MB',
            suggestion: 'Compress your image or choose a smaller file'
          }
        );
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return errorResponse(
          res, 
          400, 
          'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
          null,
          { 
            receivedType: req.file.mimetype,
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
          }
        );
      }

      const { folder, width, height, quality } = uploadImageSchema.parse(req.query);

      const uploadOptions = {
        folder: `etour/${folder}`,
        transformation: { 
          width, 
          height, 
          crop: 'fill' as const, 
          quality 
        },
      };

      const result = await UploadService.uploadImage(req.file, uploadOptions);
      const variants = UploadService.generateImageVariants(result.public_id);

      // Enhanced upload response
      const enhancedResult = {
        ...result,
        variants,
        uploadInfo: {
          originalSize: `${(req.file.size / (1024 * 1024)).toFixed(2)}MB`,
          optimizedSize: `${(result.bytes / (1024 * 1024)).toFixed(2)}MB`,
          compressionRatio: `${(((req.file.size - result.bytes) / req.file.size) * 100).toFixed(1)}%`,
          folder: folder,
          transformation: uploadOptions.transformation
        },
        usage: {
          cdn: 'Cloudinary',
          accessUrl: result.secure_url,
          publicId: result.public_id
        }
      };

      return uploadSuccessResponse(
        res, 
        201, 
        'Image uploaded successfully! Your image has been optimized and is ready to use.', 
        enhancedResult,
        {
          uploadType: 'single_image',
          folder: folder,
          optimized: true
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The upload parameters provided are invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error uploading image:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to upload image at this time. Please try again later.',
        error,
        { 
          operation: 'upload_image',
          userId: req.user?.id,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  },

  // POST /api/upload/profile - Upload profile image
  async uploadProfileImage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to upload a profile image. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      if (!req.file) {
        return errorResponse(
          res, 
          400, 
          'No profile image provided. Please select an image file to upload.',
          null,
          { 
            field: 'image', 
            allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
            maxSize: '10MB',
            recommendedSize: '300x300px'
          }
        );
      }

      // Validate file size (5MB limit for profile images)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        return errorResponse(
          res, 
          400, 
          'Profile image size exceeds the 5MB limit. Please choose a smaller image.',
          null,
          { 
            fileSize: `${(req.file.size / (1024 * 1024)).toFixed(2)}MB`,
            maxSize: '5MB',
            suggestion: 'Use a smaller image or compress your current image'
          }
        );
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return errorResponse(
          res, 
          400, 
          'Invalid file type for profile image. Only JPEG, PNG, and WebP images are allowed.',
          null,
          { 
            receivedType: req.file.mimetype,
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
          }
        );
      }

      const result = await UploadService.uploadProfileImage(req.file, userId);
      const variants = UploadService.generateImageVariants(result.public_id);

      // Enhanced profile upload response
      const enhancedResult = {
        ...result,
        variants,
        profileInfo: {
          userId: userId,
          imageType: 'profile',
          dimensions: `${result.width}x${result.height}`,
          optimizedForProfile: true,
          circularCrop: true
        },
        uploadInfo: {
          originalSize: `${(req.file.size / (1024 * 1024)).toFixed(2)}MB`,
          optimizedSize: `${(result.bytes / (1024 * 1024)).toFixed(2)}MB`,
          compressionRatio: `${(((req.file.size - result.bytes) / req.file.size) * 100).toFixed(1)}%`
        },
        nextSteps: [
          'Your profile image has been updated',
          'The new image will appear across your account',
          'Changes may take a few minutes to reflect everywhere'
        ]
      };

      return uploadSuccessResponse(
        res, 
        201, 
        'Profile image uploaded successfully! Your new profile picture is now active.', 
        enhancedResult,
        {
          uploadType: 'profile_image',
          userId: userId,
          optimized: true
        }
      );
    } catch (error) {
      console.error('Error uploading profile image:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to upload profile image at this time. Please try again later.',
        error,
        { 
          operation: 'upload_profile_image',
          userId: req.user?.id,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  },

  // DELETE /api/upload/image - Delete image
  async deleteImage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(
          res, 
          401, 
          'Authentication is required to delete images. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const { publicId } = deleteImageSchema.parse(req.query);
      
      if (!publicId) {
        return errorResponse(
          res, 
          400, 
          'Public ID is required to delete an image. Please provide the image public ID.',
          null,
          { 
            parameter: 'publicId', 
            example: '?publicId=etour/trips/image123'
          }
        );
      }

      const decodedPublicId = decodeURIComponent(publicId);
      
      // Security check: ensure user can only delete images from allowed folders
      const allowedFolders = ['etour/general', 'etour/profiles', 'etour/trips'];
      const isAllowed = allowedFolders.some(folder => decodedPublicId.startsWith(folder));
      
      if (!isAllowed) {
        return errorResponse(
          res, 
          403, 
          'You do not have permission to delete this image.',
          null,
          { 
            publicId: decodedPublicId,
            allowedFolders: allowedFolders
          }
        );
      }

      const result = await UploadService.deleteImage(decodedPublicId);

      if (result.result === 'ok') {
        return uploadSuccessResponse(
          res, 
          200, 
          'Image deleted successfully! The image has been permanently removed from our servers.', 
          {
            publicId: decodedPublicId,
            deletionInfo: {
              status: 'deleted',
              deletedAt: new Date().toISOString(),
              deletedBy: userId
            },
            result: result
          },
          {
            operation: 'delete_image',
            publicId: decodedPublicId
          }
        );
      } else {
        return errorResponse(
          res, 
          404, 
          'Image not found or has already been deleted.',
          null,
          { 
            publicId: decodedPublicId,
            result: result.result,
            suggestion: 'Verify the public ID and try again'
          }
        );
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res, 
          'The deletion parameters provided are invalid. Please check your input and try again.', 
          error.errors
        );
      }
      console.error('Error deleting image:', error);
      return errorResponse(
        res, 
        500, 
        'Unable to delete image at this time. Please try again later.',
        error,
        { 
          operation: 'delete_image',
          userId: req.user?.id,
          publicId: req.query.publicId,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  }
};
