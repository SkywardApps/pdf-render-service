# Getting Started

This guide gets you from a fresh clone to a working PDF response in a few minutes.

## Prerequisites

- **Node.js 20.x** (the project pins 20.18.1 via Volta; the Docker image runs 20.19.5).
- **Yarn 3 (Berry)** — `package.json` declares `packageManager: yarn@3.6.1`.
- A **Google Fonts API key** if you intend to use any font outside the bundled defaults (Roboto, Teko, Noto Sans). See [fonts.md](fonts.md).

## Install

```bash
git clone <this repo>
cd pdf-render-service
yarn
```

## Run the service

```bash
yarn start
```

This launches `ts-node-dev` with auto-respawn. By default the server listens on **port 9000**; override with the `PORT` environment variable.

You should see `Server listening on port 9000` in the console.

Other scripts:

| Script              | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `yarn start`        | Dev mode with auto-respawn.                                        |
| `yarn debug`        | Same, with `--inspect` for a debugger and `NODE_ENV=development`.  |
| `yarn build`        | Compile TypeScript to `./dist`.                                    |
| `yarn release`      | Build and run the compiled output.                                 |
| `yarn lint`         | ESLint over `src/**/*.{ts,tsx}`.                                   |
| `yarn update-types` | Regenerate the JSON schema in `src/resources/PdfRequest.json`.     |

## Health check

```bash
curl http://localhost:9000/
```

Returns `SUCCESS` with HTTP 200 when the service is up.

## Your first PDF

Send a `POST` with a JSON body. The response is the PDF binary; pipe it to a file.

```bash
curl -X POST http://localhost:9000/ \
  -H "Content-Type: application/json" \
  -o hello.pdf \
  -d '{
    "title": "Hello World",
    "size": "LETTER",
    "orientation": "portrait",
    "data": { "name": "World" },
    "pages": [
      {
        "type": "page",
        "style": { "padding": 36 },
        "children": [
          {
            "type": "text",
            "text": "Hello, {{data.name}}!",
            "style": { "fontSize": 24 }
          }
        ]
      }
    ]
  }'
```

Open `hello.pdf` to see the result.

## Where to go next

- **[api.md](api.md)** — full endpoint reference and request envelope.
- **[elements.md](elements.md)** — every element type and property.
- **[templating.md](templating.md)** — `{{...}}` syntax and the data scope rules.
- **[styling.md](styling.md)** — class application order and supported CSS.
- **[fonts.md](fonts.md)** — bundled fonts and on-demand Google Fonts loading.
- **[deployment.md](deployment.md)** — Docker, environment variables, security notes.
