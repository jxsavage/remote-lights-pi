FROM node:14.16.0-alpine as development

WORKDIR /app

COPY ["nodemon.json", "package-lock.json", "package.json", "tsconfig.json", "./"]

RUN apk add --no-cache make gcc g++ python linux-headers udev

RUN npm install

RUN apk del make gcc g++ python linux-headers udev

ENTRYPOINT [ "npm", "run" ]

CMD dev

FROM development as production

COPY src src/

RUN npm run build

CMD start

