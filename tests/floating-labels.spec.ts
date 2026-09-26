import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import type { TMenu } from '../src/components/menu';
import type { TCombobox } from '../src/components/combobox';

type Kind = 'menu' | 'combobox';
const labels = Array.from(
  { length: 12 },
  (_, index) => `Archive ${index + 1}: report_${'A'.repeat(54)}.json`,
);
const triggerLabel = `Actions for report_${'B'.repeat(45)}.json`;

async function fixture(
  page: Page,
  kind: Kind,
  direction: 'ltr' | 'rtl' = 'ltr',
  preference = 'normal',
) {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((element, kind) => {
    document.body.style.margin = '0';
    document.body.style.padding = '8px';
    element.innerHTML = `<form><t-${kind} label="Destination" name="destination"></t-${kind}></form><button id="after">After</button>`;
  }, kind);
  await page.locator(`t-${kind}`).evaluate(
    async (host: TMenu | TCombobox, { kind, direction, preference, labels, triggerLabel }) => {
      document.documentElement.dir = direction;
      host.setAttribute('data-density', 'compact');
      host.options = labels.map((label, index) => ({
        value: `archive-${index}`,
        label,
        disabled: index === 1,
      }));
      if (kind === 'menu') host.label = triggerLabel;
      host.dataset.selections = '0';
      host.addEventListener(kind === 'menu' ? 't-select' : 'change', (event) => {
        host.dataset.selections = String(Number(host.dataset.selections) + 1);
        host.dataset.selected =
          kind === 'menu' ? (event as CustomEvent).detail.value : (host as TCombobox).value;
      });
      await host.updateComplete;
      if (preference === 'enlarged') {
        const text = [
          ...host.shadowRoot!.querySelectorAll<HTMLElement>(
            'button,input,[role=option],.label,.help',
          ),
        ];
        const sizes = text.map(
          (element) => Number.parseFloat(getComputedStyle(element).fontSize) * 2,
        );
        text.forEach((element, index) => (element.style.fontSize = `${sizes[index]}px`));
      }
      if (preference === 'spaced') {
        const style = document.createElement('style');
        style.textContent =
          '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-block-end:2em!important}';
        host.shadowRoot!.append(style);
      }
    },
    { kind, direction, preference, labels, triggerLabel },
  );
}

async function open(page: Page, kind: Kind) {
  const control = page
    .locator(`t-${kind}`)
    .getByRole(kind === 'menu' ? 'button' : 'combobox')
    .first();
  await control.focus();
  await page.keyboard.press('ArrowDown');
  await expect(control).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`t-${kind} [part=${kind === 'menu' ? 'menu' : 'listbox'}]`)).toHaveCSS(
    'opacity',
    '1',
  );
}

async function geometry(page: Page, kind: Kind) {
  return page.locator(`t-${kind}`).evaluate((host, kind) => {
    const panel = host.shadowRoot!.querySelector<HTMLElement>(
      kind === 'menu' ? '[part=menu]' : '[part=listbox]',
    )!;
    const box = panel.getBoundingClientRect();
    const rows = [
      ...panel.querySelectorAll<HTMLElement>(kind === 'menu' ? '[role=menuitem]' : '[role=option]'),
    ];
    return {
      pageWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
      viewportHeight: innerHeight,
      panel: {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: panel.scrollWidth,
        available: panel.clientWidth,
      },
      rows: rows.map((row) => {
        const boundary = row.getBoundingClientRect();
        const text = document.createRange();
        text.selectNodeContents(row);
        return {
          label: row.textContent?.trim(),
          width: row.scrollWidth,
          available: row.clientWidth,
          clipped: [...text.getClientRects()].some(
            (rect) =>
              rect.width > 0 && (rect.left < boundary.left - 1 || rect.right > boundary.right + 1),
          ),
        };
      }),
    };
  }, kind);
}

