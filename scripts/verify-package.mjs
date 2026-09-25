import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir } from 'node:fs/promises';
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
assert(
  pack.files.some((file) => file.path === 'LICENSE'),
  'Packed license must exist.',
);
assert(pack.files.some((file) => file.path === 'dist/custom-elements.json'));
assert(
  pack.files.some((file) => file.path === 'docs/icon-licenses/index.html'),
  'Packed credits index must exist.',
);
const noticeDirectories = (await readdir('docs/icon-licenses', { withFileTypes: true })).filter(
  (entry) => entry.isDirectory(),
);
for (const directory of noticeDirectories) {
  assert(
    pack.files.some((file) => file.path === `docs/icon-licenses/${directory.name}/NOTICE`),
    `Packed notice missing: ${directory.name}`,
  );
}
assert(!pack.files.some((file) => file.path.startsWith('src/')));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(pkg.license, 'SEE LICENSE IN LICENSE');
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
      '@angular/platform-browser',
      'rxjs',
    ].map((name) => `${name}@${pkg.devDependencies[name]}`),
  ],
  consumer,
);
assert.equal(
  await readFile(join(consumer, 'node_modules/@terminal-kit/core/LICENSE'), 'utf8'),
  await readFile('LICENSE', 'utf8'),
  'Installed license differs from the repository license.',
);
for (const directory of noticeDirectories) {
  const path = `docs/icon-licenses/${directory.name}/NOTICE`;
  assert.equal(
    await readFile(join(consumer, 'node_modules/@terminal-kit/core', path), 'utf8'),
    await readFile(path, 'utf8'),
    `Installed notice differs: ${directory.name}`,
  );
}
const catalog = JSON.parse(await readFile('dist/catalog.json', 'utf8'));
const componentSources = (await readdir('src/components')).filter((file) => file.endsWith('.ts'));
assert.equal(
  catalog.length,
  componentSources.length,
  'Rebuild before verifying a changed component catalog.',
);
assert.equal(
  new Set(catalog.map((entry) => entry.tagName)).size,
  catalog.length,
  'Catalog tags must be unique.',
);
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
const buttonBundle = await build({
  absWorkingDir: consumer,
  stdin: { contents: "import '@terminal-kit/core/components/button';", resolveDir: consumer },
  bundle: true,
  write: false,
  metafile: true,
});
const buttonInputs = Object.keys(buttonBundle.metafile.inputs).map((file) =>
  file.replaceAll('\\', '/'),
);
assert.deepEqual(
  buttonInputs
    .filter((file) => file.includes('@terminal-kit/core/dist/components/'))
    .map((file) => file.split('/').at(-1)),
  ['button.js'],
  'A button subpath must not pull in other components.',
);
assert(
  !buttonInputs.some((file) => file.endsWith('@terminal-kit/core/dist/index.js')),
  'A button subpath must not register the complete catalog.',
);
assert(
  !Object.keys(coreBundle.metafile.inputs).some((file) =>
    /node_modules\/(?:react|vue|@angular|@lit\/react|ionicons|lucide|lucide-static|@fortawesome|@iconify-json|@iconify)\//.test(
      file.replaceAll('\\', '/'),
    ),
  ),
  'Core bundle must exclude framework runtimes and provider icon packs.',
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
import '@terminal-kit/core/typography.css';
import { TInput as ReactInput } from '@terminal-kit/core/react';
import * as ReactComponents from '@terminal-kit/core/react';
import { useTerminalModel } from '@terminal-kit/core/vue';
import '@angular/compiler';
import { TerminalValueAccessor } from '@terminal-kit/core/angular';
import { registerIcon, unregisterIcon, registerFontAwesomeIcon, registerLucideIcon, registerIconSet, type IconData } from '@terminal-kit/core/icons';
const testIcon: IconData = { width: 16, height: 16, body: '<path d="M2 2h12v12H2z"/>' };
registerIcon('package:sample', testIcon);
registerFontAwesomeIcon('package:fa', {icon:[16,16,[],'f000','M2 2h12v12H2z']});
registerLucideIcon('package:lucide', [['circle', {cx:12,cy:12,r:8}]]);
registerIconSet({prefix:'package-set',icons:{box:testIcon}}, ['box']);
unregisterIcon('package:unused');
const input = new TInput(); input.value = 'Installed';
document.body.append(input);
for (const name of ['package:sample','package:fa','package:lucide','package-set:box']) {
  const icon = new TIcon(); icon.name = name; icon.dataset.packageIcon = name; document.body.append(icon);
}
(globalThis as any).packageResult = { count: ${catalog.length}, value: input.value, react: !!ReactInput, reactWrappers: [${catalog.map(({ name }) => `ReactComponents.${name}`).join(',')}].filter(Boolean).length, vue: !!useTerminalModel, angular: !!TerminalValueAccessor };
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
@Component({selector:'consumer-app',standalone:true,schemas:[CUSTOM_ELEMENTS_SCHEMA],imports:[ReactiveFormsModule,TerminalValueAccessor],template:
  '<t-input label="Name" [formControl]="name"></t-input>' +
  '<t-password-input label="Password" [formControl]="password"></t-password-input>' +
  '<t-number-input label="Quantity" [formControl]="quantity"></t-number-input>' +
  '<t-segmented-control label="Plan" [options]="plans" [formControl]="plan"></t-segmented-control>' +
  '<t-rating label="Rating" [formControl]="rating"></t-rating>' +
  '<t-tags-input label="Tags" [formControl]="tags"></t-tags-input>' +
  '<t-multi-select label="Departments" [options]="departments" [formControl]="selectedDepartments"></t-multi-select>' +
  '<t-color-picker label="Color" [formControl]="color"></t-color-picker>'})
