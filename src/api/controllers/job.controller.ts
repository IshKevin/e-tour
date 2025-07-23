import { Request, Response } from 'express';
import { jobService } from '../../services/job.service';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  jobSuccessResponse
} from '../../utils/response';
import { z } from 'zod';

// Enhanced validation schemas
const createJobSchema = z.object({
  customTripId: z.string().uuid('Invalid custom trip ID format').optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description cannot exceed 2000 characters'),
  tokenCost: z.coerce.number().min(1, 'Token cost must be at least 1').max(1000, 'Token cost cannot exceed 1000'),
  category: z.string().max(100, 'Category cannot exceed 100 characters').optional(),
  location: z.string().max(255, 'Location cannot exceed 255 characters').optional(),
  applicationDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Application deadline must be in YYYY-MM-DD format').optional(),
  requirements: z.array(z.string().max(200, 'Each requirement cannot exceed 200 characters')).max(10, 'Maximum 10 requirements allowed').optional(),
  skills: z.array(z.string().max(50, 'Each skill cannot exceed 50 characters')).max(20, 'Maximum 20 skills allowed').optional()
});

const updateJobSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(255, 'Title cannot exceed 255 characters').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description cannot exceed 2000 characters').optional(),
  category: z.string().max(100, 'Category cannot exceed 100 characters').optional(),
  location: z.string().max(255, 'Location cannot exceed 255 characters').optional(),
  applicationDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Application deadline must be in YYYY-MM-DD format').optional(),
  status: z.enum(['open', 'closed'], { errorMap: () => ({ message: 'Status must be either open or closed' }) }).optional(),
  requirements: z.array(z.string().max(200, 'Each requirement cannot exceed 200 characters')).max(10, 'Maximum 10 requirements allowed').optional(),
  skills: z.array(z.string().max(50, 'Each skill cannot exceed 50 characters')).max(20, 'Maximum 20 skills allowed').optional()
});

const jobApplicationSchema = z.object({
  coverLetter: z.string().max(1000, 'Cover letter cannot exceed 1000 characters').optional(),
  portfolioLinks: z.array(z.string().url('Each portfolio link must be a valid URL')).max(5, 'Maximum 5 portfolio links allowed').optional(),
  expectedRate: z.coerce.number().min(0, 'Expected rate must be positive').optional(),
  availability: z.enum(['immediate', 'within_week', 'within_month', 'flexible']).optional()
});

const applicantActionSchema = z.object({
  feedback: z.string().max(500, 'Feedback cannot exceed 500 characters').optional(),
  rating: z.coerce.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5').optional()
});

export const jobController = {
  // POST /api/jobs - Create job post
  async createJob(req: Request, res: Response): Promise<Response> {
    try {
      const clientId = req.user?.id;
      if (!clientId) {
        return errorResponse(
          res,
          401,
          'Authentication is required to create a job posting. Please log in and try again.',
          null,
          { action: 'login_required', endpoint: '/api/v1/auth/login' }
        );
      }

      const jobData = createJobSchema.parse(req.body);

      // Validate application deadline if provided
      if (jobData.applicationDeadline) {
        const deadlineDate = new Date(jobData.applicationDeadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (deadlineDate <= today) {
          return errorResponse(
            res,
            400,
            'Application deadline must be in the future',
            null,
            { field: 'applicationDeadline', received: jobData.applicationDeadline }
          );
        }
      }

      const job = await jobService.createJob(clientId, jobData);

      // Enhanced job creation response
      const enhancedJob = {
        ...job,
        jobInfo: {
          status: 'open',
          visibility: 'public',
          canEdit: true,
          canDelete: true
        },
        applicationInfo: {
          totalApplications: 0,
          deadline: jobData.applicationDeadline || 'No deadline set',
          estimatedCost: `${jobData.tokenCost} tokens`
        },
        nextSteps: [
          'Your job posting is now live and visible to freelancers',
          'You will receive notifications when freelancers apply',
          'Review applications and select the best candidate'
        ]
      };

      return jobSuccessResponse(
        res,
        201,
        'Job posting created successfully! Your job is now live and visible to freelancers.',
        enhancedJob,
        { operation: 'create_job' }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return validationErrorResponse(
          res,
          'The job posting information provided is invalid. Please check your input and try again.',
          error.errors
        );
      }
      console.error('Error creating job:', error);
      return errorResponse(
        res,
        500,
        'Unable to create job posting at this time. Please try again later.',
        error,
        {
          operation: 'create_job',
          clientId: req.user?.id,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
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
    const jobId = req.params.id;
    const clientId = req.user?.id;

    if (!jobId || typeof jobId !== 'string') {
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
    const jobId = req.params.id;
    const clientId = req.user?.id;

    if (!jobId || typeof jobId !== 'string') {
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
    const jobId = req.params.id;
    const clientId = req.user?.id;

    if (!jobId || typeof jobId !== 'string') {
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
    const jobId = req.params.id;
    const applicantId = req.user?.id;

    if (!jobId || typeof jobId !== 'string') {
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
    const jobId = req.params.id;
    const clientId = req.user?.id;

    if (!jobId || typeof jobId !== 'string') {
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
    const jobId = req.params.id;
    const applicantId = req.params.applicantId;
    const clientId = req.user?.id;

    if (!jobId || !applicantId || typeof jobId !== 'string' || typeof applicantId !== 'string') {
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
    const jobId = req.params.id;
    const applicantId = req.params.applicantId;
    const clientId = req.user?.id;

    if (!jobId || !applicantId || typeof jobId !== 'string' || typeof applicantId !== 'string') {
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
