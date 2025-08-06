// Simple analytics service with mock data
export const analyticsService = {
  // Get dashboard metrics
  async getDashboardMetrics(userId?: string, role?: string) {
    try {
      const baseMetrics = {
        totalUsers: 1250,
        totalTrips: 89,
        totalBookings: 456,
        totalRevenue: 125000,
        activeUsers: 234,
        pendingBookings: 23,
        completedTrips: 67,
        averageRating: 4.6
      };

      // Adjust metrics based on role
      if (role === 'agent') {
        return {
          myTrips: 12,
          myBookings: 45,
          myRevenue: 15000,
          myRating: 4.8,
          pendingRequests: 3,
          completedTrips: 8,
          totalClients: 34,
          monthlyEarnings: 3500
        };
      }

      return baseMetrics;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  },

  // Get booking analytics
  async getBookingAnalytics(timeRange: string = '30d') {
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      
      const bookingData = Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        bookings: Math.floor(Math.random() * 20) + 5,
        revenue: Math.floor(Math.random() * 5000) + 1000,
        cancellations: Math.floor(Math.random() * 3)
      }));

      const summary = {
        totalBookings: bookingData.reduce((sum, day) => sum + day.bookings, 0),
        totalRevenue: bookingData.reduce((sum, day) => sum + day.revenue, 0),
        totalCancellations: bookingData.reduce((sum, day) => sum + day.cancellations, 0),
        averageBookingsPerDay: Math.round(bookingData.reduce((sum, day) => sum + day.bookings, 0) / days),
        conversionRate: '12.5%',
        topDestinations: ['Paris', 'Tokyo', 'New York', 'London', 'Sydney']
      };

      return {
        timeRange,
        data: bookingData,
        summary
      };
    } catch (error) {
      console.error('Error fetching booking analytics:', error);
      throw error;
    }
  },

  // Get user analytics
  async getUserAnalytics() {
    try {
      const userStats = {
        totalUsers: 1250,
        newUsersThisMonth: 89,
        activeUsers: 234,
        userGrowthRate: '15.2%',
        usersByCountry: [
          { country: 'United States', users: 345 },
          { country: 'United Kingdom', users: 234 },
          { country: 'Canada', users: 156 },
          { country: 'Australia', users: 123 },
          { country: 'Germany', users: 98 }
        ],
        usersByAge: [
          { ageGroup: '18-25', users: 234 },
          { ageGroup: '26-35', users: 456 },
          { ageGroup: '36-45', users: 345 },
          { ageGroup: '46-55', users: 156 },
          { ageGroup: '55+', users: 59 }
        ],
        retentionRate: '68.5%'
      };

      return userStats;
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      throw error;
    }
  },

  // Get revenue analytics
  async getRevenueAnalytics(timeRange: string = '30d') {
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      
      const revenueData = Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 5000) + 1000,
        bookings: Math.floor(Math.random() * 20) + 5,
        averageOrderValue: Math.floor(Math.random() * 500) + 200
      }));

      const summary = {
        totalRevenue: revenueData.reduce((sum, day) => sum + day.revenue, 0),
        averageRevenue: Math.round(revenueData.reduce((sum, day) => sum + day.revenue, 0) / days),
        revenueGrowth: '18.7%',
        topRevenueTrips: [
          { tripName: 'Paris Adventure', revenue: 15000 },
          { tripName: 'Tokyo Explorer', revenue: 12500 },
          { tripName: 'NYC Experience', revenue: 11000 }
        ]
      };

      return {
        timeRange,
        data: revenueData,
        summary
      };
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      throw error;
    }
  },

  // Generate custom report
  async generateCustomReport(reportConfig: {
    metrics: string[];
    timeRange: string;
    filters?: Record<string, any>;
  }) {
    try {
      const { metrics, timeRange, filters } = reportConfig;
      
      // Mock report generation
      const reportData = {
        reportId: `report_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        config: reportConfig,
        data: {
          summary: {
            totalRecords: 1250,
            dateRange: timeRange,
            appliedFilters: Object.keys(filters || {}).length
          },
          metrics: metrics.map(metric => ({
            name: metric,
            value: Math.floor(Math.random() * 10000),
            change: `${Math.floor(Math.random() * 20) - 10}%`,
            trend: Math.random() > 0.5 ? 'up' : 'down'
          }))
        },
        downloadUrl: `/api/reports/download/${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      return reportData;
    } catch (error) {
      console.error('Error generating custom report:', error);
      throw error;
    }
  }
};
