# ShortShorts - AI Video Shorts Creator

Create engaging YouTube Shorts from long-form educational videos with AI-powered TTS and smart cropping. Powered by **Vercel Fluid Compute** for fast, reliable server-side processing.

## Features

- **Script-Based Editing**: Import Gemini-generated scripts with timestamps
- **AI Text-to-Speech**: Generate professional voiceovers using Piper TTS
- **Smart Cropping**: Automatic face detection and 9:16 cropping with MediaPipe
- **Background Music**: Choose from 12 royalty-free tracks
- **Word-by-Word Captions**: Animated caption highlighting
- **Server-Side Processing**: Fast video processing with Vercel Fluid Compute
- **Background Jobs**: Processing continues even if you close the browser

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to start creating shorts.

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Vercel Blob Storage (required for uploads)
BLOB_READ_WRITE_TOKEN=your_token_here

# Upstash Redis (optional - for production job tracking)
UPSTASH_REDIS_REST_URL=your_url_here
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**Note**: In development without Redis, job tracking uses in-memory storage.

## Workflow

1. **Upload**: Add your source video and paste your script
2. **Configure**: Select voice, music, and caption options
3. **Process**: Generate TTS, extract clips, apply smart cropping
4. **Preview**: Review your short and export

## Script Format

Import scripts in this 3-column format:

```
Time | Script/Voiceover | [Source Timestamp] (Description)
00:00 | Your opening hook text here | [23:23] (Scene description)
00:06 | More narration content | [24:02] (Another scene)
```

## Tech Stack

- **Next.js 16** - React framework with App Router
- **Vercel Fluid Compute** - Server-side processing with background jobs
- **Vercel Blob** - Video file storage
- **Upstash Redis** - Job status tracking
- **FFmpeg.wasm** - Video processing (runs on server)
- **Piper TTS** - Neural text-to-speech
- **MediaPipe** - Face detection for smart cropping
- **Tailwind CSS** - Styling
- **Zustand** - State management

## Output Specifications

- **Dimensions**: 720 x 1280 (9:16 aspect ratio)
- **Format**: MP4 (H.264 video, AAC audio)
- **Duration**: Optimized for 45-75 seconds

## Setup Music & Voice Assets

### Music (public/music/)

Download royalty-free tracks from:
- [Pixabay Music](https://pixabay.com/music/)
- [Free Music Archive](https://freemusicarchive.org/)

See `public/music/README.md` for required files.

### Voices (public/voices/)

Download Piper TTS models from:
- [Piper Releases](https://github.com/rhasspy/piper/releases)

See `public/voices/README.md` for required files.

## Browser Requirements

- Chrome 89+ or Edge 89+ (for SharedArrayBuffer support)
- 4GB+ RAM recommended for video processing
- WebGL support (for MediaPipe)

## Deployment

Optimized for Vercel deployment with Fluid Compute enabled.

```bash
# Build and deploy
npm run build
vercel deploy

# Or link to Vercel and deploy
vercel link
vercel deploy --prod
```

### Setting Up Vercel Services

1. **Add Vercel Blob Storage**:
   - Go to your Vercel project dashboard
   - Navigate to Storage > Create Database > Blob
   - The `BLOB_READ_WRITE_TOKEN` will be automatically added

2. **Add Upstash Redis** (recommended for production):
   - Go to Vercel Marketplace > Upstash Redis
   - Create a new database
   - Link it to your project

3. **Enable Fluid Compute** (automatic):
   - Fluid Compute is enabled via `vercel.json`
   - No additional configuration needed

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload video to Blob storage |
| `/api/process` | POST | Start processing job |
| `/api/status/[jobId]` | GET | Get job status |

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────┐
│   Browser       │────▶│  Vercel Fluid Compute        │
│   (Upload UI)   │     │  - /api/upload               │
└─────────────────┘     │  - /api/process (waitUntil)  │
                        │  - /api/status               │
                        └──────────────────────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        ▼                           ▼
               ┌─────────────────┐       ┌─────────────────┐
               │  Vercel Blob    │       │  Upstash Redis  │
               │  (Video Files)  │       │  (Job Status)   │
               └─────────────────┘       └─────────────────┘
```

## Privacy

Videos are uploaded to Vercel Blob storage for processing. Files are stored temporarily and can be deleted after processing is complete.

## License

MIT
