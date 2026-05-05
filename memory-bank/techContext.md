# Tech Context

## Stack
- **Runtime**: Node.js 20.19.5 (Volta pins 20.18.1 for local dev).
- **Language**: TypeScript 5.7, `target: ES6`, `module: commonjs`, `strict: true`, `jsx: react`.
- **Renderer**: `@react-pdf/renderer` ^3.4.5 (Yoga layout under the hood) + `react` 16.12.
- **Validation**: `ajv` ^8 against a JSON schema generated from TS types via `ts-json-schema-generator`.
- **Templating sandbox**: `vm2` ^3.10 (`eval:false`, `wasm:false`, 150ms timeout per script).
- **Logging**: `winston` (console at info, file `pdf-renderer.log` at warning).
- **HTTP**: stdlib `http`, `cors` package present in deps but the routing in [src/Server.ts](src/Server.ts) sets CORS headers manually.
- **Other**: `axios` (Google Fonts API), `fontkit`, `uuid`.
- **Package manager**: yarn 3.6.1 (Berry).

## Constraints
- **Body limit**: 30MB per POST (data-URI inline images can be large). Exceeding this destroys the connection.
- **Script timeout**: 150ms per `{{...}}` evaluation in vm2.
- **No in-memory render**: react-pdf forces a tmp-file round-trip (`os.tmpdir()/pdf-renderer/<uuid>.pdf`).
- **`vm2` is deprecated upstream** — known security history; constrained sandbox config (no eval, no wasm) mitigates but doesn't eliminate. Replacing it would be a non-trivial migration.

## Setup
```bash
yarn                # install (yarn 3, immutable in CI)
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
Multi-stage Dockerfile in [Dockerfile](Dockerfile):
- `pdf_debug` extends a base image and is intended for compose-mounted dev.
- `pdf_build` installs immutable deps, builds, runs `node-prune`.
- `pdf_release` runs as non-root `nodeuser`, exposes port 9000, entrypoint `node dist/index.js`.

## Tooling Patterns
- **Schema-from-types** — `PdfRequest.ts` is the source of truth; `PdfRequest.json` is generated. Don't hand-edit the JSON.
- **Element registration** — new element kinds need a factory in [src/factory/Elements/](src/factory/Elements/) plus an entry in [src/factory/ElementRegistry.tsx](src/factory/ElementRegistry.tsx).
- **Default fonts** — Roboto, Teko, and Noto Sans are bundled under [fonts/](fonts/) and registered at module load in [src/fontManagement.ts](src/fontManagement.ts); anything else is fetched from Google Fonts at request time.

## Dependencies of note
- `vm2` — sandbox; deprecated, watch for replacement effort.
- `react` 16 — pinned by react-pdf compatibility; do not upgrade independently.
- `@react-pdf/types` — drives `Style`, `StandardPageSize`, `Orientation` types referenced from wire definitions.
