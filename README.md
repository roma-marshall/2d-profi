# 2D Profi

2D Profi is a browser-based planner for wooden terraces. It lets users create,
edit, save, and print a precise top-down terrace plan.

Website: [2d-profi.vercel.app](https://2d-profi.vercel.app)

## Features

- Rectangle, L-shape, T-shape, U-form, O-form, circle, and free-form plans
- Live edge dimensions, angles, area calculation, and validation
- Wood finish, board direction, angle, width, gap, and offset controls
- Zoom, pan, fit, rotate, undo/redo, grid, and dimension display controls
- Draggable special elements: walls, cutouts, and stairs
- Local persistence, JSON import/export, plan summary, and print/PDF export
- Responsive desktop and mobile interface

## Tech stack

Vue 3, Vite, TypeScript, Composition API, Tailwind CSS, SVG, and Vitest.
The app is fully client-side; the current plan is stored in `localStorage`.

## Project structure

```text
src/
  components/configurator/  Interface components
  composables/              State, history, and persistence
  data/                     Shape and material metadata
  geometry/                 Pure geometry and SVG calculations
  tests/                    Unit tests
  types/                    Shared TypeScript models
```

`TerraceConfig` is the central typed model. Geometry is separated from Vue:
each shape has a pure generator, registered in the geometry registry. This
makes it possible to add a standard shape without changing the preview
component.

## Run locally

Requirements: Node.js 22.13+ and npm.

```bash
npm install
npm run dev
```

## Checks

```bash
npm run typecheck
npm test
npm run build
```
