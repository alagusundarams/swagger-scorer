# Stage 1: Build
# We use the full node image to build the TypeScript code
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install all dependencies (including devDependencies for tsc)
# --frozen-lockfile ensures we use exact versions from package-lock.json
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript to dist/
RUN npm run build

# Stage 2: Production
# We use a fresh alpine image for the final artifact
FROM node:18-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config

# Create a non-root user for security
# Alpine already has a 'node' user, we just need to use it
USER node

# Expose the API port
EXPOSE 3001

# Start the application
# We use the direct node command instead of npm start to reduce signal handling issues
CMD ["node", "dist/index.js"]
