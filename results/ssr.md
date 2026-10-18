# SSR and hydration

Generated 2026-10-18T01:07:17.217Z. Angular 22.2.3, `@angular/ssr` 22.2.3, Playwright 1.64.1 (Chromium 156.0.8078.4), Node v24.15.0.

Libraries: forty-cdk 0.38.0, ng-primitives 0.131.2, Angular Aria 22.2.3, Angular CDK 22.2.3, Spartan (brain) 1.8.0.

Method: [SSR.md](../SSR.md). Each cell reads, in order: **server render** · **server markup** (no JavaScript) · **hydration** · **post-hydration behavior**.

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | --- | --- | --- | --- | --- |
| Accordion | ✅ ✅ ✅ ✅ | ❌ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ |
| Tabs | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | n/a | ✅ ✅ ✅ ✅ |
| Menu button | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | n/a |
| Listbox | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | n/a |
| Combobox | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | n/a | ✅ ✅ ✅ ✅ |
| Dialog (modal) | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ | n/a | ✅ ✅ ✅ ✅ | ✅ ✅ ✅ ✅ |

## Per scenario

| Scenario | Server render | Server markup | Hydration | Server elements | Discarded | Client-created | Server = hydrated | Post-hydration |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| accordion--forty | ✅ | ✅ 2/2 | ✅ | 18 | 0 | 0 | yes | ✅ |
| accordion--ng-primitives | ❌ | ✅ 2/2 | ✅ | 18 | 0 | 0 | **no** (tree, tab stops) | ✅ |
| accordion--angular-aria | ✅ | ✅ 2/2 | ✅ | 12 | 0 | 1 | **no** (tree) | ✅ |
| accordion--angular-cdk | ✅ | ✅ 2/2 | ✅ | 14 | 0 | 0 | yes | ✅ |
| accordion--spartan | ✅ | ✅ 2/2 | ✅ | 18 | 0 | 0 | yes | ✅ |
| tabs--forty | ✅ | ✅ 3/3 | ✅ | 13 | 0 | 0 | yes | ✅ |
| tabs--ng-primitives | ✅ | ✅ 3/3 | ✅ | 13 | 0 | 0 | yes | ✅ |
| tabs--angular-aria | ✅ | ✅ 3/3 | ✅ | 10 | 0 | 1 | **no** (tree, tab stops) | ✅ |
| tabs--spartan | ✅ | ✅ 3/3 | ✅ | 13 | 0 | 0 | yes | ✅ |
| menu--forty | ✅ | ✅ 2/2 | ✅ | 4 | 0 | 0 | yes | ✅ |
| menu--ng-primitives | ✅ | ✅ 2/2 | ✅ | 3 | 0 | 0 | yes | ✅ |
| menu--angular-aria | ✅ | ✅ 2/2 | ✅ | 3 | 0 | 0 | yes | ✅ |
| menu--angular-cdk | ✅ | ✅ 2/2 | ✅ | 3 | 0 | 0 | yes | ✅ |
| listbox--forty | ✅ | ✅ 3/3 | ✅ | 8 | 0 | 0 | yes | ✅ |
| listbox--ng-primitives | ✅ | ✅ 3/3 | ✅ | 8 | 0 | 0 | yes | ✅ |
| listbox--angular-aria | ✅ | ✅ 3/3 | ✅ | 8 | 0 | 0 | **no** (tab stops) | ✅ |
| listbox--angular-cdk | ✅ | ✅ 3/3 | ✅ | 8 | 0 | 0 | yes | ✅ |
| combobox--forty | ✅ | ✅ 2/2 | ✅ | 4 | 0 | 0 | yes | ✅ |
| combobox--ng-primitives | ✅ | ✅ 2/2 | ✅ | 4 | 0 | 0 | yes | ✅ |
| combobox--angular-aria | ✅ | ✅ 2/2 | ✅ | 4 | 0 | 0 | yes | ✅ |
| combobox--spartan | ✅ | ✅ 2/2 | ✅ | 4 | 0 | 0 | yes | ✅ |
| dialog--forty | ✅ | ✅ 1/1 | ✅ | 3 | 0 | 0 | yes | ✅ |
| dialog--ng-primitives | ✅ | ✅ 1/1 | ✅ | 3 | 0 | 0 | yes | ✅ |
| dialog--angular-cdk | ✅ | ✅ 1/1 | ✅ | 3 | 0 | 0 | yes | ✅ |
| dialog--spartan | ✅ | ✅ 1/1 | ✅ | 5 | 0 | 0 | yes | ✅ |

