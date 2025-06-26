import { pgTable, serial, integer, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const agentPerformanceLogs = pgTable('agent_performance_logs', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').references(() => users.id).notNull(),
  totalBookings: integer('total_bookings').default(0).notNull(),
  totalRevenue: decimal('total_revenue', { precision: 12, scale: 2 }).default('0').notNull(),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0'),
  rankingPosition: integer('ranking_position'),
  calculatedAt: timestamp('calculated_at').defaultNow().notNull()
}, (table) => ({
  agentIdx: index('agent_performance_agent_idx').on(table.agentId),
  rankingIdx: index('agent_performance_ranking_idx').on(table.rankingPosition),
  dateIdx: index('agent_performance_date_idx').on(table.calculatedAt)
}));

export type AgentPerformanceLog = typeof agentPerformanceLogs.$inferSelect;
export type NewAgentPerformanceLog = typeof agentPerformanceLogs.$inferInsert;