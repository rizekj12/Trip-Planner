# Multi-stage build: compile the frontend, then run one Node server that serves both
# the built app and the /api routes on a single port (Railway sets PORT).
FROM node:22-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including devDependencies for the build)
COPY package*.json ./
RUN npm ci

COPY . .

# Vite bakes VITE_* values into the frontend at build time, so they're needed here.
# (On Railway, service variables are passed in as these build args automatically.)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_USE_MOCK_DATA
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_USE_MOCK_DATA=$VITE_USE_MOCK_DATA

RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Runtime dependencies only (express, Anthropic SDK, Supabase, pdfkit, ...)
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
# Code shared by the server and the browser (e.g. trip length)
COPY --from=builder /app/shared ./shared

# Local default; hosts like Railway override it with their own PORT
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/index.js"]
