import { tokenService, TOKEN_PACKAGES } from '../../services/token.service';

// Mock the database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

describe('TokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserTokenBalance', () => {
    it('should return existing token balance', async () => {
      const mockTokens = {
        id: 1,
        userId: 1,
        balance: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDb = require('../../db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockTokens]),
        }),
      });

      const result = await tokenService.getUserTokenBalance(1);

      expect(result).toEqual(mockTokens);
    });

    it('should create new token balance if none exists', async () => {
      const mockNewTokens = {
        id: 1,
        userId: 1,
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDb = require('../../db').db;

      // Mock empty select result
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      // Mock insert
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockNewTokens]),
        }),
      });

      const result = await tokenService.getUserTokenBalance(1);

      expect(result).toEqual(mockNewTokens);
    });
  });

  describe('purchaseTokens', () => {
    it('should successfully purchase tokens', async () => {
      const packageId = 'standard';
      const paymentReference = 'payment-123';
      const userId = 1;

      const mockCurrentTokens = {
        id: 1,
        userId,
        balance: 50,
        updatedAt: new Date(),
      };

      const mockUpdatedTokens = {
        ...mockCurrentTokens,
        balance: 600, // 50 + 500 + 50 bonus
      };

      const mockTransaction = {
        id: 1,
        userId,
        type: 'purchase',
        amount: 550, // 500 + 50 bonus
        cost: '39.99',
        paymentReference,
        description: 'Purchased Standard Package - 500 tokens + 50 bonus',
      };

      const mockDb = require('../../db').db;

      // Mock getUserTokenBalance
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockCurrentTokens]),
        }),
      });

      // Mock token update
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUpdatedTokens]),
          }),
        }),
      });

      // Mock transaction insert
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockTransaction]),
        }),
      });

      const result = await tokenService.purchaseTokens(userId, packageId, paymentReference);

      expect(result.tokens).toEqual(mockUpdatedTokens);
      expect(result.transaction).toEqual(mockTransaction);
    });

    it('should throw error for invalid package', async () => {
      await expect(tokenService.purchaseTokens(1, 'invalid-package', 'payment-123'))
        .rejects.toThrow('Invalid token package');
    });
  });

  describe('useTokens', () => {
    it('should successfully use tokens', async () => {
      const userId = 1;
      const amount = 50;
      const mockCurrentTokens = {
        id: 1,
        userId,
        balance: 100,
      };

      const mockUpdatedTokens = {
        ...mockCurrentTokens,
        balance: 50,
      };

      const mockDb = require('../../db').db;

      // Mock getUserTokenBalance
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockCurrentTokens]),
        }),
      });

      // Mock token update
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUpdatedTokens]),
          }),
        }),
      });

      // Mock transaction insert
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const result = await tokenService.useTokens(userId, amount, '1', 'job_post', 'Created job post');

      expect(result).toEqual(mockUpdatedTokens);
    });

    it('should throw error for insufficient balance', async () => {
      const userId = 1;
      const amount = 150;
      const mockCurrentTokens = {
        id: 1,
        userId,
        balance: 100,
      };

      const mockDb = require('../../db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockCurrentTokens]),
        }),
      });

      await expect(tokenService.useTokens(userId, amount))
        .rejects.toThrow('Insufficient token balance');
    });
  });

  describe('refundTokens', () => {
    it('should successfully refund tokens', async () => {
      const userId = 1;
      const amount = 50;
      const mockCurrentTokens = {
        id: 1,
        userId,
        balance: 100,
      };

      const mockUpdatedTokens = {
        ...mockCurrentTokens,
        balance: 150,
      };

      const mockDb = require('../../db').db;

      // Mock getUserTokenBalance
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockCurrentTokens]),
        }),
      });

      // Mock token update
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUpdatedTokens]),
          }),
        }),
      });

      // Mock transaction insert
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const result = await tokenService.refundTokens(userId, amount, '1', 'job_post_refund', 'Refund for deleted job');

      expect(result).toEqual(mockUpdatedTokens);
    });
  });

  describe('getTokenHistory', () => {
    it('should return token transaction history', async () => {
      const userId = 1;
      const mockHistory = [
        {
          id: 1,
          type: 'purchase',
          amount: 500,
          cost: '39.99',
          description: 'Purchased Standard Package',
          createdAt: new Date(),
        },
        {
          id: 2,
          type: 'usage',
          amount: -50,
          referenceId: '1',
          referenceType: 'job_post',
          description: 'Created job post',
          createdAt: new Date(),
        },
      ];

      const mockDb = require('../../db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockHistory),
            }),
          }),
        }),
      });

      const result = await tokenService.getTokenHistory(userId, 50);

      expect(result).toEqual(mockHistory);
    });
  });

  describe('getTokenPackages', () => {
    it('should return predefined token packages', () => {
      const result = tokenService.getTokenPackages();

      expect(result).toEqual(TOKEN_PACKAGES);
      expect(result).toHaveLength(4);
      expect(result[0]).toHaveProperty('id', 'basic');
      expect(result[1]).toHaveProperty('id', 'standard');
      expect(result[2]).toHaveProperty('id', 'premium');
      expect(result[3]).toHaveProperty('id', 'enterprise');
    });
  });

  describe('getTokenStatistics', () => {
    it('should return token statistics', async () => {
      const mockStats = {
        totalUsers: 100,
        totalTokensInCirculation: 50000,
        totalTokensPurchased: 75000,
        totalTokensUsed: 25000,
        totalRevenue: 5000,
      };

      const mockTopUsers = [
        {
          userId: 1,
          balance: 1000,
          userName: 'John Doe',
          userEmail: 'john@example.com',
        },
        {
          userId: 2,
          balance: 800,
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
        },
      ];

      const mockDb = require('../../db').db;

      // Mock stats query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockResolvedValue([mockStats]),
        }),
      });

      // Mock top users query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockTopUsers),
            }),
          }),
        }),
      });

      const result = await tokenService.getTokenStatistics();

      expect(result).toEqual({
        ...mockStats,
        topUsers: mockTopUsers,
      });
    });
  });
});
