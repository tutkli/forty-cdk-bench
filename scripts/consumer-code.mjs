import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  discoverScenarios,
  libraries,
  patterns,
  resultsDir,
  root,
  scenarioId,
  unsupported,
} from './shared.mjs';

const SHARED_SOURCES = new Set(['@angular/core', '../data']);
const BOILERPLATE =
  /^\s*(@Component\(\{|selector: |changeDetection: |\}\)|export class Scenario \{)/;
const CLOSING_ONLY = /^\s*[}\])]+[;,)]*\s*$/;

function measure(file) {
  let source = readFileSync(file, 'utf8');

  const imports = [
    ...source.matchAll(/^import\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+'([^']+)';\s*$/gm),
  ];
  const librarySymbols = imports
    .filter((match) => !SHARED_SOURCES.has(match[2]))
    .flatMap((match) =>
      match[1]
        .split(',')
        .map((symbol) => symbol.trim())
        .filter(Boolean),
    );
  source = source.replace(/^import[\s\S]*?;\s*$/gm, '');

  const templateStart = source.indexOf('template: `');
  const templateEnd = source.indexOf('`', templateStart + 'template: `'.length);
  const template = source.slice(templateStart + 'template: `'.length, templateEnd);
  source = source.slice(0, templateStart) + source.slice(templateEnd + 1);
  source = source.replace(/^\s*imports: \[[\s\S]*?\],\s*$/m, '');

  const nonBlank = (text) => text.split('\n').filter((line) => line.trim() !== '');
  const typescript = nonBlank(source).filter(
    (line) => !BOILERPLATE.test(line) && !CLOSING_ONLY.test(line) && line.trim() !== ',',
  );

  return {
    templateLines: nonBlank(template).filter((line) => !CLOSING_ONLY.test(line)).length,
    typescriptLines: typescript.length,
    librarySymbols: librarySymbols.length,
    imports: librarySymbols,
  };
}

const scenarios = discoverScenarios();
const rows = [];
for (const pattern of patterns) {
  for (const library of libraries) {
    const scenario = scenarios.find(
      (candidate) => candidate.pattern.id === pattern.id && candidate.library.id === library.id,
    );
    const reason = unsupported[`${pattern.id}/${library.id}`];
    rows.push({
      id: scenarioId(pattern.id, library.id),
      pattern: pattern.id,
      library: library.id,
      status: scenario ? 'measured' : reason ? 'unsupported' : 'missing',
      ...(scenario && measure(join(root, 'src', 'scenarios', pattern.id, `${library.id}.ts`))),
    });
  }
}

mkdirSync(resultsDir, { recursive: true });
writeFileSync(
  join(resultsDir, 'consumer-code.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2)}\n`,
);

const header = `| Pattern | ${libraries.map((library) => library.name).join(' | ')} |`;
const divider = `| --- | ${libraries.map(() => '---:').join(' | ')} |`;
const body = patterns.map((pattern) => {
  const cells = libraries.map((library) => {
    const row = rows.find((r) => r.pattern === pattern.id && r.library === library.id);
    if (row.status !== 'measured') {
      return row.status === 'unsupported' ? 'n/a' : '—';
    }
    return `${row.templateLines + row.typescriptLines} (${row.templateLines} + ${row.typescriptLines}) · ${row.librarySymbols}`;
  });
  return `| ${patterns.find((p) => p.id === pattern.id).name} | ${cells.join(' | ')} |`;
});

const markdown = [
  '# Consumer code',
  '',
  `Generated ${new Date().toISOString()}. How much code a consumer writes to build the same accessible component ([SCENARIOS.md](../SCENARIOS.md)) with each library, read from the scenario files. Every file is formatted by the same Prettier config.`,
  '',
  'Cell: **total lines (template + TypeScript) · library symbols imported**.',
  '',
  header,
  divider,
  ...body,
  '',
  '- **Template lines**: non-blank lines of the inline template.',
  '- **TypeScript lines**: non-blank lines outside the template, excluding imports, the decorator lines every scenario shares (`@Component`, `selector`, `changeDetection`, `imports: [...]`, the class header) and lines holding only closing brackets. Component-level `providers` count.',
  '- **Library symbols**: named imports from anything other than `@angular/core` and the shared data module, including a library dependency the docs require (e.g. `@angular/cdk/overlay` in the Angular Aria menu and combobox).',
  '- Fewer lines is not automatically better: a line may be the consumer opting into something the library leaves out (see [NOTES.md](../NOTES.md) for what each scenario had to write by hand), and a primitive that needs more pieces can still be the better API.',
  '',
].join('\n');

writeFileSync(join(resultsDir, 'consumer-code.md'), markdown);
console.log(markdown);
