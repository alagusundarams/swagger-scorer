import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import jwksRsa from "jwks-rsa";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export default fp(async (fastify: FastifyInstance) => {
    // Check for Mock Auth Config
    const enableMockAuth = process.env.ENABLE_MOCK_AUTH === "true";

    if (enableMockAuth) {
        fastify.log.warn("Mock Authentication Enabled! Skipping JWT verification.");

        fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
            // Inject Mock User
            request.user = {
                oid: "mock-user-id",
                sub: "mock-user-sub",
                name: "Mock Developer",
                email: "mock@local.dev",
                preferred_username: "mock@local.dev",
                tid: "mock-tenant"
            };
        });
        return;
    }

    const tenantId = process.env.AZURE_TENANT_ID || "common";
    const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;

    fastify.register(fastifyJwt, {
        // Dynamically decode the token header to find the kid, then retrieve the signing key from Azure AD JWKS
        secret: async (request: FastifyRequest, token: any) => {
            const client = jwksRsa({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: jwksUri,
            });

            const key = await client.getSigningKey(token.header.kid);
            return key.getPublicKey();
        },
        verify: {
            allowedIss: [
                `https://sts.windows.net/${tenantId}/`,
                `https://login.microsoftonline.com/${tenantId}/v2.0`
            ],
            // audience: process.env.AZURE_CLIENT_ID // Optional: Enforce audience check
        },
        decoratorName: "user"
    });

    fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.send(err);
        }
    });
});

// Type augmentation
declare module "fastify" {
    export interface FastifyInstance {
        authenticate: any;
    }
}
