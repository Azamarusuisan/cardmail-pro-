import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processCardHandler } from './processors/ocrAndSend.js';

dotenv.config();

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Create worker
const worker = new Worker(
  'card-processing',
  async (job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    
    switch (job.name) {
      case 'processCard':
        return await processCardHandler(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: 4, // Process up to 4 jobs in parallel
    limiter: {
      max: 10,
      duration: 1000 // Max 10 jobs per second
    }
  }
);

// Worker event handlers
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await worker.close();
  connection.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  await worker.close();
  connection.disconnect();
  process.exit(0);
});

console.log('Worker started and waiting for jobs...');