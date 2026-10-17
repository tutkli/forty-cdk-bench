# Bundle size

Generated 2026-10-17T21:55:49.792Z at `7f94166` on Node v24.15.0 (win32-x64).

Initial JavaScript added on top of an empty zoneless Angular app (baseline: 32.0 kB gzip, 28.9 kB brotli, 96.1 kB raw). Production build, one app per cell.

## gzip (level 9)

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | +12.4 kB | +14.0 kB | +15.4 kB | +7.2 kB | +23.3 kB |
| Tabs | +14.1 kB | +17.9 kB | +16.2 kB | n/a | +15.3 kB |
| Menu button | +32.1 kB | +42.5 kB | +36.7 kB | +35.7 kB | n/a |
| Listbox | +21.1 kB | +37.9 kB | +13.0 kB | +19.7 kB | n/a |
| Combobox | +38.1 kB | +45.6 kB | +37.7 kB | n/a | +50.6 kB |
| Dialog (modal) | +18.9 kB | +58.4 kB | n/a | +26.0 kB | +36.2 kB |

## brotli (quality 11)

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | +10.9 kB | +12.4 kB | +13.5 kB | +6.4 kB | +20.5 kB |
| Tabs | +12.4 kB | +15.8 kB | +14.1 kB | n/a | +13.6 kB |
| Menu button | +28.3 kB | +37.3 kB | +32.2 kB | +31.5 kB | n/a |
| Listbox | +18.7 kB | +33.4 kB | +11.4 kB | +17.5 kB | n/a |
| Combobox | +33.4 kB | +40.0 kB | +33.0 kB | n/a | +44.1 kB |
| Dialog (modal) | +16.7 kB | +50.8 kB | n/a | +23.0 kB | +31.7 kB |

## raw (minified)

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | +36.4 kB | +42.7 kB | +48.5 kB | +21.2 kB | +72.9 kB |
| Tabs | +42.0 kB | +55.4 kB | +52.0 kB | n/a | +48.9 kB |
| Menu button | +97.9 kB | +135.8 kB | +135.5 kB | +126.6 kB | n/a |
| Listbox | +64.8 kB | +120.2 kB | +43.1 kB | +65.4 kB | n/a |
| Combobox | +115.4 kB | +150.5 kB | +137.5 kB | n/a | +185.7 kB |
| Dialog (modal) | +56.9 kB | +199.0 kB | n/a | +92.6 kB | +131.3 kB |

`n/a`: the library has no primitive for the pattern. `—`: not written yet.

## All patterns in one app

Every pattern a library supports, rendered together in one app, against the sum of the patterns measured one by one. *Shared* is what the patterns don't pay twice (common core, overlay, focus management). Libraries cover different sets of patterns, so compare this column within a library more than across them.

| Library | Patterns | Together (gzip) | Sum of separate (gzip) | Shared |
| --- | --- | ---: | ---: | ---: |
| forty-cdk | 6 (accordion, tabs, menu, listbox, combobox, dialog) | +52.7 kB | +136.7 kB | 84.0 kB |
| ng-primitives | 6 (accordion, tabs, menu, listbox, combobox, dialog) | +82.4 kB | +216.4 kB | 134.0 kB |
| Angular Aria | 5 (accordion, tabs, menu, listbox, combobox) | +41.3 kB | +119.0 kB | 77.8 kB |
| Angular CDK | 4 (accordion, menu, listbox, dialog) | +43.0 kB | +88.5 kB | 45.5 kB |
| Spartan (brain) | 4 (accordion, tabs, combobox, dialog) | +61.2 kB | +125.5 kB | 64.2 kB |

## Unsupported

- **Angular CDK / Tabs**: `@angular/cdk` has no tabs primitive.
- **Spartan (brain) / Menu button**: brain has no menu primitive; Spartan's dropdown menu is a styled wrapper over `@angular/cdk/menu` (the Angular CDK column).
- **Spartan (brain) / Listbox**: brain has no standalone listbox; listbox roles exist only inside its combobox, select and command widgets.
- **Angular CDK / Combobox**: `@angular/cdk` has no combobox; the experimental one ships separately in `@angular/cdk-experimental`.
- **Angular Aria / Dialog (modal)**: No dialog entry point; the Angular team points to `@angular/cdk/dialog` (the Angular CDK column).

## Versions

- `@angular/core` 22.2.3
- `forty-cdk` 0.38.0
- `ng-primitives` 0.131.2
- `@angular/aria` 22.2.3
- `@angular/cdk` 22.2.3
- `@spartan-ng/brain` 1.8.0
