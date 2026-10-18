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
import {
  discoverScenarios,
  installedVersion,
  libraries,
  patterns,
  resultsDir,
  root,
  scenarioId,
  selectScenarios,
  unsupported,
} from './shared.mjs';

const ssrDistDir = join(root, 'dist', 'ssr');

const verifiedCauses = {
  'accordion--ng-primitives': {
    kind: 'failure',
    package: 'ng-primitives',
    version: '0.131.2',
    text: '`ngpAccordionContent` composes `ngpCollapsibleContent`, which subscribes to `fromMutationObserver` (`ng-primitives/internal`) while the panel is open; it calls `new MutationObserver` with no platform check, and there is none on the server. The exception aborts the render of the remaining sections: in the server HTML, Returns and Warranty have empty buttons, no `aria-expanded` / `aria-controls`, and the open region has no `aria-labelledby`. The client hydrates and fills them in. ng-primitives documents no SSR setup that would avoid it.',
  },
  'accordion--angular-aria': {
    kind: 'parity',
    package: '@angular/aria',
    version: '22.2.3',
    text: '`ngAccordionContent` is a `DeferredContent` that creates its view in `afterRenderEffect`, which never runs on the server, so the open panel ships empty and its text is created on the client.',
  },
  'tabs--angular-aria': {
    kind: 'parity',
    package: '@angular/aria',
    version: '22.2.3',
    text: '`ngTabContent` is a `DeferredContent` (view created in `afterRenderEffect`), so the selected panel ships empty. The default active tab is also set in `afterRenderEffect` (`setDefaultStateEffect`), so every tab and the tablist are `tabindex="-1"` in the server HTML.',
  },
  'listbox--angular-aria': {
    kind: 'parity',
    package: '@angular/aria',
    version: '22.2.3',
    text: 'The default active option is set in `afterRenderEffect` (`setDefaultStateEffect`), so the listbox and every option are `tabindex="-1"` in the server HTML: no tab stop until the client runs.',
  },
};

function verifiedCause(id, kind) {
  const cause = verifiedCauses[id];
  if (
    cause === undefined ||
    cause.kind !== kind ||
    installedVersion(cause.package) !== cause.version
  ) {
    return [];
  }
  return ['', `> Verified by hand (${cause.package} ${cause.version}): ${cause.text}`];
}

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
};

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

async function poll(read, done, timeout) {
  const deadline = Date.now() + timeout;
  let value = await read();
  while (!done(value) && Date.now() < deadline) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
    value = await read();
  }
  return value;
}

async function runStep(page, step, timeout) {
  if (step.click) {
    await page.locator(step.click).click({ timeout });
  } else if (step.press) {
    await page.keyboard.press(step.press);
  } else if (step.type) {
    await page.keyboard.type(step.type);
  } else if (step.expect) {
    const count = await poll(
      () => page.locator(step.expect).count(),
      (value) => value === step.count,
      timeout,
    );
    if (count !== step.count) {
      throw new Error(`expected ${step.count} × ${step.expect}, found ${count}`);
    }
  } else if (step.text) {
    const text = await poll(
      async () => (await page.locator(step.text).textContent({ timeout }))?.trim(),
      (value) => value === step.equals,
      timeout,
    );
    if (text !== step.equals) {
      throw new Error(`expected ${step.text} to read "${step.equals}", got "${text}"`);
    }
  } else if (step.focused) {
    const focused = await page
      .locator(step.focused)
      .evaluate((element) => element === document.activeElement);
    if (!focused) {
      throw new Error(`expected focus on ${step.focused}`);
    }
  }
}

function leadingAssertions(probe) {
  const steps = [];
  for (const step of probe) {
    if (step.expect === undefined && step.text === undefined) {
      break;
    }
    steps.push(step);
  }
  return steps;
}

function firstLine(error) {
  return String(error?.message ?? error).split('\n')[0];
}

