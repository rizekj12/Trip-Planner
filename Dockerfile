# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_ANTHROPIC_API_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_ANTHROPIC_API_KEY=$VITE_ANTHROPIC_API_KEY

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy package files from builder
COPY --from=builder /app/package*.json ./

# Install ALL dependencies (need sirv-cli which might be in devDependencies)
RUN npm ci

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copy backend server
COPY --from=builder /app/server ./server

# Set environment to production
ENV NODE_ENV=production

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Start BOTH backend and frontend
CMD node server/index.js & npx sirv dist --host 0.0.0.0 --port 3000 --single