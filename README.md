# forty-cdk-bench

Reproducible comparisons between [forty-cdk](https://github.com/tutkli/forty-cdk) and other headless / behavior libraries in the Angular ecosystem.

Every library implements **the same accessible component** for each pattern, written to one spec ([SCENARIOS.md](SCENARIOS.md)), and every measurement runs against those exact scenarios. A scenario that does not pass its browser probe is not measured.

| Library         | Package(s)          | Tier                               |
| --------------- | ------------------- | ---------------------------------- |
| forty-cdk       | `forty-cdk`         | Headless primitives                |
| ng-primitives   | `ng-primitives`     | Headless primitives                |
| Angular Aria    | `@angular/aria`     | Headless primitives (Angular team) |
| Angular CDK     | `@angular/cdk`      | Behavior building blocks           |
| Spartan (brain) | `@spartan-ng/brain` | Headless layer of a styled kit     |

All of them run on the same Angular version in one workspace; exact versions are pinned in `package.json` and printed in every report.

## Benchmarks

|                                                                                                | Status  | Command            |
| ---------------------------------------------------------------------------------------------- | ------- | ------------------ |
| **Bundle size**: initial JS each pattern adds to an empty zoneless app                         | ✅      | `pnpm bench:size`  |
| **Smoke probe**: the scenario renders, meets its labels and basic behavior, and logs no errors | ✅      | `pnpm bench:smoke` |
| **Accessibility conformance**: APG keyboard matrix, ARIA, focus, axe, screen readers           | Planned |                    |
| **SSR and hydration**                                                                          | Planned |                    |
| **Runtime performance**: large lists, open/close leaks, interaction latency                    | Planned |                    |

Results live in [`results/`](results/).

## Running

```bash
pnpm install
pnpm exec playwright install chromium
pnpm bench                       # build every scenario, probe it, measure it
pnpm bench:build "combobox/*"    # build a subset: <pattern>/<library>, * for all
pnpm bench:smoke "*/forty"
pnpm bench:size                  # report from whatever is built
```

`bench:build` accepts `--jobs=N` to build in parallel.

## How bundle size is measured

1. `src/entries/<pattern>--<library>.ts` is generated per scenario: it bootstraps that scenario's `Scenario` component with the shared `src/app.config.ts`. The baseline bootstraps an empty component with the same config.
2. Each entry is a separate production `ng build` (`@angular/build:application`, default optimizations, no output hashing).
3. Initial JS is every `<script src>` and `<link rel="modulepreload">` in the built `index.html`; anything else is reported as lazy. Sizes are minified bytes, gzip level 9 and brotli quality 11.
4. The reported figure is the difference from the baseline: what a consumer pays to add that one component to an app that has none.

What this does **not** tell you: the marginal cost of a second pattern from the same library (shared core is paid once), and anything about runtime cost.

## Adding a library or a scenario

1. Add the library to `bench.config.mjs` and install it with an exact version.
2. Write `src/scenarios/<pattern>/<library>.ts` following [SCENARIOS.md](SCENARIOS.md), or add an `unsupported` entry with the reason.
3. Record what had to be hand-written in [NOTES.md](NOTES.md).
4. `pnpm bench:build "<pattern>/<library>" && pnpm bench:smoke "<pattern>/<library>"` until it passes.

## Fairness

- Scenarios follow each library's own documentation. If you maintain one of these libraries and a scenario is not how you would write it, please open an issue or a PR.
- A missing piece that the consumer has to write by hand is part of the scenario, and it is listed in [NOTES.md](NOTES.md).
- Numbers are tied to the pinned versions and to the date in the report.
