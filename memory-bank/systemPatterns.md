# System Patterns

## Architecture
Single-process Node HTTP server. No framework — raw `http.createServer`. Three layers:

1. **Transport** — [src/index.ts](src/index.ts) wires winston + the listener. [src/Server.ts](src/Server.ts) routes by method/url and instantiates a controller per POST.
2. **Controller** — [src/PdfController.ts](src/PdfController.ts) buffers the body (30MB cap), parses JSON, optionally validates, hands off to the factory, renders to a tmp file, streams the bytes back.
3. **Factory + Elements** — [src/factory/ElementFactory.tsx](src/factory/ElementFactory.tsx) walks the JSON tree and produces a react-pdf React element tree. Each element type has its own factory in [src/factory/Elements/](src/factory/Elements/) and is registered in [src/factory/ElementRegistry.tsx](src/factory/ElementRegistry.tsx).

## Major Design Choices
- **react-pdf as the renderer** — layout is Yoga (flexbox-ish CSS subset); no headless browser.
- **JSON schema generation, not runtime types** — `yarn update-types` runs `ts-json-schema-generator` over [src/wire/PdfRequest.ts](src/wire/PdfRequest.ts) into [src/resources/PdfRequest.json](src/resources/PdfRequest.json). Validation uses ajv in [src/validatePdfRequest.ts](src/validatePdfRequest.ts).
- **vm2 sandbox for templating** — `{{...}}` first tries a fast regex dereference; if anything remains, evaluate via vm2 with `eval:false`, `wasm:false`, 150ms timeout.
- **Two-stage scope** — global config + a stack of local scopes (pushed/popped by list elements via `pushData`/`popData` on the factory). `$item` and friends live in the top frame.
- **Tmp-file round-trip** — `ReactPDF.render` writes to disk because there's no in-memory API; the controller reads it back and streams it.
- **Render stack on errors** — `createElementKey` builds a breadcrumb; thrown errors get a `renderStack` array attached and surfaced in the 400 response.

## Component Relationships
```
index.ts → Server.ts → PdfController
                          │
                          ├─ validatePdfRequest (ajv)
                          └─ ElementFactory ──▶ ElementRegistry ──▶ Elements/{Page,View,Text,Image,Link,List,Shadow}
                                  │
                                  ├─ fontManagement (loadReferencedFonts, registerFont)
                                  ├─ vm2 (templating)
                                  └─ helpers/FinalizeHelpers
```

## Critical Flows

### Render flow (POST /)
1. Buffer body, abort if >30MB.
2. `JSON.parse` → `PdfRequest`.
3. If `strict` flag (request) or `VALIDATEAPIPAYLOADS=strict` (env) → ajv validate, 400 on failure.
4. `ElementFactory.generate()` walks `pages[]`, dispatching each declaration through the registry; `<Document>` wraps the result.
5. `ReactPDF.render(tree, tmpPath)` writes the PDF.
6. Read file, set `Content-type: application/pdf` + `Content-Disposition` (sanitized title), stream back.

### Type inference
When `type` is omitted, `ElementFactory.inferElementType` picks one based on which discriminator property is present (`text` → text, `src` → image, `children` → view, `basis`+`loop` → list). At stack depth 1 the default is `page`. Conflicting discriminators throw.

### Font loading
`loadUnregisteredFonts(fontFamily)` checks the in-memory `registeredFonts` map; if missing, `loadReferencedFonts` hits the Google Fonts API (cached per-request after the first call) and `Font.register`s every variant returned.
