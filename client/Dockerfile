FROM node:20-alpine AS build

ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY tsconfig.json vite.config.ts index.html ./
COPY src/ src/
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 69
CMD ["nginx", "-g", "daemon off;"]
