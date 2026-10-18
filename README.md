# forty-cdk-bench

Reproducible comparisons between [forty-cdk](https://github.com/tutkli/forty-cdk) and other headless / behavior libraries in the Angular ecosystem.

Every library implements **the same accessible component** for each pattern, written to one spec ([SCENARIOS.md](SCENARIOS.md)), and every benchmark runs against those exact scenarios. A scenario that does not pass its browser probe is not measured. What each library made the consumer write by hand is recorded in [NOTES.md](NOTES.md).

| Library         | Package(s)          | Tier                               |
| --------------- | ------------------- | ---------------------------------- |
| forty-cdk       | `forty-cdk`         | Headless primitives                |
| ng-primitives   | `ng-primitives`     | Headless primitives                |
| Angular Aria    | `@angular/aria`     | Headless primitives (Angular team) |
| Angular CDK     | `@angular/cdk`      | Behavior building blocks           |
| Spartan (brain) | `@spartan-ng/brain` | Headless layer of a styled kit     |

All of them run on the same Angular version in one workspace, zoneless; exact versions are pinned in `package.json` and printed in every report.

## Results at a glance

Generated from `results/*.json` by `pnpm bench:summary`. Each row links to its full report. Libraries cover different sets of patterns, so a total is only comparable together with the number of patterns behind it; the per-pattern tables in each report are the fair comparison.

|                                                                                         |  forty-cdk   |   ng-primitives   | Angular Aria |      Angular CDK       |    Spartan (brain)     |
| --------------------------------------------------------------------------------------- | :----------: | :---------------: | :----------: | :--------------------: | :--------------------: |
| [APG patterns covered](results/coverage.md)                                             |   27 / 28    |      21 / 28      |    9 / 28    |         8 / 28         |        14 / 28         |
| [Initial JS, all measured patterns in one app (gzip, patterns)](results/bundle-size.md) | 48.7 kB (6)  |    82.6 kB (6)    | 41.4 kB (5)  |      43.1 kB (4)       |      61.4 kB (4)       |
| [Required APG checks passed](results/a11y.md)                                           |   59 / 59    |      54 / 59      |   48 / 50    |        33 / 34         |        41 / 41         |
| [Optional / recommended APG checks passed](results/a11y.md)                             |   22 / 24    |      18 / 24      |   19 / 21    |        15 / 17         |        11 / 12         |
| [axe violations (WCAG 2.2 AA tags)](results/a11y.md)                                    |      0       |         1         |      0       |           0            |           0            |
| [Scenarios clean under SSR + hydration](results/ssr.md)                                 |    6 / 6     |       5 / 6       |    5 / 5     |         4 / 4          |         4 / 4          |
| [Leaks (DOM nodes or listeners retained per cycle)](results/perf.md)                    |     none     |  menu (+8 nodes)  |     none     |          none          |          none          |
| [Consumer code, median lines per scenario](results/consumer-code.md)                    |      16      |        15         |      21      |           12           |           16           |
| [Signal inputs](results/api.md)                                                         |    100 %     |       100 %       |    100 %     |          0 %           |         100 %          |
| [Forms integration](results/api.md)                                                     | Signal Forms | reads `NgControl` |      —       | `ControlValueAccessor` | `ControlValueAccessor` |

The runtime timings (render, interaction latency, 1000-option lists) do not reduce to one number: see [results/perf.md](results/perf.md).

## Benchmarks

| Benchmark               | What it measures                                                                                                                                | Report                                       | Method                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| **Bundle size**         | Initial JS each pattern adds to an empty zoneless app, alone and all together                                                                   | [bundle-size.md](results/bundle-size.md)     | [below](#how-bundle-size-is-measured)                  |
| **Accessibility**       | 83 checks from the WAI-ARIA APG (roles, states, keyboard, focus) plus axe-core in the closed and open states                                    | [a11y.md](results/a11y.md)                   | [A11Y.md](A11Y.md)                                     |
| **SSR and hydration**   | Prerender without errors, accessible state in the server HTML, hydration without discarding nodes, behavior after hydration                     | [ssr.md](results/ssr.md)                     | [SSR.md](SSR.md)                                       |
| **Runtime performance** | Render time, interaction latency under CPU throttling, DOM / listener leaks over 100 cycles, 1000-option lists                                  | [perf.md](results/perf.md)                   | [perf.config.mjs](perf.config.mjs)                     |
| **Modern Angular API**  | Signal inputs, outputs, standalone, NgModules, forms integration, lifecycle hooks, NgZone and RxJS, read from the published typings and bundles | [api.md](results/api.md)                     | [scripts/api.mjs](scripts/api.mjs)                     |
| **Coverage**            | Which APG patterns each library ships a primitive for, each claim verified against the installed package                                        | [coverage.md](results/coverage.md)           | [coverage.config.mjs](coverage.config.mjs)             |
| **Consumer code**       | Lines and library symbols a consumer writes for the same component                                                                              | [consumer-code.md](results/consumer-code.md) | [scripts/consumer-code.mjs](scripts/consumer-code.mjs) |
| **Smoke probe**         | The scenario renders, meets its labels and basic behavior, and logs no errors (the gate for everything above)                                   | —                                            | [bench.config.mjs](bench.config.mjs)                   |

Not automated: **real screen readers**. [A11Y.md](A11Y.md) has a manual protocol for NVDA and VoiceOver per pattern.

## Running

```bash
pnpm install
pnpm exec playwright install chromium
pnpm bench:all            # every benchmark, in the order below (about 20 minutes)
pnpm bench:summary        # refresh "Results at a glance" from results/*.json
```

Or one at a time:

```bash
pnpm bench:build          # production build of every scenario (dist/scenarios)
pnpm bench:smoke          # browser probe of every built scenario
pnpm bench:size           # bundle size report
pnpm bench:a11y           # accessibility report
pnpm bench:ssr:build      # SSR / prerender build of every scenario (dist/ssr)
pnpm bench:ssr            # SSR and hydration report
pnpm bench:perf           # runtime report; run it on an otherwise idle machine
pnpm bench:api            # modern Angular API report
pnpm bench:coverage       # APG coverage report
pnpm bench:code           # consumer code report
```

Most scripts accept filters, `<pattern>/<library>` with `*` as a wildcard, e.g. `pnpm bench:build "combobox/*"` or `pnpm bench:a11y "*/forty"`. `bench:build` and `bench:ssr:build` accept `--jobs=N`.

## How bundle size is measured

1. `src/entries/<pattern>--<library>.ts` is generated per scenario: it bootstraps that scenario's `Scenario` component with the shared `src/app.config.ts`. The baseline bootstraps an empty component with the same config.
2. Each entry is a separate production `ng build` (`@angular/build:application`, default optimizations, no output hashing), type-checked on its own so one broken scenario cannot affect another.
3. Initial JS is every `<script src>` and `<link rel="modulepreload">` in the built `index.html`; anything else is reported as lazy. Sizes are minified bytes, gzip level 9 and brotli quality 11.
4. The reported figure is the difference from the baseline: what a consumer pays to add that one component to an app that has none.
5. A second app per library renders every pattern it supports at once, against the same kind of baseline, to show how much of the cost is shared core paid only once.

## Adding a library or a scenario

1. Add the library to `bench.config.mjs` (and `coverage.config.mjs`) and install it with an exact version.
2. Write `src/scenarios/<pattern>/<library>.ts` following [SCENARIOS.md](SCENARIOS.md), or add an `unsupported` entry with the reason.
3. Record what had to be hand-written in [NOTES.md](NOTES.md).
4. `pnpm bench:build "<pattern>/<library>" && pnpm bench:smoke "<pattern>/<library>"` until it passes, then run the other benchmarks.

## Fairness

- Scenarios follow each library's own documentation. If you maintain one of these libraries and a scenario is not how you would write it, please open an issue or a PR.
- Checks come from the APG text, not from any library's behavior, and accept every APG-compliant alternative. Every failure in the reports was reproduced by hand, and failures caused by a scenario rather than its library are labelled as such.
- A missing piece that the consumer has to write by hand is part of the scenario, and it is listed in [NOTES.md](NOTES.md).
- Numbers are tied to the pinned versions and to the date in each report. The repo is maintained alongside forty-cdk, so read it with that in mind and check the method, not just the totals.
