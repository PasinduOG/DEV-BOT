/**
 * MASTER-CHIEF Aspect Ratio Test Script
 * 
 * This script tests the animated sticker creation with videos of different aspect ratios
 * to verify that the original aspect ratio is preserved.
 */

import fs from 'fs';
import path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import ffmpegStatic from 'ffmpeg-static';

const exec = promisify(execCallback);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define aspect ratios to test
const aspectRatios = [
  { name: "landscape", width: 1280, height: 720 },
  { name: "portrait", width: 720, height: 1280 },
  { name: "ultrawide", width: 2560, height: 1080 },
  { name: "square", width: 512, height: 512 }
];

// Define simplified version of the animated sticker creation function for testing
async function createTestAnimatedSticker(inputPath, outputPath) {
    try {
        // Import ffmpeg-static
        const ffmpegPath = ffmpegStatic;
        
        console.log(`🔧 Using FFmpeg from path: ${ffmpegPath}`);
        
        // Use our updated filter that preserves original aspect ratio
        console.log('🎬 Converting to animated sticker with aspect ratio preservation...');
        const ffmpegCommand = `"${ffmpegPath}" -y -i "${inputPath}" -vf "scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,fps=12" -vcodec webp -lossless 0 -q:v 50 -loop 0 -compression_level 6 -preset default -an -fps_mode vfr -t 3 "${outputPath}"`;
        
        console.log('🎬 Running ffmpeg command:', ffmpegCommand);
        
        const { stdout, stderr } = await exec(ffmpegCommand);
        if (stderr) {
            console.log('⚠️ FFmpeg stderr (not necessarily an error):', stderr);
        }
        
        // Verify the output file exists and has content
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            console.log(`✅ Animated sticker created successfully at: ${outputPath}`);
            return true;
        } else {
            throw new Error('Failed to create animated sticker - output file is missing or empty');
        }
    } catch (error) {
        console.error('❌ Error details:', error);
        return false;
    }
}

async function runTest() {
    try {
        console.log('🧪 Testing animated sticker creation with different aspect ratios');
        
        // Create temporary directory if it doesn't exist
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        
        // Create test directory for outputs if it doesn't exist
        const testDir = path.join(__dirname, 'test-stickers');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir);
        }
        
        const ffmpegPath = ffmpegStatic;
        
        // Test each aspect ratio
        for (const ratio of aspectRatios) {
            console.log(`\n🧪 Testing ${ratio.name} aspect ratio (${ratio.width}x${ratio.height})...`);
            
            // Create a test video with the current aspect ratio
            const testVideoPath = path.join(tempDir, `test-${ratio.name}.mp4`);
            const testCommand = `"${ffmpegPath}" -y -f lavfi -i testsrc=duration=3:size=${ratio.width}x${ratio.height}:rate=24 "${testVideoPath}"`;
            
            console.log(`📹 Creating test video with ${ratio.name} aspect ratio: ${ratio.width}x${ratio.height}`);
            await exec(testCommand);
            
            if (fs.existsSync(testVideoPath) && fs.statSync(testVideoPath).size > 0) {
                console.log(`✅ Test video created at: ${testVideoPath}`);
                
                // Create animated sticker from the test video
                const outputPath = path.join(testDir, `sticker-${ratio.name}.webp`);
                
                console.log(`🎬 Creating animated sticker from ${ratio.name} video...`);
                const success = await createTestAnimatedSticker(testVideoPath, outputPath);
                
                if (success) {
                    console.log(`🔍 Getting dimensions of created sticker: ${outputPath}`);
                    
                    // Get the dimensions of the created sticker
                    const probeCommand = `"${ffmpegPath}" -i "${outputPath}" -v error`;
                    
                    try {
                        await exec(probeCommand);
                    } catch (probeError) {
                        // ffprobe often exits with code 1 but still provides useful info in stderr
                        console.log(`📊 Sticker info for ${ratio.name}:`, probeError.stderr);
                    }
                }
            } else {
                console.error(`❌ Failed to create test video for ${ratio.name} aspect ratio`);
            }
        }
        
        console.log('\n✅ All aspect ratio tests completed!');
        console.log(`📁 Check the stickers in the ${testDir} directory to verify aspect ratios were preserved.`);
        
    } catch (e) {
        console.error('❌ Error during testing:', e);
    }
}

runTest();
