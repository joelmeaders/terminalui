import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const root = process.cwd();
const consumer = await mkdtemp(join(tmpdir(), 'terminal-kit-consumer-'));
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this verification with npm run test:package.');
function npmRun(args, cwd = root) {
  return execFileSync(process.execPath, [npm, ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
}
const pack = JSON.parse(
  npmRun(['pack', '--ignore-scripts', '--json', '--pack-destination', consumer]),
)[0];
assert(pack.files.some((file) => file.path === 'dist/custom-elements.json'));
assert(!pack.files.some((file) => file.path.startsWith('src/')));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.deepEqual(
  Object.keys(pkg.dependencies),
  ['lit'],
  'Framework runtimes must remain optional peers.',
);
await writeFile(
  join(consumer, 'package.json'),
  JSON.stringify({ name: 'terminal-kit-external-consumer', private: true, type: 'module' }),
);
npmRun(
  [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    join(consumer, pack.filename),
    ...[
      'react',
      '@types/react',
      '@lit/react',
      'vue',
      '@angular/core',
      '@angular/common',
      '@angular/forms',
      '@angular/compiler',
      'rxjs',
    ].map((name) => `${name}@${pkg.devDependencies[name]}`),
  ],
  consumer,
);
const catalog = JSON.parse(await readFile('dist/catalog.json', 'utf8'));
const manifest = JSON.parse(await readFile('dist/custom-elements.json', 'utf8'));
const manifestTags = manifest.modules.flatMap((module) =>
  (module.declarations ?? []).filter((item) => item.tagName).map((item) => item.tagName),
);
assert.deepEqual(manifestTags.sort(), catalog.map((item) => item.tagName).sort());
const coreBundle = await build({
  absWorkingDir: consumer,
  stdin: { contents: "import '@terminal-kit/core';", resolveDir: consumer },
  bundle: true,
  write: false,
  metafile: true,
});
assert(
  !Object.keys(coreBundle.metafile.inputs).some((file) =>
    /node_modules\/(?:react|vue|@angular|@lit\/react)\//.test(file.replaceAll('\\', '/')),
  ),
  'Core bundle must exclude framework runtimes.',
);
const imports = catalog
  .map(
    ({ name, path }) =>
      `import { ${name} } from '@terminal-kit/core/${path.replace(/\.js$/, '')}';`,
  )
  .join('\n');
await writeFile(
  join(consumer, 'consumer.ts'),
  `${imports}
import '@terminal-kit/core';
import '@terminal-kit/core/themes.css';
import { TInput as ReactInput } from '@terminal-kit/core/react';
import { useTerminalModel } from '@terminal-kit/core/vue';
import '@angular/compiler';
import { TerminalValueAccessor } from '@terminal-kit/core/angular';
const input = new TInput(); input.value = 'Installed';
document.body.append(input);
(globalThis as any).packageResult = { count: ${catalog.length}, value: input.value, react: !!ReactInput, vue: !!useTerminalModel, angular: !!TerminalValueAccessor };
`,
);
const config = {
  compilerOptions: {
    target: 'ES2022',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    strict: true,
    skipLibCheck: false,
    noEmit: true,
    types: [],
    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
  },
  include: ['consumer.ts'],
};
await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify(config));
execFileSync(
  process.execPath,
  [resolve('node_modules/typescript/bin/tsc'), '-p', join(consumer, 'tsconfig.json')],
  { stdio: 'inherit' },
);
await writeFile(
  join(consumer, 'angular-consumer.ts'),
  `
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TerminalValueAccessor } from '@terminal-kit/core/angular';
@Component({selector:'consumer-app',standalone:true,schemas:[CUSTOM_ELEMENTS_SCHEMA],imports:[ReactiveFormsModule,TerminalValueAccessor],template:'<t-input [formControl]="name"></t-input>'})
export class ConsumerApp { name = new FormControl('Installed', {nonNullable:true}); }
`,
);
await writeFile(
  join(consumer, 'tsconfig.angular.json'),
  JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      experimentalDecorators: true,
      skipLibCheck: true,
      types: [],
      outDir: './aot',
    },
    angularCompilerOptions: { strictTemplates: true },
    files: ['angular-consumer.ts'],
  }),
);
execFileSync(
  process.execPath,
  [
    resolve('node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js'),
    '-p',
    join(consumer, 'tsconfig.angular.json'),
  ],
  { stdio: 'inherit' },
);
const angularOutput = await readFile(join(consumer, 'aot/angular-consumer.js'), 'utf8');
assert(angularOutput.includes('ɵɵdefineComponent'), 'Consumer must compile with Angular AOT.');
const result = await build({
  absWorkingDir: consumer,
  entryPoints: ['consumer.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  write: false,
  outfile: 'consumer.js',
  loader: { '.css': 'empty' },
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('about:blank');
  await page.addScriptTag({ content: result.outputFiles[0].text });
  const data = await page.evaluate(() => globalThis.packageResult);
  assert.deepEqual(data, {
    count: catalog.length,
    value: 'Installed',
    react: true,
    vue: true,
    angular: true,
  });
  const registered = await page.evaluate(
    (tags) => tags.every((tag) => !!customElements.get(tag)),
    catalog.map((entry) => entry.tagName),
  );
  assert(registered, 'All catalog tags must register from the installed package.');
  await page.goto('about:blank');
  await page.addScriptTag({
    type: 'module',
    content: await readFile(
      join(consumer, 'node_modules/@terminal-kit/core/dist/terminal.js'),
      'utf8',
    ),
  });
  await page.waitForFunction(() => !!customElements.get('t-input'));
  assert(
    await page.evaluate(
      (tags) => tags.every((tag) => !!customElements.get(tag)),
      catalog.map((entry) => entry.tagName),
    ),
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
console.log(
  `Verified external npm install, all ${catalog.length} element exports, NodeNext types, optional adapters, Angular AOT consumer, and standalone registration.`,
);
console.log(`Consumer artifacts: ${consumer}`);
