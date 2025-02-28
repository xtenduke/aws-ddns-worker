FROM node:23 AS install
WORKDIR /app

COPY ["package.json", "yarn.lock", "./"]
COPY . .
RUN yarn install
RUN yarn build

ENV NODE_ENV=production
FROM node:23-alpine as run
WORKDIR /app

COPY --from=install ./app/dist ./dist
COPY --from=install ./app/node_modules ./node_modules
COPY ["package.json", "yarn.lock", "./"]
CMD [ "yarn", "start" ]