function readBuild(dir) {
  const file = join(dir, 'build.json');
  if (!existsSync(file)) {
    return null;
  }
  const build = JSON.parse(readFileSync(file, 'utf8'));
  const log = existsSync(join(dir, 'build.log'))
    ? readFileSync(join(dir, 'build.log'), 'utf8')
    : '';
  const lines = log.split(/\r?\n/);
  const errors = [];
  const warnings = [];
  const message = (index) => {
    const next = lines[index + 1] ?? '';
    const detail = /^\s*(at\s|$)/.test(next) ? '' : ` ${next}`;
    return `${lines[index]}${detail}`.replace(/\s+/g, ' ').trim();
  };
  for (const [index, line] of lines.entries()) {
    if (/\[ERROR\]|^\s*ERROR\b/.test(line)) {
      errors.push(message(index));
    } else if (/\[WARNING\]|^\s*WARN(ING)?\b/.test(line)) {
      warnings.push(message(index));
    }
  }
  return { ...build, errors, warnings };
}

function analyseServerHtml(html) {
  const host = html.match(/<bench-scenario\b([^>]*)>/);
  const state = html.match(/<script id="ng-state" type="application\/json">([\s\S]*?)<\/script>/);
  return {
    serverContext: host?.[1].match(/ng-server-context="([^"]*)"/)?.[1] ?? null,
    nghAttributes: (html.match(/\sngh="/g) ?? []).length,
    hydrationData: state?.[1].includes('__nghData__') ?? false,
    skipHydration: /\sngskiphydration\b/i.test(html),
  };
}

function installHydrationProbe() {
  const state = {
    started: false,
    frozen: false,
    added: 0,
    removed: 0,
    lastMutation: 0,
    serverNodes: [],
  };
  window.__ssrBench = state;
  const size = (node) => 1 + node.querySelectorAll('*').length;
  const host = () => document.querySelector('bench-scenario');
  const inside = (node) => {
    const element = host();
    return element !== null && (element === node || element.contains(node));
  };
  const start = () => {
    if (state.started) {
      return;
    }
    state.started = true;
    const element = host();
    state.serverNodes = element ? [element, ...element.querySelectorAll('*')] : [];
    const serverSet = new Set(state.serverNodes);
    state.lastMutation = performance.now();
    new MutationObserver((records) => {
      if (state.frozen) {
        return;
      }
      for (const record of records) {
        const targetInside = inside(record.target);
        for (const node of record.removedNodes) {
          if (node.nodeType === 1 && (targetInside || serverSet.has(node))) {
            state.removed += size(node);
            state.lastMutation = performance.now();
          }
        }
        for (const node of record.addedNodes) {
          if (node.nodeType === 1 && (targetInside || inside(node))) {
            state.added += size(node);
            state.lastMutation = performance.now();
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  };
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') {
      start();
    }
  });
}

async function checkServerMarkup(browser, url, scenario) {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto(url);
    const rendered = await page.evaluate(
      () => document.querySelector('bench-scenario')?.childElementCount ?? 0,
    );
    const steps = [];
    for (const step of leadingAssertions(scenario.pattern.probe)) {
      try {
        await runStep(page, step, 0);
        steps.push({ step, ok: true });
      } catch (error) {
        steps.push({ step, ok: false, error: firstLine(error) });
      }
    }
    const ariaSnapshot = await page.locator('bench-scenario').ariaSnapshot();
    const tabStops = await readTabStops(page);
    return {
      ok: rendered > 0 && steps.every((step) => step.ok),
      rendered: rendered > 0,
      steps,
      ariaSnapshot,
      tabStops,
    };
  } finally {
    await context.close();
  }
}

function hydrationCodes(messages) {
  return [...new Set(messages.flatMap((message) => message.match(/NG0?5\d\d/g) ?? []))];
}

async function checkHydrationAndBehavior(browser, url, scenario) {
  const context = await browser.newContext();
  await context.addInitScript(installHydrationProbe);
  const page = await context.newPage();
  const log = { phase: 'hydration', hydration: [], behavior: [] };
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      log[log.phase].push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => log[log.phase].push(`pageerror: ${firstLine(error)}`));
  try {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle');
    await page
      .waitForFunction(
        () =>
          window.__ssrBench?.started &&
          !document.querySelector('bench-scenario')?.hasAttribute('ngh') &&
          performance.now() - window.__ssrBench.lastMutation > 300,
        undefined,
        { timeout: 5000 },
      )
      .catch(() => undefined);
    await page.waitForTimeout(200);
    const snapshot = await page.evaluate(() => {
      const state = window.__ssrBench;
      state.frozen = true;
      const host = document.querySelector('bench-scenario');
      const serverSet = new Set(state.serverNodes);
      const current = host ? [host, ...host.querySelectorAll('*')] : [];
      return {
        started: state.started,
        serverElements: state.serverNodes.length,
        discarded: state.serverNodes.filter((node) => !node.isConnected).length,
        clientCreated: current.filter((node) => !serverSet.has(node)).length,
        added: state.added,
        removed: state.removed,
        rootNghConsumed: host !== null && !host.hasAttribute('ngh'),
        residualNgh: host ? host.querySelectorAll('[ngh]').length : 0,
      };
    });
    const ariaSnapshot = await page.locator('bench-scenario').ariaSnapshot();
    const tabStops = await readTabStops(page);
    const codes = hydrationCodes(log.hydration);
    const hydrated = snapshot.rootNghConsumed && snapshot.discarded === 0 && codes.length === 0;
    const hydration = {
      ok: hydrated && log.hydration.length === 0,
      hydrated,
      ...snapshot,
      codes,
      console: [...log.hydration],
      ariaSnapshot,
      tabStops,
    };

    log.phase = 'behavior';
    let failure = null;
    for (const [index, step] of scenario.pattern.probe.entries()) {
      try {
        await runStep(page, step, 2000);
      } catch (error) {
        failure = `step ${index + 1} ${JSON.stringify(step)}: ${firstLine(error)}`;
        break;
      }
    }
    if (!failure && log.behavior.length > 0) {
      failure = `console: ${log.behavior.map(firstLine).join(' | ')}`;
    }
    return { hydration, behavior: { ok: failure === null, failure, console: log.behavior } };
  } finally {
    await context.close();
  }
}

function readTabStops(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('bench-scenario *')]
      .filter(
        (element) =>
          element.tabIndex >= 0 && !element.disabled && !element.closest('[inert], [hidden]'),
      )
      .map(
        (element) =>
          `${element.getAttribute('role') ?? element.localName} "${element.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)}"`,
      ),
  );
}

