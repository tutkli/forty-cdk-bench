# Runtime performance

Generated 2026-10-18T01:42:42.024Z on Node v24.15.0 (win32-x64), Chromium 156.0.8078.4 (headless, Playwright 1.64.1). Production builds from `dist/scenarios`.

Timings run with 4× CPU throttling (Chrome DevTools Protocol) so differences on a fast machine are visible; absolute numbers depend on the machine, compare within a row. Medians; the JSON has n, p90, min and max.

## Render

Time from navigation start to the scenario's first rendered content, median of 9 cold page loads. Mostly script download, parse and bootstrap, so it follows bundle size.

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | 92.5 ms | 153.6 ms | 131.0 ms | 129.4 ms | 189.4 ms |
| Tabs | 185.9 ms | 186.6 ms | 202.1 ms | n/a | 174.1 ms |
| Menu button | 189.3 ms | 173.8 ms | 204.5 ms | 182.9 ms | n/a |
| Listbox | 202.6 ms | 183.0 ms | 151.6 ms | 149.5 ms | n/a |
| Combobox | 200.1 ms | 206.5 ms | 196.5 ms | n/a | 188.3 ms |
| Dialog (modal) | 121.1 ms | 157.0 ms | n/a | 125.2 ms | 147.5 ms |

## Interaction latency

From the input event (`pointerdown` / `keydown`) to the frame after the action's last event (`click` / `keyup`) was handled: the time until the result can be painted. Median of 15 repetitions per action.

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | open Returns 5.5 ms<br>open Shipping 5.5 ms | open Returns 14.2 ms<br>open Shipping 13.1 ms | open Returns 13.6 ms<br>open Shipping 14.7 ms | open Returns 13.9 ms<br>open Shipping 14.2 ms | open Returns 14.9 ms<br>open Shipping 14.1 ms |
| Tabs | ArrowRight 16.1 ms<br>ArrowLeft 14.8 ms | ArrowRight 17.9 ms<br>ArrowLeft 14.2 ms | ArrowRight 16.4 ms<br>ArrowLeft 20.2 ms | n/a | ArrowRight 17.9 ms<br>ArrowLeft 15.8 ms |
| Menu button | open 36.5 ms<br>Escape 16.8 ms | open 23.5 ms<br>Escape 15.2 ms | open 26.4 ms<br>Escape 18.9 ms | open 21.9 ms<br>Escape 24.1 ms | n/a |
| Listbox | select Cherry 14.0 ms<br>select Banana 12.9 ms | select Cherry 15.6 ms<br>select Banana 14.8 ms | select Cherry 13.8 ms<br>select Banana 12.6 ms | select Cherry 15.8 ms<br>select Banana 13.7 ms | n/a |
| Combobox | type a 20.6 ms<br>Backspace 24.2 ms | type a 20.8 ms<br>Backspace 24.2 ms | type a 19.5 ms<br>Backspace 18.5 ms | n/a | type a 15.8 ms<br>Backspace 16.4 ms |
| Dialog (modal) | open 19.9 ms<br>Escape 14.4 ms | open 13.3 ms<br>Escape 14.3 ms | n/a | open 18.0 ms<br>Escape 14.1 ms | open 17.7 ms<br>Escape 15.8 ms |

## Leaks

Each cycle (open/close, toggle, select) runs 30 times to warm up, then 100 more times between two readings, each taken after forced garbage collection. Cell: **DOM nodes / event listeners / JS heap (kB)** retained per measured cycle.

- **Nodes and listeners** are the leak signal: a steady non-zero value means each cycle leaves DOM or listeners behind. The combobox cycle types into an `<input>`, and Chromium keeps one node per edit in the input's undo history: a plain `<input>` with no library shows the same +1.0, so that value is the browser, not the library.
- **Heap** is reported but is a weak signal on its own: it includes V8 warm-up (compiled code, inline caches) that keeps shrinking per cycle as the run gets longer. Compare it across libraries within a row, not against zero.

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | +0.0 / +0.0 / +3.4 | +0.0 / +0.0 / +2.4 | +0.0 / +0.0 / +3.3 | +0.0 / +0.0 / +2.8 | +0.0 / +0.0 / +2.9 |
| Tabs | +0.0 / +0.0 / +3.7 | +0.0 / +0.0 / +1.4 | +0.0 / +0.0 / +2.9 | n/a | +0.0 / +0.0 / +1.1 |
| Menu button | +0.0 / +0.0 / +4.0 | +8.0 / +0.0 / +5.5 | +0.0 / +0.0 / +4.5 | +0.0 / +0.0 / +4.0 | n/a |
| Listbox | +0.0 / +0.0 / +2.7 | +0.0 / +0.0 / +3.4 | +0.0 / +0.0 / +2.6 | +0.0 / +0.0 / +2.4 | n/a |
| Combobox | +1.0 / +0.0 / +4.2 | +1.0 / +0.0 / +4.0 | +1.0 / +0.0 / +3.1 | n/a | +1.0 / +0.0 / +2.3 |
| Dialog (modal) | +0.0 / +0.0 / +2.8 | +0.0 / +0.0 / +3.5 | n/a | +0.0 / +0.0 / +3.1 | +0.0 / +0.0 / +3.8 |

## Scale: 1000 options

The same listbox and combobox scenarios with 1000 options (`?size=1000`), none of them virtualized. Render time, then the latency of moving through the listbox and of filtering the combobox.

| Render | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Listbox | 469.2 ms | 964.5 ms | 4358.8 ms | 217.6 ms | n/a |
| Combobox | 203.2 ms | 212.3 ms | 203.7 ms | n/a | 204.0 ms |

| Interaction | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Listbox | ArrowDown 46.9 ms<br>ArrowUp 50.3 ms | ArrowDown 22.8 ms<br>ArrowUp 25.2 ms | ArrowDown 30.5 ms<br>ArrowUp 30.1 ms | ArrowDown 21.0 ms<br>ArrowUp 21.5 ms | n/a |
| Combobox | type 5 144.9 ms<br>Backspace 252.7 ms | type 5 134.3 ms<br>Backspace 410.3 ms | type 5 86.0 ms<br>Backspace 6613.7 ms | n/a | type 5 45.1 ms<br>Backspace 90.8 ms |
