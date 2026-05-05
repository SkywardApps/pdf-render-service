# Project Brief: pdf-render-service

## Purpose
A PDF layout and rendering engine plus an HTTP service that renders PDFs on-demand from a JSON request payload.

## Why
Existing tools (wkhtmltopdf, headless-Chromium services) cannot reliably handle re-entrant headers/footers on variable-length content (e.g. a table whose header row repeats on each page break). They are also fragile under upstream browser updates. This service owns the rendering path so it can be debugged and fixed in-house.

## Requirements
- **Data-driven structure and content** — both the layout tree and the values inside it come from the request payload, not hardcoded templates.
- **Templating** — `{{...}}` interpolation in any string field, supporting simple dereferences and arbitrary single-statement JS (sandboxed).
- **Re-entrant blocks** — list elements may declare `header` and `footer` that re-render on every page break the list spans.
- **Service-shaped** — POST a JSON body, get a PDF binary back. CORS-enabled. GET `/` for health, GET `/fonts` for registered fonts.
- **Schema validation** — opt-in strict validation against a generated JSON schema for `PdfRequest`.

## Scope
- IN: JSON-to-PDF rendering, dynamic font loading from Google Fonts, layout via react-pdf/Yoga, the HTTP wrapper.
- OUT (future): graphical template editor — the data-driven model exists to enable this later, but it is not part of this repo.

## End Goal
Enable a future visual template editor by keeping data and structure separable, and let non-developers edit PDF templates without redeploying.
