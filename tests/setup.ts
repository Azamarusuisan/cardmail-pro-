import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Global test setup
beforeAll(async () => {
  // Setup test database, redis, etc.
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test environment
  console.log('Cleaning up test environment...');
});

beforeEach(() => {
  // Reset state before each test
});

afterEach(() => {
  // Cleanup after each test
});