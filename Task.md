## **API Endpoints**

### **Authentication & User Management**

1. **POST `/api/auth/register`**

   * **Task**: Implement user registration.
   * **Expected Result**: Validate input, hash password with `bcrypt`, store in DB, and return a JWT token.

2. **POST `/api/auth/login`**

   * **Task**: Implement login for users.
   * **Expected Result**: Validate credentials, compare password with `bcrypt`, return JWT token.

3. **POST `/api/auth/logout`**

   * **Task**: Implement logout by invalidating the JWT token.
   * **Expected Result**: Destroy token on the client side.

4. **POST `/api/auth/verify-email`**

   * **Task**: Email verification.
   * **Expected Result**: Generate verification code, validate it, and mark email as verified.

5. **POST `/api/auth/reset-password`**

   * **Task**: Password reset functionality.
   * **Expected Result**: Generate reset token, send email/SMS with reset link, and update the password.

6. **GET `/api/profile`**

   * **Task**: Fetch the authenticated user's profile.
   * **Expected Result**: Return user data based on JWT.

7. **PUT `/api/profile`**

   * **Task**: Update the authenticated user's profile.
   * **Expected Result**: Validate and update user details.

### **Client Features**

8. **GET `/api/trips`**

   * **Task**: Fetch available trips with filters (location, date, price).
   * **Expected Result**: Return paginated trips list.

9. **GET `/api/trips/:id`**

   * **Task**: Fetch a specific trip's details.
   * **Expected Result**: Return trip details (itinerary, reviews, price).

10. **POST `/api/trips/:id/book`**

    * **Task**: Book a trip.
    * **Expected Result**: Validate seat availability, create booking, return booking ID.

11. **GET `/api/bookings`**

    * **Task**: Get all bookings for the authenticated user.
    * **Expected Result**: Return user bookings.

12. **POST `/api/bookings/:id/cancel`**

    * **Task**: Cancel a specific booking (Soft Delete).
    * **Expected Result**: Update booking status to "cancelled" and mark it as deleted in the database (don’t actually delete the record, set a `deleted_at` timestamp or status flag).

13. **POST `/api/trips/:id/review`**

    * **Task**: Submit a review for a completed trip.
    * **Expected Result**: Save review (rating, comment), update trip's average rating.

14. **POST `/api/custom-trips`**

    * **Task**: Submit a custom trip request.
    * **Expected Result**: Store the request with "pending" status.

15. **GET `/api/custom-trips`**

    * **Task**: View all custom trip requests.
    * **Expected Result**: Return a list of requests by the authenticated user.

16. **GET `/api/custom-trips/:id`**

    * **Task**: View details of a specific custom trip request.
    * **Expected Result**: Return custom trip details.

17. **POST `/api/suggestions/activities`**

    * **Task**: Get activity suggestions based on user inputs.
    * **Expected Result**: Return matching activities.

18. **GET `/api/trending`**

    * **Task**: Get trending trips.
    * **Expected Result**: Return a list of top-rated or popular trips.

### **Agent Features**

19. **POST `/api/agent/trips`**

    * **Task**: Create a new trip.
    * **Expected Result**: Validate trip input and save in DB.

20. **GET `/api/agent/trips`**

    * **Task**: Fetch agent's trips.
    * **Expected Result**: Return a list of trips created by the authenticated agent.

21. **GET `/api/agent/trips/:id`**

    * **Task**: Fetch details of a specific trip.
    * **Expected Result**: Return trip details.

22. **PUT `/api/agent/trips/:id`**

    * **Task**: Edit trip (if no bookings exist).
    * **Expected Result**: Ensure no bookings exist, update trip details.

23. **DELETE `/api/agent/trips/:id`**

    * **Task**: Soft delete a trip (if no bookings exist).
    * **Expected Result**: Mark trip as deleted by setting a `deleted_at` timestamp or a "status" flag.

24. **GET `/api/agent/bookings`**

    * **Task**: Fetch bookings for agent's trips.
    * **Expected Result**: Return bookings associated with the agent's trips.

25. **GET `/api/agent/performance`**

    * **Task**: Fetch performance metrics (total bookings, revenue).
    * **Expected Result**: Return performance metrics and agent ranking.

### **Admin Features**

26. **GET `/api/admin/users`**

    * **Task**: Fetch all users.
    * **Expected Result**: Return a list of all users in the system.

27. **POST `/api/admin/users/:id/suspend`**

    * **Task**: Suspend a user.
    * **Expected Result**: Update user status to "suspended" in the database.

28. **GET `/api/admin/trips`**

    * **Task**: Fetch all trips.
    * **Expected Result**: Return a list of all trips in the system.

29. **PUT `/api/admin/trips/:id`**

    * **Task**: Admin updates trip.
    * **Expected Result**: Allow trip editing with admin privileges.

30. **GET `/api/admin/bookings`**

    * **Task**: Fetch all bookings.
    * **Expected Result**: Return a list of all bookings.

31. **GET `/api/admin/custom-trips`**

    * **Task**: Fetch all custom trip requests.
    * **Expected Result**: Return a list of custom trip requests.

32. **POST `/api/admin/custom-trips/:id/assign`**

    * **Task**: Assign an agent to a custom trip request.
    * **Expected Result**: Update request status and assign an agent.

### **Job Marketplace** (Future)

33. **POST `/api/jobs`**

    * **Task**: Create a job post.
    * **Expected Result**: Create a job post linked to a custom trip.

34. **GET `/api/jobs`**

    * **Task**: Fetch job posts.
    * **Expected Result**: Return job posts created by the client.

35. **PUT `/api/jobs/:id`**

    * **Task**: Edit a job post.
    * **Expected Result**: Edit job details if still open.

36. **DELETE `/api/jobs/:id`**

    * **Task**: Soft delete the job post.
    * **Expected Result**: Mark the job post as "deleted" by setting a `deleted_at` timestamp.

37. **GET `/api/jobs/:id/applicants`**

    * **Task**: View job applicants.
    * **Expected Result**: Return a list of applicants for the job post.

38. **POST `/api/jobs/:id/applicants/:applicant_id/accept`**

    * **Task**: Accept a job applicant.
    * **Expected Result**: Update applicant status to "accepted".

39. **POST `/api/jobs/:id/applicants/:applicant_id/reject`**

    * **Task**: Reject a job applicant.
    * **Expected Result**: Update applicant status to "rejected".

40. **GET `/api/jobs/available`**

    * **Task**: Fetch available job posts.
    * **Expected Result**: Return a list of open job posts.

---

### **Token System**

41. **POST `/api/tokens/purchase`**

    * **Task**: Purchase a token package.
    * **Expected Result**: Trigger payment gateway, add tokens to the balance.

42. **GET `/api/tokens/balance`**

    * **Task**: View token balance.
    * **Expected Result**: Return current token balance.

43. **GET `/api/tokens/history`**

    * **Task**: View token transaction history.
    * **Expected Result**: Return token usage and purchase history.

### **Utilities & Miscellaneous**

44. **GET `/api/notifications`**

    * **Task**: Fetch notifications for the user.
    * **Expected Result**: Return a list of unread/read notifications.

45. **GET `/api/search`**

    * **Task**: Perform search on trips, jobs, agents, etc.
    * **Expected Result**: Return search results.

46. **POST `/api/contact`**

    * **Task**: Submit a contact/support message.
    * **Expected Result**: Store or send the contact message to admin.