# Deployment

The service is a single Node process with no external dependencies (other than the optional Google Fonts API). The shipped Dockerfile produces a non-root release image.

## Docker

The [Dockerfile](../Dockerfile) defines three stages:

| Stage         | Purpose                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| `pdf_debug`   | Empty stage extending a `pdf_base` image. Intended for `docker compose` mounts in dev. The host project is mounted at runtime, so the image itself stays empty. |
| `pdf_build`   | Installs deps with `yarn --immutable`, copies `src/` and `fonts/`, runs `yarn build`, then runs `node-prune` to strip dev-only files from `node_modules`. |
| `pdf_release` | The final stage. Creates a non-privileged `nodeuser`, copies `dist/`, `fonts/`, and `node_modules/` from `pdf_build`. Exposes port 9000. Entrypoint is `node dist/index.js`. |

### Building

```bash
docker build --target pdf_release -t pdf-render-service .
```

### Running

```bash
docker run --rm -p 9000:9000 \
  -e GOOGLEAPIKEY=your-key \
  pdf-render-service
```

The release image runs as `nodeuser` (non-root) with `WORKDIR /app`.

## Environment variables

| Variable              | Required | Default | Purpose                                                                                |
| --------------------- | -------- | ------- | -------------------------------------------------------------------------------------- |
| `PORT`                | no       | `9000`  | Listen port.                                                                           |
| `GOOGLEAPIKEY`        | conditional | _none_ | Required if the renders ever reference a font outside the bundled set. See [fonts.md](fonts.md). |
| `VALIDATEAPIPAYLOADS` | no       | _unset_ | Set to `strict` to force JSON-schema validation on every request. See [api.md](api.md#validation). |

## Logging

Two `winston` transports are configured in [src/index.ts](../src/index.ts):

- **Console** at `info` level (simple format).
- **File** `pdf-renderer.log` at `warning` level (JSON format).

In Docker, the file lives in `/app/pdf-renderer.log`. Mount a volume there if you want it persisted, or change the transport configuration.

## Resource considerations

- **Body cap**: 30 MB per request, enforced in [src/PdfController.ts](../src/PdfController.ts). Tune by editing the constant; raising it makes flood mitigation weaker.
- **Tmp files**: each render writes a `<uuid>.pdf` into `${tmpdir()}/pdf-renderer/` and reads it back. The service does not currently delete these — clean up via container restarts or a periodic sweep on long-lived hosts.
- **Memory**: large `data` payloads, large inline images, and big text trees all live in memory simultaneously. Under load, give the container enough headroom to absorb a 30 MB request plus working memory for layout.

## Security notes

### `vm2` is deprecated

The `{{...}}` JS evaluation path uses [`vm2`](https://www.npmjs.com/package/vm2), which is no longer maintained and has a history of sandbox-escape CVEs. The renderer constrains the sandbox (`eval: false`, `wasm: false`, no `require`), which mitigates a lot but does not eliminate the risk.

If you accept render requests from untrusted clients, treat the JS path as a soft attack surface. Options:

- **Don't expose this service directly to untrusted users.** Front it with a service that owns templates and only exposes a parameterized API.
- **Validate strictly.** Set `VALIDATEAPIPAYLOADS=strict` to reject malformed requests before they reach rendering.
- **Track replacement.** A future migration off `vm2` (e.g. to `isolated-vm` or a hand-rolled expression evaluator that doesn't include a JS engine) is on the radar.

### CORS is wide open

The service responds with `Access-Control-Allow-Origin: *` for every request. This is intended to support browser-side template editors. Tighten this in [src/Server.ts](../src/Server.ts) before exposing the service on the public internet.

### No auth

There is no authentication. If you need it, terminate at a reverse proxy / API gateway in front of the service.

## Health and readiness

The `GET /` endpoint returns `SUCCESS` whenever the process can serve. It does not check downstream dependencies (the Google Fonts API in particular). For deeper readiness checks, point your probe at `/fonts` and assert that the bundled families are present.
