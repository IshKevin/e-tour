import { pgTable, uuid, varchar, text, timestamp, pgEnum, boolean, json, index, integer } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { trips } from './trips.schema';

export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read', 'archived']);
export const conversationStatusEnum = pgEnum('conversation_status', ['active', 'closed', 'archived']);

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => users.id).notNull(),
  agentId: uuid('agent_id').references(() => users.id).notNull(),
  tripId: uuid('trip_id').references(() => trips.id), // Optional - conversation might be about a specific trip
  subject: varchar('subject', { length: 255 }).notNull(),
  status: conversationStatusEnum('status').default('active').notNull(),
  lastMessageAt: timestamp('last_message_at').defaultNow().notNull(),
  clientUnreadCount: integer('client_unread_count').default(0).notNull(),
  agentUnreadCount: integer('agent_unread_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  clientIdx: index('conversations_client_idx').on(table.clientId),
  agentIdx: index('conversations_agent_idx').on(table.agentId),
  tripIdx: index('conversations_trip_idx').on(table.tripId),
  statusIdx: index('conversations_status_idx').on(table.status),
  lastMessageIdx: index('conversations_last_message_idx').on(table.lastMessageAt)
}));

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  recipientId: uuid('recipient_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  attachments: json('attachments').$type<string[]>(), // Array of attachment URLs
  status: messageStatusEnum('status').default('sent').notNull(),
  isSystemMessage: boolean('is_system_message').default(false).notNull(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  conversationIdx: index('messages_conversation_idx').on(table.conversationId),
  senderIdx: index('messages_sender_idx').on(table.senderId),
  recipientIdx: index('messages_recipient_idx').on(table.recipientId),
  statusIdx: index('messages_status_idx').on(table.status),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt)
}));

export const messageAttachments = pgTable('message_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => messages.id).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  fileSize: integer('file_size').notNull(), // in bytes
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull()
}, (table) => ({
  messageIdx: index('message_attachments_message_idx').on(table.messageId)
}));

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type NewMessageAttachment = typeof messageAttachments.$inferInsert;
