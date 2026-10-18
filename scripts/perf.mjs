import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';
import { cycles, scale, settings } from '../perf.config.mjs';
import {
  distDir,
  flagValue,
  installedVersion,
  libraries,
  patterns,
  resultsDir,
  selectScenarios,
  unsupported,
} from './shared.mjs';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function serve(dir) {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
    let file = join(dir, path);
    if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) {
      file = join(dir, 'index.html');
    }
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolvePromise) =>
    server.listen(0, '127.0.0.1', () => resolvePromise(server)),
  );
}

function instrument() {
  window.__bench = { rendered: null, start: null, samples: [] };
  new MutationObserver((_, observer) => {
    const host = document.querySelector('bench-scenario');
    if (host && host.childElementCount > 0) {
      window.__bench.rendered = performance.now();
      observer.disconnect();
    }
  }).observe(document, { childList: true, subtree: true });
  const begin = (event) => {
    if (window.__bench.start === null) {
      window.__bench.start = event.timeStamp;
    }
  };
  const finish = () => {
    const start = window.__bench.start;
    if (start === null) {
      return;
    }
    window.__bench.start = null;
    requestAnimationFrame(() =>
      setTimeout(() => window.__bench.samples.push(performance.now() - start)),
    );
  };
  addEventListener('pointerdown', begin, true);
  addEventListener('keydown', begin, true);
  addEventListener('click', finish, true);
  addEventListener('keyup', finish, true);
}

const quantile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};
const summary = (values) => ({
  n: values.length,
  median: quantile(values, 0.5),
  p90: quantile(values, 0.9),
  min: Math.min(...values),
  max: Math.max(...values),
});

async function openPage(browser, url, throttling) {
  const page = await browser.newPage();
  await page.addInitScript(instrument);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttling });
  await page.goto(url);
  await page.waitForFunction(() => window.__bench.rendered !== null);
  await page.waitForLoadState('load');
  return { page, cdp };
}

async function act(page, step) {
  if (step.click) {
    await page.locator(step.click).click({ timeout: 5000 });
  } else if (step.press) {
    await page.keyboard.press(step.press);
  }
}

async function measureRender(browser, url) {
  const times = [];
  for (let run = 0; run < settings.renderRuns; run++) {
    const { page } = await openPage(browser, url, settings.cpuThrottling);
    times.push(await page.evaluate(() => window.__bench.rendered));
    await page.close();
  }
  return summary(times);
}

async function measureInteractions(browser, url, cycle) {
  const { page } = await openPage(browser, url, settings.cpuThrottling);
  for (const step of cycle.setup) {
    await act(page, step);
  }
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    window.__bench.samples = [];
    window.__bench.start = null;
  });
  const samples = Object.fromEntries(cycle.actions.map((action) => [action.name, []]));
  for (let run = 0; run < settings.interactionCycles; run++) {
    for (const action of cycle.actions) {
      const before = await page.evaluate(() => window.__bench.samples.length);
      await act(page, action);
      await page.waitForFunction((count) => window.__bench.samples.length > count, before, {
        timeout: 60000,
      });
      samples[action.name].push(await page.evaluate(() => window.__bench.samples.at(-1)));
      await page.waitForTimeout(30);
    }
  }
  await page.close();
  return Object.fromEntries(
    Object.entries(samples).map(([name, values]) => [name, summary(values)]),
  );
}

async function counters(cdp) {
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.collectGarbage');
  const dom = await cdp.send('Memory.getDOMCounters');
  const heap = await cdp.send('Runtime.getHeapUsage');
  return { nodes: dom.nodes, listeners: dom.jsEventListeners, heap: heap.usedSize };
}

