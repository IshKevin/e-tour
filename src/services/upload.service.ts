import { v2 as cloudinary } from 'cloudinary';
import { Request } from 'express';
import multer from 'multer';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

export interface UploadOptions {
  folder?: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
  };
  public_id?: string;
  overwrite?: boolean;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
}

export class UploadService {
  /**
   * Upload single image to Cloudinary
   */
  static async uploadImage(
    file: Express.Multer.File,
    options: UploadOptions = {}
  ): Promise<{
    public_id: string;
    url: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  }> {
    try {
      return new Promise((resolve, reject) => {
        const uploadOptions: any = {
          folder: options.folder || 'etour',
          resource_type: options.resource_type || 'image',
          overwrite: options.overwrite || false,
          ...options,
        };

        // Add transformation if provided
        if (options.transformation) {
          uploadOptions.transformation = [
            {
              width: options.transformation.width || 800,
              height: options.transformation.height || 600,
              crop: options.transformation.crop || 'fill',
              quality: options.transformation.quality || 'auto',
            },
          ];
        }

        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                public_id: result!.public_id,
                url: result!.url,
                secure_url: result!.secure_url,
                width: result!.width,
                height: result!.height,
                format: result!.format,
                bytes: result!.bytes,
              });
            }
          }
        );

        // Convert buffer to stream and pipe to Cloudinary
        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);
        bufferStream.pipe(uploadStream);
      });
    } catch (error: any) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple images to Cloudinary
   */
  static async uploadMultipleImages(
    files: Express.Multer.File[],
    options: UploadOptions = {}
  ): Promise<Array<{
    public_id: string;
    url: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  }>> {
    try {
      const uploadPromises = files.map((file, index) => {
        const fileOptions = {
          ...options,
          public_id: options.public_id ? `${options.public_id}_${index}` : undefined,
        };
        return this.uploadImage(file, fileOptions);
      });

      return await Promise.all(uploadPromises);
    } catch (error: any) {
      throw new Error(`Multiple image upload failed: ${error.message}`);
    }
  }

  /**
   * Delete image from Cloudinary
   */
  static async deleteImage(publicId: string): Promise<{ result: string }> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error: any) {
      throw new Error(`Image deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete multiple images from Cloudinary
   */
  static async deleteMultipleImages(publicIds: string[]): Promise<{ deleted: Record<string, string> }> {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      return result;
    } catch (error: any) {
      throw new Error(`Multiple image deletion failed: ${error.message}`);
    }
  }

  /**
   * Get image details from Cloudinary
   */
  static async getImageDetails(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error: any) {
      throw new Error(`Failed to get image details: ${error.message}`);
    }
  }

  /**
   * Generate optimized image URL with transformations
   */
  static generateImageUrl(
    publicId: string,
    transformations: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string | number;
      format?: string;
    } = {}
  ): string {
    return cloudinary.url(publicId, {
      transformation: [
        {
          width: transformations.width || 800,
          height: transformations.height || 600,
          crop: transformations.crop || 'fill',
          quality: transformations.quality || 'auto',
          format: transformations.format || 'auto',
        },
      ],
    });
  }

  /**
   * Generate multiple image variants (thumbnail, medium, large)
   */
  static generateImageVariants(publicId: string): {
    thumbnail: string;
    medium: string;
    large: string;
    original: string;
  } {
    return {
      thumbnail: this.generateImageUrl(publicId, {
        width: 150,
        height: 150,
        crop: 'fill',
        quality: 'auto',
      }),
      medium: this.generateImageUrl(publicId, {
        width: 400,
        height: 300,
        crop: 'fill',
        quality: 'auto',
      }),
      large: this.generateImageUrl(publicId, {
        width: 1200,
        height: 800,
        crop: 'fill',
        quality: 'auto',
      }),
      original: cloudinary.url(publicId, { quality: 'auto' }),
    };
  }

  /**
   * Upload profile image with specific transformations
   */
  static async uploadProfileImage(file: Express.Multer.File, userId: string) {
    return await this.uploadImage(file, {
      folder: 'etour/profiles',
      public_id: `profile_${userId}`,
      overwrite: true,
      transformation: {
        width: 300,
        height: 300,
        crop: 'fill',
        quality: 'auto',
      },
    });
  }

  /**
   * Upload trip images with specific transformations
   */
  static async uploadTripImages(files: Express.Multer.File[], tripId: string) {
    return await this.uploadMultipleImages(files, {
      folder: 'etour/trips',
      public_id: `trip_${tripId}`,
      transformation: {
        width: 1200,
        height: 800,
        crop: 'fill',
        quality: 'auto',
      },
    });
  }

  /**
   * Upload document files
   */
  static async uploadDocument(file: Express.Multer.File, folder: string = 'documents') {
    return await this.uploadImage(file, {
      folder: `etour/${folder}`,
      resource_type: 'auto',
    });
  }
}

export default UploadService;
