# SSR and hydration

Does each scenario render on the server, ship its initial accessible state in the server HTML, hydrate onto that HTML instead of re-rendering it, and still work afterwards?

```bash
node scripts/ssr-build.mjs              # prerender every scenario into dist/ssr/<pattern>--<library>
node scripts/ssr-build.mjs "tabs/*"     # a subset, same filters as bench:build; --jobs=N (default 2)
node scripts/ssr.mjs                    # check what is built, write results/ssr.json and results/ssr.md
```

## Build

For each scenario, `scripts/ssr-build.mjs` generates `src/entries/ssr/<pattern>--<library>/` (gitignored) and runs one production `ng build` on it, so a scenario that breaks on the server cannot break another one's build:

- `config.ts`: the shared `src/app.config.ts` plus `provideClientHydration(withEventReplay())`.
- `main.ts`: `bootstrapApplication(Scenario, clientConfig)`.
- `main.server.ts`: the same config plus `provideServerRendering(withRoutes([{ path: '**', renderMode: RenderMode.Prerender }]))`, exported as the default bootstrap function that receives the `BootstrapContext`.
- `tsconfig.json`: only those two files.

The build is the CLI's own SSG path: `ng build --configuration=production --browser=… --server=… --output-mode=static --output-hashing=none`. The scenarios have no router, so `@angular/ssr` prerenders the single root route into `dist/ssr/<id>/browser/index.html`. Nothing in `angular.json`, `src/app.config.ts` or the bundle-size builds changes. The build log and exit code are kept in `dist/ssr/<id>/build.log` and `build.json`: a build or prerender failure is a result, not a crash of the script.

Applications are zoneless (the Angular 22 default), as in every other benchmark here.

## What is checked

| Dimension                   | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Server render**           | The build exits 0, writes a prerendered `index.html` whose `bench-scenario` carries `ng-server-context`, and its log has no `[ERROR]` / `ERROR` lines. A server-side exception (such as a `document`, `window` or `MutationObserver` access) either fails the prerender or, when Angular's error handler absorbs it, is logged as `ERROR` while the build still exits 0 with whatever markup was rendered before the throw; both fail this dimension. Warnings are listed, not failed.                                                                 |
| **Server markup**           | Chromium with **JavaScript disabled** loads the prerendered page. `bench-scenario` must have content, and the pattern's leading assertion steps from `bench.config.mjs` (every `expect` / `text` step before the first interaction) must already hold, checked once with no waiting.                                                                                                                                                                                                                                                                   |
| **Hydration**               | Chromium with JavaScript loads the page. An init script snapshots every element inside `bench-scenario` once the HTML is parsed (before the deferred module script runs) and counts element nodes added to or removed from it while the app boots. After the page settles, hydration passes when the root's `ngh` attribute was consumed by the client, **none of the server-rendered elements was discarded**, and the console logged no error or warning. Any `NG05xx` code is recorded. The report also lists how many elements the client created. |
| **Post-hydration behavior** | The full smoke probe for the pattern runs against the hydrated page, as in `bench:smoke`. A console error during the probe fails it.                                                                                                                                                                                                                                                                                                                                                                                                                   |

Unsupported cells (`unsupported` in `bench.config.mjs`) are `n/a`.

### Server HTML vs hydrated page (informational)

The leading assertions only cover what the probe checks first, so `results/ssr.md` also compares, with JavaScript disabled and again after hydration but before any interaction:

- the Playwright ARIA snapshot of `bench-scenario` (roles, names, states, text), line by line;
- its keyboard tab stops, in order: elements with `tabIndex >= 0` that are not disabled, `inert` or `hidden`.

A difference means a user without JavaScript yet (slow network, failed script) meets a different accessible widget than after hydration: missing content, missing names, or no way to tab into it. It is reported with its hand-verified cause, not counted as a failure, because some differences are deliberate library design (lazy panel content).

## Per-library setup

The SSR configuration is the same for every scenario. A library that documents a provider needed for SSR gets it through the `ssrSetup` map in `scripts/ssr-build.mjs`, which writes it into that scenario's generated `config.ts` only; it is recorded in `build.json` and listed in `results/ssr.md` under "Per-library SSR setup". No library currently needs one.

## Validating the harness

Each failure mode was provoked once with throwaway apps built the same way, to confirm the harness reports it rather than passing it silently:

| Control                                                                                   | Reported as                                                                                   |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Client bootstrapped **without** `provideClientHydration` over hydration-ready server HTML | hydration ❌: root `ngh` not consumed, 17 of 18 server elements discarded                     |
| Component reading `window.innerWidth` in a field initializer                              | server render ❌: build exits 1, `ReferenceError: window is not defined`, no prerendered page |
| Component that removes one of its own template nodes on the server only (DOM mismatch)    | hydration ❌ with `NG0502`, post-hydration ❌                                                 |

## Limits

- **Overlays are not in the server markup by design.** Menus, comboboxes and dialogs render their popup only after an interaction, so their leading assertions check the closed state (no `role=menu`, no `role=dialog`, the combobox input). Not having the popup in the server HTML is not penalized.
- **Interactions are not replayed from before hydration.** `withEventReplay()` is on, but the probe interacts only after the page has settled; whether a click made before hydration is replayed is not measured.
- **Static prerendering only.** One route rendered at build time with the Node.js platform; no per-request rendering, no `REQUEST` token, no edge runtime.
- **"Settled"** means network idle, the root `ngh` attribute consumed, and 300 ms without DOM changes inside `bench-scenario`, capped at 5 s. A library that keeps mutating its subtree for longer would show those mutations in the counts.
- **Client-created elements are not a failure.** A hydrated component may legitimately add DOM on the client, for example something it only renders in the browser. Only discarded server elements count as a destructive re-render.
- **Chromium only.**
