# Styling

Layout uses [Yoga](https://yogalayout.com/) (flexbox) under the hood through `@react-pdf/renderer`. If you have web-CSS experience, most of it transfers directly.

## What's supported

The CSS subset is whatever react-pdf accepts — see the canonical list at [react-pdf.org/styling#valid-css-properties](https://react-pdf.org/styling#valid-css-properties). Common buckets:

- **Box model**: `margin`, `padding`, `width`, `height`, `border`, etc.
- **Flex layout**: `display: flex`, `flexDirection`, `justifyContent`, `alignItems`, `gap`, `flex`, `flexBasis`, `flexGrow`, `flexShrink`, `flexWrap`.
- **Positioning**: `position: relative | absolute`, `top`, `right`, `bottom`, `left`.
- **Typography**: `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `color`, `textAlign`, `lineHeight`, `letterSpacing`, `textDecoration`, `textTransform`.
- **Backgrounds & borders**: `backgroundColor`, `borderColor`, `borderRadius`, `borderStyle`, `borderWidth` (and per-side variants).
- **Transforms**: `transform: "translateX(...) rotate(...)"`.

What's **not** supported the way you'd expect on the web:

- No CSS grid (Yoga is flexbox).
- No pseudo-classes (`:hover`, `:nth-child`).
- No media queries — there's only the page.
- No animations.

## Where styles go

### Inline `style`

Attached directly to an element:

```json
{
  "type": "text",
  "text": "Hello World",
  "style": {
    "fontSize": 18,
    "color": "#000000",
    "margin": 5,
    "position": "absolute",
    "top": 0,
    "left": 0
  }
}
```

### Named classes

Defined once in `styles` at the request level, applied via `classes` on any stylable element:

```json
{
  "styles": {
    "zeroPad":    { "margin": 0, "padding": 0 },
    "smallPad":   { "padding": 2 },
    "guideTitle": { "fontSize": 24, "fontWeight": "bold", "color": "#F7A03A" }
  },
  "pages": [
    {
      "type": "page",
      "children": [
        {
          "type": "text",
          "classes": ["zeroPad", "smallPad", "guideTitle"],
          "style": { "color": "#000000" },
          "text": "Title"
        }
      ]
    }
  ]
}
```

## Precedence

Unlike CSS specificity, application here is purely positional:

1. `classes` are applied **in list order**. Later classes overwrite same-named properties from earlier ones.
2. The element's own `style` is applied **last**, overriding any class.

So in the example above:

- `padding` resolves to `2` (smallPad overwrites zeroPad's `0`).
- `color` resolves to `"#000000"` (inline `style` overrides `guideTitle`'s orange).

The merge is implemented in [src/factory/ElementFactory.tsx:180](../src/factory/ElementFactory.tsx#L180) (`buildFinalStyle`).

## Templated style values

Every value in a `style` object can be a templated string — the wire type is `Style[Property] | string`. The string is evaluated through the same templating pipeline as text content:

```json
{
  "style": {
    "marginLeft": "{{data.standardMargin}}",
    "color":      "{{$item.isActive ? '#0066cc' : '#999999'}}",
    "fontSize":   "{{14 + data.zoom}}"
  }
}
```

Two extra locals are exposed inside style-string templates: `appliedStyle` (the class-merged style — *not* including any inline values) and `style` (the original inline `style` declaration). Use `appliedStyle.fontSize` to derive a value from class state. See [templating.md](templating.md#style-template-locals-inside-style-values).

See [templating.md](templating.md) for the expression rules.

## Common patterns

### Two-column flow with gap

```json
{
  "type": "view",
  "style": { "display": "flex", "flexDirection": "row", "gap": 12 },
  "children": [
    { "type": "view", "style": { "flex": 1 }, "children": [ /* left */ ] },
    { "type": "view", "style": { "flex": 1 }, "children": [ /* right */ ] }
  ]
}
```

### Absolute-positioned overlay

```json
{
  "type": "view",
  "style": { "position": "relative", "width": 200, "height": 200 },
  "children": [
    { "src": "https://example.com/bg.png", "style": { "position": "absolute", "top": 0, "left": 0, "width": 200, "height": 200 } },
    { "type": "text", "text": "Overlay", "style": { "position": "absolute", "top": 8, "left": 8, "color": "white" } }
  ]
}
```

### Repeating page header (fixed)

```json
{
  "type": "view",
  "fixed": true,
  "style": { "position": "absolute", "top": 12, "left": 12, "right": 12 },
  "children": [
    { "type": "text", "text": "Confidential — Page {{pageNumber}}/{{totalPages}}" }
  ]
}
```

`pageNumber` and `totalPages` are only available inside `text`/`shadow` text bodies — see [templating.md](templating.md#page-render-locals-text-shadow).

## See also

- [elements.md](elements.md) — which properties each element accepts.
- [fonts.md](fonts.md) — using `fontFamily` correctly.
