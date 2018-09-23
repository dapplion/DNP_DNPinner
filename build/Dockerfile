FROM node:8.9.4-alpine as build

WORKDIR /usr/src/app
COPY src/package*.json ./
RUN apk add --no-cache git python build-base bind-tools bash
RUN npm install --only=production

FROM node:8.9.4-alpine

WORKDIR /usr/src/app
COPY --from=build /usr/src/app /usr/src/app
COPY src .

CMD [ "npm", "start" ]