async function expectReflow(page: Page, kind: Kind) {
  const layout = await geometry(page, kind);
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.panel.left).toBeGreaterThanOrEqual(7);
  expect(layout.panel.right).toBeLessThanOrEqual(layout.viewport - 7);
  expect(layout.panel.top).toBeGreaterThanOrEqual(7);
  expect(layout.panel.bottom).toBeLessThanOrEqual(layout.viewportHeight - 7);
  expect(layout.panel.width).toBeLessThanOrEqual(layout.panel.available + 1);
  expect(layout.rows.map((row) => row.label)).toEqual(labels);
  expect(layout.rows.filter((row) => row.clipped || row.width > row.available + 1)).toEqual([]);
}

for (const kind of ['menu', 'combobox'] as const)
  for (const direction of ['ltr', 'rtl'] as const)
    for (const preference of ['normal', 'enlarged', 'spaced'])
      test(`${kind} long choices reflow and remain reachable: ${direction}, ${preference}`, async ({
        page,
      }, testInfo) => {
        await fixture(page, kind, direction, preference);
        const host = page.locator(`t-${kind}`);
        expect(await host.evaluate((element) => element.shadowRoot!.activeElement)).toBeNull();
        await open(page, kind);
        await expectReflow(page, kind);
        await page.keyboard.press('End');
        const last = host.getByRole(kind === 'menu' ? 'menuitem' : 'option', {
          name: labels.at(-1),
          exact: true,
        });
        await expect(last).toBeInViewport({ ratio: 1 });
        if (kind === 'menu') {
          await expect(last).toBeFocused();
          await expect(host.locator('[role=menuitem][tabindex="0"]')).toHaveCount(1);
        } else {
          await expect(host.getByRole('combobox')).toBeFocused();
          await expect(last).toHaveAttribute('data-active');
          await expect(host.getByRole('combobox')).toHaveAttribute(
            'aria-activedescendant',
            (await last.getAttribute('id')) ?? '',
          );
        }
        if (preference === 'enlarged')
          await page.screenshot({
            path: testInfo.outputPath(`${kind}-${direction}-320-enlarged.png`),
          });
        await page.keyboard.press('Home');
        await page.keyboard.press('ArrowDown');
        const choice = host.getByRole(kind === 'menu' ? 'menuitem' : 'option', {
          name: labels[2],
          exact: true,
        });
        if (kind === 'menu') await expect(choice).toBeFocused();
        else await expect(choice).toHaveAttribute('data-active');
        await expect(choice).toBeInViewport({ ratio: 1 });
        await page.keyboard.press('Enter');
        await expect(host).toHaveAttribute('data-selections', '1');
        await expect(host).toHaveAttribute('data-selected', 'archive-2');
        const control = host.getByRole(kind === 'menu' ? 'button' : 'combobox').first();
        await expect(control).toBeFocused();
        await expect(control).toHaveAttribute('aria-expanded', 'false');
        if (kind === 'combobox')
          expect(
            await page
              .locator('form')
              .evaluate((form: HTMLFormElement) => new FormData(form).get('destination')),
          ).toBe('archive-2');
        await open(page, kind);
        await page.keyboard.press('Escape');
        await expect(control).toBeFocused();
        await expect(control).toHaveAttribute('aria-expanded', 'false');
        await expect(host).toHaveAttribute('data-selections', '1');
      });

for (const kind of ['menu', 'combobox'] as const)
  test(`${kind} wrapped choices retain semantics in every palette`, async ({ page }, testInfo) => {
    await fixture(page, kind);
    for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
      await page
        .locator('html')
        .evaluate((element, theme) => element.setAttribute('data-theme', theme), theme);
      await open(page, kind);
      await expectReflow(page, kind);
      const report = await new AxeBuilder({ page }).include(`t-${kind}`).analyze();
      const path = testInfo.outputPath(`${kind}-long-${theme}-axe-review.json`);
      await writeFile(
        path,
        JSON.stringify({ violations: report.violations, incomplete: report.incomplete }, null, 2),
      );
      await testInfo.attach(`${kind}-long-${theme}-axe-review`, {
        path,
        contentType: 'application/json',
      });
      expect(report.violations).toEqual([]);
      await page.keyboard.press('Escape');
    }
  });

