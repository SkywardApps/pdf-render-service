# Templating

Any string field in a request payload (text body, image src, style values, even `basis`) supports `{{...}}` interpolation. The expression inside the braces resolves against the current data scope and is substituted into the string.

## Two evaluation paths

To keep the common case fast, the renderer tries a regex-based dereference first and only falls back to the JS sandbox for non-trivial expressions.

### 1. Fast path — simple dereferences

A pattern matching `[a-zA-Z_$][a-zA-Z0-9_.]+` is treated as a dotted property path on the scope. No JS engine is involved.

```json
{ "text": "{{data.user.name}}" }
{ "text": "Hello {{$item.label}}" }
```

These run as a single object walk and are very fast.

### 2. Sandboxed JS — anything else

If anything in the substituted string still looks like `{{...}}` after the fast path runs, the remaining expressions are evaluated through [`vm2`](https://www.npmjs.com/package/vm2). The sandbox is configured with:

| Setting   | Value     |
| --------- | --------- |
| `eval`    | `false`   |
| `wasm`    | `false`   |
| `timeout` | `150` ms  |
| `sandbox` | the scope |

Any single-statement JS expression that returns a stringifiable value works:

```json
{ "text": "{{[1,2,3,4].filter(i => i > 2).map(i => 'Index:' + (i+1))}}" }
{ "text": "{{$item.cost.toFixed(2)}}" }
{ "src":  "https://api.example.com/{{encodeURIComponent(data.query)}}" }
```

If a script throws, the thrown error is stringified and inserted in place of the expression — your PDF will visibly contain the error text rather than failing the render. Errors are also logged.

> **Performance**: any string with at least one expression that reaches the JS path instantiates a fresh `vm2` VM (`condition` and `basis` evaluations each spin one up too). For documents with thousands of templates, prefer fast-path dereferences. A list iterating 1000 items where every cell uses an inline lambda will be noticeably slower than one that uses `{{$item.value}}`.

## The data scope

There are two layers:

1. **Global scope** — the `PdfRequest` object itself, including `data`, `styles`, `title`, etc.
2. **Local scope stack** — additional frames pushed by container elements (currently just `list`).

When templates are evaluated, the **top local frame is merged with the global scope**, with the local frame taking precedence. So inside a list iteration `data.X` is still reachable, and `$item` etc. shadow any same-named keys from the global scope.

The scope merge is implemented in [src/factory/ElementFactory.tsx](../src/factory/ElementFactory.tsx) — see `finalizeStringDeferred` and the `scope` getter.

### Globals you can reach

Anything you put in the request top level is reachable. The most common:

| Reference                | What it resolves to                                                  |
| ------------------------ | -------------------------------------------------------------------- |
| `data`                   | Your `data` payload.                                                 |
| `data.something`         | A field on it.                                                       |
| `title`, `size`, etc.    | The corresponding top-level request fields.                          |
| `styles.someClass`       | A registered class object (rarely needed in templates).              |

### List-iteration locals

Inside a `list`'s `loop`, `header`, or `footer` subtree:

| Local     | Value                                                            |
| --------- | ---------------------------------------------------------------- |
| `$item`   | The current element of the `basis` array.                        |
| `$index`  | The 0-based iteration index.                                     |
| `$parent` | The `$item` of the enclosing list (for nested lists).            |

`$parent` only carries one level up — if you nest three lists deep and need the outermost item, you'd need to project it down via the data shape.

### Page-render locals (text, shadow)

When a `text` or `shadow` element renders, react-pdf supplies render-time locals exposed to your templates:

| Local         | Value                                            |
| ------------- | ------------------------------------------------ |
| `pageNumber`  | The page this element lands on (1-based).        |
| `totalPages`  | Total page count of the document.                |

Example:

```json
{ "type": "text", "fixed": true, "text": "Page {{pageNumber}} of {{totalPages}}" }
```

These are only defined inside `text`/`shadow` `text` properties. Outside that context they're undefined.

### Style-template locals (inside `style` values)

When a string value inside a `style` block is finalized, two extra locals are exposed:

| Local          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| `appliedStyle` | The class-merged style for this element (no inline values yet). |
| `style`        | The original inline `style` declaration as written.            |

This lets a templated value reference the class-derived state, e.g. `"{{appliedStyle.fontSize * 1.5}}"`. Note that `appliedStyle` does **not** update incrementally as other inline-style strings are evaluated — every inline value sees the same class-only snapshot.

## Where templates can appear

Anywhere the schema accepts a string. Concretely:

- `text`, `href`, `src`, `basis`, `condition`.
- All values inside `style` (the type is `Style[Property] | string` to allow this; see [src/wire/ElementDeclaration.ts:17](../src/wire/ElementDeclaration.ts#L17)).
- `key`, `comment` (technically allowed; rarely useful).
- The boolean-template fields `fixed`, `break`, `wrap`, `cache`, `debug` accept strings that resolve to booleans.

## `condition`

`condition` is a special template field that gates whether an element renders.

```json
{
  "type": "view",
  "condition": "data.user.isAdmin",
  "children": [
    { "text": "Admin-only content" }
  ]
}
```

The expression is evaluated through the JS sandbox; truthy values render the subtree, falsy values skip it entirely. This is useful for optional sections, debug-only blocks, and per-environment branching.

## Limits and gotchas

- **150 ms script timeout** is per-expression, not per-render. A single `{{...}}` that loops too long will be killed and the error stringified into your output.
- **Only single-statement expressions** work cleanly — `vm2.run` evaluates as an expression. Statements (`if`, declarations) won't return a value.
- **No I/O**, **no `require`**, **no eval**, **no wasm**. The sandbox cannot read files, hit networks, or load modules.
- **Errors don't fail the request** — they appear in the output text. If you need a request to fail when a template fails, validate your data before sending or use `condition` to skip clearly-broken branches.
- **Nested braces** (e.g. `{{ {a:1}.a }}`) work via the sandbox path because the regex extracts greedily-then-non-greedily; if you need literal `{{` in your output, you currently can't escape them.

## See also

- [elements.md](elements.md) for the elements that consume templated values.
- [styling.md](styling.md) for templated style values.
