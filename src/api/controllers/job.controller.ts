import { Request, Response } from 'express';
import { jobService } from '../../services/job.service';
import { successResponse } from '../../utils/response';
import { z } from 'zod';

// Validation schemas
const createJobSchema = z.object({
  customTripId: z.number().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  tokenCost: z.number().min(1, 'Token cost must be positive'),
  category: z.string().optional(),
  location: z.string().optional(),
  applicationDeadline: z.string().optional(),
});

const updateJobSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  applicationDeadline: z.string().optional(),
  status: z.enum(['open', 'closed']).optional(),
});

const jobApplicationSchema = z.object({
  coverLetter: z.string().optional(),
  portfolioLinks: z.array(z.string()).optional(),
});

const applicantActionSchema = z.object({
  feedback: z.string().optional(),
});

export const jobController = {
  // POST /api/jobs - Create job post
  async createJob(req: Request, res: Response): Promise<Response> {
    const clientId = req.user?.id;
    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const jobData = createJobSchema.parse(req.body);
      const job = await jobService.createJob(clientId, jobData);
      return successResponse(res, 201, 'Job created successfully', job);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // GET /api/jobs - Get client's jobs
  async getClientJobs(req: Request, res: Response): Promise<Response> {
    const clientId = req.user?.id;
    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const jobs = await jobService.getClientJobs(clientId);
    return successResponse(res, 200, 'Jobs fetched successfully', jobs);
  },

  // GET /api/jobs/:id - Get job details
  async getJobById(req: Request, res: Response): Promise<Response> {
    const jobId = parseInt(req.params.id);
    const clientId = req.user?.id;

    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const job = await jobService.getJobById(jobId, clientId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return successResponse(res, 200, 'Job details fetched successfully', job);
  },

  // PUT /api/jobs/:id - Update job
  async updateJob(req: Request, res: Response): Promise<Response> {
    const jobId = parseInt(req.params.id);
    const clientId = req.user?.id;

    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const updateData = updateJobSchema.parse(req.body);
      const updatedJob = await jobService.updateJob(jobId, clientId, updateData);
      return successResponse(res, 200, 'Job updated successfully', updatedJob);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // DELETE /api/jobs/:id - Delete job
  async deleteJob(req: Request, res: Response): Promise<Response> {
    const jobId = parseInt(req.params.id);
    const clientId = req.user?.id;

    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const deletedJob = await jobService.deleteJob(jobId, clientId);
      return successResponse(res, 200, 'Job deleted successfully', deletedJob);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // GET /api/jobs/available - Get available jobs (for agents)
  async getAvailableJobs(req: Request, res: Response): Promise<Response> {
    const limit = parseInt(req.query.limit as string) || 20;
    const jobs = await jobService.getAvailableJobs(limit);
    return successResponse(res, 200, 'Available jobs fetched successfully', jobs);
  },

  // POST /api/jobs/:id/apply - Apply for job
  async applyForJob(req: Request, res: Response): Promise<Response> {
    const jobId = parseInt(req.params.id);
    const applicantId = req.user?.id;

    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    if (!applicantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const applicationData = jobApplicationSchema.parse(req.body);
      const application = await jobService.applyForJob(jobId, applicantId, applicationData);
      return successResponse(res, 201, 'Application submitted successfully', application);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // GET /api/jobs/:id/applicants - Get job applicants
  async getJobApplicants(req: Request, res: Response): Promise<Response> {
    const jobId = parseInt(req.params.id);
    const clientId = req.user?.id;

    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const applicants = await jobService.getJobApplicants(jobId, clientId);
      return successResponse(res, 200, 'Job applicants fetched successfully', applicants);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // POST /api/jobs/:id/applicants/:applicantId/accept - Accept applicant
  async acceptApplicant(req: Request, res: Response): Promise<Response> {
    const jobId = parseInt(req.params.id);
    const applicantId = parseInt(req.params.applicantId);
    const clientId = req.user?.id;

    if (isNaN(jobId) || isNaN(applicantId)) {
      return res.status(400).json({ error: 'Invalid job or applicant ID' });
    }

    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { feedback } = applicantActionSchema.parse(req.body);
      const application = await jobService.acceptApplicant(jobId, applicantId, clientId, feedback);
      return successResponse(res, 200, 'Applicant accepted successfully', application);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // POST /api/jobs/:id/applicants/:applicantId/reject - Reject applicant
  async rejectApplicant(req: Request, res: Response): Promise<Response> {
    const jobId = parseInt(req.params.id);
    const applicantId = parseInt(req.params.applicantId);
    const clientId = req.user?.id;

    if (isNaN(jobId) || isNaN(applicantId)) {
      return res.status(400).json({ error: 'Invalid job or applicant ID' });
    }

    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { feedback } = applicantActionSchema.parse(req.body);
      const application = await jobService.rejectApplicant(jobId, applicantId, clientId, feedback);
      return successResponse(res, 200, 'Applicant rejected successfully', application);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  },

  // GET /api/my-applications - Get user's job applications
  async getUserApplications(req: Request, res: Response): Promise<Response> {
    const applicantId = req.user?.id;
    if (!applicantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const applications = await jobService.getUserApplications(applicantId);
    return successResponse(res, 200, 'Applications fetched successfully', applications);
  },
};
