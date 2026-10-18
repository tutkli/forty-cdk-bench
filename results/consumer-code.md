# Consumer code

Generated 2026-10-18T19:16:33.771Z. How much code a consumer writes to build the same accessible component ([SCENARIOS.md](../SCENARIOS.md)) with each library, read from the scenario files. Every file is formatted by the same Prettier config.

Cell: **total lines (template + TypeScript) · library symbols imported**.

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | 18 (13 + 5) · 4 | 22 (17 + 5) · 4 | 30 (20 + 10) · 4 | 39 (29 + 10) · 2 | 27 (17 + 10) · 5 |
| Tabs | 17 (12 + 5) · 4 | 18 (13 + 5) · 4 | 18 (13 + 5) · 5 | n/a | 16 (11 + 5) · 4 |
| Menu button | 11 (9 + 2) · 4 | 15 (10 + 5) · 3 | 21 (18 + 3) · 5 | 12 (10 + 2) · 3 | n/a |
| Listbox | 7 (5 + 2) · 2 | 14 (12 + 2) · 2 | 7 (5 + 2) · 2 | 12 (10 + 2) · 2 | n/a |
| Combobox | 17 (11 + 6) · 4 | 37 (13 + 24) · 5 | 48 (34 + 14) · 6 | n/a | 25 (16 + 9) · 11 |
| Dialog (modal) | 16 (11 + 5) · 5 | 13 (12 + 1) · 5 | n/a | 19 (8 + 11) · 1 | 12 (11 + 1) · 7 |

- **Template lines**: non-blank lines of the inline template.
- **TypeScript lines**: non-blank lines outside the template, excluding imports, the decorator lines every scenario shares (`@Component`, `selector`, `changeDetection`, `imports: [...]`, the class header) and lines holding only closing brackets. Component-level `providers` count.
- **Library symbols**: named imports from anything other than `@angular/core` and the shared data module, including a library dependency the docs require (e.g. `@angular/cdk/overlay` in the Angular Aria menu and combobox).
- Fewer lines is not automatically better: a line may be the consumer opting into something the library leaves out (see [NOTES.md](../NOTES.md) for what each scenario had to write by hand), and a primitive that needs more pieces can still be the better API.
