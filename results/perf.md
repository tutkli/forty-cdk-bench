# Runtime performance

Generated 2026-11-16T10:01:37.985Z on Node v24.15.0 (win32-x64), Chromium 156.0.8078.4 (headless, Playwright 1.64.1). Production builds from `dist/scenarios`.

Timings run with 4× CPU throttling (Chrome DevTools Protocol) so differences on a fast machine are visible; absolute numbers depend on the machine, compare within a row. Medians; the JSON has n, p90, min and max.

## Render

Time from navigation start to the scenario's first rendered content, median of 9 cold page loads. Mostly script download, parse and bootstrap, so it follows bundle size.

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | 72.3 ms | 161.2 ms | 140.4 ms | 84.5 ms | 130.3 ms |
| Tabs | 88.9 ms | 215.1 ms | 106.2 ms | n/a | 93.7 ms |
| Menu button | 91.4 ms | 141.6 ms | 104.2 ms | 98.3 ms | n/a |
| Listbox | 98.2 ms | 146.2 ms | 129.7 ms | 92.9 ms | n/a |
| Combobox | 110.9 ms | 134.3 ms | 128.3 ms | n/a | 118.5 ms |
| Dialog (modal) | 97.3 ms | 123.1 ms | n/a | 86.8 ms | 110.6 ms |

## Interaction latency

From the input event (`pointerdown` / `keydown`) to the frame after the action's last event (`click` / `keyup`) was handled: the time until the result can be painted. Median of 15 repetitions per action.

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | open Returns 13.4 ms<br>open Shipping 13.6 ms | open Returns 12.2 ms<br>open Shipping 10.9 ms | open Returns 8.3 ms<br>open Shipping 4.6 ms | open Returns 4.9 ms<br>open Shipping 10.6 ms | open Returns 10.0 ms<br>open Shipping 9.1 ms |
| Tabs | ArrowRight 12.6 ms<br>ArrowLeft 15.4 ms | ArrowRight 16.0 ms<br>ArrowLeft 16.9 ms | ArrowRight 15.1 ms<br>ArrowLeft 14.5 ms | n/a | ArrowRight 11.3 ms<br>ArrowLeft 13.1 ms |
| Menu button | open 8.6 ms<br>Escape 14.9 ms | open 14.0 ms<br>Escape 15.4 ms | open 18.0 ms<br>Escape 14.0 ms | open 9.2 ms<br>Escape 14.3 ms | n/a |
| Listbox | select Cherry 9.2 ms<br>select Banana 4.0 ms | select Cherry 10.9 ms<br>select Banana 10.8 ms | select Cherry 10.3 ms<br>select Banana 11.7 ms | select Cherry 7.0 ms<br>select Banana 4.7 ms | n/a |
| Combobox | type a 18.7 ms<br>Backspace 16.3 ms | type a 14.7 ms<br>Backspace 16.3 ms | type a 14.1 ms<br>Backspace 16.9 ms | n/a | type a 15.6 ms<br>Backspace 17.2 ms |
| Dialog (modal) | open 7.7 ms<br>Escape 13.6 ms | open 12.6 ms<br>Escape 13.3 ms | n/a | open 11.3 ms<br>Escape 20.1 ms | open 12.5 ms<br>Escape 15.0 ms |

## Leaks

Each cycle (open/close, toggle, select) runs 30 times to warm up, then 100 more times between two readings, each taken after forced garbage collection. Cell: **DOM nodes / event listeners / JS heap (kB)** retained per measured cycle.

- **Nodes and listeners** are the leak signal: a steady non-zero value means each cycle leaves DOM or listeners behind. The combobox cycle types into an `<input>`, and Chromium keeps one node per edit in the input's undo history: a plain `<input>` with no library shows the same +1.0, so that value is the browser, not the library.
- **Heap** is reported but is a weak signal on its own: it includes V8 warm-up (compiled code, inline caches) that keeps shrinking per cycle as the run gets longer. Compare it across libraries within a row, not against zero.

| Pattern | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accordion | +0.0 / +0.0 / +3.3 | +0.0 / +0.0 / +2.4 | +0.0 / +0.0 / +3.2 | +0.0 / +0.0 / +2.8 | +0.0 / +0.0 / +2.8 |
| Tabs | +0.0 / +0.0 / +4.0 | +0.0 / +0.0 / +1.4 | +0.0 / +0.0 / +2.9 | n/a | +0.0 / +0.0 / +1.1 |
| Menu button | +0.0 / +0.0 / +4.0 | +8.0 / +0.0 / +5.4 | +0.0 / +0.0 / +4.5 | +0.0 / +0.0 / +4.0 | n/a |
| Listbox | +0.0 / +0.0 / +2.9 | +0.0 / +0.0 / +3.4 | +0.0 / +0.0 / +2.6 | +0.0 / +0.0 / +2.4 | n/a |
| Combobox | +1.0 / +0.0 / +4.3 | +1.0 / +0.0 / +3.9 | +1.0 / +0.0 / +3.1 | n/a | +1.0 / +0.0 / +2.3 |
| Dialog (modal) | +0.0 / +0.0 / +2.8 | +0.0 / +0.0 / +3.5 | n/a | +0.0 / +0.0 / +3.1 | +0.0 / +0.0 / +3.8 |

## Scale: 1000 options

The same listbox and combobox scenarios with 1000 options (`?size=1000`), none of them virtualized. Render time, then the latency of moving through the listbox and of filtering the combobox.

| Render | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Listbox | 231.4 ms | 318.6 ms | 1817.1 ms | 144.7 ms | n/a |
| Combobox | 170.1 ms | 122.5 ms | 123.0 ms | n/a | 104.7 ms |

| Interaction | forty-cdk | ng-primitives | Angular Aria | Angular CDK | Spartan (brain) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Listbox | ArrowDown 23.3 ms<br>ArrowUp 24.7 ms | ArrowDown 16.1 ms<br>ArrowUp 16.6 ms | ArrowDown 13.2 ms<br>ArrowUp 15.2 ms | ArrowDown 12.9 ms<br>ArrowUp 16.1 ms | n/a |
| Combobox | type 5 73.9 ms<br>Backspace 99.9 ms | type 5 65.1 ms<br>Backspace 173.8 ms | type 5 41.6 ms<br>Backspace 2727.1 ms | n/a | type 5 21.5 ms<br>Backspace 41.0 ms |
