FROM alpine as bmz_base

RUN apk update && apk add nodejs && apk upgrade busybox

# Run everything after as non-privileged user.
RUN install -m 775 -d /usr/src/app
WORKDIR /app
EXPOSE 9000

# Build another image that's just for debugging.
FROM bmz_base as bmz_debug
# This is left empty because compose will mount
# the main app directory and build at runtime.
# So do nothing app related as the files won't 
# be present yet. 

FROM node:14 as bmz_build

WORKDIR /src
RUN curl -sfL https://install.goreleaser.com/github.com/tj/node-prune.sh | bash -s -- -b /usr/local/bin
COPY package.json .
COPY yarn.lock .
COPY tslint.json .
COPY tsconfig.json .
RUN yarn install --frozen-lockfile
COPY src ./src
COPY fonts ./fonts

RUN yarn build

# remove development dependencies
RUN npm prune --production

# run node prune
RUN /usr/local/bin/node-prune

FROM bmz_base as bmz_release

# create a new user and change directory ownership
RUN adduser --disabled-password \
  --home /app \
  --gecos '' nodeuser && chown -R nodeuser /app

# impersonate into the new user
USER nodeuser
WORKDIR /app

COPY --from=bmz_build /src/dist ./dist
COPY --from=bmz_build /src/fonts ./fonts
COPY --from=bmz_build /src/node_modules ./node_modules
ENTRYPOINT ["node", "dist/index.js"]
