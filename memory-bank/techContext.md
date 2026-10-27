# Tech Context

## Stack
- **Runtime**: Node.js 24 (Docker + Volta pin 24.22.1; `.nvmrc` = `24`; `engines.node` `>=24`).
- **Language**: TypeScript 5.7, `target: ES6`, `module: commonjs`, `strict: true`, `jsx: react`.
- **Renderer**: `@react-pdf/renderer` ^3.4.5 (Yoga layout under the hood) + `react` 16.12.
- **Validation**: `ajv` ^8 against a JSON schema generated from TS types via `ts-json-schema-generator`.
- **Templating sandbox**: `vm2` ^3.12 (`eval:false`, `wasm:false`, 150ms timeout per script).
- **Logging**: `winston` (console at info, file `pdf-renderer.log` at warning).
- **HTTP**: stdlib `http`; [src/Server.ts](src/Server.ts) sets CORS headers manually (no `cors` package).
- **Other**: `axios` (Google Fonts API). `fontkit` comes transitively via `@react-pdf/font`.
- **Package manager**: Yarn 4.18.1 via corepack (`packageManager` field; no committed `.yarn/releases`). `yarn npm audit --all --recursive` works.

## Constraints
- **Body limit**: 30MB per POST (data-URI inline images can be large). Exceeding this destroys the connection.
- **Script timeout**: 150ms per `{{...}}` evaluation in vm2.
- **In-memory render**: whole PDF is buffered before sending (no streaming, no tmp files).
- **`vm2` has a long sandbox-escape history** — upstream ships frequent security releases; keep it on the latest 3.x. Constrained sandbox config (no eval, no wasm) mitigates but doesn't eliminate. Replacing it would be a non-trivial migration.

## Setup
```bash
corepack enable     # once; provides the pinned Yarn 4
yarn                # install (immutable in Docker/CI)
yarn start          # ts-node-dev with auto-respawn
yarn build          # tsc → ./dist
yarn release        # build + run compiled output
yarn debug          # tsnd with --inspect (TZ=UTC, NODE_ENV=development)
yarn lint           # eslint over src/**/*.{ts,tsx}
yarn update-types   # regenerate src/resources/PdfRequest.json from PdfRequest.ts
```

Default port: `9000`, override via `PORT`.

## Environment Variables
- `PORT` — listen port (default 9000).
- `GOOGLEAPIKEY` — Google Fonts API key for on-demand font loading.
- `VALIDATEAPIPAYLOADS` — set to `strict` to force ajv validation on every request (otherwise per-request `strict: true` opts in).

## Deployment
Multi-stage Dockerfile in [Dockerfile](Dockerfile); `.dockerignore` trims the context:
- `pdf_compile` (`node:24.22.1`, `corepack enable`) installs immutable deps, builds.
- `pdf_test` runs `yarn test:coverage`; CI builds it before release.
- `pdf_build` runs `yarn workspaces focus --production` (drops dev deps).
- `pdf_release` (`node:24.22.1-slim`) runs as non-root `nodeuser`, exposes port 9000, entrypoint `node dist/index.js`.

## CI
`.github/workflows/build-and-publish.yml`: `lint` job (setup-node from `.nvmrc`, corepack, `yarn lint`; not a publish gate) + `build` job (Docker `pdf_test`, then `pdf_release`; pushes to ghcr only on `mainline`). PR runs cancel superseded runs; mainline/ci runs are never cancelled. Dependabot (`.github/dependabot.yml`) groups minor/patch and majors (dev vs prod) separately; react/@react-pdf/@types/node majors ignored.

## Tooling Patterns
- **Schema-from-types** — `PdfRequest.ts` is the source of truth; `PdfRequest.json` is generated. Don't hand-edit the JSON.
- **Element registration** — new element kinds need a factory in [src/factory/Elements/](src/factory/Elements/) plus an entry in [src/factory/ElementRegistry.tsx](src/factory/ElementRegistry.tsx).
- **Default fonts** — Roboto, Teko, and Noto Sans are bundled under [fonts/](fonts/) and registered at module load in [src/fontManagement.ts](src/fontManagement.ts); anything else is fetched from Google Fonts at request time.

## Dependencies of note
- `vm2` — sandbox; frequent security releases, watch for replacement effort.
- No `resolutions`. Yarn still injects `node-gyp@latest` for `fsevents` (macOS-only); a fresh lockfile resolves 13.x (needs Node ≥22.22), so the old 9.x pin is gone.
- `pdfjs-dist` ^6.2.108 (test-only PDF reader; 5.6.83–6.2.107 are vulnerable). v6 API: clean up via `loadingTask.destroy()` (no `PDFDocumentProxy.destroy`), no `isEvalSupported` option.
- `react` 16 — pinned by react-pdf compatibility; do not upgrade independently.
- `@react-pdf/types` — drives `Style`, `StandardPageSize`, `Orientation` types referenced from wire definitions.
