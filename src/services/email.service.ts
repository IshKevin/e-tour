// Email service for sending verification and reset emails
// In a real application, you would integrate with services like SendGrid, AWS SES, etc.

export const emailService = {
  async sendVerificationEmail(email: string, verificationCode: string): Promise<boolean> {
    // Mock implementation - in production, integrate with actual email service
    console.log(`Sending verification email to ${email} with code: ${verificationCode}`);
    
    // Simulate email sending
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Verification email sent to ${email}`);
        resolve(true);
      }, 100);
    });
  },

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    // Mock implementation - in production, integrate with actual email service
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log(`Sending password reset email to ${email} with link: ${resetLink}`);
    
    // Simulate email sending
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Password reset email sent to ${email}`);
        resolve(true);
      }, 100);
    });
  },

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    // Mock implementation
    console.log(`Sending welcome email to ${name} at ${email}`);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Welcome email sent to ${email}`);
        resolve(true);
      }, 100);
    });
  },
};
