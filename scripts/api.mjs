import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { installedVersion, libraries, resultsDir, root } from './shared.mjs';

const OWN_PACKAGE = {
  forty: 'forty-cdk',
  'ng-primitives': 'ng-primitives',
  'angular-aria': '@angular/aria',
  'angular-cdk': '@angular/cdk',
  spartan: '@spartan-ng/brain',
};

function filesUnder(dir, extension) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return filesUnder(path, extension);
    }
    return name.endsWith(extension) && !/testing/.test(name) ? [path] : [];
  });
}

const OPEN = { '<': '>', '{': '}', '[': ']', '(': ')' };
const CLOSE = new Set(Object.values(OPEN));

function genericArguments(text, start) {
  const args = [];
  let depth = 0;
  let current = '';
  let quote = null;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      current += char;
      if (char === quote && text[index - 1] !== '\\') {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '=' && text[index + 1] === '>') {
      current += '=>';
      index++;
      continue;
    }
    if (OPEN[char]) {
      depth++;
      if (depth === 1 && char === '<') {
        continue;
      }
    } else if (CLOSE.has(char)) {
      depth--;
      if (depth === 0) {
        args.push(current.trim());
        return args;
      }
    } else if (char === ',' && depth === 1) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  return args;
}

function analyze(pkg) {
  const base = join(root, 'node_modules', pkg);
  const typings = filesUnder(join(base, 'types'), '.d.ts');
  const bundles = filesUnder(join(base, 'fesm2022'), '.mjs');
  const dts = typings.map((file) => readFileSync(file, 'utf8')).join('\n');
  const fesm = bundles.map((file) => readFileSync(file, 'utf8'));

  const declarations = [];
  for (const match of dts.matchAll(/ɵɵ(Directive|Component)Declaration</g)) {
    const args = genericArguments(dts, match.index + match[0].length - 1);
    declarations.push({ kind: match[1], args });
  }

  const factories = [...dts.matchAll(/ɵɵFactoryDeclaration</g)].map((match) =>
    genericArguments(dts, match.index + match[0].length - 1),
  );

  const count = (pattern) => (dts.match(pattern) ?? []).length;
  const sumOver = (index, pattern) =>
    declarations.reduce((total, d) => total + (d.args[index]?.match(pattern) ?? []).length, 0);
  const signalInputs = sumOver(3, /"isSignal": true/g);
  const allInputs = sumOver(3, /"alias":/g);
  const outputs = sumOver(4, /"[^"]+":\s*"[^"]+"/g);

  return {
    package: pkg,
    version: installedVersion(pkg),
    entryPoints: typings.length,
    directives: declarations.filter((d) => d.kind === 'Directive').length,
    components: declarations.filter((d) => d.kind === 'Component').length,
    standalone: declarations.filter((d) => d.args[7] === 'true').length,
    ngModules: count(/ɵɵNgModuleDeclaration</g),
    signalInputs,
    decoratorInputs: allInputs - signalInputs,
    outputs,
    eventEmitters: count(/:\s*(?:[\w$]+\.)?EventEmitter</g),
    controlValueAccessors: count(/implements[^{]*\bControlValueAccessor\b/g),
    signalFormsControls: count(
      /implements[^{]*\b(?:FormValueControl|FormCheckboxControl|FormUiControl)\b/g,
    ),
    lifecycleHookClasses: count(
      /implements[^{]*\b(?:OnInit|OnChanges|DoCheck|AfterContentInit|AfterContentChecked|AfterViewInit|AfterViewChecked|OnDestroy)\b/g,
    ),
    injectables: factories.length,
    constructorInjectionClasses: factories.filter((args) => args[1] !== 'never').length,
    valueAccessorBundles: fesm.filter((source) => /\bNG_VALUE_ACCESSOR\b/.test(source)).length,
    ngControlBundles: fesm.filter((source) => /\bNgControl\b/.test(source)).length,
    ngZoneBundles: fesm.filter((source) => /\bNgZone\b/.test(source)).length,
    rxjsBundles: fesm.filter((source) => /from ['"]rxjs(?:\/operators)?['"]/.test(source)).length,
    bundles: fesm.length,
  };
}

const rows = libraries.map((library) => ({
  library: library.id,
  ...analyze(OWN_PACKAGE[library.id]),
}));

mkdirSync(resultsDir, { recursive: true });
writeFileSync(
  join(resultsDir, 'api.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2)}\n`,
);

const percent = (part, total) => (total === 0 ? '—' : `${Math.round((part / total) * 100)} %`);
const name = (row) => libraries.find((library) => library.id === row.library).name;
const header = `| | ${rows.map(name).join(' | ')} |`;
const divider = `| --- | ${rows.map(() => '---:').join(' | ')} |`;
const line = (label, cell) => `| ${label} | ${rows.map(cell).join(' | ')} |`;

const markdown = [
  '# Modern Angular API',
  '',
  `Generated ${new Date().toISOString()}. Static analysis of each library's own published typings (\`types/**/*.d.ts\`) and bundles (\`fesm2022/**/*.mjs\`), testing entry points excluded. Dependencies are not counted: ng-primitives and Spartan build on \`@angular/cdk\`, which has its own column.`,
  '',
  header,
  divider,
  line('Package', (row) => `\`${row.package}\` ${row.version}`),
  line('Entry points', (row) => row.entryPoints),
  line('Directives + components', (row) => row.directives + row.components),
  line('Standalone', (row) => percent(row.standalone, row.directives + row.components)),
  line('NgModules exported', (row) => row.ngModules),
  line('Signal inputs (`input()` / `model()`)', (row) =>
    percent(row.signalInputs, row.signalInputs + row.decoratorInputs),
  ),
  line('Decorator inputs (`@Input`)', (row) => row.decoratorInputs),
  line('Outputs', (row) => row.outputs),
  line('…typed as `EventEmitter` (decorator era)', (row) => row.eventEmitters),
  line('Classes implementing `ControlValueAccessor`', (row) => row.controlValueAccessors),
  line(
    'Bundles registering `NG_VALUE_ACCESSOR`',
    (row) => `${row.valueAccessorBundles} / ${row.bundles}`,
  ),
  line('Bundles injecting `NgControl`', (row) => `${row.ngControlBundles} / ${row.bundles}`),
  line('Classes implementing a Signal Forms control', (row) => row.signalFormsControls),
  line('Classes implementing classic lifecycle hooks', (row) => row.lifecycleHookClasses),
  line(
    'DI classes using constructor injection',
    (row) => `${row.constructorInjectionClasses} / ${row.injectables}`,
  ),
  line('Bundles referencing `NgZone`', (row) => `${row.ngZoneBundles} / ${row.bundles}`),
  line('Bundles importing RxJS', (row) => `${row.rxjsBundles} / ${row.bundles}`),
  '',
  'Every scenario in this repo runs without Zone.js (the apps have no `zone.js` polyfill), so all five libraries work zoneless for the measured patterns; `NgZone` references are about code paths, not about whether zoneless works.',
  '',
  'Reading the rows:',
  '',
  '- **Signal inputs** reads the `isSignal` flag Angular writes into every directive declaration, so it is exact.',
  '- **Signal Forms** controls implement `FormValueControl` / `FormCheckboxControl` / `FormUiControl` from `@angular/forms/signals`; `ControlValueAccessor` is the classic forms contract. A library can offer both.',
  '- **Signal inputs** and **outputs** come from the input and output maps in each `ɵɵDirectiveDeclaration` / `ɵɵComponentDeclaration`; decorator inputs are the ones without `isSignal`.',
  '- **Constructor injection** reads each `ɵɵFactoryDeclaration`: Angular records constructor dependencies there, and `never` means the class takes none (it uses `inject()` or nothing).',
  '',
].join('\n');

writeFileSync(join(resultsDir, 'api.md'), markdown);
console.log(markdown);
