# Image Response Update

## Changes Made

The MASTER-CHIEF bot has been updated to use image responses instead of video responses for:

1. **Invalid Commands**: When users send unrecognized commands
2. **Bad Word Detection**: When inappropriate language is detected

## Technical Details

### Previous Implementation
- Used `src/hey.mp4` video file
- Sent video with caption messages
- MIME type: `video/mp4`

### New Implementation
- Uses `src/chief.jpg` image file
- Sends image with caption messages
- MIME type: `image/jpeg`

### Updated Files
- `index.js`: Changed video response logic to image response logic
- `README.md`: Updated all documentation references

### Benefits
- **Faster Loading**: Images load faster than videos
- **Lower Bandwidth**: Reduces data usage for users
- **Better Compatibility**: Images are more universally supported
- **Consistent Branding**: Uses the MASTER-CHIEF image theme

## File Structure
```
src/
├── chief.jpg       # New image for responses (active)
└── hey.mp4         # Previous video file (kept for reference)
```

## Response Behavior
- **Invalid Commands**: Sends `chief.jpg` with error message
- **Bad Words**: Sends `chief.jpg` with language warning
- **Fallback**: Text-only message if image sending fails

Both responses maintain the same messaging and mention functionality as before.
