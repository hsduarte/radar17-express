FROM node:16

WORKDIR /app

COPY package*.json ./

RUN npm run build:css

RUN npm install

COPY . .

EXPOSE 5001

CMD ["npm", "run", "dev"]