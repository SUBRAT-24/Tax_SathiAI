# TaxSathi AI — Frontend Dockerfile (dev)
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose Vite dev port
EXPOSE 5173

# Start dev server accessible from outside container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
