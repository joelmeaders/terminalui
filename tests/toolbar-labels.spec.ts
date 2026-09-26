import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

const labels = [
  `Refresh report_${'A'.repeat(44)}.json`,
  `Export report_${'B'.repeat(44)}.json`,
  `Help for report_${'C'.repeat(44)}.json`,
];

async function fixture(
  page: Page,
  direction: 'ltr' | 'rtl',
  preference: string,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
) {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate(
    async (element, { labels, direction, preference, orientation }) => {
      document.body.style.margin = '0';
      document.body.style.padding = '8px';
      document.documentElement.dir = direction;
      document.documentElement.setAttribute('data-density', 'compact');
      element.innerHTML = `<button id="before">Before</button><t-toolbar label="Report actions" orientation="${orientation}"><button type="button" id="refresh">${labels[0]}</button><button type="button" disabled>Unavailable action</button><button type="button" id="export">${labels[1]}</button><a href="#help">${labels[2]}</a></t-toolbar><button id="after">After</button>`;
      element.dataset.clicks = '0';
      element
        .querySelector('#export')!
        .addEventListener(
          'click',
          () => (element.dataset.clicks = String(Number(element.dataset.clicks) + 1)),
        );
      const host = element.querySelector('t-toolbar')!;
      await host.updateComplete;
      if (preference === 'enlarged')
        host.style.setProperty(
          '--t-font-size',
          `${Number.parseFloat(getComputedStyle(host).fontSize) * 2}px`,
        );
      if (preference === 'spaced') {
        const style = document.createElement('style');
        style.textContent =
          '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}';
        document.head.append(style);
      }
    },
    { labels, direction, preference, orientation },
  );
}

function contrast(a: string, b: string) {
  const luminance = (color: string) =>
    color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number)
      .map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

async function expectReflow(page: Page) {
  const layout = await page.locator('t-toolbar').evaluate((host) => {
    const toolbar = host.shadowRoot!.querySelector<HTMLElement>('[role=toolbar]')!;
    return {
      pageWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
      toolbarWidth: toolbar.scrollWidth,
      available: toolbar.clientWidth,
      actions: [...host.querySelectorAll<HTMLElement>('button,a')].map((action) => {
        const box = action.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(action);
        return {
          label: action.textContent,
          width: action.scrollWidth,
          available: action.clientWidth,
          clipped: [...range.getClientRects()].some(
            (rect) => rect.width > 0 && (rect.left < box.left - 1 || rect.right > box.right + 1),
          ),
          lines: [...range.getClientRects()].filter((rect) => rect.width > 0).length,
        };
      }),
    };
  });
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.toolbarWidth).toBeLessThanOrEqual(layout.available + 1);
  for (const action of layout.actions) {
    expect(action.width, action.label!).toBeLessThanOrEqual(action.available + 1);
    expect(action.clipped, action.label!).toBe(false);
    if (action.label !== 'Unavailable action') expect(action.lines).toBeGreaterThan(1);
  }
}

async function expectFocusVisible(action: Locator) {
  const ring = await action.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const extent = Math.max(
      0,
      Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset),
    );
    return {
      top: box.top - extent,
      bottom: box.bottom + extent,
      left: box.left - extent,
      right: box.right + extent,
      width: innerWidth,
      height: innerHeight,
    };
  });
  expect(ring.top, JSON.stringify(ring)).toBeGreaterThanOrEqual(-0.5);
  expect(ring.bottom, JSON.stringify(ring)).toBeLessThanOrEqual(ring.height + 0.5);
  expect(ring.left, JSON.stringify(ring)).toBeGreaterThanOrEqual(-0.5);
  expect(ring.right, JSON.stringify(ring)).toBeLessThanOrEqual(ring.width + 0.5);
}

