FROM node:20.19.1

WORKDIR /bot

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "bot.js" ]