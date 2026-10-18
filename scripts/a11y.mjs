import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';
import { axeTags, checks, notes, openStates } from '../a11y.config.mjs';
import {
  distDir,
  installedVersion,
  libraries,
  patterns,
  resultsDir,
  root,
  scenarioId,
  selectScenarios,
  unsupported,
} from './shared.mjs';

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
};

const AXE_PATH = join(root, 'node_modules', 'axe-core', 'axe.min.js');
const IMPACTS = ['critical', 'serious', 'moderate', 'minor'];
const LEVELS = ['required', 'recommended', 'optional'];
const POOL = 2;

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

function installInspector() {
  const refs = (element, attribute) =>
    (element?.getAttribute(attribute) ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id));
  const text = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const name = (element) => {
    const label = element.getAttribute('aria-label');
    if (label && label.trim()) {
      return label.trim();
    }
    const labelledBy = refs(element, 'aria-labelledby').filter(Boolean);
    if (labelledBy.length > 0) {
      return labelledBy.map(text).join(' ');
    }
    return text(element);
  };
  const visible = (element) =>
    !!element &&
    element.isConnected &&
    element.checkVisibility({ visibilityProperty: true, opacityProperty: false }) &&
    element.getClientRects().length > 0;
  const effective = () => {
    const active = document.activeElement;
    const target = refs(active, 'aria-activedescendant')[0];
    return target ?? active;
  };
  const describe = (element) => {
    if (!element) {
      return 'nothing';
    }
    if (element === document.body) {
      return '<body>';
    }
    const role = element.getAttribute('role');
    const label = name(element).slice(0, 40);
    return `<${element.tagName.toLowerCase()}${role ? ` role=${role}` : ''}>${label ? ` "${label}"` : ''}`;
  };
  const tabbables = (container) =>
    [container, ...container.querySelectorAll('*')].filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.disabled &&
        !element.closest('[inert]') &&
        visible(element) &&
        !(element.matches('div,span') && !element.hasAttribute('role') && name(element) === ''),
    );
  const textState = (wanted) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let present = false;
    let shown = false;
    let exposed = false;
    while (walker.nextNode()) {
      if (walker.currentNode.data.trim() === wanted) {
        const parent = walker.currentNode.parentElement;
        present = true;
        shown = shown || visible(parent);
        exposed = exposed || (visible(parent) && !parent.closest('[aria-hidden="true"],[inert]'));
      }
    }
    return { present, visible: shown, exposed };
  };
  window.__a11y = { refs, name, visible, effective, describe, tabbables, textState };
}

function helpers(page) {
  const h = {
    page,
    role(role, name) {
      return page.getByRole(role, name === undefined ? {} : { name, exact: true });
    },
    show(value) {
      return value === null ? 'unset' : `"${value}"`;
    },
    async until(predicate, timeout = 1500) {
      const deadline = Date.now() + timeout;
      let last = 'condition not met';
      for (;;) {
        try {
          const result = await predicate();
          if (result === null || result === undefined || result === true) {
            return;
          }
          last = result === false ? 'condition not met' : result;
        } catch (error) {
          last = error.message.split('\n')[0];
        }
        if (Date.now() >= deadline) {
          throw new Error(last);
        }
        await page.waitForTimeout(50);
      }
    },
    async one(role, name) {
      const locator = h.role(role, name);
      await h.until(async () => {
        const count = await locator.count();
        return count === 1 ? null : `expected one visible ${role} named "${name}", found ${count}`;
      });
      return locator;
    },
    press(key) {
      return page.keyboard.press(key);
    },
    async settle() {
      await page.evaluate(
        () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
      );
      await page.waitForTimeout(250);
    },
    focusDescription() {
      return page.evaluate(() => window.__a11y.describe(window.__a11y.effective()));
    },
    async focusOn(locator, label, timeout = 1500) {
      await h.until(async () => {
        const focused = await locator.evaluate(
          (element) => element === window.__a11y.effective(),
          undefined,
          { timeout: 500 },
        );
        return focused
          ? null
          : `expected focus on ${label}, focus is on ${await h.focusDescription()}`;
      }, timeout);
    },
    textState(text) {
      return page.evaluate((wanted) => window.__a11y.textState(wanted), text);
    },
    async expectOutput(expected) {
      await h.until(async () => {
        const text = ((await page.locator('output').textContent()) ?? '').trim();
        return text === expected ? null : `<output> reads "${text}", expected "${expected}"`;
      });
    },
    sentinels() {
      return page.evaluate(() => {
        if (document.querySelector('[data-a11y-sentinel]')) {
          return;
        }
        for (const position of ['before', 'after']) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = `Sentinel ${position}`;
          button.dataset.a11ySentinel = position;
          if (position === 'before') {
            document.body.prepend(button);
          } else {
            document.body.append(button);
          }
        }
      });
    },
    focusSentinel(position) {
      return page.locator(`[data-a11y-sentinel="${position}"]`).focus();
    },
  };
  return h;
}