async function measureLeaks(browser, url, cycle) {
  const { page, cdp } = await openPage(browser, url, 1);
  await cdp.send('HeapProfiler.enable');
  for (const step of cycle.setup) {
    await act(page, step);
  }
  const runCycle = async () => {
    for (const action of cycle.actions) {
      const before = await page.evaluate(() => window.__bench.samples.length);
      await act(page, action);
      await page.waitForFunction((count) => window.__bench.samples.length > count, before, {
        timeout: 60000,
      });
    }
  };
  for (let run = 0; run < settings.leakWarmup; run++) {
    await runCycle();
  }
  await page.waitForTimeout(300);
  const start = await counters(cdp);
  for (let run = 0; run < leakCycles; run++) {
    await runCycle();
  }
  await page.waitForTimeout(300);
  const end = await counters(cdp);
  await page.close();
  return {
    cycles: leakCycles,
    nodesPerCycle: (end.nodes - start.nodes) / leakCycles,
    listenersPerCycle: (end.listeners - start.listeners) / leakCycles,
    heapBytesPerCycle: (end.heap - start.heap) / leakCycles,
    start,
    end,
  };
}

async function guarded(label, task) {
  try {
    return await task();
  } catch (error) {
    console.log(`     ${label} failed: ${error.message.split('\n')[0]}`);
    return { error: error.message.split('\n')[0] };
  }
}

const argv = process.argv.slice(2);
const leakCycles = Number(
  flagValue(process.argv.slice(2), 'leak-cycles', String(settings.leakCycles)),
);
const only = flagValue(argv, 'only', 'render,interactions,leaks,scale').split(',');
const scenarios = selectScenarios(argv);
const browser = await chromium.launch();
const previous = existsSync(join(resultsDir, 'perf.json'))
  ? JSON.parse(readFileSync(join(resultsDir, 'perf.json'), 'utf8')).rows
  : [];
const rows = [];

for (const scenario of scenarios) {
  const dir = join(distDir, scenario.id, 'browser');
  if (!existsSync(join(dir, 'index.html'))) {
    console.log(`skip ${scenario.id} (not built)`);
    continue;
  }
  const server = await serve(dir);
  const url = `http://127.0.0.1:${server.address().port}/`;
  const cycle = cycles[scenario.pattern.id];
  const row = { pattern: scenario.pattern.id, library: scenario.library.id };
  console.log(scenario.id);
  if (only.includes('render')) {
    row.render = await guarded('render', () => measureRender(browser, url));
  }
  if (only.includes('interactions')) {
    row.interactions = await guarded('interactions', () =>
      measureInteractions(browser, url, cycle),
    );
  }
  if (only.includes('leaks')) {
    row.leaks = await guarded('leaks', () => measureLeaks(browser, url, cycle));
  }
  if (only.includes('scale') && scale[scenario.pattern.id]) {
    const scaledUrl = `${url}?size=${settings.scaleSize}`;
    row.scale = {
      size: settings.scaleSize,
      render: await guarded('scale render', () => measureRender(browser, scaledUrl)),
      interactions: await guarded('scale interactions', () =>
        measureInteractions(browser, scaledUrl, scale[scenario.pattern.id]),
      ),
    };
  }
  const earlier = previous.find((r) => r.pattern === row.pattern && r.library === row.library);
  rows.push({ ...earlier, ...row });
  server.close();
}

for (const earlier of previous) {
  if (!rows.some((r) => r.pattern === earlier.pattern && r.library === earlier.library)) {
    rows.push(earlier);
  }
}

const browserVersion = browser.version();
await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  chromium: browserVersion,
  playwright: installedVersion('playwright'),
  settings,
  versions: Object.fromEntries(
    [...new Set(['@angular/core', ...libraries.flatMap((library) => library.packages)])].map(
      (pkg) => [pkg, installedVersion(pkg)],
    ),
  ),
  rows,
};

mkdirSync(resultsDir, { recursive: true });
writeFileSync(join(resultsDir, 'perf.json'), `${JSON.stringify(report, null, 2)}\n`);

