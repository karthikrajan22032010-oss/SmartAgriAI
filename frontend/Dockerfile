FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

# Since Vite dev server is used in docker-compose, we run dev
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
