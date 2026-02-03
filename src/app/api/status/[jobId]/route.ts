import { NextResponse } from 'next/server';
import { getJob } from '@/lib/server';
import type { JobStatusResponse } from '@/lib/server';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * Get the status of a processing job
 * GET /api/status/[jobId]
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<Response> {
  try {
    const { jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    const job = await getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    const response: JobStatusResponse = {
      id: job.id,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      currentSegment: job.currentSegment,
      totalSegments: job.totalSegments,
      message: job.message,
      error: job.error,
      outputUrl: job.outputUrl,
      captions: job.captions,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}
