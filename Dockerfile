# ---------- Stage 1: Build ----------
FROM node:18-slim AS build
# Set working directory
WORKDIR /app
# Copy package files first (for layer caching)
COPY package*.json ./
# Install dependencies (including dev dependencies if needed for build)
RUN npm ci
# Copy all source code
COPY . .
# If you have a build step (e.g. for TypeScript or React), run it here
# RUN npm run build
# ---------- Stage 2: Production ----------
FROM node:18-slim AS production
# Set NODE_ENV for better performance and smaller dependency footprint
ENV NODE_ENV=production
WORKDIR /app
# Copy only the package files and reinstall only production deps
COPY package*.json ./
RUN npm ci --omit=dev
# Copy the built app from the build stage (or full code if no build step)
COPY --from=build /app ./
# Expose app port
EXPOSE 3000
# Start the app
CMD ["npm", "start"]