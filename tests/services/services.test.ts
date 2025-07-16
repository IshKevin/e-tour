import { EmailService } from '../../src/services/email.service';
import { UploadService } from '../../src/services/upload.service';
import { createMockFile } from '../utils/testHelpers';

// Mock external dependencies
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn(),
    },
    api: {
      resource: jest.fn(),
    },
    url: jest.fn(),
  },
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      response: '250 OK',
    }),
    verify: jest.fn().mockResolvedValue(true),
  })),
}));

describe('Service Layer Tests', () => {
  describe('EmailService', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('sendEmail', () => {
      it('should send email successfully', async () => {
        const emailOptions = {
          to: 'test@example.com',
          subject: 'Test Email',
          html: '<h1>Test Content</h1>',
          text: 'Test Content',
        };

        const result = await EmailService.sendEmail(emailOptions);

        expect(result).toBe(true);
      });

      it('should handle email sending failure', async () => {
        // Mock nodemailer to throw error
        const nodemailer = require('nodemailer');
        nodemailer.createTransport.mockReturnValue({
          sendMail: jest.fn().mockRejectedValue(new Error('SMTP Error')),
          verify: jest.fn().mockResolvedValue(true),
        });

        const emailOptions = {
          to: 'test@example.com',
          subject: 'Test Email',
          html: '<h1>Test Content</h1>',
        };

        const result = await EmailService.sendEmail(emailOptions);

        expect(result).toBe(false);
      });

      it('should send email to multiple recipients', async () => {
        const emailOptions = {
          to: ['test1@example.com', 'test2@example.com'],
          subject: 'Test Email',
          html: '<h1>Test Content</h1>',
        };

        const result = await EmailService.sendEmail(emailOptions);

        expect(result).toBe(true);
      });

      it('should send email with attachments', async () => {
        const emailOptions = {
          to: 'test@example.com',
          subject: 'Test Email',
          html: '<h1>Test Content</h1>',
          attachments: [
            {
              filename: 'test.pdf',
              path: '/path/to/test.pdf',
            },
          ],
        };

        const result = await EmailService.sendEmail(emailOptions);

        expect(result).toBe(true);
      });
    });

    describe('sendWelcomeEmail', () => {
      it('should send welcome email successfully', async () => {
        const result = await EmailService.sendWelcomeEmail(
          'newuser@example.com',
          'John Doe'
        );

        expect(result).toBe(true);
      });

      it('should handle missing name parameter', async () => {
        const result = await EmailService.sendWelcomeEmail(
          'newuser@example.com',
          ''
        );

        expect(result).toBe(true);
      });
    });

    describe('sendVerificationEmail', () => {
      it('should send verification email successfully', async () => {
        const result = await EmailService.sendVerificationEmail(
          'user@example.com',
          '123456',
          'John Doe'
        );

        expect(result).toBe(true);
      });

      it('should send verification email without name', async () => {
        const result = await EmailService.sendVerificationEmail(
          'user@example.com',
          '123456'
        );

        expect(result).toBe(true);
      });

      it('should handle invalid verification code', async () => {
        const result = await EmailService.sendVerificationEmail(
          'user@example.com',
          '', // Empty code
          'John Doe'
        );

        expect(result).toBe(true); // Should still attempt to send
      });
    });

    describe('sendPasswordResetEmail', () => {
      it('should send password reset email successfully', async () => {
        const result = await EmailService.sendPasswordResetEmail(
          'user@example.com',
          'reset-token-123',
          'John Doe'
        );

        expect(result).toBe(true);
      });

      it('should send password reset email without name', async () => {
        const result = await EmailService.sendPasswordResetEmail(
          'user@example.com',
          'reset-token-123'
        );

        expect(result).toBe(true);
      });

      it('should handle invalid reset token', async () => {
        const result = await EmailService.sendPasswordResetEmail(
          'user@example.com',
          '', // Empty token
          'John Doe'
        );

        expect(result).toBe(true); // Should still attempt to send
      });
    });
  });

  describe('UploadService', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('uploadImage', () => {
      it('should upload image successfully', async () => {
        const cloudinary = require('cloudinary');
        cloudinary.v2.uploader.upload.mockResolvedValue({
          public_id: 'test_image_123',
          url: 'https://res.cloudinary.com/test/image/upload/test_image_123.jpg',
          secure_url: 'https://res.cloudinary.com/test/image/upload/test_image_123.jpg',
          width: 800,
          height: 600,
          format: 'jpg',
          bytes: 125000,
        });

        const mockFile = createMockFile();
        const uploadOptions = {
          folder: 'etour/test',
          transformation: {
            width: 800,
            height: 600,
            crop: 'fill',
            quality: 'auto',
          },
        };

        const result = await UploadService.uploadImage(mockFile, uploadOptions);

        expect(result).toHaveProperty('public_id');
        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('secure_url');
        expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            folder: 'etour/test',
            transformation: expect.any(Object),
          })
        );
      });

      it('should handle upload failure', async () => {
        const cloudinary = require('cloudinary');
        cloudinary.v2.uploader.upload.mockRejectedValue(new Error('Upload failed'));

        const mockFile = createMockFile();
        const uploadOptions = {
          folder: 'etour/test',
        };

        await expect(UploadService.uploadImage(mockFile, uploadOptions))
          .rejects.toThrow('Image upload failed');
      });

      it('should upload with default options', async () => {
        const cloudinary = require('cloudinary');
        cloudinary.v2.uploader.upload.mockResolvedValue({
          public_id: 'test_image_123',
          url: 'https://res.cloudinary.com/test/image/upload/test_image_123.jpg',
        });

        const mockFile = createMockFile();

        const result = await UploadService.uploadImage(mockFile);

        expect(result).toHaveProperty('public_id');
        expect(cloudinary.v2.uploader.upload).toHaveBeenCalled();
      });
    });

    describe('uploadMultipleImages', () => {
      it('should upload multiple images successfully', async () => {
        const cloudinary = require('cloudinary');
        cloudinary.v2.uploader.upload
          .mockResolvedValueOnce({
            public_id: 'test_image_1',
            url: 'https://res.cloudinary.com/test/image/upload/test_image_1.jpg',
          })
          .mockResolvedValueOnce({
            public_id: 'test_image_2',
            url: 'https://res.cloudinary.com/test/image/upload/test_image_2.jpg',
          });

        const mockFiles = [
          createMockFile('test1.jpg'),
          createMockFile('test2.jpg'),
        ];

        const uploadOptions = {
          folder: 'etour/test',
        };

        const results = await UploadService.uploadMultipleImages(mockFiles, uploadOptions);

        expect(results).toHaveLength(2);
        expect(results[0]).toHaveProperty('public_id', 'test_image_1');
        expect(results[1]).toHaveProperty('public_id', 'test_image_2');
        expect(cloudinary.v2.uploader.upload).toHaveBeenCalledTimes(2);
      });

      it('should handle partial upload failures', async () => {
        const cloudinary = require('cloudinary');
        cloudinary.v2.uploader.upload
          .mockResolvedValueOnce({
            public_id: 'test_image_1',
            url: 'https://res.cloudinary.com/test/image/upload/test_image_1.jpg',
          })
          .mockRejectedValueOnce(new Error('Upload failed'));

        const mockFiles = [
          createMockFile('test1.jpg'),
          createMockFile('test2.jpg'),
        ];

        await expect(UploadService.uploadMultipleImages(mockFiles))
          .rejects.toThrow('Multiple image upload failed');
      });
    });

    describe('deleteImage', () => {
      it('should delete image successfully', async () => {
        const cloudinary = require('cloudinary');
        cloudinary.v2.uploader.destroy.mockResolvedValue({
          result: 'ok',
        });

        const result = await UploadService.deleteImage('test_image_123');

        expect(result).toHaveProperty('result', 'ok');
        expect(cloudinary.v2.uploader.destroy).toHaveBeenCalledWith('test_image_123');
      });

      it('should handle delete failure', async () => {
        const cloudinary = require('cloudinary');
        cloudinary.v2.uploader.destroy.mockRejectedValue(new Error('Delete failed'));

        await expect(UploadService.deleteImage('test_image_123'))
          .rejects.toThrow('Image deletion failed');
      });
    });

    describe('generateImageVariants', () => {
      it('should generate image variants', () => {
        const cloudinary = require('cloudinary');
        cloudinary.v2.url
          .mockReturnValueOnce('https://res.cloudinary.com/test/image/upload/c_fill,h_150,w_150/test_image.jpg')
          .mockReturnValueOnce('https://res.cloudinary.com/test/image/upload/c_fill,h_300,w_400/test_image.jpg')
          .mockReturnValueOnce('https://res.cloudinary.com/test/image/upload/c_fill,h_800,w_1200/test_image.jpg')
          .mockReturnValueOnce('https://res.cloudinary.com/test/image/upload/test_image.jpg');

        const variants = UploadService.generateImageVariants('test_image');

        expect(variants).toHaveProperty('thumbnail');
        expect(variants).toHaveProperty('medium');
        expect(variants).toHaveProperty('large');
        expect(variants).toHaveProperty('original');
        expect(cloudinary.v2.url).toHaveBeenCalledTimes(4);
      });
    });

    describe('uploadProfileImage', () => {
      it('should upload profile image with correct transformations', async () => {
        const cloudinary = require('cloudinary');
        cloudinary.v2.uploader.upload.mockResolvedValue({
          public_id: 'profile_123',
          url: 'https://res.cloudinary.com/test/image/upload/profile_123.jpg',
        });

        const mockFile = createMockFile('profile.jpg');
        const userId = 123;

        const result = await UploadService.uploadProfileImage(mockFile, userId);

        expect(result).toHaveProperty('public_id');
        expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            folder: 'etour/profiles',
            public_id: `profile_${userId}`,
            transformation: expect.objectContaining({
              width: 300,
              height: 300,
              crop: 'fill',
            }),
          })
        );
      });
    });
  });
});