async function openScenario(browser, url) {
  const context = await browser.newContext();
  await context.addInitScript(installInspector);
  const page = await context.newPage();
  page.setDefaultTimeout(1000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message.split('\n')[0]));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text().split('\n')[0]);
    }
  });
  await page.goto(url, { timeout: 15000 });
  await page.waitForFunction(
    () => document.querySelector('bench-scenario')?.childElementCount > 0,
    undefined,
    { timeout: 10000 },
  );
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
  return { context, page, errors };
}

async function attempt(browser, url, check) {
  let opened;
  try {
    opened = await openScenario(browser, url);
  } catch (error) {
    return { ok: false, message: `page did not load: ${error.message.split('\n')[0]}`, errors: [] };
  }
  const { context, page, errors } = opened;
  try {
    await check.run(page, helpers(page));
    return { ok: true, errors };
  } catch (error) {
    return { ok: false, message: error.message.split('\n')[0], errors };
  } finally {
    await context.close();
  }
}

async function runCheck(browser, url, check) {
  const first = await attempt(browser, url, check);
  const base = { id: check.id, title: check.title, level: check.level, apg: check.apg };
  if (first.ok) {
    return { ...base, status: 'pass', flaky: false, pageErrors: first.errors };
  }
  const second = await attempt(browser, url, check);
  if (second.ok) {
    return {
      ...base,
      status: 'pass',
      flaky: true,
      message: `failed once: ${first.message}`,
      pageErrors: second.errors,
    };
  }
  return {
    ...base,
    status: 'fail',
    flaky: false,
    message: second.message,
    firstMessage: first.message === second.message ? undefined : first.message,
    pageErrors: second.errors,
  };
}

async function runAxe(browser, url, pattern, state) {
  let opened;
  try {
    opened = await openScenario(browser, url);
  } catch (error) {
    return { state, error: `page did not load: ${error.message.split('\n')[0]}`, violations: [] };
  }
  const { context, page } = opened;
  try {
    if (state === 'open') {
      await openStates[pattern](page, helpers(page));
      await helpers(page).settle();
    }
    await page.addScriptTag({ path: AXE_PATH });
    const violations = await page.evaluate(async (tags) => {
      const result = await window.axe.run(document, {
        runOnly: { type: 'tag', values: tags },
        resultTypes: ['violations'],
      });
      return result.violations.map((violation) => ({
        rule: violation.id,
        impact: violation.impact,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.length,
        target: violation.nodes[0]?.target.join(' ') ?? '',
      }));
    }, axeTags);
    return { state, violations };
  } catch (error) {
    return { state, error: error.message.split('\n')[0], violations: [] };
  } finally {
    await context.close();
  }
}

async function runScenario(browser, scenario) {
  const dir = join(distDir, scenario.id, 'browser');
  const base = { id: scenario.id, pattern: scenario.pattern.id, library: scenario.library.id };
  if (!existsSync(join(dir, 'index.html'))) {
    return { ...base, status: 'not-built' };
  }
  const server = await serve(dir);
  const url = `http://127.0.0.1:${server.address().port}/`;
  const started = Date.now();
  try {
    const prefix = `${scenario.pattern.id}/${scenario.library.id}`;
    const results = [];
    for (const check of checks[scenario.pattern.id] ?? []) {
      const result = await runCheck(browser, url, check);
      const note = notes[`${prefix}/${check.id}`];
      results.push(result.status === 'fail' && note ? { ...result, note } : result);
    }
    const axe = [await runAxe(browser, url, scenario.pattern.id, 'initial')];
    if (openStates[scenario.pattern.id]) {
      axe.push(await runAxe(browser, url, scenario.pattern.id, 'open'));
    }
    for (const state of axe) {
      state.violations = state.violations.map((violation) => {
        const note = notes[`${prefix}/axe:${violation.rule}`];
        return note ? { ...violation, note } : violation;
      });
    }
    return { ...base, status: 'ok', durationMs: Date.now() - started, checks: results, axe };
  } finally {
    server.close();
  }
}

