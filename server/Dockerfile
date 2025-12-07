# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Install build dependencies for native modules (sqlite3)
# Use --update to ensure package index is fresh
RUN apk update && apk add --no-cache python3 make g++ || \
    (sleep 5 && apk update && apk add --no-cache python3 make g++)

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]
