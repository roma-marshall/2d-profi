---
name: decompose-vue-components
description: Safely decompose oversized Vue 3 single-file components into focused components and composables while preserving observable behavior, reactive state, events, accessibility, responsive and print layouts, SVG output, and existing user flows. Use when refactoring large `.vue` files, especially ConfiguratorShell, SettingsPanel, or TerracePreview, or when extracting UI sections, dialogs, controls, rendering layers, or cohesive behavior without redesigning the feature.
---

# Decompose Vue Components

Perform a structural refactor only. Preserve the feature's observable behavior
and current user flow unless the user explicitly requests a behavior change.

## 1. Establish the Baseline

1. Read every applicable `AGENTS.md`.
2. Inspect `git status` and preserve unrelated user changes.
3. Read the entire target component and its direct imports before editing.
4. Map the behavior that must remain stable:
   - props, emits, slots, template refs, and component public APIs;
   - state ownership, computed values, watchers, and lifecycle hooks;
   - event payloads, event ordering, and async or `nextTick` timing;
   - keyboard, pointer, focus, dialog, and cleanup behavior;
   - CSS selectors, responsive layouts, print rules, and visible UI copy;
   - SVG structure, drawing order, clipping, transforms, and coordinates;
   - persistence, history, import/export, and configuration normalization.
5. Run the repository's existing typecheck, focused tests, and build before
   editing. Record pre-existing failures instead of treating them as regressions.
6. Identify the affected critical user flows. Add characterization tests for
   fragile logic when the current test setup supports them. Do not introduce a
   new test framework solely for this refactor unless the user requests it.

## 2. Choose Extraction Boundaries

Extract one cohesive responsibility at a time. Prefer boundaries such as:

- a complete template section with a small, explicit interface;
- a dialog, toolbar, control group, summary, or notification;
- a self-contained SVG rendering layer;
- cohesive reusable behavior that belongs in a composable.

For this repository, consider these boundaries without treating them as
mandatory:

- `ConfiguratorShell.vue`: workflow navigation, summary dialog, file actions,
  and notifications;
- `SettingsPanel.vue`: layout, decking, and special-element settings;
- `TerracePreview.vue`: viewport controls, grid, dimensions, decking, and
  special-element rendering.

Keep state in its current owner during the first extraction. Prefer explicit
typed props and emits over duplicated state, implicit coupling, or unnecessary
provide/inject. Move state into a composable only when the extracted behavior
is cohesive and its ownership remains clear.

Do not optimize for an arbitrary line count. Leave code together when splitting
it would create a larger or less stable interface.

## 3. Extract Incrementally

1. Define the proposed child contract before moving code.
2. Extract the smallest useful unit.
3. Preserve names, defaults, emitted payloads, DOM order, and visible output.
4. Keep business logic unchanged while moving it. Report discovered bugs
   separately unless the user asks to fix them.
5. Preserve Vue reactivity:
   - do not replace live computed or ref values with snapshots;
   - avoid destructuring reactive props in a way that loses reactivity;
   - preserve watcher options and execution timing;
   - preserve lifecycle registration and listener cleanup;
   - preserve writable versus readonly ownership.
6. Preserve template-ref and dialog behavior, including focus restoration and
   imperative element methods.
7. Preserve scoped-style behavior. Move or adjust selectors only when required
   by the new component boundary, and verify the rendered result.
8. Keep SVG element ordering and coordinate-space assumptions stable.
9. Update imports and remove dead code created by the extraction.
10. Inspect the diff before starting the next extraction.

Avoid combining decomposition with redesigns, copy changes, dependency changes,
state-model migrations, broad renaming, or unrelated cleanup.

## 4. Verify Every Step

After each extraction:

1. Run the typechecker.
2. Run the most relevant existing tests.
3. Verify the affected user flow in the running application when browser
   control is available.
4. Compare the affected desktop, mobile, and print presentation when relevant.
5. Check the console for Vue warnings and runtime errors.
6. Review the diff for accidental behavior, styling, or API changes.

Use checkpoints relevant to the changed component, including:

- selecting shapes and editing dimensions;
- switching decking settings and start edges;
- adding, moving, editing, and removing special elements;
- zooming, panning, fitting, rotating, and toggling preview layers;
- undoing, redoing, resetting, saving, importing, and exporting;
- opening and closing the summary while preserving focus;
- printing the plan;
- completing the same flow at mobile width.

Do not claim a user flow was verified unless it was actually exercised.

## 5. Complete the Refactor

1. Run all verification commands required by `AGENTS.md`.
2. Confirm that existing public component contracts and stored-data behavior
   remain compatible.
3. Summarize:
   - extracted components or composables;
   - state ownership and their props/emits contracts;
   - automated checks and user flows exercised;
   - any unverified behavior or remaining risk.

Stop and ask for direction when a proposed boundary requires a product decision
or an observable behavior change that cannot be inferred safely.
