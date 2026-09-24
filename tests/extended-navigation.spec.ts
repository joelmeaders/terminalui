import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

async function fixture(page: Page, markup: string) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.evaluate(async () => {
    for (const name of [
      'command-palette',
      'steps',
      'timeline',
      'meter',
      'description-list',
      'link',
      'toolbar',
      'split-pane',
    ])
      await import(`/src/components/${name}.ts`);
  });
  await page.locator('#fixture').evaluate((element, html) => {
    element.innerHTML = html;
  }, markup);
}

test('command palette filters, skips disabled actions, contains focus, and restores its opener', async ({
  page,
}) => {
  await fixture(
    page,
    '<button id="open">Find command</button><t-command-palette></t-command-palette><button>After</button>',
  );
  await page
    .locator('t-command-palette')
    .evaluate((element: import('../src/components/command-palette').TCommandPalette) => {
      element.commands = [
        { value: 'open', label: 'Open project', keywords: ['folder'] },
        { value: 'disabled', label: 'Save changes', disabled: true },
        { value: 'settings', label: 'Workspace settings' },
      ];
      element.addEventListener(
        't-select',
        (event) => (element.dataset.selected = (event as CustomEvent).detail.value),
      );
      document
        .querySelector('#open')!
        .addEventListener('click', () =>
          element.show(document.querySelector<HTMLElement>('#open')!),
        );
    });
  await page.getByRole('button', { name: 'Find command' }).click();
  const search = page.getByRole('combobox', { name: 'Search commands' });
  await expect(search).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Close command palette' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(search).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'Workspace settings' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Home');
  await expect(page.getByRole('option', { name: 'Open project' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await search.fill('folder');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.locator('t-command-palette')).toHaveAttribute('data-selected', 'open');
  await expect(page.getByRole('button', { name: 'Find command' })).toBeFocused();
  await page.getByRole('button', { name: 'Find command' }).click();
  await expect(search).toHaveValue('');
  await search.fill('unknown command');
  await expect(page.getByRole('status')).toHaveText('No matching commands.');
  await expect(search).not.toHaveAttribute('aria-activedescendant');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .locator('t-command-palette')
    .evaluate(
      (element: import('../src/components/command-palette').TCommandPalette) =>
        (element.loading = true),
    );
  await expect(page.getByRole('status')).toHaveText('Loading commands…');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Find command' })).toBeFocused();
});

test('steps expose ordered current/error states and emit enabled navigation only', async ({
  page,
}) => {
  await fixture(page, '<t-steps label="Request stages" value="review"></t-steps>');
  await page.locator('t-steps').evaluate((element: import('../src/components/steps').TSteps) => {
    element.items = [
      { id: 'details', label: 'Details', status: 'complete' },
      { id: 'review', label: 'Review', status: 'error' },
      { id: 'confirm', label: 'Confirm', disabled: true },
    ];
    element.addEventListener(
      't-select',
      (event) => (element.dataset.selection = JSON.stringify((event as CustomEvent).detail)),
    );
  });
  await expect(
    page.getByRole('navigation', { name: 'Request stages' }).getByRole('list'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Review/ })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await expect(page.getByRole('button', { name: /Review/ })).toContainText('Needs attention');
  await expect(page.getByRole('button', { name: /Confirm/ })).toBeDisabled();
  await page.getByRole('button', { name: /Details/ }).click();
  await expect(page.locator('t-steps [aria-current=step]')).toHaveCount(1);
  await expect(page.locator('t-steps')).toHaveAttribute(
    'data-selection',
    /"value":"details","index":0/,
  );
});

test('timeline and description lists retain native semantics and plain text', async ({ page }) => {
  await fixture(
    page,
    '<t-timeline></t-timeline><t-description-list><dt>Guide</dt><dd><a href="#guide">Read the guide</a></dd></t-description-list>',
  );
  await page.locator('t-timeline').evaluate(
    (element: import('../src/components/timeline').TTimeline) =>
      (element.items = [
        {
          id: 'created',
          title: 'Request created',
          date: 'September 23, 2026',
          dateTime: '2026-09-23',
          status: 'Complete',
          description: '<b>Plain text</b>',
        },
      ]),
  );
  await page.locator('t-description-list').evaluate(
    (element: import('../src/components/description-list').TDescriptionList) =>
      (element.items = [
        { term: 'Documents', value: 42 },
        { term: 'Owner', value: '<b>Ellen</b>' },
      ]),
  );
  await expect(page.getByRole('list', { name: 'Activity timeline' })).toBeVisible();
  await expect(page.locator('t-timeline time')).toHaveAttribute('datetime', '2026-09-23');
  await expect(page.getByRole('article', { name: 'Request created' })).toContainText('Complete');
  await expect(page.locator('t-timeline b,t-description-list b')).toHaveCount(0);
  await expect(page.getByRole('term')).toHaveCount(3);
  await expect(page.getByRole('definition')).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Read the guide' })).toBeVisible();
});

test('native meter maps ranges and formatted value without invalid measurements', async ({
  page,
}) => {
  await fixture(
    page,
    '<t-meter label="Storage used" min="0" max="100" value="42" low="60" high="85" optimum="20" value-text="42 GB of 100 GB"></t-meter>',
  );
  const meter = page.getByRole('meter', { name: 'Storage used' });
  await expect(meter).toHaveAttribute('value', '42');
  await expect(meter).toHaveAttribute('aria-valuetext', '42 GB of 100 GB');
  await expect(meter).toHaveAttribute('low', '60');
  await expect(meter).toHaveAttribute('high', '85');
  await page.locator('t-meter').evaluate((element: import('../src/components/meter').TMeter) => {
    element.value = 999;
    element.valueText = '';
  });
  await expect(meter).toHaveAttribute('value', '100');
  await page.locator('t-meter').evaluate((element: import('../src/components/meter').TMeter) => {
    element.min = 5;
    element.max = 2;
    element.value = Number.NaN;
  });
  await expect(meter).toHaveAttribute('min', '5');
  await expect(meter).toHaveAttribute('max', '6');
  await expect(meter).toHaveAttribute('value', '5');
});

test('links preserve native navigation and protect external and unavailable destinations', async ({
  page,
}) => {
  await fixture(
    page,
    '<p><t-link href="#guide">Guide</t-link> <t-link href="https://example.com" target="_blank" rel="author">External docs</t-link> <t-link href="javascript:alert(1)">Unsafe URL</t-link> <t-link href="#disabled" disabled>Unavailable</t-link></p><h1 id="guide">Guide destination</h1>',
  );
  const external = page.getByRole('link', { name: 'External docs (opens in a new tab)' });
  await expect(external).toHaveAttribute('rel', /noopener/);
  await expect(external).toHaveAttribute('rel', /noreferrer/);
  await expect(external).toHaveAttribute('rel', /author/);
  await expect(page.getByRole('link', { name: 'Unsafe URL' })).not.toHaveAttribute('href');
  await expect(page.getByRole('link', { name: 'Unavailable' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await page.getByRole('link', { name: 'Guide', exact: true }).click();
  await expect(page).toHaveURL(/#guide$/);
});

test('toolbar roves native and shadow actions, skips disabled buttons, and restores tabindex', async ({
  page,
}) => {
  await fixture(
    page,
    '<button>Before</button><t-toolbar label="Document actions"><button id="first">New document</button><t-button disabled>Delete document</t-button><t-button id="last">Download document</t-button><a href="#help" tabindex="-1">Help</a></t-toolbar><button>After</button>',
  );
  await page.getByRole('button', { name: 'New document' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Download document' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('link', { name: 'Help' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'New document' })).toBeFocused();
  await expect(page.locator('t-toolbar [tabindex="0"]')).toHaveCount(1);
  await page
    .locator('t-toolbar')
    .evaluate(
      (element: import('../src/components/toolbar').TToolbar) => (element.orientation = 'vertical'),
    );
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: 'Download document' })).toBeFocused();
  const restored = await page.locator('t-toolbar').evaluate((element) => {
    const first = element.querySelector('#first')!,
      link = element.querySelector('a')!,
      last = element.querySelector('t-button#last')!.shadowRoot!.querySelector('button')!;
    element.remove();
    return [
      first.getAttribute('tabindex'),
      link.getAttribute('tabindex'),
      last.getAttribute('tabindex'),
    ];
  });
  expect(restored).toEqual([null, '-1', null]);
});

test('split pane supports bounded keyboard and pointer resizing with responsive semantics', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await fixture(
    page,
    '<t-split-pane min="20" max="80" primary-label="Files" secondary-label="Preview"><button slot="primary">Open file</button><button slot="secondary">Preview file</button></t-split-pane>',
  );
  await page
    .locator('t-split-pane')
    .evaluate((element: import('../src/components/split-pane').TSplitPane) =>
      element.addEventListener(
        't-change',
        (event) => (element.dataset.change = JSON.stringify((event as CustomEvent).detail)),
      ),
    );
  const separator = page.getByRole('separator', { name: 'Resize panes' });
  await expect(separator).toHaveAttribute('aria-orientation', 'vertical');
  await separator.focus();
  await page.keyboard.press('ArrowRight');
  await expect(separator).toHaveAttribute('aria-valuenow', '51');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(separator).toHaveAttribute('aria-valuenow', '61');
  await page.keyboard.press('End');
  await expect(separator).toHaveAttribute('aria-valuenow', '80');
  await page.keyboard.press('Home');
  await expect(separator).toHaveAttribute('aria-valuenow', '20');
  const box = (await separator.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 150, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('t-split-pane')).toHaveAttribute('data-change', /"source":"pointer"/);
  expect(Number(await separator.getAttribute('aria-valuenow'))).toBeGreaterThan(20);
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
  await separator.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await expect(separator).toHaveAttribute('aria-valuenow', '21');
  await page
    .locator('t-split-pane')
    .evaluate(
      (element: import('../src/components/split-pane').TSplitPane) => (element.disabled = true),
    );
  await page.keyboard.press('End');
  await expect(separator).toHaveAttribute('aria-valuenow', '21');
  await expect(separator).toHaveAttribute('tabindex', '-1');
  await expect(page.getByRole('region', { name: 'Files' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open file' })).toBeEnabled();
});

for (const [mode, scenario] of [
  ['narrow', '320 CSS pixel reflow (not browser zoom)'],
  ['text-200', 'simulated 200% text enlargement (not browser zoom)'],
  ['text-spacing', 'WCAG text-spacing overrides'],
] as const)
  test(`extended navigation remains usable with ${scenario}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: mode === 'text-200' ? 1280 : 320, height: 900 });
    await fixture(
      page,
      '<h1>Extended components</h1><t-steps></t-steps><t-timeline></t-timeline><t-meter label="Storage" value="42"></t-meter><t-description-list></t-description-list><p><t-link href="#guide">Read the complete guide</t-link></p><t-toolbar label="Document actions"><t-button>New document</t-button><t-button>Open document</t-button></t-toolbar><t-split-pane><p slot="primary">Read the primary pane content.</p><p slot="secondary">Read the secondary pane content.</p></t-split-pane><t-command-palette></t-command-palette>',
    );
    await page.evaluate(() => {
      document.body.style.padding = '16px';
      document.body.style.margin = '0';
      document.querySelector('t-steps')!.items = [
        { id: 'one', label: 'Review project information', status: 'complete' },
        { id: 'two', label: 'Confirm project changes', status: 'error' },
      ];
      document.querySelector('t-timeline')!.items = [
        {
          id: 'one',
          title: 'Request created',
          description: 'The request is ready for review.',
          date: 'September 23, 2026',
          dateTime: '2026-09-23',
          status: 'Complete',
        },
      ];
      document.querySelector('t-description-list')!.items = [
        { term: 'Workspace identifier', value: 'mission-navigation-records' },
        { term: 'Owner', value: 'Ellen Ripley' },
      ];
      document.querySelector('t-command-palette')!.commands = [
        {
          value: 'open',
          label: 'Open the mission project',
          description: 'View the complete mission archive.',
        },
        { value: 'disabled', label: 'Unavailable project action', disabled: true },
      ];
    });
    await expect(page.getByRole('button', { name: /Review project information/ })).toBeVisible();
    await page.evaluate((mode) => {
      const roots: (Document | ShadowRoot)[] = [],
        elements: HTMLElement[] = [];
      const visit = (root: Document | ShadowRoot) => {
        roots.push(root);
        for (const element of root.querySelectorAll<HTMLElement>('*')) {
          elements.push(element);
          if (element.shadowRoot) visit(element.shadowRoot);
        }
      };
      visit(document);
      if (mode === 'text-200') {
        const sizes = elements.map((element) => parseFloat(getComputedStyle(element).fontSize));
        elements.forEach((element, index) =>
          element.style.setProperty('font-size', `${sizes[index] * 2}px`, 'important'),
        );
      }
      if (mode === 'text-spacing')
        for (const root of roots) {
          const style = document.createElement('style');
          style.textContent =
            '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-block-end:2em!important}';
          (root instanceof Document ? root.head : root).append(style);
        }
    }, mode);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(
      true,
    );
    const axe = await new AxeBuilder({ page })
      .include('#fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const evidence = testInfo.outputPath('axe-extended-review.json');
    await writeFile(
      evidence,
      JSON.stringify({ mode, violations: axe.violations, incomplete: axe.incomplete }, null, 2),
    );
    await testInfo.attach('axe-extended-review', {
      path: evidence,
      contentType: 'application/json',
    });
    expect(axe.violations).toEqual([]);
    await page
      .locator('t-command-palette')
      .evaluate((element: import('../src/components/command-palette').TCommandPalette) =>
        element.show(),
      );
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.getByRole('combobox', { name: 'Search commands' }).fill('mission');
    await expect(page.getByRole('option')).toHaveCount(1);
    const modalAxe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const modalEvidence = testInfo.outputPath('axe-command-palette-review.json');
    await writeFile(
      modalEvidence,
      JSON.stringify(
        { mode, violations: modalAxe.violations, incomplete: modalAxe.incomplete },
        null,
        2,
      ),
    );
    await testInfo.attach('axe-command-palette-review', {
      path: modalEvidence,
      contentType: 'application/json',
    });
    if (mode !== 'text-200') {
      const geometry = await page.locator('t-command-palette').evaluate((element) => {
        const root = element.shadowRoot!;
        const description = root.querySelector<HTMLElement>('.description')!;
        const option = description.closest<HTMLElement>('[role=option]')!;
        const results = root.querySelector<HTMLElement>('.results')!;
        const range = document.createRange();
        range.selectNodeContents(description);
        const textRects = [...range.getClientRects()].filter((rect) => rect.width && rect.height);
        return {
          description: description.getBoundingClientRect().toJSON(),
          option: option.getBoundingClientRect().toJSON(),
          results: results.getBoundingClientRect().toJSON(),
          status: root.querySelector('.status')!.getBoundingClientRect().toJSON(),
          textRects: textRects.map((rect) => rect.toJSON()),
          hits: textRects.map((rect) =>
            [rect.left + 1, rect.left + rect.width / 2, rect.right - 1].map((x) => {
              const hit = root.elementFromPoint(x, rect.top + rect.height / 2);
              return {
                x,
                y: rect.top + rect.height / 2,
                tag: hit?.localName,
                className: hit?.getAttribute('class'),
                descriptionHit: hit === description || description.contains(hit),
              };
            }),
          ),
          colors: {
            foreground: getComputedStyle(description).color,
            background: getComputedStyle(option).backgroundColor,
          },
          scroll: {
            top: results.scrollTop,
            height: results.scrollHeight,
            clientHeight: results.clientHeight,
          },
        };
      });
      const geometryPath = testInfo.outputPath('command-description-geometry.json');
      await writeFile(geometryPath, JSON.stringify(geometry, null, 2));
      await testInfo.attach('command-description-geometry', {
        path: geometryPath,
        contentType: 'application/json',
      });
      const screenshotPath = testInfo.outputPath('command-description.png');
      await page.screenshot({ path: screenshotPath });
      await testInfo.attach('command-description', {
        path: screenshotPath,
        contentType: 'image/png',
      });
      // Axe cannot resolve this active option's background at narrow widths.
      // Check the rendered text itself for clipping or an obscuring element.
      expect(geometry.textRects.length).toBeGreaterThan(0);
      for (const rect of geometry.textRects) {
        for (const container of [geometry.description, geometry.option, geometry.results]) {
          expect(rect.left).toBeGreaterThanOrEqual(container.left - 1);
          expect(rect.right).toBeLessThanOrEqual(container.right + 1);
          expect(rect.top).toBeGreaterThanOrEqual(container.top - 1);
          expect(rect.bottom).toBeLessThanOrEqual(container.bottom + 1);
        }
        expect(rect.bottom).toBeLessThanOrEqual(geometry.status.top);
      }
      expect(geometry.hits.flat().every((hit) => hit.descriptionHit)).toBe(true);
    }
    expect(modalAxe.violations).toEqual([]);
    await page.keyboard.press('Escape');
  });