const ms = (value) => (value === undefined ? '—' : `${value.toFixed(1)} ms`);
const cellOf = (pattern, library, read) => {
  if (unsupported[`${pattern}/${library}`]) {
    return 'n/a';
  }
  const row = rows.find((r) => r.pattern === pattern && r.library === library);
  if (!row) {
    return '—';
  }
  try {
    return read(row);
  } catch {
    return 'error';
  }
};
const table = (title, read, patternIds = patterns.map((p) => p.id)) => [
  `| ${title} | ${libraries.map((library) => library.name).join(' | ')} |`,
  `| --- | ${libraries.map(() => '---:').join(' | ')} |`,
  ...patternIds.map(
    (id) =>
      `| ${patterns.find((p) => p.id === id).name} | ${libraries
        .map((library) => cellOf(id, library.id, read))
        .join(' | ')} |`,
  ),
];
const interactionCell = (block) => {
  if (!block || block.error) {
    return 'error';
  }
  return Object.entries(block)
    .map(([name, stats]) => `${name} ${ms(stats.median)}`)
    .join('<br>');
};
const signedNumber = (value, digits = 1) =>
  `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)}`;

const markdown = [
  '# Runtime performance',
  '',
  `Generated ${report.generatedAt} on Node ${report.node} (${report.platform}), Chromium ${report.chromium} (headless, Playwright ${report.playwright}). Production builds from \`dist/scenarios\`.`,
  '',
  `Timings run with ${settings.cpuThrottling}× CPU throttling (Chrome DevTools Protocol) so differences on a fast machine are visible; absolute numbers depend on the machine, compare within a row. Medians; the JSON has n, p90, min and max.`,
  '',
  '## Render',
  '',
  `Time from navigation start to the scenario's first rendered content, median of ${settings.renderRuns} cold page loads. Mostly script download, parse and bootstrap, so it follows bundle size.`,
  '',
  ...table('Pattern', (row) => ms(row.render.median)),
  '',
  '## Interaction latency',
  '',
  `From the input event (\`pointerdown\` / \`keydown\`) to the frame after the action's last event (\`click\` / \`keyup\`) was handled: the time until the result can be painted. Median of ${settings.interactionCycles} repetitions per action.`,
  '',
  ...table('Pattern', (row) => interactionCell(row.interactions)),
  '',
  '## Leaks',
  '',
  `Each cycle (open/close, toggle, select) runs ${settings.leakWarmup} times to warm up, then ${leakCycles} more times between two readings, each taken after forced garbage collection. Cell: **DOM nodes / event listeners / JS heap (kB)** retained per measured cycle.`,
  '',
  "- **Nodes and listeners** are the leak signal: a steady non-zero value means each cycle leaves DOM or listeners behind. The combobox cycle types into an `<input>`, and Chromium keeps one node per edit in the input's undo history: a plain `<input>` with no library shows the same +1.0, so that value is the browser, not the library.",
  '- **Heap** is reported but is a weak signal on its own: it includes V8 warm-up (compiled code, inline caches) that keeps shrinking per cycle as the run gets longer. Compare it across libraries within a row, not against zero.',
  '',
  ...table('Pattern', (row) =>
    row.leaks.error
      ? 'error'
      : `${signedNumber(row.leaks.nodesPerCycle)} / ${signedNumber(row.leaks.listenersPerCycle)} / ${signedNumber(row.leaks.heapBytesPerCycle / 1000)}`,
  ),
  '',
  `## Scale: ${settings.scaleSize} options`,
  '',
  `The same listbox and combobox scenarios with ${settings.scaleSize} options (\`?size=${settings.scaleSize}\`), none of them virtualized. Render time, then the latency of moving through the listbox and of filtering the combobox.`,
  '',
  ...table('Render', (row) => ms(row.scale.render.median), ['listbox', 'combobox']),
  '',
  ...table('Interaction', (row) => interactionCell(row.scale.interactions), [
    'listbox',
    'combobox',
  ]),
  '',
].join('\n');

writeFileSync(join(resultsDir, 'perf.md'), markdown);
console.log(markdown);
