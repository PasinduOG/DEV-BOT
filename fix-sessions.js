import fs from 'fs';
import path from 'path';

/**
 * Quick Session Fix Script
 * Use this when you see multiple "Skipping protocol/stub message" errors
 * or "Closing stale open session" messages
 */

console.log('🔧 Quick Session Fix Tool');
console.log('This will clear problematic session files while preserving credentials.\n');

const authPath = path.join(process.cwd(), 'auth');

if (!fs.existsSync(authPath)) {
    console.log('❌ No auth directory found. Nothing to fix.');
    process.exit(0);
}

try {
    const files = fs.readdirSync(authPath);
    let clearedCount = 0;
    let preservedFiles = [];
    
    console.log('📋 Analyzing auth files...');
    
    files.forEach(file => {
        // Preserve essential files
        if (file === 'creds.json') {
            preservedFiles.push(file);
            console.log(`✅ Preserving: ${file}`);
            return;
        }
        
        // Clear only problematic session files (keep some newer ones)
        if (file.includes('session-') && !file.includes('.0.json')) {
            const filePath = path.join(authPath, file);
            try {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Cleared problematic session: ${file}`);
                clearedCount++;
            } catch (err) {
                console.log(`⚠️ Could not delete ${file}:`, err.message);
            }
        }
        // Clear sender-key-memory files (often cause issues)
        else if (file.includes('sender-key-memory')) {
            const filePath = path.join(authPath, file);
            try {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Cleared memory file: ${file}`);
                clearedCount++;
            } catch (err) {
                console.log(`⚠️ Could not delete ${file}:`, err.message);
            }
        }
        // Keep other files but log them
        else {
            preservedFiles.push(file);
        }
    });
    
    console.log(`\n✅ Session fix completed!`);
    console.log(`🗑️ Cleared ${clearedCount} problematic files`);
    console.log(`✅ Preserved ${preservedFiles.length} essential files`);
    console.log('\n💡 You can now restart the bot with: npm start');
    
} catch (error) {
    console.error('❌ Error during session fix:', error.message);
    process.exit(1);
}
