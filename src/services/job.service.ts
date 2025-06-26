import { db } from '../db';
import { jobs, Job, NewJob } from '../db/schema/jobs.schema';
import { jobApplications, JobApplication, NewJobApplication } from '../db/schema/jobApplications.schema';
import { users } from '../db/schema/user.schema';
import { customTripRequests } from '../db/schema/customTripRequests.schema';
import { tokenService } from './token.service';
import { eq, and, desc, ne, isNull, sql } from 'drizzle-orm';

export const jobService = {
  // Create a job post
  async createJob(clientId: number, jobData: Omit<NewJob, 'clientId'>) {
    // Check if user has enough tokens
    const userTokens = await tokenService.getUserTokenBalance(clientId);
    if (userTokens.balance < jobData.tokenCost) {
      throw new Error('Insufficient tokens to create job post');
    }

    // Create job
    const newJobData: NewJob = {
      ...jobData,
      clientId,
    };

    const [job] = await db.insert(jobs).values(newJobData).returning();

    // Deduct tokens
    await tokenService.useTokens(
      clientId,
      jobData.tokenCost,
      job.id.toString(),
      'job_post',
      `Created job post: ${job.title}`
    );

    return job;
  },

  // Get jobs created by client
  async getClientJobs(clientId: number) {
    return await db
      .select({
        id: jobs.id,
        customTripId: jobs.customTripId,
        title: jobs.title,
        description: jobs.description,
        tokenCost: jobs.tokenCost,
        category: jobs.category,
        location: jobs.location,
        status: jobs.status,
        applicationDeadline: jobs.applicationDeadline,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        applicationsCount: sql<number>`COUNT(${jobApplications.id})`,
      })
      .from(jobs)
      .leftJoin(jobApplications, eq(jobs.id, jobApplications.jobId))
      .where(and(eq(jobs.clientId, clientId), isNull(jobs.deletedAt)))
      .groupBy(jobs.id)
      .orderBy(desc(jobs.createdAt));
  },

  // Get job by ID
  async getJobById(jobId: number, clientId?: number) {
    const conditions = [eq(jobs.id, jobId), isNull(jobs.deletedAt)];
    if (clientId) {
      conditions.push(eq(jobs.clientId, clientId));
    }

    const [job] = await db
      .select({
        id: jobs.id,
        clientId: jobs.clientId,
        customTripId: jobs.customTripId,
        title: jobs.title,
        description: jobs.description,
        tokenCost: jobs.tokenCost,
        category: jobs.category,
        location: jobs.location,
        status: jobs.status,
        applicationDeadline: jobs.applicationDeadline,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        clientName: users.name,
        clientEmail: users.email,
      })
      .from(jobs)
      .leftJoin(users, eq(jobs.clientId, users.id))
      .where(and(...conditions));

    if (!job) return null;

    // Get custom trip details if linked
    let customTrip = null;
    if (job.customTripId) {
      const [trip] = await db
        .select()
        .from(customTripRequests)
        .where(eq(customTripRequests.id, job.customTripId));
      customTrip = trip;
    }

    return {
      ...job,
      customTrip,
    };
  },

  // Update job
  async updateJob(jobId: number, clientId: number, updateData: Partial<Job>) {
    // Check if job belongs to client and is still open
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.clientId, clientId), isNull(jobs.deletedAt)));

    if (!job) {
      throw new Error('Job not found or unauthorized');
    }

    if (job.status !== 'open') {
      throw new Error('Cannot update closed or filled job');
    }

    const [updatedJob] = await db
      .update(jobs)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(jobs.id, jobId))
      .returning();

    return updatedJob;
  },

  // Soft delete job
  async deleteJob(jobId: number, clientId: number) {
    // Check if job belongs to client
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.clientId, clientId), isNull(jobs.deletedAt)));

    if (!job) {
      throw new Error('Job not found or unauthorized');
    }

    // Check if there are any applications
    const [applicationCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(jobApplications)
      .where(eq(jobApplications.jobId, jobId));

    if (applicationCount.count > 0) {
      throw new Error('Cannot delete job with existing applications');
    }

    const [deletedJob] = await db
      .update(jobs)
      .set({ 
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(jobs.id, jobId))
      .returning();

    // Refund tokens
    await tokenService.refundTokens(
      clientId,
      job.tokenCost,
      job.id.toString(),
      'job_post_refund',
      `Refund for deleted job post: ${job.title}`
    );

    return deletedJob;
  },

  // Get available jobs (for agents to browse)
  async getAvailableJobs(limit: number = 20) {
    return await db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        tokenCost: jobs.tokenCost,
        category: jobs.category,
        location: jobs.location,
        applicationDeadline: jobs.applicationDeadline,
        createdAt: jobs.createdAt,
        clientName: users.name,
        applicationsCount: sql<number>`COUNT(${jobApplications.id})`,
      })
      .from(jobs)
      .leftJoin(users, eq(jobs.clientId, users.id))
      .leftJoin(jobApplications, eq(jobs.id, jobApplications.jobId))
      .where(and(eq(jobs.status, 'open'), isNull(jobs.deletedAt)))
      .groupBy(jobs.id, users.id)
      .orderBy(desc(jobs.createdAt))
      .limit(limit);
  },

  // Apply for a job
  async applyForJob(jobId: number, applicantId: number, applicationData: Omit<NewJobApplication, 'jobId' | 'applicantId'>) {
    // Check if job exists and is open
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.status, 'open'), isNull(jobs.deletedAt)));

    if (!job) {
      throw new Error('Job not found or not available');
    }

    // Check if user already applied
    const [existingApplication] = await db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.applicantId, applicantId)));

    if (existingApplication) {
      throw new Error('You have already applied for this job');
    }

    // Create application
    const newApplicationData: NewJobApplication = {
      ...applicationData,
      jobId,
      applicantId,
    };

    const [application] = await db.insert(jobApplications).values(newApplicationData).returning();
    return application;
  },

  // Get job applicants
  async getJobApplicants(jobId: number, clientId: number) {
    // Verify job belongs to client
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.clientId, clientId)));

    if (!job) {
      throw new Error('Job not found or unauthorized');
    }

    return await db
      .select({
        id: jobApplications.id,
        applicantId: jobApplications.applicantId,
        status: jobApplications.status,
        coverLetter: jobApplications.coverLetter,
        portfolioLinks: jobApplications.portfolioLinks,
        appliedAt: jobApplications.appliedAt,
        statusUpdatedAt: jobApplications.statusUpdatedAt,
        feedback: jobApplications.feedback,
        applicantName: users.name,
        applicantEmail: users.email,
        applicantPhone: users.phone,
        applicantProfileImage: users.profileImage,
      })
      .from(jobApplications)
      .leftJoin(users, eq(jobApplications.applicantId, users.id))
      .where(eq(jobApplications.jobId, jobId))
      .orderBy(desc(jobApplications.appliedAt));
  },

  // Accept job applicant
  async acceptApplicant(jobId: number, applicantId: number, clientId: number, feedback?: string) {
    // Verify job belongs to client
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.clientId, clientId)));

    if (!job) {
      throw new Error('Job not found or unauthorized');
    }

    // Update application status
    const [updatedApplication] = await db
      .update(jobApplications)
      .set({
        status: 'accepted',
        statusUpdatedAt: new Date(),
        feedback,
      })
      .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.applicantId, applicantId)))
      .returning();

    // Update job status to filled
    await db
      .update(jobs)
      .set({ status: 'filled', updatedAt: new Date() })
      .where(eq(jobs.id, jobId));

    // Reject all other applications
    await db
      .update(jobApplications)
      .set({
        status: 'rejected',
        statusUpdatedAt: new Date(),
        feedback: 'Position has been filled',
      })
      .where(and(eq(jobApplications.jobId, jobId), ne(jobApplications.applicantId, applicantId)));

    return updatedApplication;
  },

  // Reject job applicant
  async rejectApplicant(jobId: number, applicantId: number, clientId: number, feedback?: string) {
    // Verify job belongs to client
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.clientId, clientId)));

    if (!job) {
      throw new Error('Job not found or unauthorized');
    }

    const [updatedApplication] = await db
      .update(jobApplications)
      .set({
        status: 'rejected',
        statusUpdatedAt: new Date(),
        feedback,
      })
      .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.applicantId, applicantId)))
      .returning();

    return updatedApplication;
  },

  // Get user's job applications
  async getUserApplications(applicantId: number) {
    return await db
      .select({
        id: jobApplications.id,
        jobId: jobApplications.jobId,
        status: jobApplications.status,
        coverLetter: jobApplications.coverLetter,
        portfolioLinks: jobApplications.portfolioLinks,
        appliedAt: jobApplications.appliedAt,
        statusUpdatedAt: jobApplications.statusUpdatedAt,
        feedback: jobApplications.feedback,
        jobTitle: jobs.title,
        jobDescription: jobs.description,
        jobTokenCost: jobs.tokenCost,
        jobCategory: jobs.category,
        jobLocation: jobs.location,
        clientName: users.name,
      })
      .from(jobApplications)
      .leftJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .leftJoin(users, eq(jobs.clientId, users.id))
      .where(eq(jobApplications.applicantId, applicantId))
      .orderBy(desc(jobApplications.appliedAt));
  },
};
