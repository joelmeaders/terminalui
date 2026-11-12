import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const root = process.cwd();
const consumer = await mkdtemp(join(tmpdir(), 'hullframe-consumer-'));
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
assert.equal(pack.name, '@joelmeaders/hullframe');
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
assert.equal(pkg.name, pack.name);
assert.equal(pkg.license, 'MIT');
assert.deepEqual(
  Object.keys(pkg.dependencies),
  ['lit'],
  'Framework runtimes must remain optional peers.',
);
await writeFile(
  join(consumer, 'package.json'),
  JSON.stringify({ name: 'hullframe-external-consumer', private: true, type: 'module' }),
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
  await readFile(join(consumer, 'node_modules/@joelmeaders/hullframe/LICENSE'), 'utf8'),
  await readFile('LICENSE', 'utf8'),
  'Installed license differs from the repository license.',
);
for (const directory of noticeDirectories) {
  const path = `docs/icon-licenses/${directory.name}/NOTICE`;
  assert.equal(
    await readFile(join(consumer, 'node_modules/@joelmeaders/hullframe', path), 'utf8'),
    await readFile(path, 'utf8'),
    `Installed notice differs: ${directory.name}`,
  );
}
assert.equal(
  await readFile(join(consumer, 'node_modules/@joelmeaders/hullframe/dist/terminal.js'), 'utf8'),
  await readFile(join(consumer, 'node_modules/@joelmeaders/hullframe/dist/hullframe.js'), 'utf8'),
  'The legacy standalone file must remain self-contained and match the canonical bundle.',
);
const standaloneAliases = await build({
  absWorkingDir: consumer,
  stdin: {
    contents: `import { TButton } from '@joelmeaders/hullframe/hullframe.js';
import { TButton as LegacyButton } from '@joelmeaders/hullframe/terminal.js';
globalThis.standaloneAliasesMatch = TButton === LegacyButton;`,
    resolveDir: consumer,
  },
  bundle: true,
  format: 'iife',
  write: false,
});
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
  stdin: { contents: "import '@joelmeaders/hullframe';", resolveDir: consumer },
  bundle: true,
  write: false,
  metafile: true,
});
const buttonBundle = await build({
  absWorkingDir: consumer,
  stdin: { contents: "import '@joelmeaders/hullframe/components/button';", resolveDir: consumer },
  bundle: true,
  write: false,
  metafile: true,
});
const dockBundle = await build({
  absWorkingDir: consumer,
  stdin: { contents: "import '@joelmeaders/hullframe/components/dock';", resolveDir: consumer },
  bundle: true,
  minify: true,
  format: 'iife',
  write: false,
  metafile: true,
});
const dockInputs = Object.values(dockBundle.metafile.outputs)
  .flatMap((output) => Object.entries(output.inputs))
  .filter(([, data]) => data.bytesInOutput > 0)
  .map(([file]) => file.replaceAll('\\', '/'));
