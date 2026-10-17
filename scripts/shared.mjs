import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { libraries, patterns, unsupported } from '../bench.config.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const entriesDir = join(root, 'src', 'entries');
export const distDir = join(root, 'dist', 'scenarios');
export const resultsDir = join(root, 'results');

export const BASELINE = 'baseline';

export { libraries, patterns, unsupported };

export function scenarioId(pattern, library) {
  return `${pattern}--${library}`;
}

export function discoverScenarios() {
  const found = [];
  for (const pattern of patterns) {
    const dir = join(root, 'src', 'scenarios', pattern.id);
    const files = existsSync(dir) ? readdirSync(dir) : [];
    for (const library of libraries) {
      if (files.includes(`${library.id}.ts`)) {
        found.push({ id: scenarioId(pattern.id, library.id), pattern, library });
      }
    }
  }
  return found;
}

export function selectScenarios(argv) {
  const filters = argv.filter((arg) => !arg.startsWith('--'));
  const all = discoverScenarios();
  if (filters.length === 0) {
    return all;
  }
  return all.filter((scenario) =>
    filters.some((filter) => {
      const [pattern, library] = filter.split('/');
      return (
        (pattern === '*' || pattern === scenario.pattern.id) &&
        (library === undefined || library === '*' || library === scenario.library.id)
      );
    }),
  );
}

export function flagValue(argv, name, fallback) {
  const prefix = `--${name}=`;
  const match = argv.find((arg) => arg.startsWith(prefix));
  return match === undefined ? fallback : match.slice(prefix.length);
}

export function writeEntry(id, importPath) {
  mkdirSync(entriesDir, { recursive: true });
  const file = join(entriesDir, `${id}.ts`);
  writeFileSync(
    file,
    [
      `import { bootstrapApplication } from '@angular/platform-browser';`,
      `import { appConfig } from '../app.config';`,
      `import { Scenario } from '${importPath}';`,
      ``,
      `bootstrapApplication(Scenario, appConfig).catch((error: unknown) => console.error(error));`,
      ``,
    ].join('\n'),
  );
  return file;
}

export function entryFor(id) {
  if (id === BASELINE) {
    return writeEntry(BASELINE, '../scenarios/baseline');
  }
  const [pattern, library] = id.split('--');
  return writeEntry(id, `../scenarios/${pattern}/${library}`);
}

export function installedVersion(pkg) {
  const manifest = JSON.parse(
    readFileSync(join(root, 'node_modules', pkg, 'package.json'), 'utf8'),
  );
  return manifest.version;
}
