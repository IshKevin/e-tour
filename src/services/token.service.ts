import { db } from '../db';
import { tokens, Token, NewToken } from '../db/schema/tokens.schema';
import { tokenTransactions, TokenTransaction, NewTokenTransaction } from '../db/schema/tokenTransactions.schema';
import { users } from '../db/schema/user.schema';
import { eq, desc, sql } from 'drizzle-orm';

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  bonus?: number;
  description?: string;
}

// Predefined token packages
export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'basic',
    name: 'Basic Package',
    tokens: 100,
    price: 9.99,
    description: 'Perfect for occasional use'
  },
  {
    id: 'standard',
    name: 'Standard Package',
    tokens: 500,
    price: 39.99,
    bonus: 50,
    description: 'Most popular choice'
  },
  {
    id: 'premium',
    name: 'Premium Package',
    tokens: 1000,
    price: 69.99,
    bonus: 150,
    description: 'Best value for heavy users'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Package',
    tokens: 2500,
    price: 149.99,
    bonus: 500,
    description: 'For business users'
  }
];

export const tokenService = {
  // Get or create user token balance
  async getUserTokenBalance(userId: string): Promise<Token> {
    let [userTokens] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.userId, userId));

    if (!userTokens) {
      // Create initial token balance
      const newTokenData: NewToken = {
        userId,
        balance: 0,
      };
      [userTokens] = await db.insert(tokens).values(newTokenData).returning();
    }

    return userTokens;
  },

  // Purchase tokens
  async purchaseTokens(userId: string, packageId: string, paymentReference: string): Promise<{ tokens: Token; transaction: TokenTransaction }> {
    const tokenPackage = TOKEN_PACKAGES.find(pkg => pkg.id === packageId);
    if (!tokenPackage) {
      throw new Error('Invalid token package');
    }

    // Calculate total tokens (base + bonus)
    const totalTokens = tokenPackage.tokens + (tokenPackage.bonus || 0);

    // Get current token balance
    const userTokens = await this.getUserTokenBalance(userId);

    // Update token balance
    const [updatedTokens] = await db
      .update(tokens)
      .set({
        balance: userTokens.balance + totalTokens,
        updatedAt: new Date(),
      })
      .where(eq(tokens.userId, userId))
      .returning();

    // Create transaction record
    const transactionData: NewTokenTransaction = {
      userId,
      type: 'purchase',
      amount: totalTokens,
      cost: tokenPackage.price.toString(),
      paymentReference,
      description: `Purchased ${tokenPackage.name} - ${tokenPackage.tokens} tokens${tokenPackage.bonus ? ` + ${tokenPackage.bonus} bonus` : ''}`,
    };

    const [transaction] = await db.insert(tokenTransactions).values(transactionData).returning();

    return { tokens: updatedTokens, transaction };
  },

  // Use tokens
  async useTokens(userId: string, amount: number, referenceId?: string, referenceType?: string, description?: string): Promise<Token> {
    const userTokens = await this.getUserTokenBalance(userId);

    if (userTokens.balance < amount) {
      throw new Error('Insufficient token balance');
    }

    // Update token balance
    const [updatedTokens] = await db
      .update(tokens)
      .set({
        balance: userTokens.balance - amount,
        updatedAt: new Date(),
      })
      .where(eq(tokens.userId, userId))
      .returning();

    // Create transaction record
    const transactionData: NewTokenTransaction = {
      userId,
      type: 'usage',
      amount: -amount, // Negative for usage
      referenceId,
      referenceType,
      description: description || 'Token usage',
    };

    await db.insert(tokenTransactions).values(transactionData);

    return updatedTokens;
  },

  // Refund tokens
  async refundTokens(userId: string, amount: number, referenceId?: string, referenceType?: string, description?: string): Promise<Token> {
    const userTokens = await this.getUserTokenBalance(userId);

    // Update token balance
    const [updatedTokens] = await db
      .update(tokens)
      .set({
        balance: userTokens.balance + amount,
        updatedAt: new Date(),
      })
      .where(eq(tokens.userId, userId))
      .returning();

    // Create transaction record
    const transactionData: NewTokenTransaction = {
      userId,
      type: 'refund',
      amount,
      referenceId,
      referenceType,
      description: description || 'Token refund',
    };

    await db.insert(tokenTransactions).values(transactionData);

    return updatedTokens;
  },

  // Admin grant tokens
  async grantTokens(userId: string, amount: number, description?: string): Promise<Token> {
    const userTokens = await this.getUserTokenBalance(userId);

    // Update token balance
    const [updatedTokens] = await db
      .update(tokens)
      .set({
        balance: userTokens.balance + amount,
        updatedAt: new Date(),
      })
      .where(eq(tokens.userId, userId))
      .returning();

    // Create transaction record
    const transactionData: NewTokenTransaction = {
      userId,
      type: 'admin_grant',
      amount,
      description: description || 'Admin granted tokens',
    };

    await db.insert(tokenTransactions).values(transactionData);

    return updatedTokens;
  },

  // Get token transaction history
  async getTokenHistory(userId: string, limit: number = 50) {
    return await db
      .select({
        id: tokenTransactions.id,
        type: tokenTransactions.type,
        amount: tokenTransactions.amount,
        cost: tokenTransactions.cost,
        referenceId: tokenTransactions.referenceId,
        referenceType: tokenTransactions.referenceType,
        paymentReference: tokenTransactions.paymentReference,
        description: tokenTransactions.description,
        createdAt: tokenTransactions.createdAt,
      })
      .from(tokenTransactions)
      .where(eq(tokenTransactions.userId, userId))
      .orderBy(desc(tokenTransactions.createdAt))
      .limit(limit);
  },

  // Get available token packages
  getTokenPackages(): TokenPackage[] {
    return TOKEN_PACKAGES;
  },

  // Get token statistics (admin)
  async getTokenStatistics() {
    const [stats] = await db
      .select({
        totalUsers: sql<number>`COUNT(DISTINCT ${tokens.userId})`,
        totalTokensInCirculation: sql<number>`SUM(${tokens.balance})`,
        totalTokensPurchased: sql<number>`SUM(CASE WHEN ${tokenTransactions.type} = 'purchase' THEN ${tokenTransactions.amount} ELSE 0 END)`,
        totalTokensUsed: sql<number>`SUM(CASE WHEN ${tokenTransactions.type} = 'usage' THEN ABS(${tokenTransactions.amount}) ELSE 0 END)`,
        totalRevenue: sql<number>`SUM(CASE WHEN ${tokenTransactions.type} = 'purchase' THEN CAST(${tokenTransactions.cost} AS DECIMAL) ELSE 0 END)`,
      })
      .from(tokens)
      .leftJoin(tokenTransactions, eq(tokens.userId, tokenTransactions.userId));

    // Get top users by token balance
    const topUsers = await db
      .select({
        userId: tokens.userId,
        balance: tokens.balance,
        userName: users.name,
        userEmail: users.email,
      })
      .from(tokens)
      .leftJoin(users, eq(tokens.userId, users.id))
      .orderBy(desc(tokens.balance))
      .limit(10);

    return {
      ...stats,
      topUsers,
    };
  },
};
