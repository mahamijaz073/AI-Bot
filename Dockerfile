# Multi-stage build for production

# Stage 1: Build React frontend
FROM node:18-alpine as frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production
COPY client/ ./
RUN npm run build

# Stage 2: Setup backend
FROM node:18-alpine as backend
WORKDIR /app

# Copy backend package files
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY . .

# Copy built frontend from previous stage
COPY --from=frontend-build /app/client/build ./client/build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]