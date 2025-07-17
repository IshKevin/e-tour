# Echo-Rwanda Backend - README

## Project Overview

**Echo-Rwanda** is a travel and job marketplace platform with the goal of offering a seamless experience for clients, travel agents, and admins. This backend service manages user authentication, trip bookings, custom trip requests, agent management, and job marketplace features. It follows a **Microservices** architecture and utilizes **Test-Driven Development (TDD)** for building features.

The application is built with **TypeScript**, **Node.js**, and an **Express** framework. The backend is integrated with a **PostgreSQL** or **Neon database**, depending on your configuration in `drizzle.config.ts`.

## Database Architecture

The system uses **UUID (Universally Unique Identifier)** for all primary keys instead of auto-incrementing integers, providing:

- Better security (no predictable ID sequences)
- Improved scalability for distributed systems
- Enhanced data privacy
- Seamless data migration and replication

### UUID Implementation

All database tables use UUID v4 as primary keys:

```typescript
// Example: User table with UUID
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  // ... other fields
});
```

### API Endpoints

All API endpoints expect and return UUID strings:

```bash
GET /api/users/550e8400-e29b-41d4-a716-446655440000
POST /api/trips/6ba7b810-9dad-11d1-80b4-00c04fd430c8/book
PUT /api/jobs/6ba7b811-9dad-11d1-80b4-00c04fd430c8
```

The **MVP** (Minimum Viable Product) is designed to provide core functionalities like booking trips, managing user profiles, and handling custom trip requests. Future versions will include payment integrations and more advanced features.

---

## Table of Contents

