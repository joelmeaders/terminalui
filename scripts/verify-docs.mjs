import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { parse, compileScript } from 'vue/compiler-sfc';
import { chromium } from '@playwright/test';

const out = resolve('test-results/documentation-examples');
await mkdir(out, { recursive: true });
const bundled = await build({
  entryPoints: ['.storybook/docs/examples.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const examples = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);
const catalogBundle = await build({
  entryPoints: ['.storybook/docs/catalog.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { guides } = await import(
  `data:text/javascript;base64,${Buffer.from(catalogBundle.outputFiles[0].text).toString('base64')}`
);
const { components, exampleFor } = examples;
const typographyBundle = await build({
  entryPoints: ['.storybook/docs/typography.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { typographyExampleFor } = await import(
  `data:text/javascript;base64,${Buffer.from(typographyBundle.outputFiles[0].text).toString('base64')}`
);
assert.deepEqual(
  Object.keys(guides).sort(),
  components.map((c) => c.tagName).sort(),
  'Every component needs a documentation recipe.',
);
const storySources = await Promise.all(
  (await readdir('stories'))
    .filter((f) => f.endsWith('.stories.ts'))
    .map((f) => readFile(join('stories', f), 'utf8')),
);
const entries = [];
const appearanceGuide = await readFile('docs/appearance.md', 'utf8');
const themesSource = await readFile('src/themes.css', 'utf8');
const sharedCssProperties = new Set(
  [...appearanceGuide.matchAll(/^\| `(--t-[\w-]+)`\s*\|/gm)].map((match) => match[1]),
);
for (const match of themesSource.matchAll(/(--t-[\w-]+)\s*:|var\((--t-[\w-]+)/g))
  assert(
    sharedCssProperties.has(match[1] ?? match[2]),
    `Appearance guide: undocumented shared CSS property ${match[1] ?? match[2]}.`,
  );
for (const component of components) {
  const tag = component.tagName;
  const guide = guides[tag];
  assert(
    guide.purpose && guide.usage.length && guide.accessibility.length,
    `${tag}: purpose, usage and accessibility are required.`,
  );
  assert(
    storySources.some((s) => s.includes(`component: '${tag}'`) && s.includes("'autodocs'")),
    `${tag}: missing autodocs story.`,
  );
  for (const prop of Object.keys(guide.example.props ?? {})) {
    const member = component.members.find(
      (m) => m.name === prop && m.privacy !== 'private' && m.privacy !== 'protected',
    );
    assert(member, `${tag}: example uses unknown property ${prop}.`);
  }
  if (guide.event && !['click', 'input', 'change'].includes(guide.event.name))
    assert(
      component.events.some((e) => e.name === guide.event.name),
      `${tag}: unknown example event.`,
    );
  const source = await readFile(`src/components/${tag.slice(2)}.ts`, 'utf8');
  for (const property of component.cssProperties) {
    assert(property.name.startsWith('--t-'), `${tag}: private CSS property published.`);
    assert(
      property.description && !/^\w+\.$/.test(property.description.trim()),
      `${tag}: CSS property ${property.name} needs a useful description.`,
    );
  }
  for (const match of source.matchAll(/var\((--t-[\w-]+)/g))
    assert(
      sharedCssProperties.has(match[1]) ||
        component.cssProperties.some((property) => property.name === match[1]),
      `${tag}: undocumented component CSS property ${match[1]}.`,
    );
  for (const match of source.matchAll(/\bpart="([^"$]*)"/g))
    for (const part of match[1].split(/\s+/))
      assert(
        component.cssParts.some((p) => p.name === part),
        `${tag}: undocumented CSS part ${part}.`,
      );
  for (const match of source.matchAll(/<slot\b([^>]*)>/g)) {
    if (/\bname=\$/.test(match[1])) continue;
    const name = /\bname="([^"]*)"/.exec(match[1])?.[1] ?? '';
    assert(
      component.slots.some((s) => s.name === name),
      `${tag}: undocumented slot ${name || '(default)'}.`,
    );
  }
  const titleSource = storySources.find((s) => s.includes(`component: '${tag}'`));
  const title = /title: '([^']+)'/.exec(titleSource)[1];
  entries.push({
    tag,
    docsId: title.toLowerCase().replaceAll('/', '-').replaceAll(' ', '-') + '--docs',
  });
}
entries.push({ tag: 'typography', docsId: 'introduction-typography--docs' });
for (const { tag } of entries) {
  const renderExample = (framework) =>
    tag === 'typography' ? typographyExampleFor(framework) : exampleFor(tag, framework);
  await writeFile(
    join(out, `${tag}.html`),
    `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${tag} example</title></head><body>${renderExample('html')}</body></html>`,
  );
  const reactExample = renderExample('react');
  if (tag !== 'typography' && guides[tag].event?.read.startsWith('detail')) {
    assert(
      reactExample.includes(`console.log(event.${guides[tag].event.read})`),
      `${tag}: React examples must use their inferred custom event payload.`,
    );
    assert(!reactExample.includes('as CustomEvent'), `${tag}: React event casts are unnecessary.`);
  }
  if (tag !== 'typography') {
    assert(
      reactExample.includes(`from '@terminal-kit/core/react/${tag.slice(2)}'`),
      `${tag}: React examples must import their component wrapper directly.`,
    );
    assert(
      !reactExample.includes("from '@terminal-kit/core/react'"),
      `${tag}: React examples must not import the complete wrapper barrel.`,
    );
  }
  await writeFile(join(out, `${tag}.tsx`), reactExample);
  await writeFile(join(out, `${tag}.angular.ts`), renderExample('angular'));
  const sfc = renderExample('vue');
  const { descriptor, errors } = parse(sfc, {
    filename: `${tag}.vue`,
    templateParseOptions: { isCustomElement: (name) => name.startsWith('t-') },
  });
  assert.deepEqual(errors, [], `${tag}: Vue SFC parse errors.`);
  const compiled = compileScript(descriptor, {
    id: tag,
    inlineTemplate: true,
    templateOptions: { compilerOptions: { isCustomElement: (name) => name.startsWith('t-') } },
  });
  await writeFile(join(out, `${tag}.vue.ts`), compiled.content);
}
await writeFile(join(out, 'catalog.json'), JSON.stringify(entries, null, 2));
await writeFile(join(out, 'example.css'), examples.exampleCss);
const options = {
  target: 'ES2022',
  module: 'ESNext',
  moduleResolution: 'Bundler',
  jsx: 'react-jsx',
  strict: true,
  noUnusedLocals: true,
  skipLibCheck: true,
  experimentalDecorators: true,
  useDefineForClassFields: false,
  lib: ['ES2022', 'DOM', 'DOM.Iterable'],
  types: ['react', 'vite/client'],
  noEmit: true,
};
await writeFile(
  join(out, 'react-tsconfig.json'),
  JSON.stringify({ compilerOptions: options, include: ['./*.tsx'] }),
);
execFileSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '-p', join(out, 'react-tsconfig.json')],
  { stdio: 'inherit' },
);
await writeFile(
  join(out, 'angular-tsconfig.json'),
  JSON.stringify({
    compilerOptions: { ...options, noEmit: false, outDir: './angular-build' },
    angularCompilerOptions: { strictTemplates: true },
    include: ['./*.angular.ts'],
  }),
);
execFileSync(
  process.execPath,
  [
    'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js',
    '-p',
    join(out, 'angular-tsconfig.json'),
  ],
  { stdio: 'inherit' },
);
for (const framework of ['react', 'vue', 'angular']) {
  const ext = framework === 'react' ? 'tsx' : framework === 'vue' ? 'vue.ts' : 'angular.ts';
  const imports = entries
    .map(
      ({ tag }, i) =>
        `import ${framework === 'vue' ? `Example${i}` : `{ Example as Example${i} }`} from './${framework === 'angular' ? 'angular-build/' : ''}${tag}.${framework === 'angular' ? 'angular.js' : ext}';`,
    )
    .join('\n');
  const map = entries.map(({ tag }, i) => `'${tag}': Example${i}`).join(',');
  const boot =
    framework === 'react'
      ? `import React from 'react'; import { createRoot } from 'react-dom/client'; createRoot(document.querySelector('#app')).render(React.createElement(Example));`
      : framework === 'vue'
        ? `import { createApp } from 'vue'; createApp(Example).mount('#app');`
        : `import '@angular/compiler'; import { bootstrapApplication } from '@angular/platform-browser'; await bootstrapApplication(Example);`;
  await build({
    stdin: {
      contents: `${framework === 'angular' ? "import '@angular/compiler';\n" : ''}${imports}\nimport '@terminal-kit/core/themes.css';\nimport '@terminal-kit/core/typography.css';\nconst Example = ({${map}})[new URLSearchParams(location.search).get('component')];\n${boot}`,
      resolveDir: out,
      loader: 'ts',
    },
    outfile: join(out, `${framework}.js`),
    bundle: true,
    format: 'esm',
    target: 'es2022',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  await writeFile(
    join(out, `${framework}.html`),
    `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${framework} example</title><link rel="stylesheet" href="/${framework}.css"><link rel="stylesheet" href="/example.css"></head><body><div id="app"><app-example></app-example></div><script type="module" src="/${framework}.js"></script></body></html>`,
  );
}
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    const file =
      path === '/assets/terminal.js'
        ? resolve('dist/terminal.js')
        : path === '/assets/themes.css'
          ? resolve('dist/themes.css')
          : path === '/assets/typography.css'
            ? resolve('dist/typography.css')
            : join(out, basename(path));
    const content = await readFile(file);
    response.setHeader(
      'Content-Type',
      file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html',
    );
    response.end(content);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch();
async function verifyWrappedChoice(host, role, label) {
  const row = host.getByRole(role, { name: label, exact: true });
  const layout = await row.evaluate((element) => {
    const boundary = element.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(element);
    const lines = [...range.getClientRects()].filter((rect) => rect.width > 0);
    return {
      width: element.scrollWidth,
      available: element.clientWidth,
      lines: lines.length,
      clipped: lines.some(
        (rect) => rect.left < boundary.left - 1 || rect.right > boundary.right + 1,
      ),
    };
  });
  assert(layout.lines > 1, `${role}: long documentation choice must wrap.`);
  assert(
    layout.width <= layout.available + 1 && !layout.clipped,
    `${role}: complete label must fit the row.`,
  );
}
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const framework of ['html', 'react', 'vue', 'angular']) {
    console.log(`Checking ${framework} documentation examples...`);
    for (const { tag } of entries) {
      errors.length = 0;
      await page.goto(
        framework === 'html' ? `${base}/${tag}.html` : `${base}/${framework}.html?component=${tag}`,
      );
      if (tag === 'typography') {
        const heading = page.getByRole('heading', { name: 'A clear signal.', level: 1 });
        await heading.waitFor();
        assert.equal(
          await heading.evaluate((el) => getComputedStyle(el).fontSize),
          '48px',
          `${framework}: typography CSS must load.`,
        );
        const link = page.getByRole('link', { name: 'links for navigation' });
        await link.focus();
        assert.equal(
          await link.evaluate((el) => getComputedStyle(el).textDecorationLine),
          'underline',
        );
        await link.press('Enter');
        assert(page.url().endsWith('#reading-notes'), `${framework}: native anchor must navigate.`);
        assert.deepEqual(errors, [], `${framework}/typography: browser errors.`);
        continue;
      }
      await page
        .waitForFunction((tag) => !!document.querySelector(tag), tag)
        .catch((error) => {
          throw new Error(`${framework}/${tag}: did not mount. ${errors.join('; ')}`, {
            cause: error,
          });
        });
      await page.locator(tag).first().waitFor({ state: 'attached' });
      await page.waitForFunction(
        (tag) => !!document.querySelector(tag)?.shadowRoot?.firstElementChild,
        tag,
      );
      const expected = guides[tag].example.props ?? {};
      const keys = Object.keys(expected).filter((key) => !['open'].includes(key));
      const actual = await page
        .locator(tag)
        .first()
        .evaluate(
          (element, keys) => Object.fromEntries(keys.map((key) => [key, element[key]])),
          keys,
        );
      for (const key of keys)
        assert.deepEqual(
          actual[key],
          expected[key],
          `${framework}/${tag}: ${key} did not reach the element.`,
        );
      const expectedSlots = (guides[tag].example.children ?? [])
        .filter((child) => typeof child !== 'string' && child.attrs?.slot)
        .map((child) => child.attrs.slot);
      await page
        .locator(tag)
        .first()
        .evaluate(async (element) => element.updateComplete);
      const actualSlots = await page
        .locator(tag)
        .first()
        .evaluate((element) =>
          Array.from(element.children)
            .filter((child) => child.hasAttribute('slot'))
            .map((child) => child.assignedSlot?.name),
        );
      assert.deepEqual(
        actualSlots,
        expectedSlots,
        `${framework}/${tag}: slot content was not assigned.`,
      );
      if (guides[tag].action) {
        await page.getByRole('button', { name: guides[tag].action.label, exact: true }).click();
        assert.equal(
          await page
            .locator(tag)
            .first()
            .evaluate((el) => el.open),
          true,
          `${framework}/${tag}: opener must work.`,
        );
      }
      if (tag === 't-input') {
        await page.getByRole('textbox', { name: 'Callsign', exact: false }).fill('DOCUMENTED');
        assert.equal(await page.locator(tag).evaluate((el) => el.value), 'DOCUMENTED');
      }
      if (tag === 't-breadcrumb') {
        const host = page.locator(tag);
        const viewport = page.viewportSize();
        await page.setViewportSize({ width: 320, height: 800 });
        assert.equal(
          await host.getByRole('navigation', { name: expected.label, exact: true }).count(),
          1,
        );
        for (const label of await host.locator('li > a,li > span:not(.separator)').all()) {
          const geometry = await label.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(element);
            const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
            return {
              text: element.textContent,
              clipped: rects.some((rect) => rect.left < box.left - 1 || rect.right > box.right + 1),
              lines: rects.length,
            };
          });
          assert(
            !geometry.clipped,
            `${framework}/${tag}: complete label must remain within its row.`,
          );
          if (geometry.text !== 'Home')
            assert(
              geometry.lines > 1,
              `${framework}/${tag}: filenames must wrap at narrow widths.`,
            );
        }
        const link = host.getByRole('link', { name: expected.items[1].label, exact: true });
        assert.equal(await link.getAttribute('href'), '#archive');
        assert.equal(
          await host.locator('[aria-current=page]').textContent(),
          expected.items[2].label,
        );
        await link.focus();
        assert.equal(
          await link.evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        const logged = page.waitForEvent('console', {
          predicate: (message) => message.text() === 'click',
        });
        await link.press('Enter');
        await logged;
        assert.equal(new URL(page.url()).hash, '#archive');
        await page.setViewportSize(viewport);
      }
      if (tag === 't-toolbar') {
        const host = page.locator(tag);
        assert.equal(
          await host.getByRole('toolbar', { name: expected.label, exact: true }).count(),
          1,
        );
        assert.equal(await page.evaluate(() => document.activeElement === document.body), true);
        const focused = async (name) =>
          host
            .getByRole('button', { name, exact: true })
            .evaluate((element) => element === element.getRootNode().activeElement);
        await host.getByRole('button', { name: 'Refresh', exact: true }).focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(
          await focused('Export'),
          true,
          `${framework}/${tag}: wrapped action must receive focus.`,
        );
        await page.keyboard.press('ArrowRight');
        assert.equal(
          await focused('Help'),
          true,
          `${framework}/${tag}: inert wrapper must be skipped.`,
        );
        const unavailableGroup = host.locator(':scope > span').last();
        await unavailableGroup.evaluate((element) => (element.inert = false));
        await page.keyboard.press('ArrowLeft');
        assert.equal(
          await focused('Unavailable action'),
          true,
          `${framework}/${tag}: live inert changes must restore navigation.`,
        );
        await unavailableGroup.evaluate((element) => (element.inert = true));
        await page.waitForFunction(() => {
          const root = document
            .querySelector('t-toolbar')
            .querySelectorAll('t-button')[3].shadowRoot;
          return root.activeElement === root.querySelector('button');
        });
        assert.equal(
          await focused('Help'),
          true,
          `${framework}/${tag}: live inert changes must recover focus.`,
        );
        const viewport = page.viewportSize();
        await page.setViewportSize({ width: 320, height: 720 });
        const native = host.locator(':scope > button');
        const link = host.locator(':scope > a');
        for (const action of [native, link]) {
          const layout = await action.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(element);
            const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
            return {
              width: element.scrollWidth,
              available: element.clientWidth,
              lines: rects.length,
              clipped: rects.some((rect) => rect.left < box.left - 1 || rect.right > box.right + 1),
            };
          });
          assert(
            layout.width <= layout.available + 1 && !layout.clipped && layout.lines > 1,
            `${framework}/${tag}: complete native labels must wrap within their controls.`,
          );
        }
        await native.focus();
        const logged = page.waitForEvent('console', {
          predicate: (message) => message.text() === 'click',
        });
        await native.press('Enter');
        await logged;
        await native.press('End');
        assert.equal(
          await link.evaluate((element) => element === document.activeElement),
          true,
          `${framework}/${tag}: native link must receive keyboard focus.`,
        );
        const linkBox = await link.boundingBox();
        assert(
          linkBox.y >= 0 && linkBox.y + linkBox.height <= 720,
          `${framework}/${tag}: focused link must remain fully visible.`,
        );
        assert.equal(await link.getAttribute('href'), '#report');
        await page.setViewportSize(viewport);
      }
      if (tag === 't-split-pane') {
        const host = page.locator(tag);
        assert.equal(
          await host.locator('.layout').evaluate((element) => getComputedStyle(element).height),
          '240px',
          `${framework}/${tag}: documented CSS height must reach the shadow layout.`,
        );
        const separator = host.getByRole('separator', { name: 'Record list', exact: true });
        await separator.focus();
        const logged = page.waitForEvent('console', {
          predicate: (message) => message.text() === '41',
        });
        await separator.press('ArrowRight');
        await logged;
        assert.equal(await host.evaluate((element) => element.size), 41);
        assert.equal(
          await separator.evaluate((element) => element === element.getRootNode().activeElement),
          true,
          `${framework}/${tag}: keyboard resizing must retain focus.`,
        );
        await host.getByRole('button', { name: 'Open survey', exact: true }).focus();
        await host.evaluate(async (element) => {
          element.size = 0;
          await element.updateComplete;
        });
        assert.equal(
          await separator.evaluate((element) => element === element.getRootNode().activeElement),
          true,
          `${framework}/${tag}: collapsing a wrapped custom control must recover focus.`,
        );
        await separator.press('Enter');
        assert.equal(await host.evaluate((element) => element.size), 50);
        await host.getByRole('button', { name: 'Inspect metadata', exact: true }).focus();
        await host.evaluate(async (element) => {
          element.disabled = true;
          element.size = 100;
          await element.updateComplete;
        });
        assert.equal(
          await host
            .locator('[part="primary"]')
            .evaluate((element) => element === element.getRootNode().activeElement),
          true,
          `${framework}/${tag}: disabled recovery must focus the surviving pane.`,
        );
        assert.equal(
          await host.getByRole('button', { name: 'Open survey', exact: true }).count(),
          1,
        );
        assert.equal(
          await host.getByRole('button', { name: 'Inspect metadata', exact: true }).count(),
          0,
        );
      }
      if (tag === 't-tree') {
        const host = page.locator(tag);
        assert.equal(
          await host
            .locator('[data-id=survey] > [part=row]')
            .evaluate((element) => getComputedStyle(element).paddingInlineStart),
          '12px',
          `${framework}/${tag}: documented indentation must reach the shadow row.`,
        );
        assert.equal(await page.evaluate(() => document.activeElement === document.body), true);
        assert.equal(
          await host.getByRole('tree', { name: expected.label, exact: true }).count(),
          1,
        );
        await host.getByRole('treeitem', { name: 'Atmospheric survey', exact: true }).focus();
        const logged = page.waitForEvent('console', {
          predicate: (message) => message.text() === 'survey',
        });
        await page.keyboard.press('Enter');
        await logged;
        await host.evaluate(async (element) => {
          element.documentationItems = element.items;
          element.items = [];
          await element.updateComplete;
        });
        assert.equal(
          await host
            .getByRole('group', { name: expected.label, exact: true })
            .evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        await host.evaluate(async (element) => {
          element.items = element.documentationItems;
          await element.updateComplete;
        });
        assert.equal(
          await host
            .getByRole('treeitem')
            .first()
            .evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        assert.equal(await host.evaluate((element) => element.value), 'survey');
      }
      if (tag === 't-menu') {
        const host = page.locator(tag);
        const viewport = page.viewportSize();
        await page.setViewportSize({ width: 320, height: 720 });
        const trigger = host.getByRole('button', { name: expected.label, exact: true });
        await trigger.click();
        await host.evaluate(async (element) => {
          element.documentationOptions = element.options;
          element.options = [];
          await element.updateComplete;
        });
        assert.equal(await trigger.getAttribute('aria-haspopup'), null);
        assert.equal(
          await host
            .getByRole('group', { name: expected.label, exact: true })
            .evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        assert.equal(
          await host
            .getByRole('status')
            .textContent()
            .then((text) => text.trim()),
          'No actions available.',
        );
        await host.evaluate(async (element) => {
          element.options = element.documentationOptions;
          await element.updateComplete;
        });
        await page.keyboard.press('End');
        await verifyWrappedChoice(host, 'menuitem', expected.options.at(-1).label);
        await page.keyboard.press('Home');
        const logged = page.waitForEvent('console', {
          predicate: (message) => message.text() === 'rename',
        });
        await page.keyboard.press('Enter');
        await logged;
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
        assert.equal(
          await trigger.evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        await page.setViewportSize(viewport);
      }
      if (tag === 't-combobox') {
        const host = page.locator(tag);
        const viewport = page.viewportSize();
        await page.setViewportSize({ width: 320, height: 720 });
        const search = host.getByRole('combobox', { name: expected.label, exact: true });
        await search.focus();
        await host.evaluate(async (element) => {
          element.documentationOptions = element.options;
          element.userEvents = [];
          for (const type of ['input', 'change'])
            element.addEventListener(type, () => element.userEvents.push(type));
          element.options = [];
          await element.updateComplete;
        });
        assert.equal(await search.getAttribute('aria-expanded'), 'false');
        assert.equal(await search.getAttribute('aria-controls'), null);
        assert.equal(
          await search.evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        await host.evaluate(async (element) => {
          element.options = element.documentationOptions;
          await element.updateComplete;
        });
        assert.equal(await search.getAttribute('aria-expanded'), 'true');
        assert.deepEqual(await host.evaluate((element) => element.userEvents), []);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('End');
        await verifyWrappedChoice(host, 'option', expected.options.at(-1).label);
        assert.equal(
          await host
            .getByRole('listbox')
            .evaluate((element) => getComputedStyle(element).overflowY),
          'auto',
          `${framework}/${tag}: the controlled listbox must own option scrolling.`,
        );
        await page.keyboard.press('Home');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.equal(await host.evaluate((element) => element.value), 'engineering');
        assert.deepEqual(await host.evaluate((element) => element.userEvents), ['input', 'change']);
        await page.setViewportSize(viewport);
      }
      if (tag === 't-command-palette') {
        const host = page.locator(tag);
        const search = host.getByRole('combobox');
        await host.evaluate(async (element) => {
          element.documentationCommands = element.commands;
          element.commands = [];
          await element.updateComplete;
        });
        assert.equal(await search.getAttribute('aria-expanded'), 'false');
        assert.equal(await search.getAttribute('aria-controls'), null);
        assert.equal(
          await search.evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        await host.evaluate(async (element) => {
          element.commands = element.documentationCommands;
          await element.updateComplete;
        });
        assert.equal(await search.getAttribute('aria-expanded'), 'true');
        const logged = page.waitForEvent('console', {
          predicate: (message) => message.text() === 'settings',
        });
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await logged;
        await host.evaluate(async (element) => element.updateComplete);
        assert.equal(await host.evaluate((element) => element.open), false);
      }
      if (tag === 't-tabs') {
        const host = page.locator(tag);
        assert.equal(
          await page.evaluate(() => document.activeElement === document.body),
          true,
          `${framework}/${tag}: initial rendering must not move focus.`,
        );
        assert.equal(
          await host.getByRole('tablist', { name: expected.label, exact: true }).count(),
          1,
        );
        await host.evaluate((element) => {
          element.userEvents = [];
          element.addEventListener('t-change', (event) =>
            element.userEvents.push(event.detail.value),
          );
        });
        await host.getByRole('tab', { name: 'Overview', exact: true }).focus();
        const logged = page.waitForEvent('console', {
          predicate: (message) => message.text().includes('settings'),
        });
        await page.keyboard.press('ArrowRight');
        await logged;
        assert.equal(await host.evaluate((element) => element.active), 'settings');
        assert.equal(
          await host
            .getByRole('tab', { name: 'Settings', exact: true })
            .evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        await host.evaluate(async (element) => {
          element.documentationTabs = element.tabs;
          element.tabs = [];
          await element.updateComplete;
        });
        assert.equal(
          await host
            .getByRole('group', { name: expected.label, exact: true })
            .evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        await host.evaluate(async (element) => {
          element.tabs = element.documentationTabs;
          await element.updateComplete;
        });
        assert.equal(
          await host
            .getByRole('tab', { name: 'Overview', exact: true })
            .evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        assert.deepEqual(await host.evaluate((element) => element.userEvents), ['settings']);
      }
      if (['t-radio-group', 't-segmented-control', 't-rating', 't-multi-select'].includes(tag)) {
        assert.equal(
          await page.evaluate(() => document.activeElement === document.body),
          true,
          `${framework}/${tag}: initial rendering must not move focus.`,
        );
      }
      if (['t-radio-group', 't-segmented-control', 't-rating'].includes(tag)) {
        const host = page.locator(tag);
        assert.equal(
          await host.getByRole('group', { name: expected.label, exact: true }).count(),
          1,
        );
        await host.evaluate((element) => {
          element.userEvents = [];
          for (const type of ['input', 'change'])
            element.addEventListener(type, () => element.userEvents.push(type));
          element.focus();
          element.documentationFocusedChoice = element.shadowRoot.activeElement;
        });
        assert.equal(
          await host.evaluate((element) => element.documentationFocusedChoice.value),
          expected.value,
        );
        if (tag === 't-rating')
          await host.evaluate((element) => {
            element.max = 2;
          });
        else
          await host.evaluate((element) => {
            element.options = [...element.options].reverse();
          });
        await host.evaluate(async (element) => {
          await element.updateComplete;
        });
        assert.equal(
          await host.evaluate((element) => element.shadowRoot.activeElement.value),
          tag === 't-rating' ? '2' : expected.value,
        );
        if (tag !== 't-rating')
          assert.equal(
            await host.evaluate(
              (element) => element.shadowRoot.activeElement === element.documentationFocusedChoice,
            ),
            true,
          );
        assert.deepEqual(await host.evaluate((element) => element.userEvents), []);
        const next = await host.evaluate((element) => {
          const enabled = [...element.shadowRoot.querySelectorAll('input:not(:disabled)')];
          return enabled[(enabled.indexOf(element.shadowRoot.activeElement) + 1) % enabled.length]
            .value;
        });
        const logged =
          framework === 'html'
            ? page.waitForEvent('console', { predicate: (message) => message.text() === next })
            : null;
        await page.keyboard.press('ArrowRight');
        if (logged) await logged;
        assert.equal(
          await host.evaluate((element) => element.value),
          next,
          `${framework}/${tag}: keyboard selection must update the value.`,
        );
        assert.deepEqual(await host.evaluate((element) => element.userEvents), ['input', 'change']);
        assert.equal(
          await host.evaluate((element) => element.shadowRoot.activeElement.value),
          next,
        );
      }
      if (tag === 't-calendar') {
        assert.equal(await page.getByRole('group', { name: 'Mission date' }).count(), 1);
        const day = page.locator('t-calendar [data-date="2026-09-25"]');
        await day.focus();
        assert.equal(
          await day.evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        const logged = page.waitForEvent('console', {
          predicate: (message) => message.text().includes('2026-09-25'),
        });
        await day.click();
        await logged;
        assert.equal(
          await page.locator(tag).evaluate((element) => element.value),
          '2026-09-25',
          `${framework}/${tag}: date selection must update the value and framework event handler.`,
        );
      }
      if (tag === 't-date-picker') {
        const picker = page.locator(tag);
        const field = picker.getByRole('textbox', { name: 'Mission date' });
        assert.equal(await field.count(), 1, `${framework}/${tag}: the field needs its label.`);
        await picker.evaluate((element) => {
          element.userEvents = [];
          element.addEventListener('input', () => element.userEvents.push('input'));
          element.addEventListener('t-change', (event) =>
            element.userEvents.push(event.detail.value),
          );
        });
        await picker.getByRole('button', { name: 'Change date, 2026-09-24' }).click();
        const day = picker.locator('t-calendar [data-date="2026-09-25"]');
        await day.focus();
        assert.equal(
          await day.evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        const logged =
          framework === 'html'
            ? page.waitForEvent('console', {
                predicate: (message) => message.text().includes('2026-09-25'),
              })
            : null;
        await day.click();
        if (logged) await logged;
        assert.equal(await field.inputValue(), '2026-09-25');
        assert.deepEqual(await picker.evaluate((element) => element.userEvents), [
          'input',
          '2026-09-25',
        ]);
      }
      if (tag === 't-time-picker') {
        const picker = page.locator(tag);
        const field = picker.getByRole('textbox', { name: 'Launch time' });
        assert.equal(await field.count(), 1, `${framework}/${tag}: the field needs its label.`);
        assert.equal(await field.inputValue(), '09:30');
        await picker.evaluate((element) => {
          element.userEvents = [];
          element.addEventListener('input', () => element.userEvents.push('input'));
          element.addEventListener('t-change', (event) =>
            element.userEvents.push(event.detail.value),
          );
        });
        await picker.getByRole('button', { name: 'Change time, 09:30' }).click();
        const hours = picker.getByRole('combobox', { name: 'Hours' });
        const minutes = picker.getByRole('combobox', { name: 'Minutes' });
        assert.equal(
          await hours.evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        await hours.selectOption('10');
        await minutes.selectOption('45');
        const logged =
          framework === 'html'
            ? page.waitForEvent('console', {
                predicate: (message) => message.text().includes('10:45'),
              })
            : null;
        await picker.getByRole('button', { name: 'Use time' }).click();
        if (logged) await logged;
        assert.equal(await field.inputValue(), '10:45');
        assert.deepEqual(await picker.evaluate((element) => element.userEvents), [
          'input',
          '10:45',
        ]);
        assert.equal(
          await picker
            .locator('.trigger')
            .evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
      }
      if (tag === 't-date-range-picker') {
        const picker = page.locator(tag);
        const start = picker.getByRole('textbox', { name: 'Start date' });
        const end = picker.getByRole('textbox', { name: 'End date' });
        assert.equal(
          await picker.getByRole('group', { name: 'Mission window', exact: true }).count(),
          1,
        );
        assert.equal(await start.inputValue(), '2026-09-24');
        assert.equal(await end.inputValue(), '2026-10-01');
        await picker.evaluate((element) => {
          element.userEvents = [];
          element.addEventListener('input', () => element.userEvents.push('input'));
          element.addEventListener('t-change', (event) =>
            element.userEvents.push(event.detail.value),
          );
        });
        await picker.getByRole('button', { name: 'Change date range' }).click();
        const first = picker.locator('t-calendar [data-date="2026-10-03"]');
        await first.focus();
        assert.equal(
          await first.evaluate((element) => element === element.getRootNode().activeElement),
          true,
        );
        await first.click();
        assert.equal(await picker.evaluate((element) => element.value), '2026-09-24/2026-10-01');
        const logged =
          framework === 'html'
            ? page.waitForEvent('console', {
                predicate: (message) => message.text().includes('2026-10-03/2026-10-05'),
              })
            : null;
        await picker.locator('t-calendar [data-date="2026-10-05"]').click();
        if (logged) await logged;
        assert.equal(await start.inputValue(), '2026-10-03');
        assert.equal(await end.inputValue(), '2026-10-05');
        assert.deepEqual(await picker.evaluate((element) => element.userEvents), [
          'input',
          '2026-10-03/2026-10-05',
        ]);
      }
      if (tag === 't-chip') {
        const chip = page.locator(tag);
        const action = chip.getByRole('button', { name: 'Engineering', exact: true });
        const remove = chip.getByRole('button', { name: 'Remove Engineering' });
        assert.equal(await action.count(), 1, `${framework}/${tag}: selection needs its label.`);
        assert.equal(await remove.count(), 1, `${framework}/${tag}: removal needs its label.`);
        await chip.evaluate((element) => {
          element.userEvents = [];
          element.addEventListener('t-toggle', (event) =>
            element.userEvents.push(['toggle', event.detail.selected]),
          );
          element.addEventListener('t-remove', (event) =>
            element.userEvents.push(['remove', event.detail.label]),
          );
        });
        const logged =
          framework === 'html'
            ? page.waitForEvent('console', { predicate: (message) => message.text() === 'true' })
            : null;
        await action.click();
        if (logged) await logged;
        assert.equal(await chip.evaluate((element) => element.selected), true);
        assert.equal(await action.getAttribute('aria-pressed'), 'true');
        await remove.click();
        assert.equal(await chip.count(), 1, `${framework}/${tag}: removal is an app request.`);
        assert.deepEqual(await chip.evaluate((element) => element.userEvents), [
          ['toggle', true],
          ['remove', 'Engineering'],
        ]);
      }
      if (tag === 't-multi-select') {
        await page.getByRole('checkbox', { name: 'Engineering' }).check();
        assert.deepEqual(
          await page.locator(tag).evaluate((el) => el.values),
          ['archive', 'engineering'],
          `${framework}/${tag}: selection must update the bound values array.`,
        );
        await page.getByRole('searchbox', { name: 'Filter Departments' }).fill('engine');
        assert.deepEqual(
          await page.locator(tag).evaluate((el) => el.values),
          ['archive', 'engineering'],
          `${framework}/${tag}: filtering must keep selected values.`,
        );
      }
      if (tag === 't-table') {
        await page.getByRole('button', { name: 'Next page for Mission records' }).click();
        assert.equal(
          await page.locator(tag).evaluate((el) => el.page),
          2,
          `${framework}/${tag}: local paging must update the page property.`,
        );
        await page.getByRole('searchbox', { name: 'Filter Mission records' }).fill('crew');
        assert.deepEqual(
          await page.locator(tag).evaluate((el) => ({ query: el.query, page: el.page })),
          { query: 'crew', page: 1 },
          `${framework}/${tag}: filtering must reset the page without losing the query.`,
        );
        assert.equal(await page.locator('t-table tbody tr').count(), 1);
      }
      if (tag === 't-toast') {
        assert.equal(
          (await page.locator('t-toast [role=status]').innerText()).trim(),
          expected.message,
          `${framework}/${tag}: message must remain visible beside named slots.`,
        );
      }
      assert.deepEqual(errors, [], `${framework}/${tag}: browser errors.`);
    }
  }
  console.log(
    `Verified ${entries.length} guides, metadata coverage, React types, Angular AOT, Vue SFC compilation, and all ${entries.length * 4} examples rendered with their documented properties and slots in Chromium.`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
