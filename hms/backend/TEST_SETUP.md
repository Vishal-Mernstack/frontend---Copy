# Comprehensive Test Suite Setup Guide

## Overview

This test suite implements the comprehensive testing specification for the Healthcare Management System (HMS). It covers authentication, patients, appointments, billing, middleware, and database integration tests using Jest and Supertest.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** database with a test database
3. **Test database** named `hms_test` (or configure via environment variables)

## Installation

The test dependencies are already installed:
- `jest` - Testing framework
- `supertest` - HTTP assertion library
- `@types/jest` - TypeScript definitions for Jest

## Environment Configuration

Create or update your `.env` file with test-specific variables:

```env
# Test Database Configuration
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=hms_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=your_password

# JWT Configuration for Testing
JWT_SECRET=test-secret-key-for-testing
JWT_EXPIRES_IN=1h

# Test Environment
NODE_ENV=test
```

## Test Database Setup

1. **Create test database:**
```sql
CREATE DATABASE hms_test;
```

2. **Run migrations/seeds:**
The test suite will automatically seed test data (admin, doctor, patient users) before running tests.

## Running Tests

### Run All Tests
```bash
npm test
# or
npm run test:all
```

### Run Specific Test Suites

```bash
# Authentication tests only
npm run test:auth

# Patient tests only
npm run test:patients

# Appointment tests only
npm run test:appointments

# Billing tests only
npm run test:billing

# Middleware tests only
npm run test:middleware

# Database integration tests only
npm run test:database
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Test Report
```bash
npm run test:report
```

## Test Structure

```
backend/
├── tests/
│   ├── setup.js              # Test database configuration and helpers
│   ├── auth.test.js          # Authentication tests
│   ├── patients.test.js      # Patient CRUD tests
│   ├── appointments.test.js  # Appointment CRUD tests
│   ├── billing.test.js       # Billing CRUD tests
│   ├── middleware.test.js    # Middleware layer tests
│   └── database.test.js      # Database integration tests
├── jest.config.js            # Jest configuration
└── run-tests.js              # Test execution script
```

## Test Coverage

### Authentication Tests (auth.test.js)
- ✅ Valid credential login (admin, doctor, patient)
- ✅ Missing field validation
- ✅ Wrong password handling
- ✅ Non-existent user handling
- ✅ SQL injection protection
- ✅ JWT integrity tests (tampered, expired, malformed)
- ✅ Global checks (Content-Type, error structure)

### Patient Tests (patients.test.js)
- ✅ List patients (admin, doctor roles)
- ✅ Empty result handling
- ✅ Response schema validation
- ✅ Unauthorized access prevention
- ✅ Create patient with validation
- ✅ Duplicate email handling
- ✅ Foreign key constraints

### Appointment Tests (appointments.test.js)
- ✅ Fetch all appointments
- ✅ Filter by patient ID and date range
- ✅ Create appointment with validation
- ✅ Referential integrity (patient/doctor FK)
- ✅ Invalid datetime format handling
- ✅ Role-based access control

### Billing Tests (billing.test.js)
- ✅ List billing records (admin, billing roles)
- ✅ Numeric type validation
- ✅ Create billing with validation
- ✅ Negative amount prevention
- ✅ Foreign key constraints
- ✅ Role-based access control

### Middleware Tests (middleware.test.js)
- ✅ Authentication middleware (valid/invalid tokens)
- ✅ Authorization middleware (role-based access)
- ✅ Schema validation middleware
- ✅ Rate limiting middleware
- ✅ CORS middleware

### Database Integration Tests (database.test.js)
- ✅ Relational integrity (FK constraints)
- ✅ CRUD end-to-end flows
- ✅ Concurrent request handling
- ✅ Database schema validation
- ✅ Cascade behavior testing

## Test Data

The test suite automatically seeds the following test users:

| Email | Password | Role |
|-------|----------|------|
| admin@test.com | Admin@123 | admin |
| doctor@test.com | Doc@123 | doctor |
| patient@test.com | Pat@123 | patient |

**Note:** Passwords are bcrypt-hashed in the database. The test setup uses a pre-computed hash for simplicity.

## Troubleshooting

### Database Connection Errors

If you see database connection errors:
1. Ensure PostgreSQL is running
2. Verify test database exists: `psql -l` to list databases
3. Check credentials in `.env` file
4. Ensure database user has proper permissions

### Port Already in Use

If the test server port is already in use:
1. Stop any running backend server
2. Or configure a different test port in environment variables

### Test Failures

If tests fail:
1. Check the test output for specific error messages
2. Verify database schema matches expectations
3. Ensure test data is properly seeded
4. Run individual test suites to isolate issues: `npm run test:auth`

## Continuous Integration

To integrate with CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    npm run test:coverage
```

## Coverage Goals

Target code coverage: ≥80% on controllers and middleware

Run `npm run test:coverage` to generate coverage reports.

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
