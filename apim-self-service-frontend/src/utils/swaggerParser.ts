/**
 * ------------------------------------------------------------------
 * 📍 Utility: OpenAPI/Swagger Parser
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Structural analysis of OpenAPI (3.0+) and Swagger (2.0) documents.
 * - Map operations to a flat array for the 'Operation Explorer' UI.
 * - Normalize complex paths/methods for policy targeting.
 * 
 * 🧩 DATA STRUCTURES:
 * - `ApiOperation`: The normalized internal model for an API endpoint.
 * ------------------------------------------------------------------
 */
import yaml from 'js-yaml';

export interface ApiOperation {
    id: string; // Unique key: "METHOD:/path"
    method: string; // GET, POST, etc.
    path: string; // /users/{id}
    summary?: string;
    description?: string;
    operationId?: string;
    tags?: string[];
}

export const parseSwaggerOperations = async (specContent: string): Promise<ApiOperation[]> => {
    console.log("SwaggerParser: Received content type:", typeof specContent);
    if (!specContent) {
        console.warn("SwaggerParser: Empty content");
        return [];
    }

    try {
        // 1. Detect format & parse
        let spec: any;
        console.log("SwaggerParser: First char:", specContent.trim().charAt(0));

        if (specContent.trim().startsWith('{')) {
            spec = JSON.parse(specContent);
            console.log("SwaggerParser: Parsed as JSON");
        } else {
            spec = yaml.load(specContent);
            console.log("SwaggerParser: Parsed as YAML");
        }

        if (!spec || !spec.paths) {
            console.error("SwaggerParser: Invalid spec structure. Paths missing.", spec ? Object.keys(spec) : "null");
            return [];
        }

        const operations: ApiOperation[] = [];

        // 2. Iterate paths
        for (const [path, methods] of Object.entries(spec.paths)) {
            if (typeof methods !== 'object') continue;

            // 3. Iterate methods (get, post, put, delete, etc.)
            const validMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
            for (const [method, details] of Object.entries(methods as any)) {
                if (!validMethods.includes(method.toLowerCase())) continue;

                const opDetails = details as any;
                const upperMethod = method.toUpperCase();

                // 4. Construct Operation Object
                operations.push({
                    id: `${upperMethod}:${path}`,
                    method: upperMethod,
                    path: path,
                    summary: opDetails.summary || '',
                    description: opDetails.description || '',
                    operationId: opDetails.operationId,
                    tags: opDetails.tags || []
                });
            }
        }

        return operations;

    } catch (e) {
        console.error("Failed to parse Swagger spec:", e);
        return [];
    }
};
