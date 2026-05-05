# HTTP API

The service exposes a small surface: a health check, a font list, and a single render endpoint.

## Endpoints

### `GET /`

Health check. Returns `SUCCESS` (text body) with HTTP 200 when the service is up.

### `GET /fonts`

Returns the list of currently registered font families (the bundled defaults plus any Google Fonts that have been loaded on demand during this process's lifetime).

```bash
curl http://localhost:9000/fonts
```

Response (`application/json`):

```json
[
  {
    "family": "Roboto",
    "configurations": [
      { "weight": "normal", "style": "normal" },
      { "weight": "bold",   "style": "normal" },
      { "weight": "normal", "style": "italic" },
      { "weight": "bold",   "style": "italic" }
    ]
  }
]
```

Note: registration here means the source URL is recorded — a font is not validated as actually loadable until it is referenced during rendering.

### `OPTIONS *`

CORS preflight. The service responds 204 with these headers on every endpoint:

| Header                         | Value                  |
| ------------------------------ | ---------------------- |
| `Access-Control-Allow-Origin`  | `*`                    |
| `Access-Control-Allow-Methods` | `OPTIONS, POST, GET`   |
| `Access-Control-Max-Age`       | `2592000` (30 days)    |

### `POST /`

The render endpoint. Send a JSON body conforming to the `PdfRequest` schema. The response is the PDF binary on success.

| On success                                                                            |
| ------------------------------------------------------------------------------------- |
| `Content-type: application/pdf`                                                       |
| `Content-disposition: attachment; filename="<sanitized title>.pdf"`                   |
| HTTP 200, body = PDF bytes                                                            |

The filename comes from the `title` field with everything outside `[A-Za-z0-9_.-]` replaced with `_`.

## Request envelope (`PdfRequest`)

| Field         | Type                               | Default          | Notes                                                            |
| ------------- | ---------------------------------- | ---------------- | ---------------------------------------------------------------- |
| `title`       | `string`                           | `"PDF Document"` | PDF metadata title; also drives the response filename.           |
| `size`        | `StandardPageSize`                 | `"Legal"`        | Default page size; pages may override per-page.                  |
| `orientation` | `"portrait" \| "landscape"`        | `"portrait"`     | Default orientation; pages may override per-page.                |
| `debug`       | `boolean`                          | `false`          | When true, every element renders with debug rectangles.          |
| `styles`      | `{ [name: string]: Style }`        | `{}`             | Named style classes. See [styling.md](styling.md).               |
| `data`        | `any`                              | `{}`             | The data model exposed to `{{...}}` templates.                   |
| `pages`       | `PageElementDeclaration[]`         | required         | The page tree. Top-level elements must be pages.                 |
| `strict`      | `boolean`                          | `false`          | Per-request opt-in to JSON-schema validation.                    |
| `prerender`   | `boolean`                          | `false`          | Pre-evaluates text templates to enable paragraph measurement.    |

`StandardPageSize` is the type re-exported from `@react-pdf/types` — common values include `"LETTER"`, `"LEGAL"`, `"TABLOID"`, and the ISO `A`/`B`/`C` series (`"A4"`, `"A5"`, …). See the `@react-pdf/types` definitions for the full set.

A minimal valid request:

```json
{
  "title": "Minimum",
  "pages": [
    { "type": "page", "children": [ { "text": "hi" } ] }
  ]
}
```

## Validation

The body is parsed as JSON. Validation against the generated JSON schema (`src/resources/PdfRequest.json`) runs when **either**:

- the request body sets `"strict": true`, or
- the service is started with `VALIDATEAPIPAYLOADS=strict` in the environment.

When validation fails, the response is `400` with a plaintext body containing the AJV error array.

## Limits

- **Body size**: hard cap at **30 MB**. Larger requests have their connection destroyed and the request is logged as a flood candidate. (Inline data-URI images are the usual reason this matters.)
- **Template script timeout**: 150 ms per `{{...}}` evaluation that requires the JS sandbox.

## Error responses

| Status | When                                                                                                          | Body                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `400`  | Schema validation failed (when strict).                                                                       | `The request was not valid: <ajv errors json>.`                               |
| `400`  | Element-tree generation threw an `Error` (e.g. unknown element type, font lookup failed, template threw).     | `Error (<name>) rendering the file: <message>\nRender Stack: <breadcrumb>`    |
| `500`  | `react-pdf` rendering threw, or the temp file could not be read back.                                         | `Error rendering the file: <error>.`                                          |
| `404`  | Any request that isn't `OPTIONS`, `GET /`, `GET /fonts`, or `POST /`.                                         | empty                                                                         |

### Render-stack breadcrumb

When generation fails inside the element tree, the service emits a `Render Stack: a > b > c` trail in the response body. Each segment names the element type and its position. The format of each segment:

- Top of stack: `document[<page-index>]`.
- A child position: `<parent-key>.child[<index>]` (or `.loop`, `.loop[<index>]`, `.header`, `.footer` for list subtrees).
- The failing element itself: `<type>` alone, or annotated with the first available identifier — `<type>[key=...]`, `<type>[comment=...]`, `<type>[text=...]`, `<type>[src=...]`, or `<type>[basis=...]` (truncated to 50 chars).

Example:

```
Error (Error) rendering the file: No factory found for element of type widget
Render Stack: document[0] > page.child[2] > view.child[1] > widget
```

Setting `key` on suspect elements in your payload makes these breadcrumbs much easier to read — `view[key=invoice-table].child[3]` is more useful than `view.child[3]`.

## CORS

The service is CORS-open (`*`). This is intended for browser-side template editors. If you proxy the service behind a gateway or use cookies, you will probably want to lock this down — the headers are set in [src/Server.ts](../src/Server.ts).

## See also

- [getting-started.md](getting-started.md) for a `curl` example end-to-end.
- [elements.md](elements.md) for the shape of `pages[]`.
- [deployment.md](deployment.md) for environment variables.
