# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/build ./build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "node_modules/@react-router/serve/bin.js", "./build/server/index.js"]
