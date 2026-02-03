/**
 * Job store for tracking processing jobs
 * Uses Upstash Redis in production, in-memory Map for development
 */

import { Redis } from '@upstash/redis';
import type { ProcessingJob, JobStatus, ProcessingStage } from './types';

// In-memory store for development
const memoryStore = new Map<string, ProcessingJob>();

// Redis client (lazy initialized)
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (url && token) {
    redis = new Redis({ url, token });
    return redis;
  }
  
  return null;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' && getRedis() !== null;
}

/**
 * Create a new processing job
 */
export async function createJob(job: ProcessingJob): Promise<void> {
  if (isProduction()) {
    const client = getRedis()!;
    await client.set(`job:${job.id}`, JSON.stringify(job), { ex: 86400 }); // 24h TTL
  } else {
    memoryStore.set(job.id, job);
    console.log(`[JobStore] Created job ${job.id} (in-memory)`);
  }
}

/**
 * Get a job by ID
 */
export async function getJob(jobId: string): Promise<ProcessingJob | null> {
  if (isProduction()) {
    const client = getRedis()!;
    const data = await client.get(`job:${jobId}`);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data as ProcessingJob;
  } else {
    return memoryStore.get(jobId) || null;
  }
}

/**
 * Update job status and progress
 */
export async function updateJob(
  jobId: string,
  updates: Partial<Pick<ProcessingJob, 
    'status' | 'stage' | 'progress' | 'currentSegment' | 'message' | 
    'error' | 'outputUrl' | 'captions' | 'completedAt'
  >>
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  
  const updatedJob: ProcessingJob = {
    ...job,
    ...updates,
    updatedAt: Date.now(),
  };
  
  if (isProduction()) {
    const client = getRedis()!;
    await client.set(`job:${job.id}`, JSON.stringify(updatedJob), { ex: 86400 });
  } else {
    memoryStore.set(jobId, updatedJob);
    console.log(`[JobStore] Updated job ${jobId}: ${updates.stage || job.stage} - ${updates.message || job.message}`);
  }
}

/**
 * Update job progress helper
 */
export async function updateJobProgress(
  jobId: string,
  stage: ProcessingStage,
  progress: number,
  message: string,
  currentSegment?: number
): Promise<void> {
  await updateJob(jobId, {
    stage,
    progress,
    message,
    currentSegment,
    status: stage === 'complete' ? 'complete' : stage === 'error' ? 'error' : 'processing',
  });
}

/**
 * Mark job as complete
 */
export async function completeJob(
  jobId: string,
  outputUrl: string,
  captions?: ProcessingJob['captions']
): Promise<void> {
  await updateJob(jobId, {
    status: 'complete',
    stage: 'complete',
    progress: 100,
    message: 'Processing complete',
    outputUrl,
    captions,
    completedAt: Date.now(),
  });
}

/**
 * Mark job as failed
 */
export async function failJob(jobId: string, error: string): Promise<void> {
  await updateJob(jobId, {
    status: 'error',
    stage: 'error',
    message: 'Processing failed',
    error,
  });
}

/**
 * Delete a job
 */
export async function deleteJob(jobId: string): Promise<void> {
  if (isProduction()) {
    const client = getRedis()!;
    await client.del(`job:${jobId}`);
  } else {
    memoryStore.delete(jobId);
  }
}
