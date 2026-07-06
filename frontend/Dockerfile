# Build stage
FROM node:20-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Accept VITE_API_BASE as a build argument
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

# Production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["/bin/sh", "-c", "sed -i \"s|PORT_PLACEHOLDER|${PORT:-80}|g\" /etc/nginx/conf.d/default.conf && sed -i \"s|http://localhost:8000|${VITE_API_BASE}|g\" /usr/share/nginx/html/assets/*.js 2>/dev/null || true; nginx -g \"daemon off;\""]

