# Coverage

Generated 2026-10-18T01:23:45.731Z. Which [WAI-ARIA APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) each library ships a primitive for (Landmarks and Link are left out: they are plain HTML). A cell names the entry point; every claim is checked against the installed package on each run (the entry point must be exported and its typings must contain the evidence recorded in `coverage.config.mjs`), so a stale claim fails the script.

| APG pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | :---: | :---: | :---: | :---: | :---: |
| [Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) | `accordion` | `accordion` | `accordion` | `accordion`<sup>1</sup> | `accordion` |
| [Alert](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) | `toast` | `toast` | · | · | · |
| [Alert dialog](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/) | `dialog` | `dialog` | · | `dialog` | `alert-dialog` |
| [Breadcrumb](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/) | `breadcrumbs` | `breadcrumbs` | · | · | · |
| [Button (incl. toggle)](https://www.w3.org/WAI/ARIA/apg/patterns/button/) | `toggle` | `toggle` | · | · | `toggle` |
| [Carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) | `carousel` | · | · | · | · |
| [Checkbox](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/) | `checkbox` | `checkbox` | · | · | `checkbox` |
| [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | `combobox` | `combobox` | `combobox` | · | `combobox` |
| [Dialog (modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | `dialog` | `dialog` | · | `dialog` | `dialog` |
| [Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) | `disclosure` | `collapsible` | · | · | `collapsible` |
| [Feed](https://www.w3.org/WAI/ARIA/apg/patterns/feed/) | · | · | · | · | · |
| [Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) | `table` | · | `grid` | · | · |
| [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) | `listbox` | `listbox` | `listbox` | `listbox` | · |
| [Menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) | `menubar` | `navigation-menu`<sup>2</sup> | `menu` | `menu` | · |
| [Menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) | `dropdown-menu` | `menu` | `menu` | `menu` | · |
| [Meter](https://www.w3.org/WAI/ARIA/apg/patterns/meter/) | `meter` | `meter` | · | · | · |
| [Radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) | `radio-group` | `radio` | · | · | `radio-group` |
| [Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) | `slider` | `slider` | · | · | `slider` |
| [Slider (multi-thumb)](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/) | `slider` | `slider` | · | · | `slider` |
| [Spinbutton](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) | `number-input` | `number-field` | · | · | · |
| [Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) | `switch` | `switch` | · | · | `switch` |
| [Table](https://www.w3.org/WAI/ARIA/apg/patterns/table/) | `table` | · | · | `table` | · |
| [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | `tabs` | `tabs` | `tabs` | · | `tabs` |
| [Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) | `toolbar` | `toolbar` | `toolbar` | · | · |
| [Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) | `tooltip` | `tooltip` | · | · | `tooltip` |
| [Tree view](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) | `tree` | · | `tree` | `tree` | · |
| [Treegrid](https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/) | `table` | · | · | · | · |
| [Window splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) | `pane-resizer` | · | · | · | `resizable` |
| **Patterns covered** | **27 / 28** | **21 / 28** | **9 / 28** | **8 / 28** | **14 / 28** |

Notes:

1. **Angular CDK / Accordion**: state only; the consumer writes the ARIA and the keyboard handling.
2. **ng-primitives / Menubar**: its navigation menu carries `role="menubar"`.

Coverage says a primitive exists, not how well it implements the pattern: that is what the accessibility benchmark measures, for the patterns that have scenarios. Libraries also ship non-APG pieces (popovers, date pickers, drag and drop, virtualization, forms helpers) that this table does not count.

## Versions

- `forty-cdk` 0.38.0
- `ng-primitives` 0.131.2
- `@angular/aria` 22.2.3
- `@angular/cdk` 22.2.3
- `@spartan-ng/brain` 1.8.0