function compareSnapshots(server, hydrated) {
  const serverLines = server.ariaSnapshot.split('\n');
  const hydratedLines = hydrated.ariaSnapshot.split('\n');
  const sameTree = server.ariaSnapshot === hydrated.ariaSnapshot;
  const sameTabStops = server.tabStops.join('\n') === hydrated.tabStops.join('\n');
  return {
    identical: sameTree && sameTabStops,
    sameTree,
    sameTabStops,
    onlyOnServer: serverLines.filter((line) => !hydratedLines.includes(line)),
    onlyAfterHydration: hydratedLines.filter((line) => !serverLines.includes(line)),
    serverTabStops: server.tabStops,
    hydratedTabStops: hydrated.tabStops,
  };
}

async function measure(browser, scenario) {
  const dir = join(ssrDistDir, scenario.id);
  const build = readBuild(dir);
  if (build === null) {
    return { status: 'not built' };
  }
  const index = join(dir, 'browser', 'index.html');
  const html = build.prerendered && existsSync(index) ? readFileSync(index, 'utf8') : '';
  const server = analyseServerHtml(html);
  const serverRender = {
    ok:
      build.exitCode === 0 &&
      build.prerendered &&
      server.serverContext !== null &&
      build.errors.length === 0,
    exitCode: build.exitCode,
    seconds: build.seconds,
    prerendered: build.prerendered,
    setup: build.setup,
    errors: build.errors,
    warnings: build.warnings,
    ...server,
  };
  if (!serverRender.prerendered) {
    return { status: 'measured', serverRender };
  }
  const httpServer = await serve(join(dir, 'browser'));
  const url = `http://127.0.0.1:${httpServer.address().port}/`;
  try {
    const serverMarkup = await checkServerMarkup(browser, url, scenario);
    const { hydration, behavior } = await checkHydrationAndBehavior(browser, url, scenario);
    const parity = compareSnapshots(serverMarkup, hydration);
    return { status: 'measured', serverRender, serverMarkup, hydration, parity, behavior };
  } finally {
    httpServer.close();
  }
}

function mark(dimension) {
  if (dimension === undefined) {
    return '–';
  }
  return dimension.ok ? '✅' : '❌';
}

function cell(result) {
  if (result === undefined) {
    return 'not run';
  }
  if (result.status === 'n/a') {
    return 'n/a';
  }
  if (result.status === 'not built') {
    return 'not built';
  }
  return [result.serverRender, result.serverMarkup, result.hydration, result.behavior]
    .map(mark)
    .join(' ');
}

