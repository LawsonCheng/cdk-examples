FROM node:12

WORKDIR /usr/app

RUN npm install forever -g

COPY package.json .
RUN npm i --quiet
COPY . .

CMD ["forever", "app.js", "--minUptime", "86400000"]