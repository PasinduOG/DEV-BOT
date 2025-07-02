import fs from 'fs';
import path from 'path';

/**
 * Emergency Bad MAC Error Fixer
 * This script aggressively clears all session files to fix Bad MAC errors
 */

console.log('🚨 Emergency Bad MAC Error Fixer');
console.log('This will clear all session files to fix cryptographic errors.\n');

const authPath = path.join(process.cwd(), 'auth');

if (!fs.existsSync(authPath)) {
    console.log('❌ No auth directory found. Nothing to clean.');
    process.exit(0);
}

try {
    const files = fs.readdirSync(authPath);
    let clearedCount = 0;
    let preservedFiles = [];
    
    console.log('📋 Found files in auth directory:');
    files.forEach(file => console.log(`   - ${file}`));
    console.log('');
    
    files.forEach(file => {
        // Preserve only the essential credentials file
        if (file === 'creds.json') {
            preservedFiles.push(file);
            console.log(`✅ Preserving: ${file}`);
            return;
        }
        
        // Clear all session-related files aggressively
        if (file.includes('session-') || 
            file.includes('sender-key-') || 
            file.includes('app-state-') ||
            file.includes('pre-key-') ||
            file.includes('sender-key-memory')) {
            
            const filePath = path.join(authPath, file);
            try {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Cleared: ${file}`);
                clearedCount++;
            } catch (err) {
                console.log(`⚠️ Could not delete ${file}:`, err.message);
            }
        } else {
            preservedFiles.push(file);
            console.log(`✅ Preserving: ${file}`);
        }
    });
    
    console.log('\n📊 Summary:');
    console.log(`   - Files cleared: ${clearedCount}`);
    console.log(`   - Files preserved: ${preservedFiles.length}`);
    console.log(`   - Preserved files: ${preservedFiles.join(', ')}`);
    
    if (clearedCount > 0) {
        console.log('\n✅ Bad MAC fix completed successfully!');
        console.log('🔄 You can now restart the bot with: npm start');
        console.log('📱 You may need to scan the QR code again.');
    } else {
        console.log('\n💡 No session files found to clear.');
        console.log('   This might not be a session file issue.');
    }
    
} catch (error) {
    console.error('❌ Error during Bad MAC fix:', error.message);
    process.exit(1);
}
