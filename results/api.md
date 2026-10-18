# Modern Angular API

Generated 2026-10-18T19:16:32.023Z. Static analysis of each library's own published typings (`types/**/*.d.ts`) and bundles (`fesm2022/**/*.mjs`), testing entry points excluded. Dependencies are not counted: ng-primitives and Spartan build on `@angular/cdk`, which has its own column.

| | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Package | `forty-cdk` 0.39.0 | `ng-primitives` 0.131.2 | `@angular/aria` 22.2.3 | `@angular/cdk` 22.2.3 | `@spartan-ng/brain` 1.8.0 |
| Entry points | 62 | 55 | 24 | 43 | 42 |
| Directives + components | 297 | 178 | 31 | 79 | 195 |
| Standalone | 100 % | 100 % | 100 % | 100 % | 100 % |
| NgModules exported | 0 | 0 | 0 | 19 | 0 |
| Signal inputs (`input()` / `model()`) | 100 % | 100 % | 100 % | 0 % | 100 % |
| Decorator inputs (`@Input`) | 0 | 0 | 0 | 157 | 0 |
| Outputs | 176 | 73 | 15 | 41 | 58 |
| …typed as `EventEmitter` (decorator era) | 0 | 0 | 0 | 37 | 0 |
| Classes implementing `ControlValueAccessor` | 0 | 0 | 0 | 1 | 14 |
| Bundles registering `NG_VALUE_ACCESSOR` | 0 / 62 | 1 / 55 | 0 / 25 | 1 / 52 | 11 / 42 |
| Bundles injecting `NgControl` | 0 / 62 | 4 / 55 | 0 / 25 | 0 / 52 | 2 / 42 |
| Classes implementing a Signal Forms control | 24 | 0 | 0 | 0 | 0 |
| Classes implementing classic lifecycle hooks | 1 | 9 | 23 | 64 | 19 |
| DI classes using constructor injection | 0 / 316 | 0 / 184 | 0 / 31 | 0 / 135 | 0 / 205 |
| Bundles referencing `NgZone` | 0 / 62 | 4 / 55 | 0 / 25 | 14 / 52 | 5 / 42 |
| Bundles importing RxJS | 0 / 62 | 8 / 55 | 0 / 25 | 23 / 52 | 13 / 42 |

Every scenario in this repo runs without Zone.js (the apps have no `zone.js` polyfill), so all five libraries work zoneless for the measured patterns; `NgZone` references are about code paths, not about whether zoneless works.

Reading the rows:

- **Signal inputs** reads the `isSignal` flag Angular writes into every directive declaration, so it is exact.
- **Signal Forms** controls implement `FormValueControl` / `FormCheckboxControl` / `FormUiControl` from `@angular/forms/signals`; `ControlValueAccessor` is the classic forms contract. A library can offer both.
- **Signal inputs** and **outputs** come from the input and output maps in each `ɵɵDirectiveDeclaration` / `ɵɵComponentDeclaration`; decorator inputs are the ones without `isSignal`.
- **Constructor injection** reads each `ɵɵFactoryDeclaration`: Angular records constructor dependencies there, and `never` means the class takes none (it uses `inject()` or nothing).
