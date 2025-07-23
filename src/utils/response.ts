import { Response } from 'express';

// Enhanced interfaces for professional responses
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ResponseMeta {
  requestId?: string;
  version?: string;
  service?: string;
  pagination?: PaginationMeta;
  filters?: Record<string, any>;
  sort?: Record<string, any>;
}

export interface SuccessResponseData {
  data: any;
  meta?: ResponseMeta;
  links?: {
    self?: string;
    next?: string;
    prev?: string;
    first?: string;
    last?: string;
  };
}

export const successResponse = (
  res: Response,
  status: number,
  message: string,
  data: any,
  meta?: ResponseMeta
) => {
  const response: any = {
    success: true,
    status,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || generateRequestId()
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(status).json(response);
};

// Enhanced success response with pagination
export const successResponseWithPagination = (
  res: Response,
  status: number,
  message: string,
  data: any[],
  pagination: PaginationMeta,
  additionalMeta?: Partial<ResponseMeta>
) => {
  return res.status(status).json({
    success: true,
    status,
    message,
    data,
    meta: {
      pagination,
      ...additionalMeta
    },
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || generateRequestId()
  });
};

// Enhanced error response with detailed error information
export const errorResponse = (
  res: Response,
  status: number,
  message: string,
  error?: any,
  details?: Record<string, any>
) => {
  const response: any = {
    success: false,
    status,
    error: {
      code: getErrorCode(status),
      message,
      details: details || null
    },
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || generateRequestId()
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && error?.stack) {
    response.error.stack = error.stack;
  }

  // Add error reference for support
  if (status >= 500) {
    response.support = {
      message: 'If this error persists, please contact support with the request ID',
      email: 'support@etour-rwanda.com'
    };
  }

  return res.status(status).json(response);
};

export const notFoundResponse = (
  res: Response,
  message: string,
  error?: any
) => {
  return res.status(404).json({
    success: false,
    message,
    error,
    timestamp: new Date().toISOString()
  });
};

// Enhanced validation error response
export const validationErrorResponse = (
  res: Response,
  message: string,
  errors: any[],
  field?: string
) => {
  const formattedErrors = errors.map(error => ({
    field: error.path?.join('.') || error.field || field,
    message: error.message,
    code: error.code || 'VALIDATION_ERROR',
    received: error.received
  }));

  return res.status(422).json({
    success: false,
    status: 422,
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details: {
        errors: formattedErrors,
        count: formattedErrors.length
      }
    },
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || generateRequestId()
  });
};

export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized access'
) => {
  return res.status(401).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

export const forbiddenResponse = (
  res: Response,
  message: string = 'Access forbidden',
  requiredRole?: string
) => {
  return res.status(403).json({
    success: false,
    status: 403,
    error: {
      code: 'FORBIDDEN',
      message,
      details: requiredRole ? { requiredRole } : null
    },
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || generateRequestId()
  });
};

// Helper functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function getErrorCode(status: number): string {
  const errorCodes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE'
  };
  return errorCodes[status] || 'UNKNOWN_ERROR';
}

// Trip-specific response helpers
export const tripSuccessResponse = (
  res: Response,
  status: number,
  message: string,
  data: any,
  meta?: ResponseMeta
) => {
  return successResponse(res, status, message, data, {
    ...meta,
    version: 'v1',
    service: 'trip-service'
  });
};

export const tripListResponse = (
  res: Response,
  trips: any[],
  pagination: PaginationMeta,
  filters?: Record<string, any>
) => {
  return successResponseWithPagination(
    res,
    200,
    'Trips retrieved successfully',
    trips,
    pagination,
    {
      filters,
      version: 'v1',
      service: 'trip-service'
    }
  );
};

// Booking-specific responses
export const bookingSuccessResponse = (
  res: Response,
  booking: any,
  message: string = 'Booking processed successfully'
) => {
  return successResponse(res, 201, message, {
    booking: {
      ...booking,
      confirmationNumber: `ETR-${booking.id.substring(0, 8).toUpperCase()}`,
      estimatedConfirmationTime: '24 hours',
      cancellationPolicy: 'Free cancellation up to 48 hours before trip start'
    }
  }, {
    version: 'v1',
    service: 'booking-service'
  });
};

// Review-specific responses
export const reviewSuccessResponse = (
  res: Response,
  review: any,
  message: string = 'Review submitted successfully'
) => {
  return successResponse(res, 201, message, {
    review,
    impact: {
      message: 'Thank you for your feedback! Your review helps other travelers make informed decisions.',
      pointsEarned: 10
    }
  }, {
    version: 'v1',
    service: 'review-service'
  });
};

// Custom trip request responses
export const customTripRequestResponse = (
  res: Response,
  request: any,
  message: string = 'Custom trip request submitted successfully'
) => {
  return successResponse(res, 201, message, {
    request,
    nextSteps: {
      message: 'Your request has been received and will be reviewed by our travel experts.',
      expectedResponseTime: '48-72 hours',
      trackingId: `CTR-${request.id.substring(0, 8).toUpperCase()}`
    }
  }, {
    version: 'v1',
    service: 'custom-trip-service'
  });
};

// Agent performance response
export const agentPerformanceResponse = (
  res: Response,
  performance: any,
  message: string = 'Performance metrics retrieved successfully'
) => {
  return successResponse(res, 200, message, {
    ...performance,
    insights: {
      topPerformingTrip: performance.topTrip || null,
      improvementAreas: performance.suggestions || [],
      nextMilestone: performance.nextGoal || null
    },
    period: {
      from: performance.periodStart || null,
      to: performance.periodEnd || null,
      type: 'monthly'
    }
  }, {
    version: 'v1',
    service: 'analytics-service'
  });
};