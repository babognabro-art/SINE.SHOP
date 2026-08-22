const fs = require('fs');
const path = require('path');

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const currentLevel = process.env.LOG_LEVEL || 'info';

const log = (level, ...args) => {
    if (logLevels[level] > logLevels[currentLevel]) return;
    
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    // Console
    const colors = {
        error: '\x1b[31m',
        warn: '\x1b[33m',
        info: '\x1b[36m',
        debug: '\x1b[32m'
    };
    console.log(`${colors[level] || ''}${logMessage}\x1b[0m`);
    
    // Fichier
    try {
        fs.appendFileSync(
            path.join(logsDir, `${level}.log`),
            logMessage
        );
        fs.appendFileSync(
            path.join(logsDir, 'all.log'),
            logMessage
        );
    } catch (error) {
        // Ignorer les erreurs d'écriture
    }
};

module.exports = {
    error: (...args) => log('error', ...args),
    warn: (...args) => log('warn', ...args),
    info: (...args) => log('info', ...args),
    debug: (...args) => log('debug', ...args),
    log
};