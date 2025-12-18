import Fastify from "fastify";
import cors from "@fastify/cors";
import authPlugin from "./plugins/auth";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

import draftsRoutes from "./routes/drafts";

const buildApp = async () => {
    const fastify = Fastify({ logger: true });

    // Register CORS
    await fastify.register(cors, {
        origin: true, // Allow all origins for now (dev), lock down in prod
        allowedHeaders: ['Content-Type', 'Authorization'], // explicit headers commonly needed
    });

    // Register Auth Plugin
    await fastify.register(authPlugin);

    // Register Routes
    await fastify.register(draftsRoutes);

    // Health Check
    fastify.get("/health", async () => {
        return { status: "ok", service: "workflow-service" };
    });

    // Protected Route Example
    fastify.get("/protected", {
        preValidation: [fastify.authenticate]
    }, async (request) => {
        return { message: "You are authenticated!", user: request.user };
    });

    return fastify;
};

// Start Server
if (require.main === module) {
    buildApp().then((fastify) => {
        const port = parseInt(process.env.PORT || "3002", 10);
        const host = process.env.HOST || "0.0.0.0";

        fastify.listen({ port, host }, (err, address) => {
            if (err) {
                fastify.log.error(err);
                process.exit(1);
            }
            console.log(`Workflow Service listening on ${address}`);
        });
    });
}

export { buildApp, prisma };
