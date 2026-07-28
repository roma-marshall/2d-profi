# AGENTS.md

## Project Overview

2D Profi is a fully client-side terrace planner built with Vue 3, Vite,
TypeScript, the Composition API, Tailwind CSS, SVG, and Vitest. Users can
configure a terrace, edit its geometry, add special elements, save the plan in
the browser, import or export JSON, and print the result.

## Communication and Language

- The user may provide prompts in Russian. Understand and respond in Russian
  unless the user requests another language.
- Keep source code, identifiers, comments, documentation, UI copy, commit
  messages, and newly created project files in English.

## Commands

- Install dependencies: `npm install`
- Start the development server: `npm run dev`
- Run the type checker: `npm run typecheck`
- Run the test suite: `npm test`
- Run tests in watch mode: `npm run test:watch`
- Create a production build: `npm run build`

Use Node.js 22.13 or newer.

## Project Structure

- `src/components/configurator/` contains the Vue interface components.
- `src/composables/` contains application state, history, persistence, and
  configuration actions.
- `src/data/` contains shape, material, decking, and special-element metadata.
- `src/geometry/` contains pure geometry and SVG calculations.
- `src/tests/` contains Vitest unit tests.
- `src/types/` contains shared TypeScript models.

`TerraceConfig` is the central typed data model. Shape geometry is implemented
as pure generators and exposed through `src/geometry/registry.ts`.

## Implementation Guidelines

- Use Vue 3 Composition API with `<script setup lang="ts">`.
- Preserve strict TypeScript typing. Avoid `any`; use type guards and `unknown`
  for untrusted imported data.
- Use the `@/` alias for imports from `src/`.
- Keep geometry calculations independent of Vue components and browser APIs.
- Add new standard shapes through the typed shape model, metadata, generator,
  and geometry registry instead of branching inside the preview component.
- Treat centimeters as the source unit for dimensions and square centimeters
  as the source unit for geometry area calculations.
- Keep boundary vertex and edge identifiers stable because dimensions and
  decking start-edge selection depend on them.
- Validate and normalize data loaded from JSON or `localStorage`. Preserve
  compatibility with existing saved configurations when changing the model.
- Keep state mutations and undo/redo history logic in
  `useTerraceConfig`, not in presentation components.
- Follow the existing formatting and naming conventions in nearby files.
- Maintain responsive, keyboard-accessible, and print-friendly behavior when
  changing the interface.
- Do not edit generated files in `dist/` or dependencies in `node_modules/`.
- Do not change dependencies or `package-lock.json` unless the task requires
  it.

## Testing and Verification

- Add or update Vitest coverage for geometry, configuration normalization,
  persistence migrations, and state-history behavior when those areas change.
- For focused changes, run the relevant test file first.
- Before completing a code change, run:

```bash
npm run typecheck
npm test
npm run build
```

- For visual changes, also inspect the relevant desktop and mobile layouts and
  confirm that print output is not unintentionally affected.
