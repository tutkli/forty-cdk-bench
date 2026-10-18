import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { entriesDir, flagValue, root, selectScenarios } from './shared.mjs';

const ssrEntriesDir = join(entriesDir, 'ssr');
const ssrDistDir = join(root, 'dist', 'ssr');

const ssrSetup = {};

const ng = join(root, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');

function posix(path) {
  return path.replaceAll('\\', '/');
}

function setupFor(scenario) {
  return ssrSetup[scenario.id] ?? ssrSetup[scenario.library.id] ?? { imports: [], providers: [] };
}

function writeEntries(scenario) {
  const dir = join(ssrEntriesDir, scenario.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const setup = setupFor(scenario);
  const scenarioImport = `../../../scenarios/${scenario.pattern.id}/${scenario.library.id}`;
  writeFileSync(
    join(dir, 'config.ts'),
    [
      `import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';`,
      `import { provideClientHydration, withEventReplay } from '@angular/platform-browser';`,
      ...setup.imports,
      `import { appConfig } from '../../../app.config';`,
      ``,
      `export const clientConfig: ApplicationConfig = mergeApplicationConfig(appConfig, {`,
      `  providers: [provideClientHydration(withEventReplay())${setup.providers.map((provider) => `, ${provider}`).join('')}],`,
      `});`,
      ``,
    ].join('\n'),
  );
  writeFileSync(
    join(dir, 'main.ts'),
    [
      `import { bootstrapApplication } from '@angular/platform-browser';`,
      `import { Scenario } from '${scenarioImport}';`,
      `import { clientConfig } from './config';`,
      ``,
      `bootstrapApplication(Scenario, clientConfig).catch((error: unknown) => console.error(error));`,
      ``,
    ].join('\n'),
  );
  writeFileSync(
    join(dir, 'main.server.ts'),
    [
      `import { mergeApplicationConfig } from '@angular/core';`,
      `import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';`,
      `import { RenderMode, provideServerRendering, withRoutes } from '@angular/ssr';`,
      `import { Scenario } from '${scenarioImport}';`,
      `import { clientConfig } from './config';`,
      ``,
      `const serverConfig = mergeApplicationConfig(clientConfig, {`,
      `  providers: [provideServerRendering(withRoutes([{ path: '**', renderMode: RenderMode.Prerender }]))],`,
      `});`,
      ``,
      `export default function bootstrap(context: BootstrapContext) {`,
      `  return bootstrapApplication(Scenario, serverConfig, context);`,
      `}`,
      ``,
    ].join('\n'),
  );
  writeFileSync(
    join(dir, 'tsconfig.json'),
    `${JSON.stringify(
      {
        extends: '../../../../tsconfig.json',
        compilerOptions: { types: [] },
        files: ['main.ts', 'main.server.ts'],
      },
      null,
      2,
    )}\n`,
  );
  return {
    browser: posix(relative(root, join(dir, 'main.ts'))),
    server: posix(relative(root, join(dir, 'main.server.ts'))),
    tsConfig: posix(relative(root, join(dir, 'tsconfig.json'))),
    setup,
  };
}

function build(scenario) {
  const { browser, server, tsConfig, setup } = writeEntries(scenario);
  const outputPath = join(ssrDistDir, scenario.id);
  rmSync(outputPath, { recursive: true, force: true });
  const started = performance.now();
  const args = [
    ng,
    'build',
    '--configuration=production',
    `--browser=${browser}`,
    `--server=${server}`,
    '--output-mode=static',
    `--ts-config=${tsConfig}`,
    `--output-path=${outputPath}`,
    '--output-hashing=none',
  ];
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, NG_CLI_ANALYTICS: 'false', FORCE_COLOR: '0' },
    });
    let log = '';
    child.stdout.on('data', (chunk) => (log += chunk));
    child.stderr.on('data', (chunk) => (log += chunk));
    child.on('close', (code) => {
      const seconds = Number(((performance.now() - started) / 1000).toFixed(1));
      mkdirSync(outputPath, { recursive: true });
      writeFileSync(join(outputPath, 'build.log'), log);
      const prerendered = existsSync(join(outputPath, 'browser', 'index.html'));
      writeFileSync(
        join(outputPath, 'build.json'),
        `${JSON.stringify(
          {
            id: scenario.id,
            exitCode: code,
            seconds,
            prerendered,
            command: ['ng', ...args.slice(1)].join(' '),
            setup: { imports: setup.imports, providers: setup.providers, note: setup.note ?? null },
          },
          null,
          2,
        )}\n`,
      );
      console.log(`${code === 0 ? 'ok  ' : 'FAIL'} ${scenario.id} (${seconds}s)`);
      if (code !== 0) {
        console.log(log.split('\n').slice(-30).join('\n'));
      }
      resolvePromise({ id: scenario.id, ok: code === 0 });
    });
  });
}

const argv = process.argv.slice(2);
const jobs = Math.max(1, Number(flagValue(argv, 'jobs', '2')));
const queue = [...selectScenarios(argv)];
const results = [];
await Promise.all(
  Array.from({ length: jobs }, async () => {
    while (queue.length > 0) {
      results.push(await build(queue.shift()));
    }
  }),
);

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} SSR builds succeeded`);
if (failed.length > 0) {
  console.log(`failed: ${failed.map((result) => result.id).join(', ')}`);
}
