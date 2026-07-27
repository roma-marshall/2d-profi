# 2D Profi

A responsive MVP for configuring a wooden terrace in a precise top-down 2D
workspace. It is built with Vue 3, Vite, TypeScript, the Composition API,
Tailwind CSS, SVG, and Vitest. The application is entirely client-side and
persists the latest configuration in `localStorage`.

## Features

- Rectangle, L-shaped, T-shaped, U-shaped, O-shaped, circular, and free-form
  plans
- Snap-to-grid free-form drawing with contour closing and draggable vertices
- Live free-form edge lengths, internal angles, and self-intersection validation
- House walls, rectangular and circular cutouts, and stairs as draggable special
  elements
- Type-specific special-element dimensions, rotation, placement validation, and
  keyboard deletion
- Net surface calculation with rectangular and circular cutout subtraction
- Shape-specific dimensions in centimeters
- Instant proportional SVG rendering
- Vertex labels and dimension lines around every plan edge
- Clickable edge dimensions linked to their corresponding inputs
- Three wood finishes and two board directions
- Arbitrary board angle, width, gap, starting edge, and layout offset
- Three-step floor plan, decking, and review workflow
- Canvas zoom, pan, fit, undo/redo, grid, dimension, and decking controls
- Local plan summary with dimensions and finish selections
- JSON save/load, print view, and a transparent approximate material estimate
- Context-aware minimum and maximum validation
- Automatic local persistence and a one-click reset
- Responsive desktop and mobile layouts

## Architecture

The application keeps rendering, state management, and geometry deliberately
separate:

```text
src/
  components/configurator/  Vue presentation components
  composables/               Configuration state and persistence
  data/                      Shape metadata, defaults, and wood finishes
  geometry/                  Pure SVG geometry functions and registry
  tests/                     Unit tests for geometry
  types/                     Shared TerraceConfig and geometry types
```

`TerraceConfig` is the single typed configuration model. It contains the shape,
dimensions, material, a normalized `DeckingLayout`, and a discriminated union of
special elements. Vue components never calculate terrace geometry themselves.
Each shape has a pure function that turns dimensions into an SVG path, points,
bounds, area, vertices, edges, and dimension metadata.
`TerracePreview` talks only to the geometry registry, so registering another
standard dimension-driven shape does not require changing the preview component.
Free-form interaction is an editor mode layered over the same registry output;
its polygon math and validation remain pure functions in `geometry/freeForm.ts`.
Special-element paths, area effects, point-in-terrace checks, overlap checks, and
automatic initial placement are pure functions in
`geometry/specialElements.ts`.

Validation and storage normalization live outside the UI. This prevents invalid
or outdated `localStorage` data from reaching the renderer and keeps the
components focused on interaction and presentation. Older saved plans without
the detailed decking model are migrated automatically when they are loaded.

Undo/redo history is maintained separately from persisted configuration, while
JSON import uses the same parser and normalization path as `localStorage`.

## Getting started

Requirements:

- Node.js 22.13 or newer
- npm

```bash
npm install
npm run dev
```

Vite prints the local development URL in the terminal.

## Quality checks

```bash
npm run typecheck
npm test
npm run build
```

The test suites cover every shape generator, including paths, points, bounds,
areas, vertex topology, edge dimensions, free-form polygon validation, and
registry dispatch. Special-element tests cover SVG geometry, concave and
circular containment, rotated cutout overlap, initial placement, area
subtraction, import normalization, and history. Configuration tests also cover
legacy migration, imported value normalization, free-form editing, and
undo/redo.

## Adding a shape

1. Add its ID and dimensions to `src/types/terrace.ts`.
2. Create a pure generator in `src/geometry/`.
3. Register the generator in `src/geometry/registry.ts`.
4. Add defaults and field metadata in `src/data/shapes.ts`.
5. Add geometry unit tests.

No change is needed in `TerracePreview.vue`.

## Production improvements

For a production configurator, the next useful steps would be:

- Add optional angle constraints, edge insertion, and pointer-friendly vertex
  deletion for free-form plans.
- Add multiple terrace areas and imported site-plan underlays.
- Model edge trims, joist layout, board cutting, and reusable offcuts.
- Add pricing and a bill of materials backed by a versioned product catalog.
- Support shareable URLs, cloud projects, authentication, and server-side
  validation.
- Add PDF/DXF export and construction-grade print layouts.
- Expand tests with component interaction, visual regression, and end-to-end
  browser coverage.
- Add telemetry, error reporting, content security policies, and a documented
  storage migration strategy.
