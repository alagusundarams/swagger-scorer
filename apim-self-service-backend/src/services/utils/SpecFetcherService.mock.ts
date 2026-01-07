/**
 * @fileoverview Spec Fetcher Mock
 * 
 * Provides stubbed OpenAPI specifications for testing.
 * Kept separate from real service to avoid polluting production-ready code.
 */

export async function fetchFileFromGitApi(repoUrl: string, filePath: string = 'openapi.yaml'): Promise<string> {
    console.log(`☁️ [MOCK_MODE] Fetching file ${filePath} from Git Repo ${repoUrl}...`);
    return `openapi: 3.0.0
info:
  title: Mocked Git API (${repoUrl})
  version: 1.0.0
paths:
  /git-endpoint:
    get:
      summary: This is a mocked endpoint from Git
      responses:
        '200':
          description: OK
`;
}

export async function fetchSpecFromAPIM(productId: string): Promise<string> {
    console.log(`☁️ [MOCK_MODE] Exporting Spec from APIM for Product ${productId}...`);
    return `openapi: 3.0.0
info:
  title: Mocked APIM API (${productId})
  version: 1.0.0
paths:
  /apim-endpoint:
    get:
      summary: This is a mocked endpoint from APIM
      responses:
        '200':
          description: OK
`;
}

export async function fetchSpecForProduct(productId: string): Promise<string> {
    console.log(`☁️ [MOCK_MODE] Fetching Spec for Product ${productId}...`);
    return fetchSpecFromAPIM(productId);
}
