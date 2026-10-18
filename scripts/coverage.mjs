import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { apgPatterns, coverage, partial } from '../coverage.config.mjs';
import { installedVersion, libraries, resultsDir, root } from './shared.mjs';

const TYPINGS = {
  forty: (entry) => ['forty-cdk', `types/forty-cdk-${entry}.d.ts`],
  'ng-primitives': (entry) => ['ng-primitives', `types/ng-primitives-${entry}.d.ts`],
  'angular-aria': (entry) => ['@angular/aria', `types/${entry}.d.ts`],
  'angular-cdk': (entry) => ['@angular/cdk', `types/${entry}.d.ts`],
  spartan: (entry) => ['@spartan-ng/brain', `types/spartan-ng-brain-${entry}.d.ts`],
};

function readTypings(path, seen = new Set()) {
  if (seen.has(path) || !existsSync(path)) {
    return '';
  }
  seen.add(path);
  const text = readFileSync(path, 'utf8');
  const chunks = [...text.matchAll(/from '(\.\/[^']+)\.js'/g)].map((match) =>
    join(path, '..', `${match[1]}.d.ts`),
  );
  return [text, ...chunks.map((chunk) => readTypings(chunk, seen))].join('\n');
}

function backs(typings, evidence) {
  const escaped = evidence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(evidence.startsWith('class ') ? `${escaped}\\b` : escaped).test(typings);
}

const problems = [];

function verify(library, pattern, claim) {
  const [pkg, file] = TYPINGS[library.id](claim.entry);
  const path = join(root, 'node_modules', pkg, file);
  const manifest = JSON.parse(
    readFileSync(join(root, 'node_modules', pkg, 'package.json'), 'utf8'),
  );
  const exported = Object.keys(manifest.exports ?? {}).includes(`./${claim.entry}`);
  const backed = backs(readTypings(path), claim.evidence);
  if (!exported || !backed) {
    problems.push(
      `${library.id} / ${pattern.id}: ${exported ? '' : `entry point ./${claim.entry} not exported; `}${backed ? '' : `"${claim.evidence}" not found in ${file}`}`,
    );
  }
  return { ...claim, specifier: `${pkg}/${claim.entry}` };
}

const rows = apgPatterns.map((pattern) => ({
  pattern: pattern.id,
  cells: Object.fromEntries(
    libraries.map((library) => {
      const claim = coverage[library.id]?.[pattern.id];
      return [library.id, claim ? verify(library, pattern, claim) : null];
    }),
  ),
  partial: Object.fromEntries(
    libraries.flatMap((library) => {
      const gap = partial[library.id]?.[pattern.id];
      if (!gap) {
        return [];
      }
      if (coverage[library.id]?.[pattern.id]) {
        problems.push(`${library.id} / ${pattern.id}: listed as both covered and partial`);
      }
      return [[library.id, verify(library, pattern, gap)]];
    }),
  ),
}));

if (problems.length > 0) {
  console.error(`Coverage claims that the installed packages do not back:\n${problems.join('\n')}`);
  process.exit(1);
}

const versions = Object.fromEntries(
  Object.values(TYPINGS).map((resolve) => {
    const [pkg] = resolve('x');
    return [pkg, installedVersion(pkg)];
  }),
);

mkdirSync(resultsDir, { recursive: true });
writeFileSync(
  join(resultsDir, 'coverage.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), versions, rows }, null, 2)}\n`,
);

const totals = libraries.map(
  (library) => rows.filter((row) => row.cells[library.id] !== null).length,
);
const notes = [];
const header = `| APG pattern | ${libraries.map((library) => library.name).join(' | ')} |`;
const divider = `| --- | ${libraries.map(() => ':---:').join(' | ')} |`;
const body = rows.map((row) => {
  const pattern = apgPatterns.find((candidate) => candidate.id === row.pattern);
  const cells = libraries.map((library) => {
    const cell = row.cells[library.id];
    if (!cell) {
      const gap = row.partial[library.id];
      if (gap) {
        notes.push(
          `${notes.length + 1}. **${library.name} / ${pattern.name}** (not counted): ${gap.note}.`,
        );
        return `·<sup>${notes.length}</sup>`;
      }
      return '·';
    }
    if (cell.note) {
      notes.push(`${notes.length + 1}. **${library.name} / ${pattern.name}**: ${cell.note}.`);
      return `\`${cell.entry}\`<sup>${notes.length}</sup>`;
    }
    return `\`${cell.entry}\``;
  });
  return `| [${pattern.name}](https://www.w3.org/WAI/ARIA/apg/patterns/${pattern.path}/) | ${cells.join(' | ')} |`;
});

const markdown = [
  '# Coverage',
  '',
  `Generated ${new Date().toISOString()}. Which [WAI-ARIA APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) each library ships a primitive for (Landmarks and Link are left out: they are plain HTML). A cell names the entry point, and a \`·\` with a note marks building blocks that fall short of the pattern; every claim is checked against the installed package on each run (the entry point must be exported and its typings must contain the evidence recorded in \`coverage.config.mjs\`), so a stale claim fails the script.`,
  '',
  header,
  divider,
  ...body,
  `| **Patterns covered** | ${totals.map((total) => `**${total} / ${apgPatterns.length}**`).join(' | ')} |`,
  '',
  ...(notes.length > 0 ? ['Notes:', '', ...notes, ''] : []),
  'Coverage says a primitive exists, not how well it implements the pattern: that is what the accessibility benchmark measures, for the patterns that have scenarios. Libraries also ship non-APG pieces (popovers, date pickers, drag and drop, virtualization, forms helpers) that this table does not count.',
  '',
  '## Versions',
  '',
  ...Object.entries(versions).map(([pkg, version]) => `- \`${pkg}\` ${version}`),
  '',
].join('\n');

writeFileSync(join(resultsDir, 'coverage.md'), markdown);
console.log(markdown);