function tally(scenario, level) {
  const relevant = scenario.checks.filter((check) => check.level === level);
  const passed = relevant.filter((check) => check.status === 'pass').length;
  return { passed, total: relevant.length };
}

function axeCounts(scenario) {
  const counts = Object.fromEntries(IMPACTS.map((impact) => [impact, 0]));
  for (const state of scenario.axe) {
    for (const violation of state.violations) {
      counts[violation.impact] = (counts[violation.impact] ?? 0) + 1;
    }
  }
  return counts;
}

function cellFor(results, pattern, library, render) {
  const id = scenarioId(pattern.id, library.id);
  if (unsupported[`${pattern.id}/${library.id}`]) {
    return 'n/a';
  }
  const scenario = results.find((candidate) => candidate.id === id);
  if (!scenario) {
    return '–';
  }
  if (scenario.status !== 'ok') {
    return scenario.status;
  }
  return render(scenario);
}

function fraction({ passed, total }) {
  return total === 0 ? '–' : `${passed}/${total}`;
}

function markdown(report) {
  const { meta, scenarios } = report;
  const shownLibraries = libraries.filter((library) =>
    scenarios.some((scenario) => scenario.library === library.id),
  );
  const shownPatterns = patterns.filter((pattern) =>
    scenarios.some((scenario) => scenario.pattern === pattern.id),
  );
  const header = `| Pattern | ${shownLibraries.map((library) => library.name).join(' | ')} |`;
  const divider = `| --- | ${shownLibraries.map(() => '---').join(' | ')} |`;
  const table = (render) =>
    shownPatterns.map(
      (pattern) =>
        `| ${pattern.name} | ${shownLibraries
          .map((library) => cellFor(scenarios, pattern, library, render))
          .join(' | ')} |`,
    );
  const flakyMark = (scenario) => (scenario.checks.some((check) => check.flaky) ? ' †' : '');
  const lines = [
    '# Accessibility conformance',
    '',
    `Run ${meta.date} · Chromium ${meta.chromium} · Playwright ${meta.playwright} · axe-core ${meta.axe} · Node ${meta.node} · ${Math.round(meta.durationMs / 1000)} s`,
    '',
    `Versions: ${Object.entries(meta.versions)
      .map(([pkg, version]) => `\`${pkg}@${version}\``)
      .join(', ')}`,
    '',
    'Checks come from the WAI-ARIA APG pattern pages; see [A11Y.md](../A11Y.md) for the method. `n/a`: the library has no primitive for the pattern. † a check passed only on its retry.',
    '',
    '## Required checks passed',
    '',
    header,
    divider,
    ...table((scenario) => `${fraction(tally(scenario, 'required'))}${flakyMark(scenario)}`),
    '',
    '## Recommended · optional checks passed',
    '',
    header,
    divider,
    ...table(
      (scenario) =>
        `${fraction(tally(scenario, 'recommended'))} · ${fraction(tally(scenario, 'optional'))}`,
    ),
    '',
    '## axe-core violations',
    '',
    `Tags: ${axeTags.join(', ')}. Whole document, initial state, plus the open state for menu, combobox and dialog. Counts are rules violated (critical / serious / moderate / minor), summed over states.`,
    '',
    header,
    divider,
    ...table((scenario) => {
      const counts = axeCounts(scenario);
      const total = IMPACTS.reduce((sum, impact) => sum + counts[impact], 0);
      return total === 0 ? '0' : `${total} (${IMPACTS.map((impact) => counts[impact]).join('/')})`;
    }),
    '',
  ];

  const axeRows = scenarios
    .filter((scenario) => scenario.status === 'ok')
    .flatMap((scenario) =>
      scenario.axe.flatMap((state) => [
        ...(state.error
          ? [
              `| ${scenario.pattern}/${scenario.library} | ${state.state} | error | ${state.error} | |`,
            ]
          : []),
        ...state.violations.map(
          (violation) =>
            `| ${scenario.pattern}/${scenario.library} | ${state.state} | ${violation.impact} | [${violation.rule}](${violation.helpUrl}) (${violation.nodes} node${violation.nodes === 1 ? '' : 's'}) | \`${violation.target.replace(/\|/g, '\\|')}\` | ${violation.note ? `${violation.note.cause}: ${violation.note.text}` : ''} |`,
        ),
      ]),
    );
  if (axeRows.length > 0) {
    lines.push(
      '| Scenario | State | Impact | Rule | First target | Cause (verified by hand) |',
      '| --- | --- | --- | --- | --- | --- |',
      ...axeRows,
      '',
    );
  }

  lines.push(
    '## Failures by library',
    '',
    'A **Cause** line marks a failure that was reproduced by hand outside the harness, and says whether it comes from the library or from the scenario code (hand-written pieces or a deviation from the library docs). A failure without one has not been reviewed yet.',
    '',
  );
  for (const library of shownLibraries) {
    lines.push(`### ${library.name}`, '');
    const own = scenarios.filter((scenario) => scenario.library === library.id);
    const failures = own.flatMap((scenario) =>
      (scenario.checks ?? [])
        .filter((check) => check.status === 'fail')
        .map(
          (check) =>
            `- **${scenario.pattern}** \`${check.id}\` (${check.level}): ${check.message} · [APG](${check.apg})${check.note ? `\n  - **Cause: ${check.note.cause}.** ${check.note.text}` : ''}`,
        ),
    );
    const flaky = own.flatMap((scenario) =>
      (scenario.checks ?? [])
        .filter((check) => check.flaky)
        .map(
          (check) => `- **${scenario.pattern}** \`${check.id}\` passed on retry (${check.message})`,
        ),
    );
    lines.push(...(failures.length > 0 ? failures : ['No failing checks.']), '');
    if (flaky.length > 0) {
      lines.push('Flaky:', '', ...flaky, '');
    }
  }

  lines.push('## Not applicable', '');
  for (const [key, reason] of Object.entries(unsupported)) {
    lines.push(`- \`${key}\`: ${reason}`);
  }
  lines.push('');
  return lines.join('\n');
}

