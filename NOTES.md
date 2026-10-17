# Scenario notes

Per library, what each scenario had to add by hand to meet [SCENARIOS.md](SCENARIOS.md), what it needed beyond the library itself, and anything a reader of the numbers should know. Every "hand-written" entry is consumer cost the bundle numbers don't show.

## forty-cdk

- **combobox**: the root's `ariaLabel` names the listbox popup, not the input, so the input carries its own `aria-label`. The library's own hero example labels only the root and leaves the input named by its `placeholder`.
