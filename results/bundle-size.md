# Bundle size

Generated 2026-10-17T21:39:51.952Z on Node v24.15.0 (win32-x64).

Initial JavaScript added on top of an empty zoneless Angular app (baseline: 32.0 kB gzip, 28.9 kB brotli, 96.1 kB raw). Production build, one app per cell.

## gzip (level 9)

| Pattern        |              forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| -------------- | ---------------------: | ------------: | -----------: | ----------: | --------------: |
| Accordion      | +12.4 kB (+0.0 kB CSS) |             — |            — |           — |               — |
| Tabs           | +14.1 kB (+0.0 kB CSS) |             — |            — |           — |               — |
| Menu button    | +32.1 kB (+0.0 kB CSS) |             — |            — |           — |               — |
| Listbox        | +21.1 kB (+0.0 kB CSS) |             — |            — |           — |               — |
| Combobox       | +38.1 kB (+0.0 kB CSS) |             — |            — |           — |               — |
| Dialog (modal) | +18.9 kB (+0.0 kB CSS) |             — |            — |           — |               — |

## brotli (quality 11)

| Pattern        |              forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| -------------- | ---------------------: | ------------: | -----------: | ----------: | --------------: |
| Accordion      | +10.9 kB (+0.0 kB CSS) |             — |            — |           — |               — |
| Tabs           | +12.4 kB (+0.0 kB CSS) |             — |            — |           — |               — |
| Menu button    | +28.3 kB (+0.0 kB CSS) |             — |            — |           — |               — |
| Listbox        | +18.7 kB (+0.0 kB CSS) |             — |            — |           — |               — |
| Combobox       | +33.3 kB (+0.0 kB CSS) |             — |            — |           — |               — |
| Dialog (modal) | +16.7 kB (+0.0 kB CSS) |             — |            — |           — |               — |

## raw (minified)

| Pattern        | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| -------------- | --------: | ------------: | -----------: | ----------: | --------------: |
| Accordion      |  +36.4 kB |             — |            — |           — |               — |
| Tabs           |  +42.0 kB |             — |            — |           — |               — |
| Menu button    |  +97.9 kB |             — |            — |           — |               — |
| Listbox        |  +64.8 kB |             — |            — |           — |               — |
| Combobox       | +115.4 kB |             — |            — |           — |               — |
| Dialog (modal) |  +56.9 kB |             — |            — |           — |               — |

`n/a`: the library has no primitive for the pattern. `—`: not written yet.

## Versions

- `@angular/core` 22.2.3
- `forty-cdk` 0.38.0
- `ng-primitives` 0.131.2
- `@angular/aria` 22.2.3
- `@angular/cdk` 22.2.3
- `@spartan-ng/brain` 1.8.0