function failuresOf(result) {
  const lines = [];
  const { serverRender, serverMarkup, hydration, behavior } = result;
  if (serverRender && !serverRender.ok) {
    if (serverRender.exitCode !== 0) {
      lines.push(`server render: build exited with ${serverRender.exitCode}`);
    }
    if (!serverRender.prerendered) {
      lines.push('server render: no prerendered index.html');
    }
    for (const error of serverRender.errors) {
      lines.push(`server render: ${error}`);
    }
  }
  if (serverMarkup && !serverMarkup.ok) {
    if (!serverMarkup.rendered) {
      lines.push('server markup: `bench-scenario` is empty in the server HTML');
    }
    for (const step of serverMarkup.steps.filter((candidate) => !candidate.ok)) {
      lines.push(`server markup: \`${JSON.stringify(step.step)}\`: ${step.error}`);
    }
  }
  if (hydration && !hydration.ok) {
    if (!hydration.rootNghConsumed) {
      lines.push('hydration: the root `ngh` attribute was never consumed');
    }
    if (hydration.discarded > 0) {
      lines.push(
        `hydration: ${hydration.discarded} of ${hydration.serverElements} server-rendered elements were discarded`,
      );
    }
    for (const message of hydration.console) {
      lines.push(`hydration: ${firstLine(message)}`);
    }
  }
  if (behavior && !behavior.ok) {
    lines.push(`post-hydration: ${behavior.failure}`);
  }
  return lines;
}

function parityMark(parity) {
  if (parity === undefined) {
    return '–';
  }
  if (parity.identical) {
    return 'yes';
  }
  return `**no** (${[!parity.sameTree && 'tree', !parity.sameTabStops && 'tab stops'].filter(Boolean).join(', ')})`;
}

function formatStops(stops) {
  return stops.length === 0 ? 'none' : stops.map((stop) => `\`${stop}\``).join(', ');
}

function parityLines(results) {
  const lines = [
    '## Server HTML vs hydrated page',
    '',
    'Informational, not a pass/fail dimension. With JavaScript disabled, and again after hydration before any interaction: the Playwright ARIA snapshot of `bench-scenario`, compared line by line, and its keyboard tab stops (elements with `tabIndex >= 0` that are not disabled, `inert` or `hidden`), compared in order.',
    '',
  ];
  const differing = orderedEntries(results).filter(
    ([, result]) => result.parity !== undefined && !result.parity.identical,
  );
  if (differing.length === 0) {
    lines.push('Identical for every scenario.', '');
  }
  for (const [id, result] of differing) {
    lines.push(
      `### ${id}`,
      '',
      ...result.parity.onlyOnServer.map((line) => `- server only: \`${line.trim()}\``),
      ...result.parity.onlyAfterHydration.map(
        (line) => `- after hydration only: \`${line.trim()}\``,
      ),
      ...(result.parity.sameTabStops
        ? []
        : [
            `- tab stops on the server: ${formatStops(result.parity.serverTabStops)}`,
            `- tab stops after hydration: ${formatStops(result.parity.hydratedTabStops)}`,
          ]),
      ...verifiedCause(id, 'parity'),
      '',
    );
  }
  return lines;
}

function orderedEntries(results) {
  return discoverScenarios()
    .map((scenario) => [scenario.id, results[scenario.id]])
    .filter(([, result]) => result !== undefined);
}

