import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Upload a video file to Vercel Blob storage
 * POST /api/upload
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: MP4, WebM, MOV, AVI' },
        { status: 400 }
      );
    }
    
    // Validate file size (500MB max)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 500MB' },
        { status: 400 }
      );
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `uploads/${timestamp}-${sanitizedName}`;
    
    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
    });
    
    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: file.size,
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

/**
 * Handle preflight requests
 */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
