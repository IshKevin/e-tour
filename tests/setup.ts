import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock external services for testing
jest.mock('../src/services/email.service', () => ({
  EmailService: {
    sendEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  },
  emailService: {
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  }
}));

jest.mock('../src/services/upload.service', () => ({
  UploadService: {
    uploadImage: jest.fn().mockResolvedValue({
      public_id: 'test_image_123',
      url: 'https://res.cloudinary.com/test/image/upload/test_image_123.jpg',
      secure_url: 'https://res.cloudinary.com/test/image/upload/test_image_123.jpg',
      width: 800,
      height: 600,
      format: 'jpg',
      bytes: 125000,
    }),
    uploadMultipleImages: jest.fn().mockResolvedValue([
      {
        public_id: 'test_image_1',
        url: 'https://res.cloudinary.com/test/image/upload/test_image_1.jpg',
        secure_url: 'https://res.cloudinary.com/test/image/upload/test_image_1.jpg',
        width: 800,
        height: 600,
        format: 'jpg',
        bytes: 125000,
      }
    ]),
    deleteImage: jest.fn().mockResolvedValue({ result: 'ok' }),
    generateImageVariants: jest.fn().mockReturnValue({
      thumbnail: 'https://res.cloudinary.com/test/image/upload/c_fill,h_150,w_150/test_image.jpg',
      medium: 'https://res.cloudinary.com/test/image/upload/c_fill,h_300,w_400/test_image.jpg',
      large: 'https://res.cloudinary.com/test/image/upload/c_fill,h_800,w_1200/test_image.jpg',
      original: 'https://res.cloudinary.com/test/image/upload/test_image.jpg',
    }),
    uploadProfileImage: jest.fn().mockResolvedValue({
      public_id: 'profile_123',
      url: 'https://res.cloudinary.com/test/image/upload/profile_123.jpg',
      secure_url: 'https://res.cloudinary.com/test/image/upload/profile_123.jpg',
      width: 300,
      height: 300,
      format: 'jpg',
      bytes: 50000,
    }),
  },
  upload: {
    single: jest.fn(() => (req: any, res: any, next: any) => {
      req.file = {
        fieldname: 'image',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake image data'),
        size: 125000,
      };
      next();
    }),
    array: jest.fn(() => (req: any, res: any, next: any) => {
      req.files = [
        {
          fieldname: 'images',
          originalname: 'test1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('fake image data 1'),
          size: 125000,
        },
        {
          fieldname: 'images',
          originalname: 'test2.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('fake image data 2'),
          size: 130000,
        }
      ];
      next();
    }),
  }
}));

// Global test timeout
jest.setTimeout(30000);

// Console log suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
