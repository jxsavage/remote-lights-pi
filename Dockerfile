FROM node:lts-alpine

WORKDIR /usr/src/app

COPY ["nodemon.json", "package-lock.json", "package.json", "tsconfig.json", "./"]

RUN apk add --no-cache make gcc g++ python linux-headers udev

RUN npm install

RUN apk del make gcc g++ python linux-headers udev

CMD npm run dev