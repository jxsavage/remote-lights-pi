FROM node:14.16.0-alpine as development

WORKDIR /app

COPY ["nodemon.json", "nodemon.prod.json", "package-lock.json", "package.json", "tsconfig.json", "./"]

RUN apk add --no-cache make gcc g++ python linux-headers udev
    
ENTRYPOINT [ "npm", "run" ]

FROM development as production

COPY . .

RUN npm install

RUN apk del make gcc g++ python linux-headers udev

COPY src src/

RUN npm run build

CMD start

