/**
 * Universal logging wrapper for database scripts
 * Executes a script and pipes output to both console and log file
 */
import { spawn } from 'child_process';
import { createWriteStream, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get script path from arguments
const scriptPath = process.argv[2];
const scriptArgs = process.argv.slice(3);

if (!scriptPath) {
    console.error('Usage: tsx run-with-logging.ts <script-path> [...args]');
    process.exit(1);
}

// Generate log file name
const scriptName = scriptPath.split('/').pop()?.replace('.ts', '') || 'unknown';
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '--');
const logDir = join(__dirname, '../..', 'logs');
const logFile = join(logDir, `${scriptName}_${timestamp}.log`);

// Ensure logs directory exists
mkdirSync(logDir, { recursive: true });

// Create write stream for log file
const logStream = createWriteStream(logFile, { flags: 'a' });

console.log(`📝 Logging to: ${logFile}\n`);
logStream.write(`=== ${scriptName} - ${new Date().toISOString()} ===\n\n`);

// Spawn the script
const child = spawn('tsx', [scriptPath, ...scriptArgs], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
});

// Pipe stdout to both console and log file
child.stdout?.on('data', (data) => {
    process.stdout.write(data);
    logStream.write(data);
});

// Pipe stderr to both console and log file
child.stderr?.on('data', (data) => {
    process.stderr.write(data);
    logStream.write(data);
});

// Handle exit
child.on('close', (code) => {
    logStream.write(`\n=== Exit code: ${code} ===\n`);
    logStream.end();
    console.log(`\n✅ Log saved to: ${logFile}`);
    process.exit(code || 0);
});
