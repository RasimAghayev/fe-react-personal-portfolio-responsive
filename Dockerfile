# Builds and runs the server.js contact-form mail relay only.
# The React frontend (src/) is a separate static build, not part of this image.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./

ENV PORT=5000
EXPOSE 5000

CMD ["node", "server.js"]
