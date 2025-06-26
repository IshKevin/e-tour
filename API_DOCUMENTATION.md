# E-Tour Backend API Documentation

## Overview

This is the comprehensive API documentation for the E-Tour backend application. The API provides endpoints for user authentication, trip management, booking system, job marketplace, token system, and administrative functions.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

Error responses:

```json
{
  "error": "Error message description"
}
```

## Authentication Endpoints

### Register User
- **POST** `/auth/register`
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "client", // optional: "client", "agent", "admin"
    "phone": "+1234567890" // optional
  }
  ```

### Login
- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

### Logout
- **POST** `/auth/logout`

### Verify Email
- **POST** `/auth/verify-email`
- **Body:**
  ```json
  {
    "userId": 1,
    "code": "ABC123"
  }
  ```

### Reset Password Request
- **POST** `/auth/reset-password`
- **Body:**
  ```json
  {
    "email": "john@example.com"
  }
  ```

## Profile Endpoints

### Get Profile
- **GET** `/profile`
- **Auth Required:** Yes

### Update Profile
- **PUT** `/profile`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "name": "Updated Name",
    "phone": "+1234567890",
    "profileImage": "image-url"
  }
  ```

## Trip Endpoints

### Get Trips
- **GET** `/trips`
- **Query Parameters:**
  - `location` (string): Filter by location
  - `startDate` (string): Filter by start date
  - `endDate` (string): Filter by end date
  - `minPrice` (number): Minimum price filter
  - `maxPrice` (number): Maximum price filter
  - `page` (number): Page number (default: 1)
  - `limit` (number): Items per page (default: 10)

### Get Trip Details
- **GET** `/trips/:id`

### Get Trending Trips
- **GET** `/trending`
- **Query Parameters:**
  - `limit` (number): Number of trips to return (default: 10)

### Book Trip
- **POST** `/trips/:id/book`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "seatsBooked": 2
  }
  ```

### Submit Review
- **POST** `/trips/:id/review`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "bookingId": 123,
    "rating": 5,
    "comment": "Great trip!"
  }
  ```

## Booking Endpoints

### Get User Bookings
- **GET** `/bookings`
- **Auth Required:** Yes

### Cancel Booking
- **POST** `/bookings/:id/cancel`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "reason": "Change of plans"
  }
  ```

## Custom Trip Endpoints

### Create Custom Trip Request
- **POST** `/custom-trips`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "destination": "Paris, France",
    "budget": 2000,
    "interests": "Museums, Food, History",
    "preferredStartDate": "2024-06-01",
    "preferredEndDate": "2024-06-07",
    "groupSize": 4,
    "clientNotes": "Looking for family-friendly activities"
  }
  ```

### Get User Custom Trip Requests
- **GET** `/custom-trips`
- **Auth Required:** Yes

### Get Custom Trip Request Details
- **GET** `/custom-trips/:id`
- **Auth Required:** Yes

## Agent Endpoints

All agent endpoints require authentication and agent role.

### Create Trip
- **POST** `/agent/trips`
- **Body:**
  ```json
  {
    "title": "Amazing Paris Tour",
    "description": "Explore the city of lights",
    "itinerary": "Day 1: Eiffel Tower...",
    "price": 1500,
    "maxSeats": 20,
    "location": "Paris, France",
    "startDate": "2024-06-01",
    "endDate": "2024-06-07",
    "images": ["url1", "url2"]
  }
  ```

### Get Agent Trips
- **GET** `/agent/trips`

### Get Agent Trip Details
- **GET** `/agent/trips/:id`

### Update Trip
- **PUT** `/agent/trips/:id`

### Delete Trip
- **DELETE** `/agent/trips/:id`

### Get Agent Bookings
- **GET** `/agent/bookings`

### Get Agent Performance
- **GET** `/agent/performance`

## Token System Endpoints

### Get Token Packages
- **GET** `/tokens/packages`

### Purchase Tokens
- **POST** `/tokens/purchase`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "packageId": "standard",
    "paymentReference": "payment-ref-123"
  }
  ```

### Get Token Balance
- **GET** `/tokens/balance`
- **Auth Required:** Yes

### Get Token History
- **GET** `/tokens/history`
- **Auth Required:** Yes
- **Query Parameters:**
  - `limit` (number): Number of transactions to return (default: 50)

## Job Marketplace Endpoints

### Create Job Post
- **POST** `/jobs`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "title": "Tour Guide Needed",
    "description": "Looking for experienced tour guide",
    "tokenCost": 50,
    "category": "Tour Guide",
    "location": "Paris",
    "applicationDeadline": "2024-05-15"
  }
  ```

