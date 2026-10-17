# Scenario specification

Every library implements the same scenario for each pattern. A scenario is only comparable if it meets this spec in full, so the numbers measure the cost of _the same accessible component_, not of whatever each library's demo happens to do.

## Rules for every scenario

1. **Location and shape.** `src/scenarios/<pattern>/<library>.ts` exports a standalone component named `Scenario`, selector `bench-scenario`, `ChangeDetectionStrategy.OnPush`. Nothing else is exported.
2. **Public, documented API only.** Import from the library's documented entry points, the way its own docs teach. Never reach into private/internal paths. A dependency the library itself requires (for example `@angular/cdk` under Spartan) is fair game; another compared library is not.
3. **The accessibility contract is part of the scenario.** The rendered result must satisfy the linked WAI-ARIA APG pattern: roles, states, properties, keyboard interaction and focus management. When the library does not provide a piece, the scenario writes it by hand, because that is what a consumer would have to do. List what was hand-written in the scenario's entry in [NOTES.md](NOTES.md).
4. **No styling.** No component styles, no global CSS. If the library _cannot work_ without a stylesheet (for example overlay positioning CSS), record it in [NOTES.md](NOTES.md); the stylesheet is then part of that library's cost.
5. **Same data and labels** as listed below, verbatim. The probe in `bench.config.mjs` checks them in a real browser.
6. **Observable state.** The component renders the current value in a single `<output>` element, exactly as specified per pattern, so the probe (and later the E2E suites) can read it.
7. **Idiomatic, not golfed.** Write what a competent consumer following the library's docs would write. Don't strip features to shave bytes, and don't add features the spec doesn't ask for.
8. **Unsupported.** If the library has no primitive for the pattern, don't build one from lower-level pieces: add an entry to `unsupported` in `bench.config.mjs` with a one-line reason.

## Patterns

### accordion

[APG Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).

- Three sections, in order, with value / header / body:
  - `shipping` / `Shipping` / `Orders ship within two business days.`
  - `returns` / `Returns` / `Returns are accepted within 30 days.`
  - `warranty` / `Warranty` / `Every product carries a two-year warranty.`
- Each header is an `<h3>` wrapping a `<button>`.
- Single-expand: opening one section closes the others. Collapsible: all may be closed.
- `shipping` is open initially.
- `<output>`: the value of the open section, or empty when none is open.

### tabs

[APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), horizontal, automatic activation.

- Tablist labelled `Account settings`.
- Three tabs with value / label / panel text:
  - `profile` / `Profile` / `Your public name, avatar and bio.`
  - `security` / `Security` / `Password and two-factor authentication.`
  - `billing` / `Billing` / `Plan, payment method and invoices.`
- `profile` selected initially. Only the selected panel is rendered or visible.
- `<output>`: the selected tab's value.

### menu

[APG Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/).

- A `<button>` with text `Actions` opens a menu with three items: `Edit`, `Duplicate`, `Delete`.
- The menu is positioned below the trigger with whatever positioning the library offers (none if it offers none).
- Activating an item closes the menu, returns focus to the trigger and writes the item's label to the state.
- `<output>`: the label of the last activated item, empty initially.

### listbox

[APG Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/), single-select.

- Listbox labelled `Fruits`.
- Five options with value / label: `apple` / `Apple`, `banana` / `Banana`, `cherry` / `Cherry`, `grape` / `Grape`, `mango` / `Mango`.
- Nothing selected initially. Clicking an option selects it.
- `<output>`: the selected value, empty when none.

### combobox

[APG Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) with a listbox popup and list autocomplete (filtering).

- An `<input>` labelled `Fruit` (an `aria-label` or a `<label>`, whichever the library supports).
- The same five fruits as the listbox. The list shows only the options whose label contains the typed text, case-insensitively; the consumer does the filtering in a `computed()` if the library doesn't.
- Single selection. Picking an option closes the popup and fills the input with its label.
- `<output>`: the selected value, empty when none.

### dialog

[APG Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

- A `<button>` with text `Open dialog` opens a modal dialog.
- The dialog has the title `Delete file?` (its accessible name) and the description `This action cannot be undone.` (its accessible description), plus two buttons: `Cancel` closes it, `Delete` closes it and writes `deleted` to the state.
- Focus moves into the dialog and is trapped there. Escape closes it. Closing returns focus to `Open dialog`.
- Prefer the library's declarative/template API if it has one; otherwise its imperative API with the content in an `<ng-template>` or a component in the same file.
- `<output>`: `deleted` after Delete was pressed, empty otherwise.
