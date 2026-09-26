import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

const archive = `telemetry_archive_${'A'.repeat(48)}.json`;
const current = `observation_report_${'B'.repeat(48)}.json`;

async function fixture(page: Page, direction: 'ltr' | 'rtl' = 'ltr', preference = 'normal') {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate(
    async (root, { archive, current, direction, preference }) => {
      document.body.style.margin = '0';
      document.body.style.padding = '8px';
      document.documentElement.dir = direction;
      document.documentElement.setAttribute('data-density', 'compact');
      root.innerHTML =
        '<button id="before">Before</button><t-breadcrumb label="Archive location"></t-breadcrumb><button id="after">After</button>';
      const breadcrumb = root.querySelector('t-breadcrumb')!;
      breadcrumb.items = [
        { label: 'Home', href: '#home' },
        { label: archive, href: '#archive' },
        { label: current },
      ];
      await breadcrumb.updateComplete;
      if (preference === 'enlarged')
        breadcrumb.style.setProperty(
          '--t-font-size',
          `${Number.parseFloat(getComputedStyle(breadcrumb).fontSize) * 2}px`,
        );
      if (preference === 'spaced') {
        const style = document.createElement('style');
        style.textContent =
          '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}';
        breadcrumb.shadowRoot!.append(style);
      }
    },
    { archive, current, direction, preference },
  );
}

async function expectReflow(page: Page) {
  const layout = await page.locator('t-breadcrumb').evaluate((host) => {
    const nav = host.shadowRoot!.querySelector('nav')!;
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
      navWidth: nav.scrollWidth,
      available: nav.clientWidth,
      labels: [
        ...host.shadowRoot!.querySelectorAll<HTMLElement>('li > a,li > span:not(.separator)'),
      ].map((element) => {
        const box = element.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(element);
        const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
        return {
          text: element.textContent,
          clipped: rects.some((rect) => rect.left < box.left - 1 || rect.right > box.right + 1),
          lines: rects.length,
        };
      }),
    };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.navWidth).toBeLessThanOrEqual(layout.available + 1);
  expect(layout.labels.map((label) => label.text)).toEqual(['Home', archive, current]);
  for (const label of layout.labels) {
    expect(label.clipped, label.text!).toBe(false);
    if (label.text !== 'Home') expect(label.lines).toBeGreaterThan(1);
  }
}

for (const direction of ['ltr', 'rtl'] as const)
  for (const preference of ['normal', 'enlarged', 'spaced'])
    test(`breadcrumb filenames reflow with complete labels: ${direction}, ${preference}`, async ({
      page,
    }, testInfo) => {
      await fixture(page, direction, preference);
      await expectReflow(page);
      const host = page.locator('t-breadcrumb');
      const link = page.getByRole('link', { name: archive, exact: true });
      await expect(page.getByRole('navigation', { name: 'Archive location' })).toBeVisible();
      await expect(host.locator('[aria-current=page]')).toHaveText(current);
      await link.focus();
      await expect(link).toBeFocused();
      await expect(link).toBeInViewport({ ratio: 1 });
      const ring = await link.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const extent =
          Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
        return {
          width: Number.parseFloat(style.outlineWidth),
          style: style.outlineStyle,
          left: box.left - extent,
          right: box.right + extent,
          top: box.top - extent,
          bottom: box.bottom + extent,
          viewport: innerWidth,
          height: innerHeight,
        };
      });
      expect(ring.width).toBeGreaterThan(0);
      expect(ring.style).not.toBe('none');
      expect(ring.left).toBeGreaterThanOrEqual(-0.5);
      expect(ring.right).toBeLessThanOrEqual(ring.viewport + 0.5);
      expect(ring.top).toBeGreaterThanOrEqual(-0.5);
      expect(ring.bottom).toBeLessThanOrEqual(ring.height + 0.5);
      if (preference === 'enlarged')
        await page.screenshot({
          path: testInfo.outputPath(`breadcrumb-${direction}-320-enlarged.png`),
        });
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#archive$/);
      await host.evaluate(
        async (breadcrumb: import('../src/components/breadcrumb').TBreadcrumb) => {
          breadcrumb.items = breadcrumb.items.map((item, index) => ({
            ...item,
            current: index === 1,
          }));
          await breadcrumb.updateComplete;
        },
      );
      await expect(host.locator('[aria-current=page]')).toHaveCount(1);
      await expect(link).toHaveAttribute('aria-current', 'page');
      await expect(link).toHaveAttribute('href', '#archive');
      await expect(link).toBeFocused();
      await expectReflow(page);
    });

test('compact breadcrumb links retain a 24 CSS pixel target with short names', async ({ page }) => {
  await fixture(page);
  await page
    .locator('t-breadcrumb')
    .evaluate(async (breadcrumb: import('../src/components/breadcrumb').TBreadcrumb) => {
      breadcrumb.items = [
        { label: 'I', href: '#drive-i' },
        { label: 'R', href: '#drive-r' },
        { label: 'Reports' },
      ];
      await breadcrumb.updateComplete;
    });
  for (const name of ['I', 'R']) {
    const box = await page.getByRole('link', { name, exact: true }).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
  }
});

test('breadcrumb native Tab order survives narrow, enlarged, and spaced layouts', async ({
  page,
  browserName,
  browser,
}, testInfo) => {
  await fixture(page);
  await page.locator('#before').evaluate((button) => {
    const link = document.createElement('a');
    link.id = 'native-tab-probe';
    link.href = '#native';
    link.textContent = 'Native probe';
    button.after(link);
  });
  await page.locator('#before').focus();
  await page.keyboard.press('Tab');
  const supported = await page
    .locator('#native-tab-probe')
    .evaluate((element) => element === document.activeElement);
  await writeFile(
    testInfo.outputPath('breadcrumb-native-tab-probe.json'),
    JSON.stringify(
      {
        browser: browserName,
        version: browser.version(),
        platform: process.platform,
        supported,
        explicitTabindex: await page.locator('#native-tab-probe').getAttribute('tabindex'),
      },
      null,
      2,
    ),
  );
  test.skip(
    browserName === 'webkit' && !supported,
    'WebKit skips an independent native link with Tab in this environment. Keyboard navigation remains unverified.',
  );
  expect(
    supported,
    'The independent native anchor must support Tab before testing component navigation.',
  ).toBe(true);
  for (const direction of ['ltr', 'rtl'] as const)
    for (const preference of ['normal', 'enlarged', 'spaced']) {
      await fixture(page, direction, preference);
      await page.locator('#before').focus();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
      const link = page.getByRole('link', { name: archive, exact: true });
      await expect(link).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#archive$/);
      await page.keyboard.press('Tab');
      await expect(page.locator('#after')).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(link).toBeFocused();
    }
});

test('long breadcrumb paths retain six-palette axe coverage', async ({ page }, testInfo) => {
  await fixture(page);
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, theme) => element.setAttribute('data-theme', theme), theme);
    await expectReflow(page);
    const axe = await new AxeBuilder({ page }).include('t-breadcrumb').analyze();
    await writeFile(
      testInfo.outputPath(`breadcrumb-labels-${theme}-axe-review.json`),
      JSON.stringify({ violations: axe.violations, incomplete: axe.incomplete }, null, 2),
    );
    expect(axe.violations, `${theme}: ${JSON.stringify(axe.violations)}`).toEqual([]);
  }
});