function writeReports(results, meta) {
  mkdirSync(resultsDir, { recursive: true });
  writeFileSync(join(resultsDir, 'ssr.json'), `${JSON.stringify({ meta, results }, null, 2)}\n`);

  const lines = [
    '# SSR and hydration',
    '',
    `Generated ${meta.date}. Angular ${meta.versions['@angular/core']}, \`@angular/ssr\` ${meta.versions['@angular/ssr']}, Playwright ${meta.versions.playwright} (Chromium ${meta.chromium}), Node ${meta.node}.`,
    '',
    `Libraries: ${libraries.map((library) => `${library.name} ${meta.versions[library.packages[0]]}`).join(', ')}.`,
    '',
    'Method: [SSR.md](../SSR.md). Each cell reads, in order: **server render** · **server markup** (no JavaScript) · **hydration** · **post-hydration behavior**.',
    '',
    `| Pattern | ${libraries.map((library) => library.name).join(' | ')} |`,
    `| --- | ${libraries.map(() => '---').join(' | ')} |`,
  ];
  for (const pattern of patterns) {
    const cells = libraries.map((library) => cell(results[scenarioId(pattern.id, library.id)]));
    lines.push(`| ${pattern.name} | ${cells.join(' | ')} |`);
  }
  lines.push(
    '',
    '## Per scenario',
    '',
    '| Scenario | Server render | Server markup | Hydration | Server elements | Discarded | Client-created | Server = hydrated | Post-hydration |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const [id, result] of orderedEntries(results)) {
    if (result.status !== 'measured') {
      continue;
    }
    const markup = result.serverMarkup
      ? `${mark(result.serverMarkup)} ${result.serverMarkup.steps.filter((step) => step.ok).length}/${result.serverMarkup.steps.length}`
      : '–';
    const h = result.hydration;
    lines.push(
      `| ${id} | ${mark(result.serverRender)} | ${markup} | ${mark(h)} | ${h?.serverElements ?? '–'} | ${h?.discarded ?? '–'} | ${h?.clientCreated ?? '–'} | ${parityMark(result.parity)} | ${mark(result.behavior)} |`,
    );
  }
  lines.push('', '## Failures', '');
  let any = false;
  for (const [id, result] of orderedEntries(results)) {
    if (result.status !== 'measured') {
      continue;
    }
    const failures = failuresOf(result);
    if (failures.length === 0) {
      continue;
    }
    any = true;
    lines.push(
      `### ${id}`,
      '',
      ...failures.map((failure) => `- ${failure}`),
      ...verifiedCause(id, 'failure'),
      '',
    );
  }
  if (!any) {
    lines.push('None.', '');
  }
  lines.push(...parityLines(results));
  const setups = orderedEntries(results).filter(
    ([, result]) => result.serverRender && (result.serverRender.setup?.providers?.length ?? 0) > 0,
  );
  lines.push('## Per-library SSR setup', '');
  if (setups.length === 0) {
    lines.push('None: every scenario uses only the shared client and server configuration.', '');
  } else {
    for (const [id, result] of setups) {
      lines.push(
        `- **${id}**: ${result.serverRender.setup.providers.map((provider) => `\`${provider}\``).join(', ')}${result.serverRender.setup.note ? `. ${result.serverRender.setup.note}` : ''}`,
      );
    }
    lines.push('');
  }
  const warned = orderedEntries(results).filter(
    ([, result]) => (result.serverRender?.warnings.length ?? 0) > 0,
  );
  if (warned.length > 0) {
    lines.push('## Build warnings', '');
    for (const [id, result] of warned) {
      for (const warning of result.serverRender.warnings) {
        lines.push(`- **${id}**: ${warning}`);
      }
    }
    lines.push('');
  }
  writeFileSync(join(resultsDir, 'ssr.md'), lines.join('\n'));
}

const argv = process.argv.slice(2);
const selected = selectScenarios(argv);
const previous = join(resultsDir, 'ssr.json');
const results =
  argv.some((arg) => !arg.startsWith('--')) && existsSync(previous)
    ? JSON.parse(readFileSync(previous, 'utf8')).results
    : {};
const browser = await chromium.launch();
for (const pattern of patterns) {
  for (const library of libraries) {
    const reason = unsupported[`${pattern.id}/${library.id}`];
    if (reason) {
      results[scenarioId(pattern.id, library.id)] = { status: 'n/a', reason };
    }
  }
}
for (const scenario of discoverScenarios()) {
  if (!selected.some((candidate) => candidate.id === scenario.id)) {
    continue;
  }
  const result = await measure(browser, scenario);
  results[scenario.id] = { pattern: scenario.pattern.id, library: scenario.library.id, ...result };
  console.log(`${cell(result).padEnd(12)} ${scenario.id}`);
  for (const failure of result.status === 'measured' ? failuresOf(result) : []) {
    console.log(`             ${failure}`);
  }
}

const packages = [
  '@angular/core',
  '@angular/ssr',
  '@angular/platform-server',
  '@angular/build',
  'playwright',
  ...new Set(libraries.flatMap((library) => library.packages)),
];
const meta = {
  date: new Date().toISOString(),
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  chromium: browser.version(),
  versions: Object.fromEntries(packages.map((pkg) => [pkg, installedVersion(pkg)])),
};
await browser.close();
writeReports(results, meta);
