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

## Angular Aria

Docs: the [angular.dev Aria guides](https://angular.dev/guide/aria/accordion) and their example sources in `angular/angular` (`adev/src/content/examples/aria`). No stylesheet needed: the CDK overlay injects its own structural styles.

- **accordion**: no group-level value; each trigger has its own `expanded` model, so the scenario derives the open section from per-trigger bindings. Single-expand needs `[multiExpandable]="false"` (the default is `true`). The library emits all the ARIA itself. Collapsed panels leave an empty, `inert` `role=region` element in the DOM.
- **tabs**: hand-written `[hidden]` on inactive panels. Without it they stay as empty, visible, `inert` `role=tabpanel` elements; the typings say "proper styling is required for visual hiding" and the guide hides them with CSS. Automatic activation (`selectionMode="follow"`) is the default.
- **menu**: positioning through `cdkConnectedOverlay` from `@angular/cdk/overlay`, as the guide does. The guide's `cdkAttachPopoverAsChild` does not exist in CDK 22.2.3. The menu has no accessible name.
- **listbox**: needs `selectionMode="explicit"`: the default `follow` selects the first option on render, so "nothing selected initially" is impossible without opting out.
- **combobox**: based on the guide's "manual" autocomplete (`selectionMode="explicit"`); with the default `follow`, opening the popup selects Apple and blurring writes it into the input. Hand-written: the filtering `computed()`, committing the picked label to the input, closing and refocusing, opening on click, and both labels (the docs example labels neither). `aria-controls` / `aria-haspopup` are only present while open.

## Angular CDK

Docs: the CDK overview examples in `angular/components` (`src/components-examples/cdk`). No stylesheet needed.

- **accordion**: the CDK provides only state, so the whole APG contract is hand-written, as in the CDK docs example: the toggle click, `aria-expanded`, `aria-controls`, header and panel ids, `role="region"` with `aria-labelledby`, and rendering the panel. While collapsed, `aria-controls` points at an id that isn't in the DOM (the docs example does the same).
- **listbox**: ARIA-complete out of the box. No two-way binding (the change event is an object), so `[cdkListboxValue]` + `(cdkListboxValueChange)`.
- **menu**: ARIA-complete, positioned below the trigger by default, focus returns after pointer and keyboard activation. After closing, the trigger keeps an `aria-controls` pointing at the removed menu.
- **dialog**: imperative only (`Dialog.open(templateRef)`). Hand-wired through the config: `ariaLabelledBy` / `ariaDescribedBy` with hand-written ids, and `ariaModal: true`, which is off by default (the CDK hides outside content with `aria-hidden` instead).

## Spartan (brain)

Docs: [spartan.ng](https://www.spartan.ng/components/accordion), which shows the styled layer (helm) on top of brain; the scenarios keep the brain directives and drop helm, using helm's sources in `spartan-ng/spartan` to see what it composes. The declared peers `tailwindcss`, `clsx`, `tw-animate-css` and `luxon` are not needed at runtime by these scenarios.

- **accordion**: hand-written `[hidden]` on closed panels (brain only sets `inert` and height variables; helm collapses them with Tailwind) and the value sync, since brain has no group-level value (`[isOpened]` + `(openedChange)` per item). Triggers toggle on `keyup` for Enter and Space rather than on native button activation. Throws at runtime if a trigger is not a `<button>` inside an `h1`–`h6`.
- **tabs**: only the tablist `aria-label` is hand-written (no input for it; the docs do the same).
- **combobox**: brain filters internally but only marks non-matching options with `data-hidden` (helm hides them with CSS), so unstyled all five stay visible and exposed; the scenario binds `[(search)]` and renders from a `computed()`. Needs `provideBrnPopoverDefaultOptions({ role: null })` and `provideBrnPopoverConfig({ align: 'start' })`, copied from helm, or the listbox is wrapped in a `role="dialog"`. `BrnCombobox` is a `ControlValueAccessor`, so `@angular/forms` is in the bundle. Escape on a closed popup clears the value.
- **dialog**: only the Delete handler is hand-written (template API with `brn-dialog`). The documented setup pulls in `@angular/cdk/overlay-prebuilt.css` through the Tailwind preset; not needed for the probe, but a brain-only consumer would add it to center the dialog.