## Failures

### accordion--ng-primitives

- server render: ERROR ReferenceError: MutationObserver is not defined

> Verified by hand (ng-primitives 0.131.2): `ngpAccordionContent` composes `ngpCollapsibleContent`, which subscribes to `fromMutationObserver` (`ng-primitives/internal`) while the panel is open; it calls `new MutationObserver` with no platform check, and there is none on the server. The exception aborts the render of the remaining sections: in the server HTML, Returns and Warranty have empty buttons, no `aria-expanded` / `aria-controls`, and the open region has no `aria-labelledby`. The client hydrates and fills them in. ng-primitives documents no SSR setup that would avoid it.

## Server HTML vs hydrated page

Informational, not a pass/fail dimension. With JavaScript disabled, and again after hydration before any interaction: the Playwright ARIA snapshot of `bench-scenario`, compared line by line, and its keyboard tab stops (elements with `tabIndex >= 0` that are not disabled, `inert` or `hidden`), compared in order.

### accordion--ng-primitives

- server only: `- region:`
- server only: `- heading [level=3]:`
- server only: `- button`
- server only: `- region:`
- server only: `- paragraph`
- server only: `- heading [level=3]:`
- server only: `- button`
- server only: `- region:`
- server only: `- paragraph`
- after hydration only: `- region "Shipping":`
- after hydration only: `- heading "Returns" [level=3]:`
- after hydration only: `- button "Returns"`
- after hydration only: `- region "Returns"`
- after hydration only: `- heading "Warranty" [level=3]:`
- after hydration only: `- button "Warranty"`
- after hydration only: `- region "Warranty"`
- tab stops on the server: `button "Shipping"`, `button ""`, `button ""`
- tab stops after hydration: `button "Shipping"`, `button "Returns"`, `button "Warranty"`

### accordion--angular-aria

- server only: `- region "Shipping"`
- after hydration only: `- region "Shipping":`
- after hydration only: `- paragraph: Orders ship within two business days.`

> Verified by hand (@angular/aria 22.2.3): `ngAccordionContent` is a `DeferredContent` that creates its view in `afterRenderEffect`, which never runs on the server, so the open panel ships empty and its text is created on the client.

### tabs--angular-aria

- server only: `- tabpanel "Profile"`
- after hydration only: `- tabpanel "Profile":`
- after hydration only: `- paragraph: Your public name, avatar and bio.`
- tab stops on the server: `tabpanel ""`
- tab stops after hydration: `tab "Profile"`, `tabpanel "Your public name, avatar and bio."`

> Verified by hand (@angular/aria 22.2.3): `ngTabContent` is a `DeferredContent` (view created in `afterRenderEffect`), so the selected panel ships empty. The default active tab is also set in `afterRenderEffect` (`setDefaultStateEffect`), so every tab and the tablist are `tabindex="-1"` in the server HTML.

### listbox--angular-aria

- tab stops on the server: none
- tab stops after hydration: `option "Apple"`

> Verified by hand (@angular/aria 22.2.3): The default active option is set in `afterRenderEffect` (`setDefaultStateEffect`), so the listbox and every option are `tabindex="-1"` in the server HTML: no tab stop until the client runs.

## Per-library SSR setup

None: every scenario uses only the shared client and server configuration.