export class ConsumerApp {
  name = new FormControl('Installed', {nonNullable:true});
  password = new FormControl('Initial-password', {nonNullable:true});
  quantity = new FormControl('3', {nonNullable:true});
  plan = new FormControl('basic', {nonNullable:true});
  rating = new FormControl('3', {nonNullable:true});
  tags = new FormControl('["alpha"]', {nonNullable:true});
  selectedDepartments = new FormControl(['archive'], {nonNullable:true});
  color = new FormControl('#22aa88', {nonNullable:true});
  plans = [{value:'basic',label:'Basic'},{value:'pro',label:'Pro'}];
  departments = [{value:'archive',label:'Archive'},{value:'engineering',label:'Engineering'}];
}
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
await writeFile(
  join(consumer, 'angular-runner.js'),
  `
import '@angular/compiler';
import '@terminal-kit/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ConsumerApp } from './aot/angular-consumer.js';
document.body.append(document.createElement('consumer-app'));
bootstrapApplication(ConsumerApp).then((app) => { globalThis.angularConsumer = app.components[0].instance; });
`,
);
const angularBundle = await build({
  absWorkingDir: consumer,
  entryPoints: ['angular-runner.js'],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  write: false,
});
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
    reactWrappers: catalog.length,
    vue: true,
    angular: true,
  });
  const registered = await page.evaluate(
    (tags) => tags.every((tag) => !!customElements.get(tag)),
    catalog.map((entry) => entry.tagName),
  );
  assert(registered, 'All catalog tags must register from the installed package.');
  await page.waitForFunction(() =>
    [...document.querySelectorAll('[data-package-icon]')].every((icon) =>
      icon.shadowRoot?.querySelector('svg path,svg circle'),
    ),
  );
  const iconBodies = await page
    .locator('[data-package-icon]')
    .evaluateAll((icons) => icons.map((icon) => icon.shadowRoot.querySelector('svg').innerHTML));
  assert(iconBodies[0].includes('M2 2h12v12H2z'));
  assert(iconBodies[1].includes('M2 2h12v12H2z'));
  assert(iconBodies[2].includes('<circle'));
  assert(iconBodies[3].includes('M2 2h12v12H2z'));
  await page.goto('about:blank');
  await page.addScriptTag({ content: angularBundle.outputFiles[0].text });
  await page.waitForFunction(() => !!globalThis.angularConsumer);
  const fields = [
    ['t-password-input', 'password', 'Initial-password', 'Changed-password'],
    ['t-number-input', 'quantity', '3', '4'],
    ['t-segmented-control', 'plan', 'basic', 'pro'],
    ['t-rating', 'rating', '3', '4'],
    ['t-tags-input', 'tags', '["alpha"]', '["beta"]'],
    ['t-color-picker', 'color', '#22aa88', '#8844cc'],
  ];
  for (const [tag, property, initial, changed] of fields) {
    await page.waitForFunction(
      ({ tag, initial }) => document.querySelector(tag)?.value === initial,
      { tag, initial },
    );
    await page.evaluate(
      ({ property, changed }) => globalThis.angularConsumer[property].setValue(changed),
      { property, changed },
    );
    await page.waitForFunction(
      ({ tag, changed }) => document.querySelector(tag)?.value === changed,
      { tag, changed },
    );
    const state = await page.evaluate(
      async ({ tag, property, initial }) => {
        const element = document.querySelector(tag);
        element.value = initial;
        await element.updateComplete;
        element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        element.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }));
        const control = globalThis.angularConsumer[property];
        const result = { value: control.value, touched: control.touched };
        control.disable();
        await element.updateComplete;
        return { ...result, disabled: element.disabled };
      },
      { tag, property, initial },
    );
    assert.deepEqual(
      state,
      { value: initial, touched: true, disabled: true },
      `Angular accessor flow for ${tag}`,
    );
  }
  await page.waitForFunction(
    () => document.querySelector('t-multi-select')?.values?.join(',') === 'archive',
  );
  await page.evaluate(() =>
    globalThis.angularConsumer.selectedDepartments.setValue(['engineering']),
  );
  await page.waitForFunction(
    () => document.querySelector('t-multi-select')?.values?.join(',') === 'engineering',
  );
  await page.getByRole('checkbox', { name: 'Archive' }).check();
  assert.deepEqual(
    await page.evaluate(() => globalThis.angularConsumer.selectedDepartments.value),
    ['engineering', 'archive'],
    'Angular accessor must read the multi-select array after input.',
  );
  await page.goto('about:blank');
  await page.evaluate(
    async (source) => {
      const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      try {
        const { registerIcon } = await import(url);
        registerIcon('standalone:check', {
          width: 24,
          height: 24,
          body: '<path d="M2 12l6 6L22 4"/>',
        });
        const icon = document.createElement('t-icon');
        icon.setAttribute('name', 'standalone:check');
        icon.setAttribute('label', 'Standalone registration');
        document.body.append(icon);
        await icon.updateComplete;
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    await readFile(join(consumer, 'node_modules/@terminal-kit/core/dist/terminal.js'), 'utf8'),
  );
  await page.waitForFunction(() => !!customElements.get('t-input'));
  assert.equal(await page.locator('t-icon path').getAttribute('d'), 'M2 12l6 6L22 4');
  assert(
    await page.evaluate(
      (tags) => tags.every((tag) => !!customElements.get(tag)),
      catalog.map((entry) => entry.tagName),
    ),
  );
  assert.deepEqual(errors, []);
  await page.setContent(
    '<main class="t-prose"><h1>Installed typography</h1><p><a href="#notes">Read the notes</a></p><h2 id="notes">Notes</h2></main>',
  );
  for (const name of ['themes', 'typography']) {
    const installed = await readFile(
      join(consumer, `node_modules/@terminal-kit/core/dist/${name}.css`),
      'utf8',
    );
    assert.equal(
      installed,
      await readFile(`src/${name}.css`, 'utf8'),
      `Installed ${name} CSS must match its source.`,
    );
    await page.addStyleTag({ content: installed });
  }
  assert.equal(await page.locator('h1').evaluate((el) => getComputedStyle(el).fontSize), '48px');
  assert.equal(
    await page.locator('a').evaluate((el) => getComputedStyle(el).textDecorationLine),
    'underline',
  );
} finally {
  await browser.close();
}
console.log(
  `Verified external npm install, button subpath isolation, all ${catalog.length} element exports and React wrappers, NodeNext types, icon registry, provider isolation, Angular AOT consumer with array-valued multi-select and six other form bindings, standalone registration, native typography CSS, and ${noticeDirectories.length} exact provider notices.`,
);
console.log(`Consumer artifacts: ${consumer}`);
