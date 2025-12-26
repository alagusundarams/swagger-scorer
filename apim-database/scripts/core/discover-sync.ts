/**
 * @fileoverview Orchestrator for the APIM Discovery & Sync process.
 * 
 * This script runs the three discovery parts in sequence and ensures
 * that arguments (like --env=DEV) are passed to each phase.
 */

import { spawn } from 'child_process';
import { join } from 'path';

const args = process.argv.slice(2);

async function runScript(scriptPath: string) {
    return new Promise((resolve, reject) => {
        console.log(`\n---------------------------------------------------------`);
        console.log(`🏃 Running: ${scriptPath} ${args.join(' ')}`);
        console.log(`---------------------------------------------------------\n`);

        const child = spawn('npx', ['tsx', scriptPath, ...args], {
            stdio: 'inherit',
            shell: true
        });

        child.on('exit', (code) => {
            if (code === 0) resolve(true);
            else reject(new Error(`Script ${scriptPath} failed with code ${code}`));
        });
    });
}

async function main() {
    try {
        await runScript('scripts/core/extract-apim-inventory.ts');
        await runScript('scripts/core/extract-ado-metadata.ts');
        await runScript('scripts/core/reconcile-governance.ts');

        console.log(`\n✅ [COMPLETE] All discovery and sync phases finished successfully.`);
    } catch (err) {
        console.error(`\n💥 [FAILED] Sync orchestration aborted:`, (err as Error).message);
        process.exit(1);
    }
}

main();
