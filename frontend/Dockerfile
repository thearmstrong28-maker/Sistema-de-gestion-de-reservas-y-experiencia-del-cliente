# Development stage for Vite dev server
FROM node:20-alpine

WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Run Vite dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
