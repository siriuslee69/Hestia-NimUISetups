# Metadata UI Guide

This guide explains how `modular/shared/modular-menu.js` parses card metadata and how it maps metadata fields to menu options.

## Where Metadata Lives

Each `.mod-data-card` is expected to provide a JSON object in `data-metadata`.

Example:

```html
<article
  class="mod-data-card"
  data-metadata='{
    "created":"Mar 2, 2026",
    "lastEdited":"15 min ago",
    "status":"Live",
    "tags":["alpha","beta","gamma"],
    "owner":{"lead":"Lina","reviewer":"Noah"}
  }'
>
  ...
</article>
```

Important:

- `data-metadata` must be valid JSON.
- Top-level value must be an object (`{ ... }`), not an array/string.
- Field names at this top level become entries in the metadata menu.

## Type Mapping to Menu Controls

The metadata menu is generated dynamically from field names and value types.

### 1) Single-value fields (`string`, `number`, `boolean`, `null`)

Example:

```json
{
  "status": "Live",
  "priority": "High",
  "lastEdited": "15 min ago"
}
```

Menu mapping:

- One checkbox per field (`status`, `priority`, `lastEdited`).
- Checked means: show that field in the metadata row.

### 2) Array fields

Example:

```json
{
  "tags": ["alpha", "beta", "gamma"],
  "checkpoints": ["ingest", "review", "publish"]
}
```

Menu mapping:

- A select control with:
  - `Carousel`
  - `Index 0`
  - `Index 1`
  - ...

Behavior:

- `Carousel`: rotate one value at a time; hover or pin to see full tooltip list.
- `Index N`: show only the selected array element.

### 3) Object fields

Example:

```json
{
  "owner": {
    "lead": "Lina",
    "reviewer": "Noah"
  }
}
```

Menu mapping:

- A select control with:
  - `Carousel`
  - each object key (`lead`, `reviewer`, ...)

Behavior:

- `Carousel`: rotate through key/value entries.
- key selection: show only that selected object field.

## Defaults

- Single-value fields default to checked.
- Array/object fields default to:
  - first index/key (if available)
  - `Carousel` if no index/key is available
- `tags` defaults to `Carousel`.

## Rendering Behavior

All selected metadata fields are rendered into one grid container:

- base: `display: grid`
- fixed cell width via CSS variable `--mod-meta-grid-cell-w`
- list mode:
  - one row (`grid-auto-flow: column`)
  - as many columns as selected fields
  - no wrapping
  - metadata page button cycles visible item pages
- details mode:
  - one row (`grid-auto-flow: column`)
  - as many columns as selected fields
- cards mode:
  - one fixed-width column (`grid-template-columns: var(--mod-meta-grid-cell-w)`)
  - as many rows as selected fields

Carousel behavior:

- one value is visible at a time by default
- full list appears only in tooltip on hover or pinned/active state

## Fallback Behavior

If `data-metadata` is missing or invalid JSON:

- the UI uses fallback metadata (`created`, `lastEdited`, and existing tag pills)
- so cards still render without breaking the metadata menu.
