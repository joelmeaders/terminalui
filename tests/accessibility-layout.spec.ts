import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { launchBrowserZoom } from './helpers/browser-zoom';

const tags = readdirSync(new URL('../src/components/', import.meta.url))
  .filter((file) => file.endsWith('.ts'))
  .map((file) => file.slice(0, -3));

async function catalog(page: Page) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.evaluate(() => {
    document.body.style.padding = '16px';
    document.body.style.margin = '0';
    document.querySelector('#fixture')!.innerHTML = `
      <h1>Component accessibility examples</h1>
      <section><h2>Actions and forms</h2><t-stack>
        <t-button>Save workspace changes</t-button><t-input label="Workspace name" value="Mission archive" help="Choose a recognizable name."></t-input>
        <t-select label="Destination"></t-select><t-checkbox label="Include archived records" checked></t-checkbox>
        <t-multi-select label="Teams" help="Choose relevant teams."></t-multi-select>
        <t-textarea label="Request details" value="Request a copy of the mission records."></t-textarea>
        <t-radio-group label="Priority" value="normal"></t-radio-group><t-range label="Signal strength" value="65"></t-range>
        <t-switch label="Notify the team" checked></t-switch><t-combobox label="Department" value="archive"></t-combobox>
        <t-file-input label="Attachments" help="Files remain in this browser."></t-file-input>
        <t-password-input label="Access code" autocomplete="new-password"></t-password-input>
        <t-number-input label="Crew size" value="4" min="1" max="12"></t-number-input>
        <t-segmented-control label="Connection mode"></t-segmented-control>
        <t-rating label="Mission rating" value="4" max="5" clearable></t-rating>
        <t-tags-input label="Mission tags"></t-tags-input>
        <t-color-picker label="Marker color" value="#f5ba5b"></t-color-picker>
        <t-date-picker label="Launch date" value="2026-09-25"></t-date-picker>
        <t-date-range-picker label="Mission window" value="2026-09-25/2026-10-01"></t-date-range-picker>
        <t-time-picker label="Launch time" value="09:30"></t-time-picker>
      </t-stack></section>
      <section><h2>Content and feedback</h2><t-card><span slot="heading">Mission summary</span><p>Review the latest records before you continue.</p><span slot="footer">Updated today</span></t-card>
        <t-badge>Review required</t-badge><t-alert dismissible>Review the selected destination before continuing.</t-alert>
        <t-chip label="Engineering" selectable></t-chip><t-copy-button label="Copy status command" value="mission --status"></t-copy-button>
        <t-progress label="Upload progress" value="42"></t-progress><t-accordion label="Additional information" open><p>All controls must remain usable with larger text and adjusted spacing.</p></t-accordion>
        <t-avatar name="Ellen Ripley"></t-avatar><t-icon name="folder" label="Folder"></t-icon><t-icon-button name="settings" label="Workspace settings"></t-icon-button>
        <t-spinner label="Loading records"></t-spinner><t-skeleton></t-skeleton><t-divider></t-divider><t-empty-state heading="No pending tasks">Everything is up to date.</t-empty-state>
        <t-toast open message="Workspace settings are saved."></t-toast>
        <t-steps label="Mission setup"></t-steps><t-timeline label="Mission history"></t-timeline>
        <t-meter label="Storage used" value="42" max="100" value-text="42 GB of 100 GB"></t-meter>
        <t-description-list></t-description-list><t-link href="#records">Open mission records</t-link>
      </section>
      <section><h2>Navigation and data</h2><t-breadcrumb></t-breadcrumb><t-menu label="Record actions"></t-menu>
        <t-tabs label="Record sections"><p slot="overview">Overview content remains readable.</p><p slot="activity">Activity content remains readable.</p></t-tabs>
        <t-pagination total="125" page="6"></t-pagination><t-table caption="Mission records" selectable></t-table><t-tree label="Project files"></t-tree>
        <t-calendar label="Mission date" value="2026-09-25" month="2026-09"></t-calendar>
        <t-grid columns="2"><p>First responsive cell.</p><p>Second responsive cell.</p></t-grid>
        <t-toolbar label="Archive actions"><button type="button">Refresh</button><button type="button">Export</button></t-toolbar>
        <t-dock label="Record tools"><button type="button" data-dock-id="dock-refresh" data-dock-label="Refresh" style="color:var(--t-text);background:var(--t-surface);border:1px solid var(--t-control-border);font:inherit;min-height:32px;padding:4px 8px">Refresh records</button><hr data-dock-id="dock-separator" data-dock-label="Tools separator"><t-input data-dock-id="dock-query" data-dock-label="Search" label="Dock search" value="missions"></t-input></t-dock>
        <t-split-pane label="Archive divider" primary-label="Record list" secondary-label="Record details"><p slot="primary">Atmospheric survey</p><p slot="secondary">Survey details and metadata.</p></t-split-pane>
      </section>
      <section><h2>Overlays</h2><t-tooltip label="More help" message="Review the information before you continue."></t-tooltip><t-popover label="Quick settings" heading="Quick settings"><t-checkbox label="Show metadata"></t-checkbox></t-popover>
        <t-dialog heading="Review workspace settings"><p>Review all settings before saving.</p><t-input label="Dialog workspace name" value="Mission archive"></t-input><t-button slot="footer">Save dialog settings</t-button></t-dialog>
        <t-drawer heading="Workspace configuration details"><p>Review all settings before saving.</p><t-input label="Drawer workspace name" value="Mission archive"></t-input><t-button slot="footer">Save drawer settings</t-button></t-drawer>
        <t-command-palette heading="Workspace commands"></t-command-palette>
      </section>`;
    const options = [
      { value: 'archive', label: 'Archive' },
      { value: 'engineering', label: 'Engineering' },
      { value: 'observatory', label: 'Observatory' },
    ];
    document.querySelector('t-select')!.options = options;
    document.querySelector('t-combobox')!.options = options;
    document.querySelector('t-multi-select')!.options = options;
    document.querySelector('t-multi-select')!.values = ['archive'];
    document.querySelector('t-radio-group')!.options = [
      { value: 'normal', label: 'Normal priority' },
      { value: 'urgent', label: 'Urgent priority' },
    ];
    document.querySelector('t-breadcrumb')!.items = [
      { label: 'Workbench', href: '#workbench' },
      { label: 'Mission records', current: true },
    ];
    document.querySelector('t-menu')!.options = [
      { value: 'export', label: 'Prepare records for export' },
      { value: 'refresh', label: 'Refresh all records' },
    ];
    document.querySelector('t-tabs')!.tabs = [
      { id: 'overview', label: 'Mission overview' },
      { id: 'activity', label: 'Recent activity' },
    ];
    document.querySelector('t-table')!.columns = [
      { key: 'name', label: 'Document', sortable: true },
      { key: 'owner', label: 'Owner', sortable: true },
      { key: 'status', label: 'Status' },
    ];
    document.querySelector('t-table')!.rows = [
      { id: '01', name: 'Atmospheric survey', owner: 'Ellen Ripley', status: 'Complete' },
      { id: '02', name: 'Navigation log', owner: 'Arthur Dallas', status: 'In review' },
    ];
    document.querySelector('t-tree')!.items = [
      {
        id: 'project',
        label: 'Mission archive',
        children: [
          { id: 'reports', label: 'Atmospheric survey reports' },
          { id: 'logs', label: 'Navigation log records' },
        ],
      },
    ];
    document.querySelector('t-tree')!.expandedIds = ['project'];
    document.querySelector('t-segmented-control')!.options = [
      { value: 'quiet', label: 'Quiet' },
      { value: 'balanced', label: 'Balanced' },
    ];
    document.querySelector('t-segmented-control')!.value = 'balanced';
    document.querySelector('t-tags-input')!.values = ['survey', 'navigation'];
    document.querySelector('t-steps')!.items = [
      { id: 'configure', label: 'Configure', status: 'complete' },
      { id: 'review', label: 'Review', status: 'pending' },
    ];
    document.querySelector('t-steps')!.value = 'review';
    document.querySelector('t-timeline')!.items = [
      { id: 'loaded', title: 'Configuration loaded', date: '09:41', status: 'Complete' },
      { id: 'ready', title: 'Awaiting command', status: 'Current' },
    ];
    document.querySelector('t-description-list')!.items = [
      { term: 'Vessel', value: 'Nostromo' },
      { term: 'Status', value: 'Ready' },
    ];
    document.querySelector('t-command-palette')!.commands = [
      { value: 'archive', label: 'Open archive' },
      { value: 'settings', label: 'Workspace settings' },
    ];
  });
  await expect(page.locator('t-tree [role=treeitem]')).toHaveCount(3);
  const present = await page
    .locator('main')
    .evaluate((element) =>
      [
        ...new Set(
          [...element.querySelectorAll('*')]
            .map((node) => node.localName)
            .filter((name) => name.startsWith('t-')),
        ),
      ].sort(),
    );
  expect(present).toEqual(tags.map((tag) => `t-${tag}`).sort());
}

