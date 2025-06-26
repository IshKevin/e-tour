import { pgTable, serial, integer, text, timestamp, pgEnum, json, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { jobs } from './jobs.schema';

export const applicationStatusEnum = pgEnum('application_status', ['pending', 'accepted', 'rejected']);

export const jobApplications = pgTable('job_applications', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').references(() => jobs.id).notNull(),
  applicantId: integer('applicant_id').references(() => users.id).notNull(),
  status: applicationStatusEnum('status').default('pending').notNull(),
  coverLetter: text('cover_letter'),
  portfolioLinks: json('portfolio_links').$type<string[]>(),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
  statusUpdatedAt: timestamp('status_updated_at').defaultNow().notNull(),
  feedback: text('feedback')
}, (table) => ({
  jobIdx: index('job_applications_job_idx').on(table.jobId),
  applicantIdx: index('job_applications_applicant_idx').on(table.applicantId),
  statusIdx: index('job_applications_status_idx').on(table.status)
}));

export type JobApplication = typeof jobApplications.$inferSelect;
export type NewJobApplication = typeof jobApplications.$inferInsert;