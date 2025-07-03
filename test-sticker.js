/**
 * MASTER-CHIEF Sticker Creation Test
 * 
 * This script creates a test video and tries to convert it to an animated sticker
 * to verify that the animated sticker creation works correctly.
 */

// Since createAnimatedSticker isn't exported, we need to use a simplified version of the function
import fs from 'fs';
import path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import ffmpegStatic from 'ffmpeg-static';

const exec = promisify(execCallback);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define a simplified version of the animated sticker creation function
async function createTestAnimatedSticker(videoBuffer) {
    // Import necessary modules
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);
    const path = await import('path');
    
    // Import ffmpeg-static
    const ffmpegStatic = await import('ffmpeg-static');
    const ffmpegPath = ffmpegStatic.default || ffmpegStatic;
    
    console.log('🔧 Using FFmpeg from path:', ffmpegPath);
    
    // Create temporary directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    
    // Create temporary file paths
    const tempInputPath = path.join(tempDir, `input-${Date.now()}.mp4`);
    const tempOutputPath = path.join(tempDir, `output-${Date.now()}.webp`);
    
    // Write buffer to temporary file
    fs.writeFileSync(tempInputPath, videoBuffer);
    
    console.log(`📁 Saved input video to temporary file: ${tempInputPath}`);
    
    // Use our updated filter that ensures full-size stickers but with optimized size
    console.log('🎬 Converting to animated sticker with optimized size...');
    // WhatsApp sticker size limits: max 500KB for animated stickers
    // Strategies to reduce size:
    // 1. Lower quality (-q:v 50 instead of 80)
    // 2. Limit framerate to 12fps (fps=12)
    // 3. Disable lossless compression (-lossless 0)
    // 4. Add additional compression options (-compression_level 6)
    const ffmpegCommand = `"${ffmpegPath}" -y -i "${tempInputPath}" -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,setsar=1,fps=12" -vcodec webp -lossless 0 -q:v 50 -loop 0 -compression_level 6 -an -fps_mode vfr -t 3 "${tempOutputPath}"`;
    
    console.log('🎬 Running ffmpeg command:', ffmpegCommand);
    
    try {
        const { stdout, stderr } = await execPromise(ffmpegCommand);
        if (stderr) {
            console.log('⚠️ FFmpeg stderr (not necessarily an error):', stderr);
        }
        
        // Verify the output file exists and has content
        if (fs.existsSync(tempOutputPath) && fs.statSync(tempOutputPath).size > 0) {
            // Read the output file
            const stickerBuffer = fs.readFileSync(tempOutputPath);
            
            // Clean up temporary files
            try {
                fs.unlinkSync(tempInputPath);
                fs.unlinkSync(tempOutputPath);
            } catch (e) {
                console.log('⚠️ Cleanup warning:', e.message);
            }
            
            console.log(`✅ Animated sticker created successfully, size: ${stickerBuffer.length} bytes`);
            return stickerBuffer;
        } else {
            throw new Error('Failed to create animated sticker - output file is missing or empty');
        }
    } catch (error) {
        console.error('❌ Error details:', error);
        throw new Error(`FFmpeg processing failed: ${error.message}`);
    }
}

async function runTest() {
    try {
        const testFile = path.join(__dirname, 'test.mp4');
        const ffmpegPath = ffmpegStatic;
        
        // Create a test video if it doesn't exist
        if (!fs.existsSync(testFile)) {
            console.log('Creating test video...');
            await exec(`"${ffmpegPath}" -y -f lavfi -i testsrc=duration=3:size=320x240:rate=15 "${testFile}"`);
        }
        
        console.log('Reading test video...');
        const buffer = fs.readFileSync(testFile);
        
        console.log('Creating sticker...');
        const stickerBuffer = await createTestAnimatedSticker(buffer);
        
        const outputPath = path.join(__dirname, 'sticker-test.webp');
        fs.writeFileSync(outputPath, stickerBuffer);
        
        console.log(`✅ Sticker created and saved to: ${outputPath}`);
    } catch (e) {
        console.error('❌ Error:', e);
    }
}

runTest();
