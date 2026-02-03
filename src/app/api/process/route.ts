import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { v4 as uuidv4 } from 'uuid';
import { createJob } from '@/lib/server';
import { processVideo } from '@/lib/server/processor';
import type { ProcessingJob, CreateJobRequest } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * Start a new video processing job
 * POST /api/process
 * 
 * The processing runs in the background using waitUntil,
 * allowing the response to return immediately with the job ID.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as CreateJobRequest;
    
    // Validate required fields
    if (!body.videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl is required' },
        { status: 400 }
      );
    }
    
    if (!body.segments || body.segments.length === 0) {
      return NextResponse.json(
        { error: 'segments array is required and must not be empty' },
        { status: 400 }
      );
    }
    
    if (!body.voiceId) {
      return NextResponse.json(
        { error: 'voiceId is required' },
        { status: 400 }
      );
    }
    
    // Create job
    const jobId = uuidv4();
    const now = Date.now();
    
    const job: ProcessingJob = {
      id: jobId,
      status: 'pending',
      stage: 'queued',
      progress: 0,
      currentSegment: 0,
      totalSegments: body.segments.length,
      message: 'Job queued',
      
      videoUrl: body.videoUrl,
      segments: body.segments,
      voiceId: body.voiceId,
      musicUrl: body.musicUrl,
      musicVolume: body.musicVolume ?? 0.3,
      includeCaptions: body.includeCaptions ?? false,
      
      createdAt: now,
      updatedAt: now,
    };
    
    // Save job to store
    await createJob(job);
    
    // Start processing in the background
    // waitUntil allows the function to continue running after the response is sent
    waitUntil(processVideo(job));
    
    // Return immediately with job ID
    return NextResponse.json({
      jobId: job.id,
      status: 'pending',
      message: 'Processing started',
    });
    
  } catch (error) {
    console.error('Process API error:', error);
    return NextResponse.json(
      { error: 'Failed to start processing' },
      { status: 500 }
    );
  }
}

/**
 * Get processing capabilities info
 * GET /api/process
 */
export async function GET(): Promise<Response> {
  return NextResponse.json({
    maxDuration: 300,
    supportedFormats: ['mp4', 'webm', 'mov', 'avi'],
    maxFileSize: '500MB',
    features: [
      'smart-crop',
      'tts-synthesis',
      'background-music',
      'captions',
    ],
  });
}
