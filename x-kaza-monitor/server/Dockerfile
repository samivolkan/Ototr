FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY server/package.json ./server/package.json
RUN cd server && npm install --omit=dev --no-audit --no-fund

COPY index.html styles.css app.js core.mjs ./
COPY server/src ./server/src
COPY server/data/.gitkeep ./server/data/.gitkeep

WORKDIR /app/server
EXPOSE 8787

CMD ["node", "src/server.mjs"]
