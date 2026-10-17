# Scenario notes

Per library, what each scenario had to add by hand to meet [SCENARIOS.md](SCENARIOS.md), what it needed beyond the library itself, and anything a reader of the numbers should know. Every "hand-written" entry is consumer cost the bundle numbers don't show.

## forty-cdk

- **combobox**: the root's `ariaLabel` names the listbox popup, not the input, so the input carries its own `aria-label`. The library's own hero example labels only the root and leaves the input named by its `placeholder`.

## ng-primitives

Docs: [angularprimitives.com](https://angularprimitives.com/primitives/accordion) and the example sources in the [`ng-primitives` repo](https://github.com/ng-primitives/ng-primitives/tree/main/apps/documentation/src/app/examples). No providers needed; `@angular/cdk` and `@floating-ui/dom` are required peers.

- **accordion**: nothing hand-written. Closed panels use `hidden="until-found"`.
- **tabs**: hand-written `[hidden]` on inactive panels (the library only sets `aria-hidden="true"`; the docs hide them with consumer CSS) and the tablist `aria-label` (no input for it). Automatic activation is opt-in through `ngpTabsetActivateOnFocus`; the default is manual.
- **menu**: hand-written focus return to the trigger after a **pointer** activation. The library restores focus only when the menu was opened or closed by keyboard, while the docs say selecting an item returns focus. Positioning needs a consumer style the docs list as required (`[ngpMenu] { position: fixed }`); the library writes `top`/`left` inline but they do nothing without it. Not added here, per rule 4 it is one line of CSS.
- **listbox**: hand-written `aria-selected` on every option. The library never emits it (only `data-selected`), on 0.131.2 and on `main` at the time of writing. This is an APG conformance gap.
- **combobox**: hand-written filtering, writing the picked label back into the input, and resetting on close, as the docs example does. Positioning needs consumer CSS (`position: absolute`), like the menu.
- **dialog**: nothing hand-written (template API with `ngpDialogTrigger` + `<ng-template>`). Centering is left to consumer CSS.