const started = Date.now();
const scenarios = selectScenarios(process.argv.slice(2));
const browser = await chromium.launch();
const queue = [...scenarios];
const results = [];

async function worker() {
  while (queue.length > 0) {
    const scenario = queue.shift();
    const result = await runScenario(browser, scenario);
    results.push(result);
    if (result.status !== 'ok') {
      console.log(`skip ${scenario.id} (${result.status})`);
      continue;
    }
    const required = tally(result, 'required');
    const failed = result.checks.filter((check) => check.status === 'fail');
    const flaky = result.checks.filter((check) => check.flaky).length;
    console.log(
      `${failed.length === 0 ? 'ok  ' : 'FAIL'} ${scenario.id} required ${required.passed}/${required.total}, ${failed.length} failing${flaky ? `, ${flaky} flaky` : ''} (${Math.round(result.durationMs / 1000)} s)`,
    );
    for (const check of failed) {
      console.log(`     ${check.id} [${check.level}]: ${check.message}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(POOL, scenarios.length) }, worker));
const chromiumVersion = browser.version();
await browser.close();

const order = scenarios.map((scenario) => scenario.id);
results.sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id));

const packages = [
  ...new Set(['@angular/core', ...libraries.flatMap((library) => library.packages)]),
];
const report = {
  meta: {
    date: new Date().toISOString(),
    durationMs: Date.now() - started,
    node: process.versions.node,
    playwright: installedVersion('playwright'),
    chromium: chromiumVersion,
    axe: installedVersion('axe-core'),
    axeTags,
    versions: Object.fromEntries(packages.map((pkg) => [pkg, installedVersion(pkg)])),
  },
  unsupported,
  scenarios: results,
};

mkdirSync(resultsDir, { recursive: true });
writeFileSync(join(resultsDir, 'a11y.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(resultsDir, 'a11y.md'), markdown(report));
console.log(
  `wrote results/a11y.json and results/a11y.md in ${Math.round(report.meta.durationMs / 1000)} s`,
);
