import fs from 'fs';
import path from 'path';

async function clearSessions() {
    try {
        console.log('🔧 Clearing WhatsApp sessions...');
        
        const authPath = path.join(process.cwd(), 'auth');
        
        if (!fs.existsSync(authPath)) {
            console.log('📁 Auth directory does not exist.');
            return;
        }
        
        const files = fs.readdirSync(authPath);
        let cleared = 0;
        
        files.forEach(file => {
            if (file.includes('session-') || 
                file.includes('sender-key-') || 
                file.includes('app-state-')) {
                const filePath = path.join(authPath, file);
                try {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Cleared: ${file}`);
                    cleared++;
                } catch (err) {
                    console.log(`⚠️ Could not delete ${file}:`, err.message);
                }
            }
        });
        
        if (cleared === 0) {
            console.log('✅ No session files found to clear.');
        } else {
            console.log(`✅ Cleared ${cleared} session files.`);
            console.log('💡 You can now restart the bot.');
        }
        
    } catch (error) {
        console.error('❌ Error clearing sessions:', error.message);
    }
}

clearSessions();
