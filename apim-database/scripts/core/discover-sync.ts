/**
 * @fileoverview Orchestrator for the APIM Discovery & Sync process.
 * 
 * This script runs the three discovery parts in sequence and ensures
 * that arguments (like --env=DEV) are passed to each phase.
 * All console output is captured to a timestamped log file.
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { createWriteStream, mkdirSync, existsSync } from 'fs';

const args = process.argv.slice(2);
console.log('DEBUG: discover-sync received args:', args);

// Setup log file
const cwd = process.cwd();
const logsDir = cwd.endsWith('apim-database')
    ? join(cwd, 'scripts', 'logs')
    : join(cwd, 'apim-database', 'scripts', 'logs');
if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

const timestamp = new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/[\\/,: ]/g, '-');
const envSuffix = args.find(a => a.startsWith('--env='))?.split('=')[1] || 'ALL';
const logFile = join(logsDir, `discover-sync_${envSuffix}_${timestamp}.log`);
const logStream = createWriteStream(logFile, { flags: 'a' });

// Dual logging helper with timestamp
function log(message: string) {
    const timestamp = new Date().toLocaleString('en-US', { hour12: false });
    const timestampedMsg = `[${timestamp}] ${message}`;
    console.log(timestampedMsg);
    logStream.write(timestampedMsg + '\n');
}

async function runScript(scriptPath: string) {
    return new Promise((resolve, reject) => {
        log(`\n---------------------------------------------------------`);
        log(`🏃 Running: ${scriptPath} ${args.join(' ')}`);
        log(`---------------------------------------------------------\n`);

        const child = spawn('npx', ['tsx', scriptPath, ...args], {
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: true
        });

        // Capture stdout and stderr to both console and file
        child.stdout?.on('data', (data) => {
            const text = data.toString();
            process.stdout.write(text);
            logStream.write(text);
        });

        child.stderr?.on('data', (data) => {
            const text = data.toString();
            process.stderr.write(text);
            logStream.write(`[STDERR] ${text}`);
        });

        child.on('exit', (code) => {
            if (code === 0) resolve(true);
            else reject(new Error(`Script ${scriptPath} failed with code ${code}`));
        });
    });
}

async function main() {
    const startTime = Date.now();
    const startDate = new Date().toLocaleString('en-US', { hour12: false });

    log(`📋 [DISCOVER-SYNC] Starting orchestrated sync...`);
    log(`🗂️  Log file: ${logFile}`);
    log(`🎯 Arguments: ${args.join(' ') || 'None (full sync)'}`);
    log(`⏰ Start time: ${startDate}\n`);

    try {
        await runScript('scripts/core/extract-apim-inventory.ts');
        await runScript('scripts/core/extract-ado-metadata.ts');
        await runScript('scripts/core/reconcile-governance.ts');

        const endTime = Date.now();
        const endDate = new Date().toLocaleString('en-US', { hour12: false });
        const durationMs = endTime - startTime;
        const durationSec = (durationMs / 1000).toFixed(2);
        const durationMin = (durationMs / 60000).toFixed(2);

        log(`\n✅ [COMPLETE] All discovery and sync phases finished successfully.`);
        log(`⏰ End time: ${endDate}`);
        log(`⏱️  Total duration: ${durationSec}s (${durationMin} minutes)`);

        // Generate comprehensive orphaned resources report
        log(`\n📊 Generating comprehensive orphaned resources report...`);
        await runScript('scripts/core/generate-orphaned-report.ts');

        log(`📄 Full log saved to: ${logFile}`);
    } catch (err) {
        const endTime = Date.now();
        const endDate = new Date().toLocaleString('en-US', { hour12: false });
        const durationMs = endTime - startTime;
        const durationSec = (durationMs / 1000).toFixed(2);

        log(`\n💥 [FAILED] Sync orchestration aborted: ${(err as Error).message}`);
        log(`⏰ Failed at: ${endDate}`);
        log(`⏱️  Time before failure: ${durationSec}s`);
        log(`📄 Error log saved to: ${logFile}`);
        process.exit(1);
    } finally {
        logStream.end();
    }
}

main();
