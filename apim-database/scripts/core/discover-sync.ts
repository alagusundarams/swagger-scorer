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

// Setup log file
const logsDir = join(process.cwd(), 'apim-database', 'scripts', 'logs');
if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const envSuffix = args.find(a => a.startsWith('--env='))?.split('=')[1] || 'ALL';
const logFile = join(logsDir, `discover-sync_${envSuffix}_${timestamp}.log`);
const logStream = createWriteStream(logFile, { flags: 'a' });

// Dual logging helper
function log(message: string) {
    console.log(message);
    logStream.write(message + '\n');
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
    log(`📋 [DISCOVER-SYNC] Starting orchestrated sync...`);
    log(`🗂️  Log file: ${logFile}`);
    log(`🎯 Arguments: ${args.join(' ') || 'None (full sync)'}\n`);

    try {
        await runScript('scripts/core/extract-apim-inventory.ts');
        await runScript('scripts/core/extract-ado-metadata.ts');
        await runScript('scripts/core/reconcile-governance.ts');

        log(`\n✅ [COMPLETE] All discovery and sync phases finished successfully.`);
        log(`📄 Full log saved to: ${logFile}`);
    } catch (err) {
        log(`\n💥 [FAILED] Sync orchestration aborted: ${(err as Error).message}`);
        log(`📄 Error log saved to: ${logFile}`);
        process.exit(1);
    } finally {
        logStream.end();
    }
}

main();
