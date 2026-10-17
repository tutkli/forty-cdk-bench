import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import {
  BASELINE,
  distDir,
  installedVersion,
  libraries,
  patterns,
  resultsDir,
  root,
  scenarioId,
  unsupported,
} from './shared.mjs';

function sizes(buffer) {
  return {
    raw: buffer.length,
    gzip: gzipSync(buffer, { level: 9 }).length,
    brotli: brotliCompressSync(buffer, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}

function sum(list) {
  return list.reduce(
    (total, item) => ({
      raw: total.raw + item.raw,
      gzip: total.gzip + item.gzip,
      brotli: total.brotli + item.brotli,
    }),
    { raw: 0, gzip: 0, brotli: 0 },
  );
}

function measure(id) {
  const browser = join(distDir, id, 'browser');
  const indexPath = join(browser, 'index.html');
  if (!existsSync(indexPath)) {
    return null;
  }
  const html = readFileSync(indexPath, 'utf8');
  const initialJs = new Set();
  for (const match of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) initialJs.add(match[1]);
  for (const match of html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g))
    initialJs.add(match[1]);
  const initialCss = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  const inlineCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) =>
    Buffer.from(m[1]),
  );

  const allJs = readdirSync(browser).filter((file) => file.endsWith('.js'));
  const file = (name) => sizes(readFileSync(join(browser, name)));

  return {
    initialJs: sum([...initialJs].map(file)),
    lazyJs: sum(allJs.filter((name) => !initialJs.has(name)).map(file)),
    css: sum([...initialCss.map(file), ...inlineCss.map(sizes)]),
    files: { initial: [...initialJs], lazy: allJs.filter((name) => !initialJs.has(name)) },
  };
}

function delta(value, base) {
  return {
    raw: value.raw - base.raw,
    gzip: value.gzip - base.gzip,
    brotli: value.brotli - base.brotli,
  };
}

const baseline = measure(BASELINE);
if (baseline === null) {
  console.error('No baseline build found. Run `pnpm bench:build` first.');
  process.exit(1);
}

const rows = [];
for (const pattern of patterns) {
  for (const library of libraries) {
    const id = scenarioId(pattern.id, library.id);
    const reason = unsupported[`${pattern.id}/${library.id}`];
    const measured = measure(id);
    rows.push({
      pattern: pattern.id,
      library: library.id,
      status: measured ? 'measured' : reason ? 'unsupported' : 'missing',
      reason: reason ?? null,
      ...(measured && {
        initialJs: measured.initialJs,
        initialJsDelta: delta(measured.initialJs, baseline.initialJs),
        lazyJs: measured.lazyJs,
        css: measured.css,
        cssDelta: delta(measured.css, baseline.css),
        files: measured.files,
      }),
    });
  }
}

let commit = null;
try {
  commit = execSync('git rev-parse --short HEAD', {
    cwd: root,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .trim();
} catch {}

const packages = [
  ...new Set(['@angular/core', ...libraries.flatMap((library) => library.packages)]),
];
const report = {
  generatedAt: new Date().toISOString(),
  commit,
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  versions: Object.fromEntries(packages.map((pkg) => [pkg, installedVersion(pkg)])),
  baseline,
  rows,
};

mkdirSync(resultsDir, { recursive: true });
writeFileSync(join(resultsDir, 'bundle-size.json'), `${JSON.stringify(report, null, 2)}\n`);

const kb = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;
const signed = (bytes) => `${bytes >= 0 ? '+' : '−'}${kb(Math.abs(bytes))}`;

function table(metric) {
  const header = `| Pattern | ${libraries.map((library) => library.name).join(' | ')} |`;
  const divider = `| --- | ${libraries.map(() => '---:').join(' | ')} |`;
  const body = patterns.map((pattern) => {
    const cells = libraries.map((library) => {
      const row = rows.find((r) => r.pattern === pattern.id && r.library === library.id);
      if (row.status === 'measured') {
        const lazy = row.lazyJs[metric] > 0 ? ` (+${kb(row.lazyJs[metric])} lazy)` : '';
        const css = row.cssDelta[metric] > 0 ? ` (+${kb(row.cssDelta[metric])} CSS)` : '';
        return `${signed(row.initialJsDelta[metric])}${lazy}${css}`;
      }
      return row.status === 'unsupported' ? 'n/a' : '—';
    });
    return `| ${pattern.name} | ${cells.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

const notes = rows
  .filter((row) => row.status === 'unsupported')
  .map((row) => {
    const library = libraries.find((l) => l.id === row.library);
    const pattern = patterns.find((p) => p.id === row.pattern);
    return `- **${library.name} / ${pattern.name}**: ${row.reason}`;
  });

const markdown = [
  '# Bundle size',
  '',
  `Generated ${report.generatedAt}${commit ? ` at \`${commit}\`` : ''} on Node ${report.node} (${report.platform}).`,
  '',
  `Initial JavaScript added on top of an empty zoneless Angular app (baseline: ${kb(baseline.initialJs.gzip)} gzip, ${kb(baseline.initialJs.brotli)} brotli, ${kb(baseline.initialJs.raw)} raw). Production build, one app per cell.`,
  '',
  '## gzip (level 9)',
  '',
  table('gzip'),
  '',
  '## brotli (quality 11)',
  '',
  table('brotli'),
  '',
  '## raw (minified)',
  '',
  table('raw'),
  '',
  '`n/a`: the library has no primitive for the pattern. `—`: not written yet.',
  '',
  ...(notes.length > 0 ? ['## Unsupported', '', ...notes, ''] : []),
  '## Versions',
  '',
  ...Object.entries(report.versions).map(([pkg, version]) => `- \`${pkg}\` ${version}`),
  '',
].join('\n');

writeFileSync(join(resultsDir, 'bundle-size.md'), markdown);
console.log(markdown);