test('short combobox popup keeps its field, loading notice, and active choice visible', async ({
  page,
}, testInfo) => {
  await fixture(page, 'combobox');
  await page.setViewportSize({ width: 320, height: 240 });
  await page.locator('t-combobox').evaluate((host: TCombobox) => (host.loading = true));
  await open(page, 'combobox');
  const host = page.locator('t-combobox');
  const control = host.getByRole('combobox');
  await expect(control).toBeFocused();
  expect(
    await control.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return (
        element.getRootNode() instanceof ShadowRoot &&
        (element.getRootNode() as ShadowRoot).elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        ) === element
      );
    }),
  ).toBe(true);
  await expectReflow(page, 'combobox');
  await writeFile(
    testInfo.outputPath('combobox-short-geometry.json'),
    JSON.stringify(
      await host.evaluate((element) => {
        return [
          ...element.shadowRoot!.querySelectorAll<HTMLElement>('.list,.scroll,.status,input'),
        ].map((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return {
            className: node.className,
            tag: node.localName,
            rect: node.getBoundingClientRect().toJSON(),
            scrollHeight: node.scrollHeight,
            clientHeight: node.clientHeight,
            scrollTop: node.scrollTop,
            textRects: [...range.getClientRects()].map((rect) => rect.toJSON()),
          };
        });
      }),
      null,
      2,
    ),
  );
  await page.screenshot({ path: testInfo.outputPath('combobox-short-before-end.png') });
  await expect(host.getByRole('status')).toBeVisible();
  const notice = await host.getByRole('status').evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const root = element.getRootNode() as ShadowRoot;
    const panel = root.querySelector('[part=listbox]')!.getBoundingClientRect();
    return {
      panel: panel.toJSON(),
      text: [...range.getClientRects()].map((rect) => ({
        ...rect.toJSON(),
        visible: [rect.left + 1, rect.left + rect.width / 2, rect.right - 1].every((x) => {
          const hit = root.elementFromPoint(x, rect.top + rect.height / 2);
          return hit === element || element.contains(hit);
        }),
      })),
    };
  });
  expect(notice.text.length).toBeGreaterThan(0);
  for (const rect of notice.text) {
    expect(rect.left).toBeGreaterThanOrEqual(notice.panel.left);
    expect(rect.right).toBeLessThanOrEqual(notice.panel.right);
    expect(rect.top).toBeGreaterThanOrEqual(notice.panel.top);
    expect(rect.bottom).toBeLessThanOrEqual(notice.panel.bottom);
    expect(rect.visible).toBe(true);
  }
  await page.keyboard.press('End');
  await expect(host.getByRole('option', { name: labels.at(-1), exact: true })).toBeInViewport({
    ratio: 1,
  });
  await expect(control).toBeFocused();
  const report = await new AxeBuilder({ page }).include('t-combobox').analyze();
  const path = testInfo.outputPath('combobox-short-axe-review.json');
  await writeFile(
    path,
    JSON.stringify({ violations: report.violations, incomplete: report.incomplete }, null, 2),
  );
  await testInfo.attach('combobox-short-axe-review', { path, contentType: 'application/json' });
  expect(report.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('combobox-short-loading.png') });
  await page.keyboard.press('Escape');
  await expect(control).toBeFocused();
});

test('menu with no enabled actions keeps native keyboard scrolling and dismissal', async ({
  page,
}) => {
  await fixture(page, 'menu');
  await page.locator('t-menu').evaluate((host: TMenu) => {
    host.options = host.options.map((option) => ({ ...option, disabled: true }));
  });
  await open(page, 'menu');
  const panel = page.locator('t-menu').getByRole('menu', { name: triggerLabel });
  await expect(panel).toBeFocused();
  await expect(panel).toHaveAttribute('tabindex', '0');
  await expect(panel).toHaveJSProperty('scrollTop', 0);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: triggerLabel, exact: true })).toBeFocused();
  await expect(page.locator('t-menu')).toHaveAttribute('data-selections', '0');
});
