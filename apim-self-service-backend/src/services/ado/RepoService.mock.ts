/**
 * @fileoverview RepoService Mock
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

const WORKSPACE_DIR = 'apim-portal-workspace';

export class RepoServiceMock {
    private workspacePath: string;

    constructor(customPath?: string) {
        this.workspacePath = customPath || path.join(os.tmpdir(), WORKSPACE_DIR);
    }

    private ensureWorkspace() {
        if (!fs.existsSync(this.workspacePath)) {
            fs.mkdirSync(this.workspacePath, { recursive: true });
        }
    }

    async syncRepo(productId: string, _repoUrl: string): Promise<{ path: string, commitHash: string }> {
        const localPath = path.join(this.workspacePath, productId);
        console.log(`☁️ [MOCK_MODE] Simulating Git Sync for ${productId}...`);

        this.ensureWorkspace();
        if (!fs.existsSync(localPath)) {
            fs.mkdirSync(localPath, { recursive: true });
        }

        if (productId.includes('payment-v2')) {
            return { path: localPath, commitHash: 'a1b2c3d' };
        }
        return { path: localPath, commitHash: '0000000' };
    }
}
