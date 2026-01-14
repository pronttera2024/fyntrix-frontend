FROM node:20-alpine as build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package.json ./package.json
RUN npm i -g serve
EXPOSE 5175
CMD ["npx", "serve", "-s", "dist", "-l", "5175"]
