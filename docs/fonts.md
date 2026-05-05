# Fonts

Fonts are referenced by `fontFamily` inside a `style` block. The service ships three families pre-registered and fetches anything else from the Google Fonts API on demand.

## Bundled defaults

Three families are registered at module load and shipped in [fonts/](../fonts/):

| Family      | Variants                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `Roboto`    | regular, bold, italic, bold italic                                                                    |
| `Teko`      | light, normal, medium, semibold, bold                                                                 |
| `Noto Sans` | thin, ultralight, light, normal, medium, semibold, bold, ultrabold, heavy — each with italic variants |

These work with no configuration. See [src/fontManagement.ts](../src/fontManagement.ts) for the registration calls.

## On-demand Google Fonts

When an element references a `fontFamily` that isn't already registered, the renderer:

1. Calls the [Google Fonts Developer API](https://developers.google.com/fonts/docs/developer_api) to find the family.
2. Registers every variant Google returns, mapping numeric weights and `italic` flags to react-pdf's `fontWeight`/`fontStyle` enum.
3. Records the family in the in-process `registeredFonts` map, so subsequent renders in this process skip the Google API call entirely.

### Required: `GOOGLEAPIKEY`

The service needs a Google API key with the **Web Fonts Developer API** enabled.

```bash
export GOOGLEAPIKEY=your-key-here
yarn start
```

Without a valid key, any reference to a non-bundled family throws:

```
Exception thrown attempting to load a font 'Open Sans' from the Google API server.
Check your API key (set via the GOOGLEAPIKEY environment variable).
```

To obtain a key: enable the Web Fonts API in a Google Cloud project and create an API key restricted to that service.

### Variant mapping

Google's variant strings map to react-pdf's `(fontWeight, fontStyle)` like this:

| Google variant | `fontWeight` | `fontStyle` |
| -------------- | ------------ | ----------- |
| `100`          | `thin`       | `normal`    |
| `200`          | `ultralight` | `normal`    |
| `300`          | `light`      | `normal`    |
| `400` / `regular` | `normal`  | `normal`    |
| `500`          | `medium`     | `normal`    |
| `600`          | `semibold`   | `normal`    |
| `700`          | `bold`       | `normal`    |
| `800`          | `ultrabold`  | `normal`    |
| `900`          | `heavy`      | `normal`    |
| `<weight>italic` / `italic` | as above | `italic` |

When you write `fontWeight: "bold"` in a style, the renderer picks the matching variant; if no exact match exists, react-pdf falls back per its own rules.

## Inspecting registered fonts

```bash
curl http://localhost:9000/fonts
```

Returns the families and `(weight, style)` configurations currently registered in this process. See [api.md](api.md#get-fonts).

Note: registration only records that the source URL exists. Fonts aren't validated as actually loadable until the first time a render references them — a typo in a custom registration won't surface until rendering.

## Using fonts in payloads

```json
{
  "type": "text",
  "text": "Sample",
  "style": {
    "fontFamily": "Open Sans",
    "fontWeight": "bold",
    "fontStyle": "italic",
    "fontSize": 18
  }
}
```

If `Open Sans` isn't bundled, the service fetches it from Google Fonts before this element renders. The fetch is cached per process, so subsequent requests for the same family are free.

## Adding a custom font at boot

If you want a font that isn't on Google Fonts (or you don't want the runtime fetch), register it at startup. Drop the files into [fonts/](../fonts/) and add a `registerFont` call alongside the existing ones in [src/fontManagement.ts](../src/fontManagement.ts):

```typescript
registerFont('My Custom Font', [
  { src: './fonts/MyCustom/MyCustom-Regular.ttf', fontWeight: 'normal' },
  { src: './fonts/MyCustom/MyCustom-Bold.ttf',    fontWeight: 'bold'   },
]);
```

`src` can also be a remote URL; `fontkit` handles the parse.

## Caveats

- **In-process registry**: each Node process has its own `registeredFonts` map. Fonts loaded on demand do not persist across restarts; they reload from Google Fonts after a redeploy.
- **No invalidation**: the Google directory response is cached for the lifetime of a single render. If Google updates a family between renders you'd pick that up on the next request, not within one.
- **Costs**: every cold-start request that references a new family adds ~one HTTP roundtrip to Google. For latency-sensitive paths, prefer bundling or pre-warming.
