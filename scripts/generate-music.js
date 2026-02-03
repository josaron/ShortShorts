const fs = require('fs');
const path = require('path');

// Generate a simple WAV file with a sine wave
function generateWav(frequency, duration, sampleRate = 44100) {
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;
  
  const buffer = Buffer.alloc(fileSize);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);
  
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // audio format (PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  // Generate audio samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Mix multiple frequencies for a more pleasant sound
    const sample = (
      Math.sin(2 * Math.PI * frequency * t) * 0.3 +
      Math.sin(2 * Math.PI * frequency * 1.5 * t) * 0.2 +
      Math.sin(2 * Math.PI * frequency * 2 * t) * 0.1
    );
    
    // Apply envelope
    const envelope = Math.min(1, t * 2) * Math.min(1, (duration - t) * 2);
    const finalSample = sample * envelope * 0.3;
    
    // Convert to 16-bit integer
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(finalSample * 32767)));
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }
  
  return buffer;
}

// Generate tracks for each category
const tracks = [
  // Upbeat
  { name: 'upbeat-1.wav', frequency: 440, duration: 120 },
  { name: 'upbeat-2.wav', frequency: 523, duration: 90 },
  { name: 'upbeat-3.wav', frequency: 392, duration: 105 },
  // Calm
  { name: 'calm-1.wav', frequency: 220, duration: 150 },
  { name: 'calm-2.wav', frequency: 262, duration: 120 },
  { name: 'calm-3.wav', frequency: 196, duration: 135 },
  // Dramatic
  { name: 'dramatic-1.wav', frequency: 147, duration: 90 },
  { name: 'dramatic-2.wav', frequency: 165, duration: 105 },
  { name: 'dramatic-3.wav', frequency: 131, duration: 120 },
  // Mystery
  { name: 'mystery-1.wav', frequency: 185, duration: 110 },
  { name: 'mystery-2.wav', frequency: 175, duration: 95 },
  { name: 'mystery-3.wav', frequency: 156, duration: 100 },
];

const outputDir = path.join(__dirname, '..', 'public', 'music');

console.log('Generating placeholder audio files...');

for (const track of tracks) {
  console.log(`  Creating ${track.name}...`);
  const buffer = generateWav(track.frequency, track.duration);
  fs.writeFileSync(path.join(outputDir, track.name), buffer);
}

console.log('Done! Generated 12 placeholder audio files.');
console.log('Note: These are simple sine wave placeholders.');
console.log('Replace with actual royalty-free music for production.');
