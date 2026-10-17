import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  BASELINE,
  SUITE_BASELINE,
  distDir,
  entriesDir,
  entryFor,
  flagValue,
  root,
  selectScenarios,
  selectSuites,
} from './shared.mjs';

const argv = process.argv.slice(2);
const jobs = Number(flagValue(argv, 'jobs', '1'));
const filtered = argv.some((arg) => !arg.startsWith('--'));
const ids = [
  ...(filtered && !argv.includes('--baseline') ? [] : [BASELINE, SUITE_BASELINE]),
  ...selectScenarios(argv).map((scenario) => scenario.id),
  ...selectSuites(argv).map((suite) => suite.id),
];

const ng = join(root, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');

function build(id) {
  const entry = relative(root, entryFor(id)).replaceAll('\\', '/');
  const tsConfig = join(entriesDir, `${id}.tsconfig.json`);
  writeFileSync(
    tsConfig,
    `${JSON.stringify({ extends: '../../tsconfig.json', compilerOptions: { types: [] }, files: [`../../${entry}`] }, null, 2)}\n`,
  );
  const outputPath = join(distDir, id);
  rmSync(outputPath, { recursive: true, force: true });
  const started = performance.now();
  return new Promise((resolvePromise) => {
    const child = spawn(
      process.execPath,
      [
        ng,
        'build',
        '--configuration=production',
        `--browser=${entry}`,
        `--ts-config=${relative(root, tsConfig).replaceAll('\\', '/')}`,
        `--output-path=${outputPath}`,
        '--output-hashing=none',
      ],
      { cwd: root, env: { ...process.env, NG_CLI_ANALYTICS: 'false', FORCE_COLOR: '0' } },
    );
    let log = '';
    child.stdout.on('data', (chunk) => (log += chunk));
    child.stderr.on('data', (chunk) => (log += chunk));
    child.on('close', (code) => {
      mkdirSync(outputPath, { recursive: true });
      writeFileSync(join(outputPath, 'build.log'), log);
      const seconds = ((performance.now() - started) / 1000).toFixed(1);
      const warnings = (log.match(/^\s*▲ \[WARNING\]/gm) ?? []).length;
      console.log(
        `${code === 0 ? 'ok  ' : 'FAIL'} ${id} (${seconds}s${warnings ? `, ${warnings} warnings` : ''})`,
      );
      if (code !== 0) {
        console.log(log.split('\n').slice(-40).join('\n'));
      }
      resolvePromise({ id, ok: code === 0 });
    });
  });
}

const queue = [...ids];
const results = [];
await Promise.all(
  Array.from({ length: Math.max(1, jobs) }, async () => {
    while (queue.length > 0) {
      results.push(await build(queue.shift()));
    }
  }),
);

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.error(
    `\n${failed.length} build(s) failed: ${failed.map((result) => result.id).join(', ')}`,
  );
  process.exit(1);
}
