import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { UploadService, upload } from '../../../services/upload.service';

const router = Router();

router.post('/image', authMiddleware, upload.single('image'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided'
      });
    }

    const folder = req.query.folder || 'general';
    const width = req.query.width ? parseInt(req.query.width) : undefined;
    const height = req.query.height ? parseInt(req.query.height) : undefined;
    const quality = req.query.quality || 'auto';

    const uploadOptions = {
      folder: `etour/${folder}`,
      transformation: { width, height, crop: 'fill', quality },
    };

    const result = await UploadService.uploadImage(req.file, uploadOptions);
    const variants = UploadService.generateImageVariants(result.public_id);

    res.json({
      message: 'Image uploaded successfully',
      data: { ...result, variants }
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    res.status(500).json({
      error: 'Failed to upload image',
      details: error.message
    });
  }
});

// Upload profile image
router.post('/profile', authMiddleware, upload.single('image'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No profile image provided'
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const result = await UploadService.uploadProfileImage(req.file, userId);
    const variants = UploadService.generateImageVariants(result.public_id);

    res.json({
      message: 'Profile image uploaded successfully',
      data: { ...result, variants }
    });
  } catch (error: any) {
    console.error('Profile image upload error:', error);
    res.status(500).json({
      error: 'Failed to upload profile image',
      details: error.message
    });
  }
});

// Delete image - using query parameter instead of path parameter to avoid path-to-regexp issues
router.delete('/image', authMiddleware, async (req: any, res: any) => {
  try {
    const publicId = req.query.publicId as string;
    if (!publicId) {
      return res.status(400).json({
        error: 'Public ID is required as query parameter'
      });
    }

    const decodedPublicId = decodeURIComponent(publicId);
    const result = await UploadService.deleteImage(decodedPublicId);

    if (result.result === 'ok') {
      res.json({
        message: 'Image deleted successfully',
        data: result
      });
    } else {
      res.status(404).json({
        error: 'Image not found or already deleted'
      });
    }
  } catch (error: any) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete image',
      details: error.message
    });
  }
});

export default router;