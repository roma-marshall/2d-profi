# 2D Terrace Configurator

A responsive MVP for configuring a wooden terrace in a precise top-down 2D
workspace. It is built with Vue 3, Vite, TypeScript, the Composition API,
Tailwind CSS, SVG, and Vitest. The application is entirely client-side and
persists the latest configuration in `localStorage`.

## Features

- Rectangle, L-shaped, T-shaped, and circular terrace plans
- Shape-specific dimensions in centimeters
- Instant proportional SVG rendering
- Dimension lines and values around every plan
- Three wood finishes and two board directions
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

`TerraceConfig` is the single typed configuration model. Vue components never
calculate terrace geometry themselves. Each shape has a pure function that
turns dimensions into an SVG path, points, bounds, area, and dimension guides.
`TerracePreview` talks only to the geometry registry, so registering another
shape does not require changing the preview component.

Validation and storage normalization live outside the UI. This prevents invalid
or outdated `localStorage` data from reaching the renderer and keeps the
components focused on interaction and presentation.

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

The geometry test suite covers every shape generator, including paths, points,
bounds, areas, dimension guides, and registry dispatch.

## Adding a shape

1. Add its ID and dimensions to `src/types/terrace.ts`.
2. Create a pure generator in `src/geometry/`.
3. Register the generator in `src/geometry/registry.ts`.
4. Add defaults and field metadata in `src/data/shapes.ts`.
5. Add geometry unit tests.

No change is needed in `TerracePreview.vue`.

## Production improvements

For a production configurator, the next useful steps would be:

- Add decimal precision, locale-aware units, and imperial conversion.
- Add snap-to-grid editing and draggable control points.
- Model board gaps, edge trims, joist layout, and material waste.
- Add pricing and a bill of materials backed by a versioned product catalog.
- Support shareable URLs, cloud projects, authentication, and server-side
  validation.
- Add export to PDF/DXF, print layouts, and accessible text summaries.
- Expand tests with component interaction, visual regression, and end-to-end
  browser coverage.
- Add telemetry, error reporting, content security policies, and a documented
  storage migration strategy.
