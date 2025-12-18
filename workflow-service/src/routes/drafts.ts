import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../index";

interface DraftBody {
    spec: string; // The OpenAPI content (YAML/JSON)
    apiTitle?: string;
}

export default async function draftsRoutes(fastify: FastifyInstance) {

    const STORAGE_PATH = process.env.STORAGE_PATH || "./storage";

    // Ensure storage directory exists at startup
    try {
        await fs.mkdir(STORAGE_PATH, { recursive: true });
    } catch (err) {
        console.error(`Failed to ensure storage path: ${STORAGE_PATH}`, err);
    }

    // Helper to get user ID from JWT
    const getUserId = (request: FastifyRequest): string => {
        const user = request.user as { oid?: string, sub?: string };
        // Azure AD uses 'oid' for Object ID, fall back to 'sub'
        return user.oid || user.sub || "unknown-user";
    };

    // POST /api/v1/drafts
    fastify.post("/api/v1/drafts", {
        preValidation: [fastify.authenticate]
    }, async (request: FastifyRequest<{ Body: DraftBody }>, reply: FastifyReply) => {
        const userId = getUserId(request);
        const { spec, apiTitle } = request.body;

        if (!spec) {
            return reply.status(400).send({ error: "Spec content is required" });
        }

        const userStoragePath = path.join(STORAGE_PATH, userId);

        try {
            // 1. Ensure user directory exists
            await fs.mkdir(userStoragePath, { recursive: true });

            // 2. Write spec to file (overwrite)
            const filePath = path.join(userStoragePath, "draft.yaml");
            await fs.writeFile(filePath, spec, "utf-8");

            // 3. Update or Create Request record in DB
            // We assume one active draft per user for now, or just track the latest
            // For MVP2, let's find an existing 'draft' status request or create one.

            let requestRecord = await prisma.request.findFirst({
                where: { userId, status: "draft" }
            });

            if (requestRecord) {
                requestRecord = await prisma.request.update({
                    where: { id: requestRecord.id },
                    data: {
                        apiTitle: apiTitle || requestRecord.apiTitle,
                        updatedAt: new Date()
                    }
                });
            } else {
                // Create user if not exists (lazy creation on first draft)
                const userEmail = (request.user as any).preferred_username || (request.user as any).email || "unknown";
                const userName = (request.user as any).name || "Unknown";

                await prisma.user.upsert({
                    where: { id: userId },
                    update: {},
                    create: { id: userId, email: userEmail, name: userName }
                });

                requestRecord = await prisma.request.create({
                    data: {
                        userId,
                        apiTitle: apiTitle || "Untitled API",
                        specBlobUrl: filePath, // Storing local path for now as 'URL'
                        status: "draft"
                    }
                });
            }

            return reply.send({ success: true, requestId: requestRecord.id });

        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: "Failed to save draft" });
        }
    });

    // GET /api/v1/drafts/latest
    fastify.get("/api/v1/drafts/latest", {
        preValidation: [fastify.authenticate]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = getUserId(request);
        const userStoragePath = path.join(STORAGE_PATH, userId);
        const filePath = path.join(userStoragePath, "draft.yaml");

        try {
            // Check if file exists
            await fs.access(filePath);

            // Read file
            const spec = await fs.readFile(filePath, "utf-8");

            // Get DB metadata
            const requestRecord = await prisma.request.findFirst({
                where: { userId, status: "draft" }
            });

            return reply.send({
                spec,
                apiTitle: requestRecord?.apiTitle || "Untitled API",
                updatedAt: requestRecord?.updatedAt
            });

        } catch (err) {
            // If file doesn't exist, return 404 or empty
            return reply.status(404).send({ error: "No draft found" });
        }
    });
}
