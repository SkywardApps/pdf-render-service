# PDF Render Engine and Service

A PDF layout and rendering engine — and an HTTP service around it — that turns a JSON request into a PDF binary. Built on [react-pdf](https://react-pdf.org/) and the [Yoga](https://yogalayout.com/) layout engine.

```bash
yarn && yarn start
curl -X POST http://localhost:9000/ \
  -H "Content-Type: application/json" \
  -o hello.pdf \
  -d '{"title":"Hello","pages":[{"children":[{"text":"Hello, World!"}]}]}'
```

See [docs/getting-started.md](docs/getting-started.md) for the full quickstart.

## Why this?

Creating a PDF is hard. Editors handle fixed content well, but anything dynamic — a variable-length product list, changing titles and names — quickly runs out of road. This service aims to be:

- **Data-driven** for both content and structure.
- **Easy to modify on the fly** — no recompilation, no template language to learn beyond JSON + a templating syntax.
- **Standards-based layout** — flexbox via Yoga.
- **Service-shaped** — POST a JSON body, get a PDF binary back.

## Why not wkhtmltopdf or another HTML-to-PDF service?

The killer feature here is **re-entrant headers and footers on variable-length content**. If you have a table whose header row should repeat at the top of every page the table spans, none of the headless-browser converters handle that cleanly. They're also fragile under upstream Chromium updates — when something breaks, you're at the mercy of a third party. This service owns the rendering path so it can be debugged and fixed in-house.

## Why JSON / data-driven?

The end goal is a graphical template editor. That only works if the layout is data, not code — otherwise a developer is always in the loop for visual changes. Keeping data and structure separable also lets a backend produce the data while a designer owns the structure, with neither blocking the other.

## Documentation

Human-targeted docs live in [docs/](docs/):

- **[Getting started](docs/getting-started.md)** — install, run, first PDF.
- **[HTTP API](docs/api.md)** — endpoints, request envelope, errors, limits.
- **[Element reference](docs/elements.md)** — every element type and property (page, view, text, image, link, list, shadow).
- **[Templating](docs/templating.md)** — `{{...}}` syntax, scope rules, sandbox limits.
- **[Styling](docs/styling.md)** — class precedence, supported CSS, common patterns.
- **[Fonts](docs/fonts.md)** — bundled defaults, on-demand Google Fonts loading.
- **[Deployment](docs/deployment.md)** — Docker, environment variables, security notes.

The `memory-bank/` directory contains a terser, LLM-targeted snapshot of the same material; humans will get more out of `docs/`.

## Project layout

```
src/
  index.ts                 entrypoint (winston + http listener)
  Server.ts                routing (GET /, GET /fonts, OPTIONS, POST /)
  PdfController.ts         POST handler — buffer body, validate, render, stream PDF back
  validatePdfRequest.ts    AJV against src/resources/PdfRequest.json
  fontManagement.ts        registry + Google Fonts loader
  wire/                    PdfRequest + ElementDeclaration types (schema source of truth)
  factory/                 ElementFactory + per-type Elements/
  helpers/                 small utilities
fonts/                     bundled font files (Roboto, Teko, Noto Sans)
docs/                      human-targeted documentation
memory-bank/               LLM-targeted project snapshot
```

## License

MIT — see [LICENSE](LICENSE).

## Contributing

See [Contributing.md](Contributing.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Issues and pull requests are tracked on GitHub.

## Reference links

- [react-pdf](https://react-pdf.org/) — the underlying renderer.
- [Yoga layout engine](https://yogalayout.com/) — the flexbox implementation react-pdf uses.
- [PDF format reference](https://en.wikipedia.org/wiki/PDF) — for when you need to understand what's coming out the other end.
