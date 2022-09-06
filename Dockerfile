# Build another image that's just for debugging.
FROM pdf_base as pdf_debug
# This is left empty because compose will mount
# the main app directory and build at runtime.
# So do nothing app related as the files won't 
# be present yet. 

FROM node:14 as pdf_build

WORKDIR /src
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
RUN npx node-prune

FROM node:14 as pdf_release

# Run everything after as non-privileged user.
RUN install -m 775 -d /usr/src/app
WORKDIR /app
EXPOSE 9000

# create a new user and change directory ownership
RUN adduser --disabled-password \
  --home /app \
  --gecos '' nodeuser && chown -R nodeuser /app

# impersonate into the new user
USER nodeuser
WORKDIR /app

COPY --from=pdf_build /src/dist ./dist
COPY --from=pdf_build /src/fonts ./fonts
COPY --from=pdf_build /src/node_modules ./node_modules
ENTRYPOINT ["node", "dist/index.js"]
