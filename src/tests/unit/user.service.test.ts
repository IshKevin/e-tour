import { userService } from '../../services/user.service';
import bcrypt from 'bcrypt';

// Mock the database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should hash password and create user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'client' as const,
      };

      const hashedPassword = 'hashedPassword123';
      const mockUser = {
        id: 1,
        name: userData.name,
        email: userData.email,
        passwordHash: hashedPassword,
        role: userData.role,
        status: 'active',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      // Mock the database insert
      const mockDb = require('../../db').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      const result = await userService.createUser(userData);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(result).toEqual(mockUser);
    });
  });

  describe('verifyPassword', () => {
    it('should return user if password is correct', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = 'hashedPassword123';

      const mockUser = {
        id: 1,
        email,
        passwordHash: hashedPassword,
        status: 'active',
      };

      // Mock database select
      const mockDb = require('../../db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await userService.verifyPassword(email, password);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toEqual(mockUser);
    });

    it('should return null if password is incorrect', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const hashedPassword = 'hashedPassword123';

      const mockUser = {
        id: 1,
        email,
        passwordHash: hashedPassword,
        status: 'active',
      };

      // Mock database select
      const mockDb = require('../../db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await userService.verifyPassword(email, password);

      expect(result).toBeNull();
    });
  });
});