- [Echo-Rwanda Backend - README](#echo-rwanda-backend---readme)
  - [Project Overview](#project-overview)
  - [Table of Contents](#table-of-contents)
  - [Project Features](#project-features)
    - [**Core Features**:](#core-features)
    - [**Future Features**:](#future-features)
  - [Installation](#installation)
    - [**Clone the Repository**:](#clone-the-repository)
    - [**Install Dependencies**:](#install-dependencies)
    - [**Set up Environment Variables**:](#set-up-environment-variables)
    - [**Set up the Database**:](#set-up-the-database)
  - [File Structure](#file-structure)
  - [Environment Setup](#environment-setup)
  - [Running the Application](#running-the-application)
  - [Testing](#testing)
    - [**Running Tests**:](#running-tests)
  - [Technologies](#technologies)
  - [TDD Methodology](#tdd-methodology)
  - [Scripts](#scripts)
  - [API Overview](#api-overview)

---

## Project Features

### **Core Features**:

* **User Roles**: Clients, Agents, and Admins.
* **Authentication**: JWT-based authentication for secure login.
* **Profile Management**: Clients and agents can manage their profiles.
* **Trip Management**:

  * Browse available trips.
  * Book trips.
  * View and cancel bookings (based on policy).
* **Custom Trip Requests**: Clients can submit custom trip requests based on budget, destination, and preferences.
* **Agent Features**: Agents can manage their trips, see booking history, and track performance.
* **Admin Dashboard**: Admins can manage users, trips, and bookings, as well as view system-wide metrics.

### **Future Features**:

* **Payment System**: Payment integration will be added in the future.
* **Job Marketplace**: Allows job listings related to trips.
* **Rating & Reviews**: A global review system for trips and agents.

---

## Installation

### **Clone the Repository**:

```bash
git clone https://github.com/yourusername/e-tour.git
cd e-tour
```

### **Install Dependencies**:

Install project dependencies using `npm`:

```bash
npm install
```

### **Set up Environment Variables**:

Create a `.env` file by copying from the example:

```bash
cp .env.example .env
```

Set the necessary environment variables in the `.env` file (e.g., database connection details, JWT secret).

### **Set up the Database**:

Configure the database as per your choice in `drizzle.config.ts`. Make sure to set up a **PostgreSQL** or **Neon Database** as the project uses **drizzle-orm**.

Run database migrations:

```bash
npm run migrate
```

---

## File Structure

```plaintext
.env                  # Environment variables
.env.example          # Example environment variables
.eslintrc.json        # ESLint configuration
.gitignore            # Git ignore file
.prettierrc           # Prettier configuration
drizzle.config.ts     # Database configuration (drizzle ORM)
jest.config.ts        # Jest testing configuration
nodemon.json          # Nodemon configuration for dev
package.json          # Project dependencies & scripts
tsconfig.json         # TypeScript configuration
.vscode/              # VSCode settings
  settings.json
src/                  # Source code
  app.ts              # Main entry point
  index.ts            # Server initialization
  api/                # API controllers & routes
    controllers/
      business.controller.ts
      user.controller.ts
    middleware/        # Custom middlewares
    routes/
      v1/
        index.ts
        user.routes.ts
  config/              # Configuration files (database, environment)
  db/                  # Database management (schema, migrations)
    migrations/        # SQL migrations
    schema/            # Database schemas
  services/            # Business logic (services)
    user.service.ts
  tests/               # Unit and integration tests
  types/               # TypeScript types
  utils/               # Utility functions (JWT, logging)
```

---

## Environment Setup

1. **Database Configuration**: Make sure the `.env` file is configured correctly, especially the database connection string and the JWT secret.

2. **Database Migrations**: Migrations are handled by **Drizzle ORM**. You can apply migrations using the following command:

   ```bash
   npm run migrate
   ```

3. **Security**: The JWT secret and other sensitive information are stored in the `.env` file.

---

## Running the Application

1. **Development Mode**:
   For running the application in development mode, use **Nodemon** for automatic reloading:

   ```bash
   npm run dev
   ```

2. **Production Mode**:
   Build the application first, then run the production version:

   ```bash
   npm run build
   npm start
   ```

---

## Testing

The application follows **Test-Driven Development (TDD)**. All tests are written using **Jest**, and **Supertest** is used for API testing.

### **Running Tests**:

1. **Unit & Integration Tests**:
   To run all tests:

   ```bash
   npm run test
   ```

2. **Test Coverage**:
   To see test coverage:

   ```bash
   npm run coverage
   ```

---

## Technologies

* **Node.js & Express**: For building the RESTful API.
* **TypeScript**: For type safety and better development experience.
* **Drizzle ORM**: ORM for interacting with the database (PostgreSQL/Neon).
* **JWT**: JSON Web Tokens for secure authentication.
* **bcrypt**: For password hashing and verification.
* **Zod**: For data validation.
* **Winston**: For logging system events.
* **Jest & Supertest**: For unit and integration testing.

---

## TDD Methodology

The development of Echo-Rwanda follows the **Test-Driven Development (TDD)** approach. This means that before implementing any feature, tests are written first to define the expected behavior of that feature. The cycle goes as follows:

1. **Write a Test**: A test case is created for the functionality that is about to be developed.
2. **Run Tests**: The test suite is run, which should fail as the feature is not yet implemented.
3. **Implement the Feature**: Code is written to pass the test.
4. **Refactor**: After passing the test, the code is refactored to improve quality, while ensuring the tests still pass.
5. **Repeat**: The process continues iteratively for each feature or change.

---

## Scripts

Here are the key scripts defined in the `package.json`:

* **`npm run start`**: Starts the application in production mode.
* **`npm run build`**: Compiles TypeScript files to JavaScript.
* **`npm run dev`**: Starts the application in development mode with automatic reloading (using `nodemon`).
* **`npm run migrate`**: Runs database migrations with **Drizzle ORM**.
* **`npm run generate`**: Generates database entities based on the schema.
* **`npm run test`**: Runs the Jest test suite for unit and integration tests.
* **`npm run lint`**: Lints the source code using **ESLint**.

---

## API Overview

**Authentication**:

* `/api/register`: Register a new user.
* `/api/login`: Log in and receive a JWT token.
* `/api/logout`: Log out the current session.

**Client Features**:

* `/api/trips`: Get available trips.
* `/api/bookings`: Manage trip bookings.
* `/api/custom-trips`: Submit and view custom trip requests.

**Agent Features**:

* `/api/agent/trips`: Create and manage agent trips.
* `/api/agent/performance`: View agent performance and booking stats.

**Admin Features**:

* `/api/admin/users`: Manage users (suspend, approve, delete).
* `/api/admin/trips`: Manage trips (edit, approve, delete).

