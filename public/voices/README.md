# Piper TTS Voice Models

This folder should contain Piper TTS voice model files.

## Required Files

Download voice models from the Piper releases:
https://github.com/rhasspy/piper/releases

### Recommended Voices

1. **en_US-lessac-medium**
   - `en_US-lessac-medium.onnx`
   - `en_US-lessac-medium.onnx.json`

2. **en_US-amy-medium**
   - `en_US-amy-medium.onnx`
   - `en_US-amy-medium.onnx.json`

3. **en_US-ryan-medium**
   - `en_US-ryan-medium.onnx`
   - `en_US-ryan-medium.onnx.json`

4. **en_GB-alan-medium**
   - `en_GB-alan-medium.onnx`
   - `en_GB-alan-medium.onnx.json`

## File Sizes

Each voice model is approximately 40-80MB. Consider:
- Lazy loading (only load when needed)
- CDN hosting for production
- IndexedDB caching for repeat visitors

## Integration Notes

The current implementation uses a fallback TTS when Piper models aren't available.
To enable full Piper TTS:

1. Download the ONNX Runtime Web library
2. Download voice models to this folder
3. Update `src/lib/piper/client.ts` to load actual models

See: https://github.com/rhasspy/piper for documentation
