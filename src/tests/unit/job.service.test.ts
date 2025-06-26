import { jobService } from '../../services/job.service';
import { tokenService } from '../../services/token.service';

// Mock the database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock the token service
jest.mock('../../services/token.service');

describe('JobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create job successfully when user has enough tokens', async () => {
      const clientId = 1;
      const jobData = {
        title: 'Tour Guide Needed',
        description: 'Looking for experienced tour guide',
        tokenCost: 50,
        category: 'Tour Guide',
        location: 'Paris',
      };

      const mockTokens = {
        id: 1,
        userId: clientId,
        balance: 100,
      };

      const mockJob = {
        id: 1,
        clientId,
        ...jobData,
        status: 'open',
        createdAt: new Date(),
      };

      // Mock token balance check
      (tokenService.getUserTokenBalance as jest.Mock).mockResolvedValue(mockTokens);

      // Mock job creation
      const mockDb = require('../../db').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockJob]),
        }),
      });

      // Mock token usage
      (tokenService.useTokens as jest.Mock).mockResolvedValue(mockTokens);

      const result = await jobService.createJob(clientId, jobData);

      expect(result).toEqual(mockJob);
      expect(tokenService.getUserTokenBalance).toHaveBeenCalledWith(clientId);
      expect(tokenService.useTokens).toHaveBeenCalledWith(
        clientId,
        jobData.tokenCost,
        mockJob.id.toString(),
        'job_post',
        `Created job post: ${jobData.title}`
      );
    });

    it('should throw error when user has insufficient tokens', async () => {
      const clientId = 1;
      const jobData = {
        title: 'Tour Guide Needed',
        description: 'Looking for experienced tour guide',
        tokenCost: 150,
        category: 'Tour Guide',
        location: 'Paris',
      };

      const mockTokens = {
        id: 1,
        userId: clientId,
        balance: 100,
      };

      (tokenService.getUserTokenBalance as jest.Mock).mockResolvedValue(mockTokens);

      await expect(jobService.createJob(clientId, jobData)).rejects.toThrow('Insufficient tokens to create job post');
    });
  });

  describe('getAvailableJobs', () => {
    it('should return available jobs', async () => {
      const mockJobs = [
        {
          id: 1,
          title: 'Tour Guide Needed',
          description: 'Looking for experienced tour guide',
          tokenCost: 50,
          category: 'Tour Guide',
          location: 'Paris',
          clientName: 'John Client',
          applicationsCount: 3,
        },
        {
          id: 2,
          title: 'Travel Photographer',
          description: 'Need photographer for trip',
          tokenCost: 75,
          category: 'Photography',
          location: 'Rome',
          clientName: 'Jane Client',
          applicationsCount: 1,
        },
      ];

      const mockDb = require('../../db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                groupBy: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue(mockJobs),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await jobService.getAvailableJobs(20);

      expect(result).toEqual(mockJobs);
    });
  });

  describe('applyForJob', () => {
    it('should apply for job successfully', async () => {
      const jobId = 1;
      const applicantId = 2;
      const applicationData = {
        coverLetter: 'I am interested in this position',
        portfolioLinks: ['https://example.com/portfolio'],
      };

      const mockJob = {
        id: jobId,
        status: 'open',
        clientId: 1,
      };

      const mockApplication = {
        id: 1,
        jobId,
        applicantId,
        ...applicationData,
        status: 'pending',
        appliedAt: new Date(),
      };

      const mockDb = require('../../db').db;

      // Mock job existence check
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockJob]),
        }),
      });

      // Mock existing application check
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      // Mock application creation
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockApplication]),
        }),
      });

      const result = await jobService.applyForJob(jobId, applicantId, applicationData);

      expect(result).toEqual(mockApplication);
    });

    it('should throw error for non-existent job', async () => {
      const jobId = 999;
      const applicantId = 2;
      const applicationData = {
        coverLetter: 'I am interested in this position',
      };

      const mockDb = require('../../db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(jobService.applyForJob(jobId, applicantId, applicationData))
        .rejects.toThrow('Job not found or not available');
    });

    it('should throw error for duplicate application', async () => {
      const jobId = 1;
      const applicantId = 2;
      const applicationData = {
        coverLetter: 'I am interested in this position',
      };

      const mockJob = {
        id: jobId,
        status: 'open',
        clientId: 1,
      };

      const mockExistingApplication = {
        id: 1,
        jobId,
        applicantId,
      };

      const mockDb = require('../../db').db;

      // Mock job existence check
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockJob]),
        }),
      });

      // Mock existing application check
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockExistingApplication]),
        }),
      });

      await expect(jobService.applyForJob(jobId, applicantId, applicationData))
        .rejects.toThrow('You have already applied for this job');
    });
  });

  describe('acceptApplicant', () => {
    it('should accept applicant and update job status', async () => {
      const jobId = 1;
      const applicantId = 2;
      const clientId = 1;
      const feedback = 'Great application!';

      const mockJob = {
        id: jobId,
        clientId,
        status: 'open',
      };

      const mockUpdatedApplication = {
        id: 1,
        jobId,
        applicantId,
        status: 'accepted',
        feedback,
        statusUpdatedAt: new Date(),
      };

      const mockDb = require('../../db').db;

      // Mock job verification
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockJob]),
        }),
      });

      // Mock application update
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUpdatedApplication]),
          }),
        }),
      });

      // Mock job status update
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      // Mock other applications rejection
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await jobService.acceptApplicant(jobId, applicantId, clientId, feedback);

      expect(result).toEqual(mockUpdatedApplication);
    });

    it('should throw error for unauthorized access', async () => {
      const jobId = 1;
      const applicantId = 2;
      const clientId = 999; // Wrong client ID

      const mockDb = require('../../db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(jobService.acceptApplicant(jobId, applicantId, clientId))
        .rejects.toThrow('Job not found or unauthorized');
    });
  });

  describe('getUserApplications', () => {
    it('should return user applications', async () => {
      const applicantId = 2;
      const mockApplications = [
        {
          id: 1,
          jobId: 1,
          status: 'pending',
          coverLetter: 'I am interested',
          appliedAt: new Date(),
          jobTitle: 'Tour Guide Needed',
          jobDescription: 'Looking for experienced guide',
          clientName: 'John Client',
        },
        {
          id: 2,
          jobId: 2,
          status: 'accepted',
          coverLetter: 'Great opportunity',
          appliedAt: new Date(),
          jobTitle: 'Travel Photographer',
          jobDescription: 'Need photographer',
          clientName: 'Jane Client',
        },
      ];

      const mockDb = require('../../db').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue(mockApplications),
              }),
            }),
          }),
        }),
      });

      const result = await jobService.getUserApplications(applicantId);

      expect(result).toEqual(mockApplications);
    });
  });

  describe('deleteJob', () => {
    it('should delete job without applications', async () => {
      const jobId = 1;
      const clientId = 1;

      const mockJob = {
        id: jobId,
        clientId,
        tokenCost: 50,
        title: 'Test Job',
      };

      const mockDeletedJob = {
        ...mockJob,
        deletedAt: new Date(),
      };

      const mockDb = require('../../db').db;

      // Mock job verification
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockJob]),
        }),
      });

      // Mock application count check
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      // Mock job deletion
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockDeletedJob]),
          }),
        }),
      });

      // Mock token refund
      (tokenService.refundTokens as jest.Mock).mockResolvedValue({});

      const result = await jobService.deleteJob(jobId, clientId);

      expect(result).toEqual(mockDeletedJob);
      expect(tokenService.refundTokens).toHaveBeenCalledWith(
        clientId,
        mockJob.tokenCost,
        mockJob.id.toString(),
        'job_post_refund',
        `Refund for deleted job post: ${mockJob.title}`
      );
    });

    it('should throw error when job has applications', async () => {
      const jobId = 1;
      const clientId = 1;

      const mockJob = {
        id: jobId,
        clientId,
        tokenCost: 50,
        title: 'Test Job',
      };

      const mockDb = require('../../db').db;

      // Mock job verification
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockJob]),
        }),
      });

      // Mock application count check
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

      await expect(jobService.deleteJob(jobId, clientId))
        .rejects.toThrow('Cannot delete job with existing applications');
    });
  });
});
