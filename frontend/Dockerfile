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
CMD ["/bin/sh", "-c", "if [ ! -z \"$VITE_API_BASE\" ]; then find /usr/share/nginx/html/assets -name \"*.js\" -exec sed -i \"s|http://localhost:8000|$VITE_API_BASE|g\" {} \\;; fi && nginx -g \"daemon off;\""]

