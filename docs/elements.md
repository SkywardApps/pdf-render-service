# Element Reference

Every entry in `pages[]` is an element declaration. Containers nest other declarations through `children` (or `loop` for lists). This document describes every element type and every property the service understands.

## Type inference

If you omit `type`, the service infers it from which discriminator property is present.

| Discriminator present       | Inferred `type` |
| --------------------------- | --------------- |
| Stack depth 1 (top of page) | `page`          |
| `text`                      | `text`          |
| `src`                       | `image`         |
| `children`                  | `view`          |
| `basis` **and** `loop`      | `list`          |

Conflicting discriminators throw (e.g. `text` + `src` on the same node). For element types that have no discriminator (`link`, `shadow`) you must set `type` explicitly. Type-inference is in [src/factory/ElementFactory.tsx:279](../src/factory/ElementFactory.tsx#L279).

## Common properties

These apply to most or all element types.

| Property    | Type                  | Where           | Notes                                                                                   |
| ----------- | --------------------- | --------------- | --------------------------------------------------------------------------------------- |
| `type`      | `ElementTypes`        | all             | Optional when inferable. One of `page`, `view`, `text`, `image`, `link`, `list`, `shadow`. |
| `key`       | `string`              | all             | Stable identifier; appears in render-stack breadcrumbs as `<type>[key=...]`. Useful for debugging payloads. |
| `comment`   | `string`              | all             | Free-form note. Ignored by the renderer; useful for hand-edited payloads.               |
| `condition` | `string` (template)   | all             | When provided, the expression is evaluated; if falsy the element (and its subtree) is skipped. |
| `fixed`     | `boolean` (template)  | all rendered    | Re-render this element on every page break. See [react-pdf fixed components](https://react-pdf.org/advanced#fixed-components). |
| `break`     | `boolean` (template)  | all rendered    | Force a page break **before** this element.                                             |
| `wrap`      | `boolean` (template)  | view, text, link, shadow | When `false`, the element is moved to the next page rather than split across pages. Default `true`. |
| `style`     | `Style`               | stylable types  | Inline style object. See [styling.md](styling.md).                                      |
| `classes`   | `string[]`            | stylable types  | Named styles applied in list order before `style`.                                      |
| `debug`     | `boolean`             | stylable types  | Draw debug rectangles around this element. ORs with the request-level `debug` flag.     |

"Template" boolean fields accept `true`/`false` or a string that resolves to one via `{{...}}` (e.g. `"{{data.shouldFix}}"`). **Caveat**: the wire types declare these as plain `boolean`, so the generated JSON schema rejects the string form. If you have `strict: true` (or `VALIDATEAPIPAYLOADS=strict`), use literal booleans or pre-resolve the value in your data.

## `page`

A page is the only element legal at the top level of `pages[]`.

```json
{
  "type": "page",
  "size": "LETTER",
  "orientation": "portrait",
  "style": { "padding": 36 },
  "children": [ /* AnyElementDeclaration[] */ ]
}
```

| Property      | Type                        | Notes                                                          |
| ------------- | --------------------------- | -------------------------------------------------------------- |
| `size`        | `StandardPageSize`          | Overrides request-level `size` for this page. If neither is set, falls back to the request-level default (`"Legal"`). |
| `orientation` | `"portrait" \| "landscape"` | Overrides request-level `orientation`. Defaults to `"portrait"`. |
| `children`    | `AnyElementDeclaration[]`   | Required.                                                      |
| `style`       | `Style`                     | Page-level style (typically padding/margins, background).      |

Pages always wrap (`wrap=true` is hardcoded). Only the request-level `debug` flag is honored on a page — a per-page `debug` is ignored. Other element types DO honor per-element `debug` (OR'd with the request flag).

## `view`

A flexbox-style container.

```json
{
  "type": "view",
  "style": { "display": "flex", "flexDirection": "row", "gap": 8 },
  "children": [ /* ... */ ]
}
```

| Property   | Type                      | Notes                                                              |
| ---------- | ------------------------- | ------------------------------------------------------------------ |
| `children` | `AnyElementDeclaration[]` | Required.                                                          |
| `wrap`     | template boolean          | Default `true`.                                                    |

Two common patterns:

- **Flow layout**: `style.display = "flex"` plus `flexDirection`, `justifyContent`, etc.
- **Absolute layout**: parent with `position: "relative"`, children with `position: "absolute"` and `top`/`left`/`right`/`bottom`.

## `text`

```json
{
  "type": "text",
  "text": "Hello, {{data.name}}!",
  "style": { "fontSize": 18, "color": "#000000" }
}
```

| Property   | Type                              | Notes                                                                                                          |
| ---------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `text`     | `string` (template)               | Body text. Mutually exclusive with `children`; if both are set, `text` is discarded with a logged warning.     |
| `children` | `TextElementDeclaration[]`        | Inline text spans. Children must themselves be text nodes — use this for runs of mixed formatting in one line. |
| `wrap`     | template boolean                  | Default `true`.                                                                                                |

Text supports react-pdf's render-callback flow: page numbers (`pageNumber`, `totalPages`) are exposed as locals to your `text` template, so `"Page {{pageNumber}} of {{totalPages}}"` works.

When the request sets `prerender: true`, the text content is pre-evaluated once with `pageNumber=100, totalPages=100` so paragraph measurement runs at layout time. Use this if your text template would otherwise produce empty layout boxes during the measurement pass.

### Inline children example

```json
{
  "type": "text",
  "children": [
    { "text": "Hello " },
    { "text": "World", "style": { "fontWeight": "bold", "color": "blue" } },
    { "text": "!" }
  ]
}
```

## `image`

```json
{
  "src": "https://example.com/{{data.imageId}}.png",
  "style": { "width": 200, "height": 100 }
}
```

| Property | Type                 | Notes                                                                                |
| -------- | -------------------- | ------------------------------------------------------------------------------------ |
| `src`    | `string` (template)  | URL or `data:` URI. Required. Discriminator for type inference.                      |
| `cache`  | template boolean     | Default `true`. Set to `false` to bypass react-pdf's image cache for this element.   |

Images cannot have children. Inline `data:` URIs are supported; the body cap of 30 MB applies, so large inline payloads can hit the limit. See [api.md](api.md#limits).

## `link`

A clickable hyperlink. **Cannot be inferred** — set `type: "link"` explicitly.

```json
{
  "type": "link",
  "href": "https://example.com",
  "text": "Visit example",
  "style": { "color": "#0066cc" }
}
```

| Property   | Type                              | Notes                                                          |
| ---------- | --------------------------------- | -------------------------------------------------------------- |
| `href`     | `string` (template)               | Destination URL. Required for the link to be useful.           |
| `text`     | `string` (template)               | Link text. Mutually exclusive with `children`.                 |
| `children` | `AnyElementDeclaration[]`         | Use when the link should wrap richer content (e.g. an image).  |
| `wrap`     | template boolean                  | Default `true`.                                                |

## `list`

Logical iterator. Renders no element of its own — it expands into the items it produces. **Has no `style` of its own**; style your loop body or wrap the list in a `view`.

```json
{
  "type": "list",
  "basis": "data.items",
  "header": { "type": "text", "text": "[Item Name] [Cost($)]", "fixed": true },
  "loop":   { "type": "text", "text": "[{{$item.Name}}] [{{$item.Cost}}]" },
  "footer": { "type": "image", "src": "https://example.com/sig.png" }
}
```

| Property | Type                                       | Notes                                                                                                                |
| -------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `basis`  | `string` (template, must resolve to array) | The collection to iterate. Any single-statement JS expression that yields an array is acceptable.                    |
| `loop`   | `AnyElementDeclaration \| AnyElementDeclaration[]` | The element(s) emitted per iteration. Inside this subtree, `$item`, `$index`, and `$parent` are bound (see below).  |
| `header` | `AnyElementDeclaration`                    | Optional. Rendered once before the iterations. Forced `fixed: true` so it repeats on each page break the list spans. |
| `footer` | `AnyElementDeclaration`                    | Optional. Rendered once after the iterations. Same forced `fixed: true`.                                             |

### Iteration locals

Within `loop`, three locals are pushed onto the data scope:

| Local     | Value                                                       |
| --------- | ----------------------------------------------------------- |
| `$item`   | The current element of the `basis` array.                   |
| `$index`  | The 0-based index of the current iteration.                 |
| `$parent` | The `$item` of the enclosing list (when lists are nested).  |

See [src/factory/Elements/ListElementFactory.tsx:8](../src/factory/Elements/ListElementFactory.tsx#L8) for the source of truth.

### Re-entrant headers/footers

The whole point of `list` over a plain loop in client code: when the iterations span a page break, `header` and `footer` re-render at the top/bottom of every page the list touches. This makes table headers that repeat across pages a one-line declaration.

## `shadow`

A drop-shadowed text element. **Cannot be inferred** — set `type: "shadow"` explicitly.

```json
{
  "type": "shadow",
  "text": "BIG TITLE",
  "style": {
    "fontSize": 48,
    "color": "#ffffff",
    "shadowColor": "#000000",
    "shadowOpacity": 0.5,
    "shadowTranslate": 2
  }
}
```

| Property | Type                | Notes                                                                                |
| -------- | ------------------- | ------------------------------------------------------------------------------------ |
| `text`   | `string` (template) | Body text. Same `pageNumber`/`totalPages` locals as `text` elements.                 |
| `wrap`   | template boolean    | Default `true`.                                                                      |

Extra style properties (on top of normal `Style`):

| Property             | Default     | Notes                                                                |
| -------------------- | ----------- | -------------------------------------------------------------------- |
| `shadowColor`        | `"#000000"` | The color of the offset shadow.                                      |
| `shadowOpacity`      | `0.5`       | Opacity of the offset shadow.                                        |
| `shadowTranslate`    | `1`         | Both X and Y offset (units are PDF points).                          |
| `shadowTranslateX`   | inherits `shadowTranslate` | X offset only. Overrides `shadowTranslate` when set.  |
| `shadowTranslateY`   | inherits `shadowTranslate` | Y offset only. Overrides `shadowTranslate` when set.  |

Implementation detail: a `shadow` is a `view` containing two stacked `text` children — one positioned absolutely and offset (the shadow) and one positioned normally (the foreground). See [src/factory/Elements/ShadowElementFactory.tsx](../src/factory/Elements/ShadowElementFactory.tsx).

## Putting it together

A more complete request showing several elements working in concert:

```json
{
  "title": "Invoice",
  "size": "LETTER",
  "data": {
    "company": "Acme Co.",
    "items": [
      { "name": "Widget", "cost": 12.5 },
      { "name": "Gadget", "cost": 7.0 }
    ]
  },
  "styles": {
    "h1": { "fontSize": 24, "fontWeight": "bold" },
    "row": { "display": "flex", "flexDirection": "row", "justifyContent": "space-between" }
  },
  "pages": [
    {
      "type": "page",
      "style": { "padding": 36 },
      "children": [
        { "type": "text", "classes": ["h1"], "text": "{{data.company}} — Invoice" },
        {
          "type": "list",
          "basis": "data.items",
          "header": { "type": "view", "classes": ["row"], "children": [
            { "text": "Item" }, { "text": "Cost" }
          ]},
          "loop":   { "type": "view", "classes": ["row"], "children": [
            { "text": "{{$item.name}}" }, { "text": "${{$item.cost.toFixed(2)}}" }
          ]}
        }
      ]
    }
  ]
}
```

## See also

- [templating.md](templating.md) — what you can put inside `{{...}}`.
- [styling.md](styling.md) — class precedence and supported CSS.