### Get Available Jobs
- **GET** `/jobs/available`
- **Query Parameters:**
  - `limit` (number): Number of jobs to return (default: 20)

### Get Client Jobs
- **GET** `/jobs`
- **Auth Required:** Yes

### Apply for Job
- **POST** `/jobs/:id/apply`
- **Auth Required:** Yes
- **Body:**
  ```json
  {
    "coverLetter": "I am interested in this position...",
    "portfolioLinks": ["url1", "url2"]
  }
  ```

### Get Job Applicants
- **GET** `/jobs/:id/applicants`
- **Auth Required:** Yes (job owner only)

### Accept/Reject Applicant
- **POST** `/jobs/:id/applicants/:applicantId/accept`
- **POST** `/jobs/:id/applicants/:applicantId/reject`
- **Auth Required:** Yes (job owner only)
- **Body:**
  ```json
  {
    "feedback": "Thank you for applying..."
  }
  ```

### Get User Applications
- **GET** `/my-applications`
- **Auth Required:** Yes

## Search Endpoints

### General Search
- **GET** `/search`
- **Query Parameters:**
  - `query` (string): Search term
  - `type` (string): "trips", "agents", or "all" (default: "all")
  - `limit` (number): Number of results (default: 20)

### Activity Suggestions
- **POST** `/suggestions/activities`
- **Body:**
  ```json
  {
    "location": "Paris",
    "interests": ["museums", "food"],
    "budget": 1000
  }
  ```

### Popular Destinations
- **GET** `/destinations/popular`
- **Query Parameters:**
  - `limit` (number): Number of destinations (default: 10)

## Notification Endpoints

### Get Notifications
- **GET** `/notifications`
- **Auth Required:** Yes
- **Query Parameters:**
  - `limit` (number): Number of notifications (default: 50)
  - `unreadOnly` (boolean): Get only unread notifications

### Mark as Read
- **POST** `/notifications/:id/read`
- **Auth Required:** Yes

### Mark All as Read
- **POST** `/notifications/read-all`
- **Auth Required:** Yes

### Delete Notification
- **DELETE** `/notifications/:id`
- **Auth Required:** Yes

### Get Unread Count
- **GET** `/notifications/unread-count`
- **Auth Required:** Yes

## Contact Endpoints

### Submit Contact Message
- **POST** `/contact`
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "Question about booking",
    "message": "I have a question..."
  }
  ```

## Admin Endpoints

All admin endpoints require authentication and admin role.

### User Management
- **GET** `/admin/users` - Get all users
- **GET** `/admin/users/:id` - Get user details
- **POST** `/admin/users/:id/suspend` - Suspend user
- **POST** `/admin/users/:id/reactivate` - Reactivate user

### Trip Management
- **GET** `/admin/trips` - Get all trips
- **PUT** `/admin/trips/:id` - Update trip

### Booking Management
- **GET** `/admin/bookings` - Get all bookings

### Custom Trip Management
- **GET** `/admin/custom-trips` - Get all custom trip requests
- **POST** `/admin/custom-trips/:id/assign` - Assign agent to custom trip

### System Statistics
- **GET** `/admin/stats` - Get system statistics

### Contact Message Management
- **GET** `/admin/contact-messages` - Get all contact messages
- **GET** `/admin/contact-messages/:id` - Get contact message details
- **PUT** `/admin/contact-messages/:id/status` - Update message status
- **POST** `/admin/contact-messages/:id/assign` - Assign message to admin

### Token Management
- **POST** `/admin/tokens/grant` - Grant tokens to user
- **GET** `/admin/tokens/stats` - Get token statistics

## Error Codes

- **400** - Bad Request (validation errors)
- **401** - Unauthorized (authentication required)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **500** - Internal Server Error

## Rate Limiting

API endpoints are rate-limited to prevent abuse. Current limits:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

## Pagination

List endpoints support pagination with the following parameters:
- `page` - Page number (starts from 1)
- `limit` - Items per page (max 100)

Response includes pagination metadata:
```json
{
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```
