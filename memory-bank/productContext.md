# Product Context

## Problem
Generating PDFs with dynamic content (variable-length lists, templated titles, repeating table headers across page breaks) is poorly served by existing tools. HTML-to-PDF converters either don't support repeating headers across pages or break under browser updates. Static PDF editors can't accept dynamic data.

## Solution
A render service driven by a single JSON document describing:
- `data` — the values to bind into the PDF.
- `styles` — named style classes, applied in list order with later classes overriding earlier ones, and inline `style` overriding all classes.
- `pages` — the element tree (pages, views, text, images, lists, links, shadow elements).

Templating with `{{expression}}` lets any string property reference data or run a sandboxed JS expression. List elements iterate over array data and may re-emit headers/footers across page breaks.

## Functional Intent
- Accept a `PdfRequest` JSON body via POST and stream a PDF binary back.
- Infer element types from discriminator properties (`text`, `src`, `children`, `basis`+`loop`) so simple cases stay terse.
- Load Google Fonts on demand when a referenced family isn't already registered (Roboto, Teko, Noto Sans ship preregistered).
- Optionally validate payloads against the generated JSON schema; fail fast with a 400 when strict.

## UX Expectations
- **Consumers are programmatic** — backends or a future template editor, not browsers directly. Errors return HTTP status codes plus a plaintext body that includes a render-stack breadcrumb when generation fails mid-tree.
- **Filename comes from `title`** — sanitized and used for `Content-Disposition`.
- **Cross-origin** — CORS open (`*`) so a browser-side editor can call it.
- **Timeouts on templating** — embedded JS runs in vm2 with a 150ms timeout to keep the service responsive.
