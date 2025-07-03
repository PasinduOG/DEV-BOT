/**
 * MASTER-CHIEF FFmpeg Compatibility Test Script
 * 
 * This script tests if your FFmpeg installation is compatible with the animated sticker creation
 * features used in the MASTER-CHIEF bot. It attempts various FFmpeg commands with different
 * pad filter syntaxes to determine which one works on your system.
 * 
 * Usage:
 * node test-ffmpeg.js
 */

import { exec as execCallback } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// Convert exec to Promise-based
const exec = promisify(execCallback);
// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to get ffmpeg path from ffmpeg-static if available
let ffmpegPath = 'ffmpeg';
try {
    const ffmpegStatic = await import('ffmpeg-static');
    ffmpegPath = ffmpegStatic.default || ffmpegStatic;
    console.log(`Using FFmpeg from ffmpeg-static: ${ffmpegPath}`);
} catch (e) {
    console.log('ffmpeg-static not found, using system FFmpeg:', e.message);
}

// Create a temp directory for test outputs
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Different filter syntaxes to test
const filterSyntaxOptions = [
    { name: "Current implementation - Full size stickers", 
      syntax: "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,setsar=1" },
    { name: "Simple scale and pad (no color)", 
      syntax: "scale='if(gt(iw,ih),512,-1)':'if(gt(ih,iw),512,-1)',pad=512:512:(512-iw)/2:(512-ih)/2" },
    { name: "Simple scale and pad (with black)", 
      syntax: "scale='if(gt(iw,ih),512,-1)':'if(gt(ih,iw),512,-1)',pad=512:512:(512-iw)/2:(512-ih)/2:color=black" },
    { name: "Force aspect ratio and crop (decrease)", 
      syntax: "scale=512:512:force_original_aspect_ratio=decrease,crop=512:512" },
    { name: "Legacy math expressions", 
      syntax: "scale=iw*min(512/iw,512/ih):ih*min(512/iw,512/ih),pad=512:512:(512-iw*min(512/iw,512/ih))/2:(512-ih*min(512/iw,512/ih))/2" }
];

async function testFFmpeg() {
    // First, check if FFmpeg is available
    try {
        const { stdout } = await exec(`"${ffmpegPath}" -version`);
        console.log(`FFmpeg detected!\n${stdout.split('\n')[0]}`);
    } catch (e) {
        console.error("❌ FFmpeg not found or not working. Please install FFmpeg.");
        console.error(e.message);
        return;
    }

    // Test each filter syntax
    console.log('\n🧪 Testing different scale and pad filter syntaxes...');
    
    for (const option of filterSyntaxOptions) {
        const testOutput = path.join(tempDir, `test-${option.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.webp`);
        
        // Create a simple test command with the current syntax
        const testCommand = `"${ffmpegPath}" -y -f lavfi -i color=s=256x128:d=1 -vf "${option.syntax}" -t 1 "${testOutput}"`;
        
        console.log(`\n🔍 Testing: ${option.name}`);
        console.log(`   Command: ${testCommand}`);
        
        try {
            const { stderr } = await exec(testCommand);
            
            if (fs.existsSync(testOutput) && fs.statSync(testOutput).size > 0) {
                console.log(`✅ SUCCESS: "${option.name}" syntax works on your system!`);
                console.log(`   Output file: ${testOutput}`);
            } else {
                console.log(`❌ FAILED: "${option.name}" syntax didn't produce output`);
                if (stderr) {
                    console.log(`   Error details: ${stderr.split('\n')[0]}`);
                }
            }
        } catch (e) {
            console.log(`❌ FAILED: "${option.name}" syntax threw an error`);
            console.log(`   Error details: ${e.message.split('\n')[0]}`);
        }
    }

    console.log('\n🧪 Testing animated WebP creation...');
    
    // Test animated WebP creation (most crucial for stickers)
    const animTestOutput = path.join(tempDir, 'test-animated.webp');
    const animCommand = `"${ffmpegPath}" -y -f lavfi -i color=s=512x512:d=3 -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,setsar=1,fps=12" -vcodec webp -lossless 0 -q:v 50 -compression_level 6 -loop 0 -fps_mode vfr -t 3 "${animTestOutput}"`;
    
    try {
        console.log(`Command: ${animCommand}`);
        const { stderr } = await exec(animCommand);
        
        if (fs.existsSync(animTestOutput) && fs.statSync(animTestOutput).size > 0) {
            console.log('✅ SUCCESS: Animated WebP creation works on your system!');
            console.log(`   Output file: ${animTestOutput}`);
        } else {
            console.log('❌ FAILED: Animated WebP creation failed');
            if (stderr) {
                console.log(`   Error details: ${stderr.split('\n')[0]}`);
            }
        }
    } catch (e) {
        console.log('❌ FAILED: Animated WebP creation threw an error');
        console.log(`   Error details: ${e.message.split('\n')[0]}`);
    }

    console.log('\n📋 Summary:');
    console.log('If any of the tests succeeded, your FFmpeg installation can create animated stickers.');
    console.log('The MASTER-CHIEF bot will automatically try different approaches if one fails.');
    console.log('\nRecommendation:');
    console.log('1. If "Simple scale and pad (no color)" worked, the bot should now work correctly with the latest update.');
    console.log('2. If that failed but other tests worked, please report which syntax works for you.');
    console.log('3. If no tests worked, consider updating your FFmpeg installation.');
}

testFFmpeg().catch(console.error);