type Adjustment = 'normal' | 'text-200' | 'text-spacing';
async function adjust(page: Page, mode: Adjustment) {
  await page.evaluate((mode) => {
    const roots: (Document | ShadowRoot)[] = [];
    const elements: HTMLElement[] = [];
    const visit = (root: Document | ShadowRoot) => {
      roots.push(root);
      for (const element of root.querySelectorAll<HTMLElement>('*')) {
        elements.push(element);
        if (element.shadowRoot) visit(element.shadowRoot);
      }
    };
    visit(document);
    if (mode === 'text-200') {
      // Computed sizes are captured before any changes. This is text enlargement,
      // not browser zoom, and it also reaches each open component shadow root.
      const sizes = elements.map((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      );
      elements.forEach((element, index) => {
        if (Number.isFinite(sizes[index]))
          element.style.setProperty('font-size', `${sizes[index] * 2}px`, 'important');
      });
    }
    if (mode === 'text-spacing')
      for (const root of roots) {
        const style = document.createElement('style');
        style.textContent =
          '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-block-end: 2em !important; }';
        (root instanceof Document ? root.head : root).append(style);
      }
  }, mode);
}

async function layoutProblems(page: Page) {
  return page.evaluate(() => {
    const clipped: string[] = [];
    const walk = (root: Document | ShadowRoot) => {
      for (const element of root.querySelectorAll<HTMLElement>('*')) {
        if (element.shadowRoot) walk(element.shadowRoot);
        if (
          !element.getClientRects().length ||
          element.clientWidth === 0 ||
          element.clientHeight === 0
        )
          continue;
        const style = getComputedStyle(element);
        if (element.classList.contains('visually-hidden') || element.closest('[aria-hidden=true]'))
          continue;
        const label = `${root instanceof ShadowRoot ? root.host.localName + ' ' : ''}${element.localName}${element.getAttribute('aria-label') ? `[${element.getAttribute('aria-label')}]` : ''} ${element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 50) ?? ''}`;
        const horizontal = element.scrollWidth > element.clientWidth + 2;
        const vertical = element.scrollHeight > element.clientHeight + 2;
        // Tables and tab lists may scroll locally. Native value fields also scroll.
        if (['input', 'textarea', 'select', 'svg', 'style', 'script'].includes(element.localName))
          continue;
        if (horizontal && ['hidden', 'clip'].includes(style.overflowX))
          clipped.push(
            `${label}: horizontal clipping ${element.scrollWidth}/${element.clientWidth}`,
          );
        if (vertical && ['hidden', 'clip'].includes(style.overflowY))
          clipped.push(
            `${label}: vertical clipping ${element.scrollHeight}/${element.clientHeight}`,
          );
        if (element.localName === 'button' && (horizontal || vertical))
          clipped.push(`${label}: button content exceeds its box`);
      }
    };
    walk(document);
    return {
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clipped,
    };
  });
}

for (const scenario of [
  {
    name: '320 CSS pixel reflow (1280px at 400% zoom equivalent width; no actual browser zoom)',
    width: 320,
    mode: 'normal',
  },
  {
    name: '200% text enlargement simulation at 1280 CSS pixels (not browser zoom)',
    width: 1280,
    mode: 'text-200',
  },
  { name: 'WCAG text spacing overrides at 320 CSS pixels', width: 320, mode: 'text-spacing' },
] as const) {
  test(`all ${tags.length} components preserve content under ${scenario.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: scenario.width, height: 900 });
    await catalog(page);
    await adjust(page, scenario.mode);
    const problems = await layoutProblems(page);
    expect.soft(problems.clipped).toEqual([]);
    expect.soft(problems.scrollWidth).toBeLessThanOrEqual(problems.width + 2);
    await page
      .getByRole('textbox', { name: 'Workspace name', exact: true })
      .fill('Accessible workspace');
    await page.getByRole('checkbox', { name: 'Include archived records' }).uncheck();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.locator('t-pagination [role=status]')).toHaveText('Page 7 of 13');
    await page.getByRole('button', { name: 'Record actions' }).click();
    const menu = page.getByRole('menu', { name: 'Record actions' });
    await expect(menu).toBeVisible();
    const bounds = (await menu.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(scenario.width);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Quick settings', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Quick settings' })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Show metadata' }).check();
    await page.keyboard.press('Escape');
    const help = page.getByRole('button', { name: 'More help', exact: true });
    await help.focus();
    await expect(page.getByRole('tooltip')).toBeVisible();
    const tipBounds = (await page.getByRole('tooltip').boundingBox())!;
    expect(tipBounds.x).toBeGreaterThanOrEqual(0);
    expect(tipBounds.x + tipBounds.width).toBeLessThanOrEqual(scenario.width);
    const axe = await new AxeBuilder({ page })
      .include('#fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const evidencePath = testInfo.outputPath('axe-layout-review-needed.json');
    await writeFile(
      evidencePath,
      JSON.stringify(
        {
          scenario: scenario.name,
          browser: testInfo.project.name,
          violations: axe.violations.length,
          incomplete: axe.incomplete.map((result) => ({
            id: result.id,
            description: result.description,
            nodes: result.nodes.map((node) => ({
              target: node.target,
              summary: node.failureSummary,
            })),
          })),
        },
        null,
        2,
      ),
    );
    await testInfo.attach('axe-layout-review-needed', {
      path: evidencePath,
      contentType: 'application/json',
    });
    expect(axe.violations).toEqual([]);
    await page.keyboard.press('Escape');
  });
}

test('all catalog components reflow under actual 400% Chromium browser zoom', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'The zoom extension uses Chromium tabs API');
  const zoomBrowser = await launchBrowserZoom(testInfo, 'http://127.0.0.1:5173', {
    width: 1280,
    height: 900,
  });
  const { context, page } = zoomBrowser;
  try {
    await catalog(page);
    const zoom = await zoomBrowser.setZoom(4);
    expect(zoom).toBeCloseTo(4, 3);
    await expect
      .poll(() =>
        page.evaluate(() => ({ width: innerWidth, dpr: Number(devicePixelRatio.toFixed(2)) })),
      )
      .toEqual({ width: 320, dpr: 4 });
    const problems = await layoutProblems(page);
    expect.soft(problems.clipped).toEqual([]);
    expect.soft(problems.scrollWidth).toBeLessThanOrEqual(322);
    const axe = await new AxeBuilder({ page })
      .include('#fixture')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const viewport = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      dpr: devicePixelRatio,
    }));
    const evidencePath = testInfo.outputPath('axe-browser-zoom-review-needed.json');
    await writeFile(
      evidencePath,
      JSON.stringify(
        {
          browser: context.browser()?.version(),
          zoom,
          viewport,
          violations: axe.violations.length,
          incomplete: axe.incomplete.map((result) => ({
            id: result.id,
            nodes: result.nodes.map((node) => ({
              target: node.target,
              summary: node.failureSummary,
            })),
          })),
        },
        null,
        2,
      ),
    );
    await testInfo.attach('axe-browser-zoom-review-needed', {
      path: evidencePath,
      contentType: 'application/json',
    });
    expect(axe.violations).toEqual([]);
    await page
      .getByRole('textbox', { name: 'Workspace name', exact: true })
      .fill('Zoomed workspace');
    await page
      .getByRole('textbox', { name: 'Workspace name', exact: true })
      .evaluate((element) => element.scrollIntoView({ block: 'center' }));
    const screenshotPath = testInfo.outputPath('catalog-400-percent-browser-zoom.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('catalog-400-percent-browser-zoom', {
      path: screenshotPath,
      contentType: 'image/png',
    });
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.locator('t-pagination [role=status]')).toHaveText('Page 7 of 13');
    await page.getByRole('button', { name: 'Record actions' }).click();
    const menu = page.getByRole('menu', { name: 'Record actions' });
    await expect(menu).toBeVisible();
    const box = (await menu.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    await page.keyboard.press('Escape');
    const dialogHost = page.locator('t-dialog[heading="Review workspace settings"]');
    await dialogHost.evaluate((element: import('../src').TDialog) => element.show());
    const dialog = dialogHost.locator('dialog');
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Close dialog' });
    await close.focus();
    const closeBox = (await close.boundingBox())!;
    expect(closeBox.x).toBeGreaterThanOrEqual(0);
    expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(320);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  } finally {
    await context.close();
  }
});

test('catalog interactive targets meet 24px size or the spacing exception', async ({ page }) => {
  await catalog(page);
  const failures = await page.evaluate(() => {
    const targets: { label: string; x: number; y: number; width: number; height: number }[] = [];
    const walk = (root: Document | ShadowRoot) => {
      for (const element of root.querySelectorAll<HTMLElement>('*')) {
        if (element.shadowRoot) walk(element.shadowRoot);
        if (
          !element.matches(
            'button,input:not([type=hidden]),select,textarea,summary,[role=treeitem],a[href]',
          ) ||
          element.matches(':disabled,[aria-disabled=true]')
        )
          continue;
        if (element.localName === 'a' && element.closest('p')) continue;
        if (!element.getClientRects().length) continue;
        // An associated wrapping label is part of a checkbox/radio hit area.
        const target = element.matches('input[type=checkbox],input[type=radio]')
          ? (element.closest('label') ?? element)
          : element;
        const box = target.getBoundingClientRect();
        if (!box.width || !box.height) continue;
        targets.push({
          label: `${root instanceof ShadowRoot ? root.host.localName : ''} ${element.getAttribute('aria-label') ?? element.getAttribute('type') ?? element.localName}`,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        });
      }
    };
    walk(document);
    return targets
      .filter((target) => target.width < 24 || target.height < 24)
      .filter((target) =>
        targets.some((other) => {
          if (other === target) return false;
          const cx = target.x + target.width / 2,
            cy = target.y + target.height / 2;
          // The 24px diameter circle must not overlap another target or the circle
          // of another undersized target. This implements the spacing exception.
          if (other.width < 24 || other.height < 24)
            return Math.hypot(cx - other.x - other.width / 2, cy - other.y - other.height / 2) < 24;
          return (
            Math.hypot(
              cx - Math.max(other.x, Math.min(cx, other.x + other.width)),
              cy - Math.max(other.y, Math.min(cy, other.y + other.height)),
            ) < 12
          );
        }),
      );
  });
  expect(failures).toEqual([]);
});

for (const scenario of [
  { name: '320 CSS pixel reflow', width: 320, mode: 'normal' },
  { name: '200% computed text enlargement simulation', width: 1280, mode: 'text-200' },
  { name: 'WCAG text spacing at 320 CSS pixels', width: 320, mode: 'text-spacing' },
] as const)
  test(`demo retains content under ${scenario.name}`, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width, height: 900 });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Application components', exact: true }),
    ).toBeVisible();
    await adjust(page, scenario.mode);
    const problems = await layoutProblems(page);
    expect(problems.clipped).toEqual([]);
    expect(problems.scrollWidth).toBeLessThanOrEqual(problems.width + 2);
  });

test('modal close and footer actions stay visible and unobscured with enlarged text at narrow width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await catalog(page);
  await adjust(page, 'text-200');
  for (const tag of ['t-dialog', 't-drawer'] as const) {
    const host = page.locator(
      tag === 't-dialog'
        ? 't-dialog[heading="Review workspace settings"]'
        : 't-drawer[heading="Workspace configuration details"]',
    );
    await host.evaluate((element: import('../src').TDialog | import('../src').TDrawer) =>
      element.show(),
    );
    const modal = host.locator('dialog');
    for (const button of [
      modal.getByRole('button', { name: `Close ${tag === 't-dialog' ? 'dialog' : 'drawer'}` }),
      host.locator('t-button').getByRole('button'),
    ]) {
      await button.focus();
      await expect(button).toBeFocused();
      await expect
        .poll(() =>
          button.evaluate((element) => {
            const box = element.getBoundingClientRect();
            return {
              visible:
                box.x >= 0 && box.y >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
              box: { x: box.x, y: box.y, right: box.right, bottom: box.bottom },
            };
          }),
        )
        .toMatchObject({ visible: true });
      // Preserve the focused bounds check before pointer checks can scroll.
      // Native actionability handles hit-test retargeting across slots.
      await button.click({ trial: true });
      await expect(button).toBeFocused();
    }
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  }
});