for (const orientation of ['horizontal', 'vertical'] as const)
  for (const direction of ['ltr', 'rtl'] as const)
    for (const preference of ['normal', 'enlarged', 'spaced'])
      test(`native toolbar labels reflow and remain keyboard reachable: ${orientation}, ${direction}, ${preference}`, async ({
        page,
      }, testInfo) => {
        await fixture(page, direction, preference, orientation);
        await expectReflow(page);
        await page.locator('#before').focus();
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: labels[0], exact: true })).toBeFocused();
        await expect(page.getByRole('button', { name: labels[0], exact: true })).toBeInViewport({
          ratio: 1,
        });
        await page.keyboard.press(
          orientation === 'vertical'
            ? 'ArrowDown'
            : direction === 'ltr'
              ? 'ArrowRight'
              : 'ArrowLeft',
        );
        await expect(page.getByRole('button', { name: labels[1], exact: true })).toBeFocused();
        await expect(page.getByRole('button', { name: labels[1], exact: true })).toBeInViewport({
          ratio: 1,
        });
        await expect(page.locator('#fixture')).toHaveAttribute('data-clicks', '0');
        await page.keyboard.press('Enter');
        await expect(page.locator('#fixture')).toHaveAttribute('data-clicks', '1');
        await page
          .locator('#export')
          .evaluate((element: HTMLButtonElement) => (element.disabled = true));
        await expect(page.getByRole('link', { name: labels[2], exact: true })).toBeFocused();
        await expect(page.getByRole('link', { name: labels[2], exact: true })).toBeInViewport({
          ratio: 1,
        });
        await page
          .locator('#export')
          .evaluate((element: HTMLButtonElement) => (element.disabled = false));
        await page.keyboard.press('End');
        await expect(page.getByRole('link', { name: labels[2], exact: true })).toBeFocused();
        await expect(page.getByRole('link', { name: labels[2], exact: true })).toBeInViewport({
          ratio: 1,
        });
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/#help$/);
        await page.keyboard.press('Tab');
        await expect(page.locator('#after')).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(page.getByRole('link', { name: labels[2], exact: true })).toBeFocused();
        await page.keyboard.press('Home');
        await expect(page.getByRole('button', { name: labels[0], exact: true })).toBeFocused();
        await expectReflow(page);
        await expectFocusVisible(page.getByRole('button', { name: labels[0], exact: true }));
        if (preference === 'enlarged' && orientation === 'horizontal')
          await page.screenshot({
            path: testInfo.outputPath(`toolbar-${direction}-320-enlarged.png`),
          });
      });

test('native toolbar focus indicators use visible contrast across all palettes', async ({
  page,
}, testInfo) => {
  await fixture(page, 'ltr', 'normal');
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, theme) => element.setAttribute('data-theme', theme), theme);
    for (const action of [page.locator('#refresh'), page.locator('t-toolbar a')]) {
      await action.focus();
      const colors = await action.evaluate((element) => {
        const style = getComputedStyle(element);
        const toolbar = element.closest('t-toolbar')!.shadowRoot!.querySelector('[role=toolbar]')!;
        return {
          outline: style.outlineColor,
          width: Number.parseFloat(style.outlineWidth),
          style: style.outlineStyle,
          background: getComputedStyle(toolbar).backgroundColor,
        };
      });
      await writeFile(
        testInfo.outputPath(
          `toolbar-${theme}-${await action.evaluate((element) => element.tagName.toLowerCase())}-focus.json`,
        ),
        JSON.stringify(colors, null, 2),
      );
      expect(colors.width).toBeGreaterThan(0);
      expect(colors.style).not.toBe('none');
      expect(
        contrast(colors.outline, colors.background),
        `${theme}: ${JSON.stringify(colors)}`,
      ).toBeGreaterThanOrEqual(3);
    }
  }
});

test('shadow toolbar actions keep full focus indicators visible after long-label navigation', async ({
  page,
}) => {
  await fixture(page, 'ltr', 'enlarged');
  await page.locator('t-toolbar').evaluate(async (host) => {
    for (const button of host.querySelectorAll('button')) {
      const action = document.createElement('t-button');
      action.id = button.id;
      action.disabled = button.disabled;
      action.textContent = button.textContent;
      button.replaceWith(action);
    }
    const link = host.querySelector('a')!;
    const action = document.createElement('t-link');
    action.href = link.getAttribute('href')!;
    action.textContent = link.textContent;
    link.replaceWith(action);
    await Promise.all(
      [
        ...host.querySelectorAll<
          import('../src/components/button').TButton | import('../src/components/link').TLink
        >('t-button,t-link'),
      ].map((element) => element.updateComplete),
    );
  });
  await page.locator('#before').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: labels[0], exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('link', { name: labels[2], exact: true })).toBeFocused();
  await expectFocusVisible(page.getByRole('link', { name: labels[2], exact: true }));
  await page.keyboard.press('Home');
  await expect(page.getByRole('button', { name: labels[0], exact: true })).toBeFocused();
  await expectFocusVisible(page.getByRole('button', { name: labels[0], exact: true }));
});

test('native toolbar labels retain semantics and axe coverage in all palettes', async ({
  page,
}, testInfo) => {
  await fixture(page, 'ltr', 'normal');
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, theme) => element.setAttribute('data-theme', theme), theme);
    await expectReflow(page);
    const axe = await new AxeBuilder({ page }).include('t-toolbar').analyze();
    await writeFile(
      testInfo.outputPath(`toolbar-labels-${theme}-axe-review.json`),
      JSON.stringify({ violations: axe.violations, incomplete: axe.incomplete }, null, 2),
    );
    expect(axe.violations, `${theme}: ${JSON.stringify(axe.violations)}`).toEqual([]);
  }
});
