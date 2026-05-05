# Build another image that's just for debugging.
FROM pdf_base AS pdf_debug
# This is left empty because compose will mount
# the main app directory and build at runtime.
# So do nothing app related as the files won't
# be present yet.

FROM node:20.20.2 AS pdf_compile

WORKDIR /src
COPY package.json .
COPY yarn.lock .
COPY eslint.config.js .
COPY tsconfig.json .
COPY .yarnrc.yml .
COPY .yarn ./.yarn
RUN yarn --immutable

COPY src ./src
COPY fonts ./fonts

RUN yarn build

# Run the test suite. Tests run against the compiled tree before node-prune
# strips dev dependencies, so vitest, pdfjs-dist, and nock are still available.
# Failed tests cause this stage to fail; CI builds pdf_test before pdf_release
# so a regression blocks publish.
FROM pdf_compile AS pdf_test

COPY vitest.config.ts ./
COPY test ./test

RUN yarn test:coverage

# Strip dev-only files from node_modules for the release artifact.
FROM pdf_compile AS pdf_build

RUN npx node-prune

FROM node:20.20.2 AS pdf_release

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
