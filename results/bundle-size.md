# Bundle size

Generated 2026-10-18T19:12:56.518Z at `0c725c5` on Node v24.15.0 (win32-x64).

Initial JavaScript added on top of an empty zoneless Angular app (baseline: 32.0 kB gzip, 28.9 kB brotli, 96.1 kB raw). Production build, one app per cell.

## gzip (level 9)

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | +12.0 kB | +14.0 kB | +15.4 kB | +7.2 kB | +23.3 kB |
| Tabs | +13.6 kB | +17.9 kB | +16.2 kB | n/a | +15.3 kB |
| Menu button | +31.4 kB | +42.5 kB | +36.7 kB | +35.7 kB | n/a |
| Listbox | +18.4 kB | +38.1 kB | +13.2 kB | +19.8 kB | n/a |
| Combobox | +35.3 kB | +45.7 kB | +37.8 kB | n/a | +50.7 kB |
| Dialog (modal) | +17.6 kB | +58.4 kB | n/a | +26.0 kB | +36.2 kB |

## brotli (quality 11)

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | +10.6 kB | +12.4 kB | +13.5 kB | +6.4 kB | +20.5 kB |
| Tabs | +11.9 kB | +15.8 kB | +14.1 kB | n/a | +13.6 kB |
| Menu button | +27.8 kB | +37.3 kB | +32.1 kB | +31.5 kB | n/a |
| Listbox | +16.3 kB | +33.6 kB | +11.5 kB | +17.6 kB | n/a |
| Combobox | +31.1 kB | +40.0 kB | +33.1 kB | n/a | +44.2 kB |
| Dialog (modal) | +15.5 kB | +50.8 kB | n/a | +23.0 kB | +31.7 kB |

## raw (minified)

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | +35.7 kB | +42.7 kB | +48.5 kB | +21.2 kB | +72.9 kB |
| Tabs | +40.8 kB | +55.4 kB | +52.0 kB | n/a | +48.9 kB |
| Menu button | +96.6 kB | +135.8 kB | +135.6 kB | +126.6 kB | n/a |
| Listbox | +56.9 kB | +120.5 kB | +43.5 kB | +65.7 kB | n/a |
| Combobox | +107.9 kB | +150.8 kB | +137.8 kB | n/a | +186.0 kB |
| Dialog (modal) | +53.6 kB | +199.0 kB | n/a | +92.6 kB | +131.3 kB |

`n/a`: the library has no primitive for the pattern. `—`: not written yet.

## All patterns in one app

Every pattern a library supports, rendered together in one app, against the sum of the patterns measured one by one. *Shared* is what the patterns don't pay twice (common core, overlay, focus management). Libraries cover different sets of patterns, so compare this column within a library more than across them.

| Library | Patterns | Together (gzip) | Sum of separate (gzip) | Shared |
| --- | --- | ---: | ---: | ---: |
| forty-cdk | 6 (accordion, tabs, menu, listbox, combobox, dialog) | +48.7 kB | +128.3 kB | 79.6 kB |
| ng-primitives | 6 (accordion, tabs, menu, listbox, combobox, dialog) | +82.6 kB | +216.7 kB | 134.1 kB |
| Angular Aria | 5 (accordion, tabs, menu, listbox, combobox) | +41.4 kB | +119.4 kB | 77.9 kB |
| Angular CDK | 4 (accordion, menu, listbox, dialog) | +43.1 kB | +88.7 kB | 45.5 kB |
| Spartan (brain) | 4 (accordion, tabs, combobox, dialog) | +61.4 kB | +125.6 kB | 64.2 kB |

## Unsupported

- **Angular CDK / Tabs**: `@angular/cdk` has no tabs primitive.
- **Spartan (brain) / Menu button**: brain has no menu primitive; Spartan's dropdown menu is a styled wrapper over `@angular/cdk/menu` (the Angular CDK column).
- **Spartan (brain) / Listbox**: brain has no standalone listbox; listbox roles exist only inside its combobox, select and command widgets.
- **Angular CDK / Combobox**: `@angular/cdk` has no combobox; the experimental one ships separately in `@angular/cdk-experimental`.
- **Angular Aria / Dialog (modal)**: No dialog entry point; the Angular team points to `@angular/cdk/dialog` (the Angular CDK column).

## Versions

- `@angular/core` 22.2.3
- `forty-cdk` 0.39.0
- `ng-primitives` 0.131.2
- `@angular/aria` 22.2.3
- `@angular/cdk` 22.2.3
- `@spartan-ng/brain` 1.8.0
