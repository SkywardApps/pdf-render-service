FROM node:24.22.1 AS pdf_compile

# Yarn comes from corepack, pinned by the packageManager field in package.json.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /src
COPY package.json .
COPY yarn.lock .
COPY eslint.config.js .
COPY tsconfig.json .
COPY .yarnrc.yml .
RUN yarn --immutable

COPY src ./src
COPY fonts ./fonts

RUN yarn build

# Run the test suite. Tests run in the full install, before pdf_build drops
# dev dependencies, so vitest, pdfjs-dist, and nock are still available.
# Failed tests cause this stage to fail; CI builds pdf_test before pdf_release
# so a regression blocks publish.
FROM pdf_compile AS pdf_test

COPY vitest.config.ts ./
COPY test ./test

RUN yarn test:coverage

# Reduce node_modules to production dependencies for the release artifact.
FROM pdf_compile AS pdf_build

RUN yarn workspaces focus --production

FROM node:24.22.1-slim AS pdf_release

WORKDIR /app
EXPOSE 9000

# Run as a non-privileged user that owns /app.
RUN useradd --home-dir /app --no-create-home nodeuser && chown nodeuser /app
USER nodeuser

COPY --from=pdf_build /src/dist ./dist
COPY --from=pdf_build /src/fonts ./fonts
COPY --from=pdf_build /src/node_modules ./node_modules
ENTRYPOINT ["node", "dist/index.js"]
