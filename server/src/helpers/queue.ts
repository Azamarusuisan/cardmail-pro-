import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Create queue
export const cardProcessingQueue = new Queue('card-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      count: 100 // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 50 // Keep last 50 failed jobs
    }
  }
});

// Queue job types
export interface ProcessCardJob {
  image: string; // base64
  mimetype: string;
  userId: string;
  userEmail: string;
  accessToken: string;
}

// Add job to queue
export async function addToQueue(name: string, data: ProcessCardJob) {
  const job = await cardProcessingQueue.add(name, data, {
    priority: 1,
    delay: 0
  });
  
  return job;
}

// Get queue stats
export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    cardProcessingQueue.getWaitingCount(),
    cardProcessingQueue.getActiveCount(),
    cardProcessingQueue.getCompletedCount(),
    cardProcessingQueue.getFailedCount()
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed
  };
}

// Clean up on shutdown
export async function closeQueue() {
  await cardProcessingQueue.close();
  connection.disconnect();
}