assert.deepEqual(
  dockInputs
    .filter((file) => file.includes('@joelmeaders/hullframe/dist/components/'))
    .map((file) => file.split('/').at(-1)),
  ['dock.js'],
  'A dock subpath must retain only its own component.',
);
assert(
  !dockInputs.some((file) => file.endsWith('/dist/index.js')),
  'Dock must exclude the catalog.',
);
assert(
  !dockInputs.some((file) =>
    /node_modules\/(?:react|react-dom|vue|@angular|@lit\/react|ionicons|lucide|@fortawesome|@iconify(?:-json)?)(?:\/|$)/.test(
      file,
    ),
  ),
  'Native dock must exclude framework runtimes and icon providers.',
);
for (const [entry, symbol, expected, excluded] of [
  ['image-pixelate', 'mountPixelation', 'pixelate.js', 'ascii.js'],
  ['image-ascii', 'mountAscii', 'ascii.js', 'pixelate.js'],
]) {
  const effectBundle = await build({
    absWorkingDir: consumer,
    stdin: {
      contents: `import { ${symbol} } from '@joelmeaders/hullframe/${entry}'; globalThis.effectFactory = ${symbol};`,
      resolveDir: consumer,
    },
    bundle: true,
    write: false,
    metafile: true,
  });
  const inputs = Object.keys(effectBundle.metafile.inputs).map((file) =>
    file.replaceAll('\\', '/'),
  );
  assert(
    inputs.some((file) => file.endsWith(`/dist/effects/${expected}`)),
    `${entry} is missing.`,
  );
  assert(
    !inputs.some((file) => file.endsWith(`/dist/effects/${excluded}`)),
    `${entry} imports ${excluded}.`,
  );
  assert(!inputs.some((file) => file.endsWith('/dist/index.js')), `${entry} imports the catalog.`);
  assert(effectBundle.outputFiles[0].text.includes('effectFactory'), `${entry} was removed.`);
}
const buttonInputs = Object.keys(buttonBundle.metafile.inputs).map((file) =>
  file.replaceAll('\\', '/'),
);
assert.deepEqual(
  buttonInputs
    .filter((file) => file.includes('@joelmeaders/hullframe/dist/components/'))
    .map((file) => file.split('/').at(-1)),
  ['button.js'],
  'A button subpath must not pull in other components.',
);
assert(
  !buttonInputs.some((file) => file.endsWith('@joelmeaders/hullframe/dist/index.js')),
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
assert(
  !Object.keys(coreBundle.metafile.inputs).some((file) =>
    file.replaceAll('\\', '/').includes('/dist/effects/'),
  ),
  'Core bundle must exclude optional image effects.',
);
// Keep allowed dependencies explicit so an accidental import cannot redefine the expectation.
const componentDependencies = {
  'copy-button': ['icon'],
  'date-picker': ['calendar', 'dialog'],
  'date-range-picker': ['calendar', 'dialog'],
  'empty-state': ['icon'],
  'icon-button': ['icon'],
  'number-input': ['input'],
  'password-input': ['input'],
  rating: ['radio-group'],
  'segmented-control': ['radio-group'],
  switch: ['checkbox'],
  'time-picker': ['dialog'],
};
for (const { name: symbol, tagName } of catalog) {
  const component = tagName.slice(2);
  const expected = [component, ...(componentDependencies[component] ?? [])]
    .map((name) => `${name}.js`)
    .sort();
  for (const entry of [`components/${component}`, `react/${component}`, 'react']) {
    const isReact = !entry.startsWith('components/');
    const result = await build({
      absWorkingDir: consumer,
      stdin: {
        contents: `import { ${symbol} } from '@joelmeaders/hullframe/${entry}'; globalThis.exampleComponent = ${symbol};`,
        resolveDir: consumer,
      },
      bundle: true,
      minify: true,
      format: 'esm',
      target: 'es2022',
      external: ['react', 'react-dom'],
      write: false,
      metafile: true,
    });
    const included = Object.values(result.metafile.outputs)
      .flatMap((output) => Object.entries(output.inputs))
      .filter(([, data]) => data.bytesInOutput > 0)
      .map(([file]) => file.replaceAll('\\', '/'));
    assert.deepEqual(
      included
        .filter((file) => file.includes('@joelmeaders/hullframe/dist/components/'))
        .map((file) => file.split('/').at(-1))
        .sort(),
      expected,
      `${entry}/${symbol}: must not retain unrelated components.`,
    );
    assert.deepEqual(
      included
        .filter((file) => file.includes('@joelmeaders/hullframe/dist/adapters/react/'))
        .map((file) => file.split('/').at(-1))
        .sort(),
      isReact ? [`${component}.js`] : [],
      `${entry}/${symbol}: must not retain unrelated wrappers.`,
    );
    assert(
      !included.some((file) => file.endsWith('/dist/index.js')),
      `${entry}: must not include the catalog.`,
    );
    assert(
      !included.some((file) =>
        /node_modules\/(?:vue|@angular|ionicons|lucide|@fortawesome|@iconify(?:-json)?)(?:\/|$)/.test(
          file,
        ),
      ),
      `${entry}/${symbol}: must not retain unrelated frameworks or icon providers.`,
    );
    if (!isReact)
      assert(
        !included.some((file) =>
          /node_modules\/(?:react|react-dom|@lit\/react)(?:\/|$)/.test(file),
        ),
        `${entry}/${symbol}: native imports must not retain React.`,
      );
  }
}
const reactImports = catalog
  .map(
    ({ name, tagName }) =>
      `import { ${name} as ${name}ReactSubpath } from '@joelmeaders/hullframe/react/${tagName.slice(2)}';`,
  )
  .join('\n');
const imports = catalog
  .map(
    ({ name, path }) =>
      `import { ${name} } from '@joelmeaders/hullframe/${path.replace(/\.js$/, '')}';`,
  )
  .join('\n');
await writeFile(
  join(consumer, 'consumer.ts'),
  `${imports}
${reactImports}
import '@joelmeaders/hullframe';
import '@joelmeaders/hullframe/themes.css';
import '@joelmeaders/hullframe/typography.css';
import '@joelmeaders/hullframe/image-effects.css';
import { mountPixelation, type PixelationOptions } from '@joelmeaders/hullframe/image-pixelate';
import { mountAscii, type AsciiOptions, type ImageEffectController } from '@joelmeaders/hullframe/image-ascii';
import { TInput as ReactInput } from '@joelmeaders/hullframe/react';
import * as ReactComponents from '@joelmeaders/hullframe/react';
import { useHullframeModel, useTerminalModel } from '@joelmeaders/hullframe/vue';
import '@angular/compiler';
import { HullframeValueAccessor, TerminalValueAccessor } from '@joelmeaders/hullframe/angular';
import { registerIcon, unregisterIcon, registerFontAwesomeIcon, registerLucideIcon, registerIconSet, type IconData } from '@joelmeaders/hullframe/icons';
const testIcon: IconData = { width: 16, height: 16, body: '<path d="M2 2h12v12H2z"/>' };
const imageEffectTypes: [typeof mountPixelation, typeof mountAscii, PixelationOptions, AsciiOptions, ImageEffectController<AsciiOptions> | undefined] = [mountPixelation, mountAscii, {pixelSize:8}, {cellSize:10,characters:' .#',invert:false}, undefined];
void imageEffectTypes;
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
(globalThis as any).packageResult = { count: ${catalog.length}, value: input.value, react: !!ReactInput, reactWrappers: [${catalog.map(({ name }) => `ReactComponents.${name}`).join(',')}].filter(Boolean).length, reactSubpaths: [${catalog.map(({ name }) => `${name}ReactSubpath`).join(',')}].filter(Boolean).length, reactCompatibility: [${catalog.map(({ name }) => `${name}ReactSubpath === ReactComponents.${name}`).join(',')}].every(Boolean), vue: !!useHullframeModel, angular: !!HullframeValueAccessor, vueCompatibility: useHullframeModel === useTerminalModel, angularCompatibility: HullframeValueAccessor === TerminalValueAccessor };
`,
);
const config = {
  compilerOptions: {
    target: 'ES2022',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    strict: true,
    jsx: 'react-jsx',
    skipLibCheck: false,
    noEmit: true,
    types: [],
    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
  },
  include: ['consumer.ts', 'react-events.tsx'],
};
await writeFile(
  join(consumer, 'react-events.tsx'),
  await readFile('tests/types/react-events.tsx', 'utf8'),
);
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
import { HullframeValueAccessor, TerminalValueAccessor } from '@joelmeaders/hullframe/angular';
@Component({selector:'consumer-app',standalone:true,schemas:[CUSTOM_ELEMENTS_SCHEMA],imports:[ReactiveFormsModule,HullframeValueAccessor,TerminalValueAccessor],template:
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
import '@joelmeaders/hullframe';
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
  await page.addScriptTag({ content: standaloneAliases.outputFiles[0].text });
  assert.equal(
    await page.evaluate(() => globalThis.standaloneAliasesMatch),
    true,
    'Both standalone package subpaths must resolve to the same module.',
  );
  await page.goto('about:blank');
  await page.addScriptTag({ content: dockBundle.outputFiles[0].text });
  const isolatedDock = await page.evaluate(
    async (tags) => {
      document.body.innerHTML =
        '<t-dock label="Installed dock"><button data-dock-id="first" data-dock-label="First">First action</button><button data-dock-id="second" data-dock-label="Second">Second action</button></t-dock>';
      const dock = document.querySelector('t-dock');
      await dock.updateComplete;
      const originalChildren = [...dock.children];
      dock.shadowRoot.querySelector('[part=edit-button]').click();
      await dock.updateComplete;
      dock.shadowRoot.querySelector('[part=settings-button]').click();
      await dock.updateComplete;
      const select = dock.shadowRoot.querySelector('#dock-item');
      select.value = 'second';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await dock.updateComplete;
      [...dock.shadowRoot.querySelectorAll('button')]
        .find((button) => button.textContent.trim() === 'Move earlier')
        .click();
      await dock.updateComplete;
      return {
        registered: tags.filter((tag) => !!customElements.get(tag)),
        order: dock.order,
        unchangedChildren: [...dock.children].every(
          (child, index) => child === originalChildren[index],
        ),
        renderedOrder:
          dock.children[1].getBoundingClientRect().left <
          dock.children[0].getBoundingClientRect().left,
        label: dock.shadowRoot.querySelector('[role=group]').getAttribute('aria-label'),
      };
    },
    catalog.map((entry) => entry.tagName),
  );
  assert.deepEqual(isolatedDock, {
    registered: ['t-dock'],
    order: ['second', 'first'],
    unchangedChildren: true,
    renderedOrder: true,
    label: 'Installed dock',
  });
  await page.goto('about:blank');
  await page.addScriptTag({ content: result.outputFiles[0].text });
  const data = await page.evaluate(() => globalThis.packageResult);
  assert.deepEqual(data, {
    count: catalog.length,
    value: 'Installed',
    react: true,
    reactWrappers: catalog.length,
    reactSubpaths: catalog.length,
    reactCompatibility: true,
    vue: true,
    angular: true,
    vueCompatibility: true,
    angularCompatibility: true,
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
    await readFile(join(consumer, 'node_modules/@joelmeaders/hullframe/dist/hullframe.js'), 'utf8'),
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
      join(consumer, `node_modules/@joelmeaders/hullframe/dist/${name}.css`),
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
  `Verified external npm install, all ${catalog.length} native and React import dependency closures (including React barrel selections), installed dock ordering and content identity, element exports, React subpaths and compatible barrel wrappers, custom event payload contracts, NodeNext types, icon registry, provider isolation, Angular AOT consumer with array-valued multi-select and six other form bindings, standalone registration, native typography CSS, and ${noticeDirectories.length} exact provider notices.`,
);
console.log(`Consumer artifacts: ${consumer}`);
