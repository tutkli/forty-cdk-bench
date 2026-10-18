import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { libraries, resultsDir, root } from './shared.mjs';

const load = (name) => {
  const path = join(resultsDir, `${name}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
};

const size = load('bundle-size');
const a11y = load('a11y');
const ssr = load('ssr');
const perf = load('perf');
const api = load('api');
const coverage = load('coverage');
const code = load('consumer-code');

const BROWSER_NODE_RETENTION = { combobox: 1 };
const kb = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;

function cells(library) {
  const suite = size?.suites.find((s) => s.library === library.id);
  const scenarios =
    a11y?.scenarios.filter((s) => s.library === library.id && s.status === 'ok') ?? [];
  const checks = scenarios.flatMap((s) => s.checks);
  const required = checks.filter((c) => c.level === 'required');
  const others = checks.filter((c) => c.level !== 'required');
  const axe = scenarios.reduce(
    (total, s) => total + s.axe.reduce((sum, state) => sum + state.violations.length, 0),
    0,
  );
  const ssrRows = Object.values(ssr?.results ?? {}).filter(
    (r) => r.library === library.id && r.status === 'measured',
  );
  const ssrClean = ssrRows.filter((r) =>
    ['serverRender', 'serverMarkup', 'hydration', 'behavior'].every((key) => r[key]?.ok),
  );
  const leakRows = (perf?.rows ?? []).filter(
    (r) => r.library === library.id && r.leaks && !r.leaks.error,
  );
  const leaking = leakRows.filter(
    (r) =>
      r.leaks.listenersPerCycle > 0.5 ||
      r.leaks.nodesPerCycle - (BROWSER_NODE_RETENTION[r.pattern] ?? 0) > 0.5,
  );
  const apiRow = api?.rows.find((r) => r.library === library.id);
  const covered = coverage?.rows.filter((r) => r.cells[library.id] !== null).length;
  const codeRows = (code?.rows ?? []).filter(
    (r) => r.library === library.id && r.status === 'measured',
  );
  const lines = codeRows.map((r) => r.templateLines + r.typescriptLines).sort((a, b) => a - b);

  return {
    coverage: coverage ? `${covered} / ${coverage.rows.length}` : '—',
    bundle: suite ? `${kb(suite.initialJsDelta.gzip)} (${suite.patterns.length})` : '—',
    required: required.length
      ? `${required.filter((c) => c.status === 'pass').length} / ${required.length}`
      : '—',
    others: others.length
      ? `${others.filter((c) => c.status === 'pass').length} / ${others.length}`
      : '—',
    axe: a11y ? String(axe) : '—',
    ssr: ssrRows.length ? `${ssrClean.length} / ${ssrRows.length}` : '—',
    leaks: leakRows.length
      ? leaking.length === 0
        ? 'none'
        : leaking.map((r) => `${r.pattern} (+${r.leaks.nodesPerCycle.toFixed(0)} nodes)`).join(', ')
      : '—',
    lines: lines.length ? String(lines[Math.floor((lines.length - 1) / 2)]) : '—',
    signals: apiRow
      ? `${Math.round((apiRow.signalInputs / Math.max(1, apiRow.signalInputs + apiRow.decoratorInputs)) * 100)} %`
      : '—',
    forms: apiRow
      ? apiRow.signalFormsControls > 0
        ? 'Signal Forms'
        : apiRow.controlValueAccessors > 0
          ? '`ControlValueAccessor`'
          : apiRow.ngControlBundles > 0
            ? 'reads `NgControl`'
            : '—'
      : '—',
  };
}

const rows = [
  ['APG patterns covered', 'coverage', 'coverage.md'],
  ['Initial JS, all measured patterns in one app (gzip, patterns)', 'bundle', 'bundle-size.md'],
  ['Required APG checks passed', 'required', 'a11y.md'],
  ['Optional / recommended APG checks passed', 'others', 'a11y.md'],
  ['axe violations (WCAG 2.2 AA tags)', 'axe', 'a11y.md'],
  ['Scenarios clean under SSR + hydration', 'ssr', 'ssr.md'],
  ['Leaks (DOM nodes or listeners retained per cycle)', 'leaks', 'perf.md'],
  ['Consumer code, median lines per scenario', 'lines', 'consumer-code.md'],
  ['Signal inputs', 'signals', 'api.md'],
  ['Forms integration', 'forms', 'api.md'],
];

const values = libraries.map((library) => cells(library));
const table = [
  `| | ${libraries.map((library) => library.name).join(' | ')} |`,
  `| --- | ${libraries.map(() => ':---:').join(' | ')} |`,
  ...rows.map(
    ([label, key, file]) =>
      `| [${label}](results/${file}) | ${values.map((value) => value[key]).join(' | ')} |`,
  ),
].join('\n');

const section = [
  '## Results at a glance',
  '',
  `Generated from \`results/*.json\` by \`pnpm bench:summary\`. Each row links to its full report. Libraries cover different sets of patterns, so a total is only comparable together with the number of patterns behind it; the per-pattern tables in each report are the fair comparison.`,
  '',
  table,
  '',
  'The runtime timings (render, interaction latency, 1000-option lists) do not reduce to one number: see [results/perf.md](results/perf.md).',
  '',
].join('\n');

const readmePath = join(root, 'README.md');
const readme = readFileSync(readmePath, 'utf8');
const start = readme.indexOf('## Results at a glance');
if (start === -1) {
  console.error('README.md has no "## Results at a glance" section to fill.');
  process.exit(1);
}
const next = readme.indexOf('\n## ', start + 1);
writeFileSync(
  readmePath,
  `${readme.slice(0, start)}${section}${next === -1 ? '' : readme.slice(next + 1)}`,
);
console.log(section);
