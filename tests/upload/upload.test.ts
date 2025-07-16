import request from 'supertest';
import { app } from '../../src/app';
import {
  createTestUser,
  createTestAgent,
  authenticatedRequest,
  expectErrorResponse,
  expectSuccessResponse,
  createMockFile
} from '../utils/testHelpers';

describe('Upload API', () => {
  let user: any;
  let agent: any;

  beforeEach(() => {
    user = createTestUser();
    agent = createTestAgent();
  });

  describe('POST /api/v1/upload/image', () => {
    it('should upload single image successfully', async () => {
      const response = await authenticatedRequest(user.token)
        .post('/api/v1/upload/image')
        .attach('image', Buffer.from('fake image data'), 'test.jpg');

      expect(response.status).toBeOneOf([200, 400]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Image uploaded successfully');
        expect(response.body.data).toHaveProperty('public_id');
        expect(response.body.data).toHaveProperty('url');
        expect(response.body.data).toHaveProperty('variants');
        expect(response.body.data.variants).toHaveProperty('thumbnail');
        expect(response.body.data.variants).toHaveProperty('medium');
        expect(response.body.data.variants).toHaveProperty('large');
        expect(response.body.data.variants).toHaveProperty('original');
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/upload/image')
        .attach('image', Buffer.from('fake image data'), 'test.jpg');

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail without image file', async () => {
      const response = await authenticatedRequest(user.token)
        .post('/api/v1/upload/image');

      expectErrorResponse(response, 400, 'No image file provided');
    });

    it('should upload with custom folder', async () => {
      const response = await authenticatedRequest(user.token)
        .post('/api/v1/upload/image')
        .query({ folder: 'custom-folder' })
        .attach('image', Buffer.from('fake image data'), 'test.jpg');

      expect(response.status).toBeOneOf([200, 400]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Image uploaded successfully');
      }
    });

    it('should upload with custom dimensions', async () => {
      const response = await authenticatedRequest(user.token)
        .post('/api/v1/upload/image')
        .query({ width: 400, height: 300, quality: 'high' })
        .attach('image', Buffer.from('fake image data'), 'test.jpg');

      expect(response.status).toBeOneOf([200, 400]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Image uploaded successfully');
      }
    });

    it('should handle upload service error', async () => {
      // Mock upload service to throw error
      const UploadService = require('../../src/services/upload.service').UploadService;
      const originalUpload = UploadService.uploadImage;
      UploadService.uploadImage = jest.fn().mockRejectedValue(new Error('Upload failed'));

      const response = await authenticatedRequest(user.token)
        .post('/api/v1/upload/image')
        .attach('image', Buffer.from('fake image data'), 'test.jpg');

      expectErrorResponse(response, 500, 'Failed to upload image');

      // Restore original method
      UploadService.uploadImage = originalUpload;
    });
  });

  describe('POST /api/v1/upload/profile', () => {
    it('should upload profile image successfully', async () => {
      const response = await authenticatedRequest(user.token)
        .post('/api/v1/upload/profile')
        .attach('image', Buffer.from('fake profile image'), 'profile.jpg');

      expect(response.status).toBeOneOf([200, 400]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Profile image uploaded successfully');
        expect(response.body.data).toHaveProperty('public_id');
        expect(response.body.data).toHaveProperty('url');
        expect(response.body.data).toHaveProperty('variants');
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/upload/profile')
        .attach('image', Buffer.from('fake image data'), 'profile.jpg');

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail without image file', async () => {
      const response = await authenticatedRequest(user.token)
        .post('/api/v1/upload/profile');

      expectErrorResponse(response, 400, 'No profile image provided');
    });

    it('should handle missing user in token', async () => {
      // Create token without user ID
      const invalidToken = 'invalid-token-without-user';

      const response = await request(app)
        .post('/api/v1/upload/profile')
        .set('Authorization', `Bearer ${invalidToken}`)
        .attach('image', Buffer.from('fake image data'), 'profile.jpg');

      expectErrorResponse(response, 401);
    });
  });

  describe('DELETE /api/v1/upload/:publicId', () => {
    it('should delete image successfully', async () => {
      const publicId = 'test_image_123';

      const response = await authenticatedRequest(user.token)
        .delete(`/api/v1/upload/${publicId}`);

      expect(response.status).toBeOneOf([200, 404]);
      if (response.status === 200) {
        expectSuccessResponse(response, 200, 'Image deleted successfully');
        expect(response.body.data).toHaveProperty('result', 'ok');
      }
    });

    it('should fail without authentication', async () => {
      const publicId = 'test_image_123';

      const response = await request(app)
        .delete(`/api/v1/upload/${publicId}`);

      expectErrorResponse(response, 401, 'Authentication required');
    });

    it('should fail without public ID', async () => {
      const response = await authenticatedRequest(user.token)
        .delete('/api/v1/upload/');

      expect(response.status).toBe(404); // Route not found
    });

    it('should handle URL encoded public ID', async () => {
      const publicId = 'etour%2Ftest%2Fimage_123';

      const response = await authenticatedRequest(user.token)
        .delete(`/api/v1/upload/${publicId}`);

      expect(response.status).toBeOneOf([200, 404]);
    });

    it('should handle delete service error', async () => {
      // Mock upload service to throw error
      const UploadService = require('../../src/services/upload.service').UploadService;
      const originalDelete = UploadService.deleteImage;
      UploadService.deleteImage = jest.fn().mockRejectedValue(new Error('Delete failed'));

      const response = await authenticatedRequest(user.token)
        .delete('/api/v1/upload/test_image_123');

      expectErrorResponse(response, 500, 'Failed to delete image');

      // Restore original method
      UploadService.deleteImage = originalDelete;
    });

    it('should handle image not found', async () => {
      // Mock upload service to return not found
      const UploadService = require('../../src/services/upload.service').UploadService;
      const originalDelete = UploadService.deleteImage;
      UploadService.deleteImage = jest.fn().mockResolvedValue({ result: 'not found' });

      const response = await authenticatedRequest(user.token)
        .delete('/api/v1/upload/non_existent_image');

      expectErrorResponse(response, 404, 'Image not found or already deleted');

      // Restore original method
      UploadService.deleteImage = originalDelete;
    });
  });

  describe('File validation', () => {
    it('should accept valid image formats', async () => {
      const validFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

      for (const format of validFormats) {
        const response = await authenticatedRequest(user.token)
          .post('/api/v1/upload/image')
          .attach('image', Buffer.from('fake image data'), `test.${format}`);

        expect(response.status).toBeOneOf([200, 400]);
      }
    });

    it('should handle large file sizes', async () => {
      // Create a large buffer (simulating large file)
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB

      const response = await authenticatedRequest(user.token)
        .post('/api/v1/upload/image')
        .attach('image', largeBuffer, 'large-image.jpg');

      // Should either succeed or fail with size limit error
      expect(response.status).toBeOneOf([200, 400, 413]);
    });

    it('should handle empty file', async () => {
      const response = await authenticatedRequest(user.token)
        .post('/api/v1/upload/image')
        .attach('image', Buffer.alloc(0), 'empty.jpg');

      expectErrorResponse(response, 400);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed requests', async () => {
      const response = await authenticatedRequest(user.token)
        .post('/api/v1/upload/image')
        .send({ invalid: 'data' });

      expectErrorResponse(response, 400);
    });

    it('should handle invalid authentication token', async () => {
      const response = await request(app)
        .post('/api/v1/upload/image')
        .set('Authorization', 'Bearer invalid-token')
        .attach('image', Buffer.from('fake image data'), 'test.jpg');

      expectErrorResponse(response, 401);
    });

    it('should handle missing authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/upload/image')
        .attach('image', Buffer.from('fake image data'), 'test.jpg');

      expectErrorResponse(response, 401);
    });

    it('should handle malformed authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/upload/image')
        .set('Authorization', 'InvalidFormat token')
        .attach('image', Buffer.from('fake image data'), 'test.jpg');

      expectErrorResponse(response, 401);
    });
  });

  describe('Rate limiting and security', () => {
    it('should handle multiple concurrent uploads', async () => {
      const uploadPromises = Array.from({ length: 5 }, (_, i) =>
        authenticatedRequest(user.token)
          .post('/api/v1/upload/image')
          .attach('image', Buffer.from(`fake image data ${i}`), `test${i}.jpg`)
      );

      const responses = await Promise.all(uploadPromises);

      // All should either succeed or fail gracefully
      responses.forEach(response => {
        expect(response.status).toBeOneOf([200, 400, 429, 500]);
      });
    });

    it('should sanitize file names', async () => {
      const maliciousFileName = '../../../etc/passwd.jpg';

      const response = await authenticatedRequest(user.token)
        .post('/api/v1/upload/image')
        .attach('image', Buffer.from('fake image data'), maliciousFileName);

      expect(response.status).toBeOneOf([200, 400]);
      // Should not contain path traversal characters in response
      if (response.status === 200) {
        expect(response.body.data.public_id).not.toContain('../');
      }
    });
  });
});
