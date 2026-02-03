# ShortShorts - AI Video Shorts Creator

Create engaging YouTube Shorts from long-form educational videos with AI-powered TTS and smart cropping. All processing happens in your browser - your video never leaves your device.

## Features

- **Script-Based Editing**: Import Gemini-generated scripts with timestamps
- **AI Text-to-Speech**: Generate professional voiceovers using Piper TTS
- **Smart Cropping**: Automatic face detection and 9:16 cropping with MediaPipe
- **Background Music**: Choose from 12 royalty-free tracks
- **Word-by-Word Captions**: Animated caption highlighting
- **Client-Side Processing**: All video processing with FFmpeg.wasm

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to start creating shorts.

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

- **Next.js 14** - React framework with App Router
- **FFmpeg.wasm** - Client-side video processing
- **Piper TTS** - Neural text-to-speech (WASM)
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

Optimized for Vercel deployment. Required headers for SharedArrayBuffer are configured in `next.config.ts`.

```bash
npm run build
vercel deploy
```

## Privacy

All processing is 100% client-side. Your videos are never uploaded to any server.

## License

MIT
