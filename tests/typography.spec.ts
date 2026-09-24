import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

async function fixture(page: Page) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/typography.html');
  await expect(page.locator('#fixture h1')).toHaveCSS('font-size', '48px');
}

test('native semantics, heading helpers, reading sizes, and consumer overrides are preserved', async ({
  page,
}) => {
  await fixture(page);
  const sizes = ['48px', '36px', '28px', '24px', '20px', '16px'];
  for (let level = 1; level <= 6; level++)
    await expect(page.locator(`#fixture h${level}`).first()).toHaveCSS(
      'font-size',
      sizes[level - 1],
    );
  await expect(page.getByRole('heading', { name: 'A large section heading', level: 2 })).toHaveCSS(
    'font-size',
    '48px',
  );
  await expect(page.locator('.t-text-small')).toHaveCSS('font-size', '14px');
  await expect(page.locator('.t-text-medium')).toHaveCSS('font-size', '16px');
  await expect(page.locator('.t-text-large')).toHaveCSS('font-size', '20px');
  await expect(page.locator('.override')).toHaveCSS('font-size', '23px');
  await expect(page.locator('#fixture ul')).toHaveCSS('list-style-type', 'disc');
  await expect(page.locator('#fixture ol')).toHaveCSS('list-style-type', 'decimal');
  const before = await page.locator('#unstyled').evaluate((el) =>
    ['h2', 'p', 'a'].map((selector) => {
      const style = getComputedStyle(el.querySelector(selector)!);
      return [
        style.fontSize,
        style.fontFamily,
        style.marginBlockStart,
        style.color,
        style.textDecorationLine,
      ];
    }),
  );
  await page.locator('link[href="/src/typography.css"]').evaluate((el: HTMLLinkElement) => {
    el.disabled = true;
  });
  const after = await page.locator('#unstyled').evaluate((el) =>
    ['h2', 'p', 'a'].map((selector) => {
      const style = getComputedStyle(el.querySelector(selector)!);
      return [
        style.fontSize,
        style.fontFamily,
        style.marginBlockStart,
        style.color,
        style.textDecorationLine,
      ];
    }),
  );
  expect(after).toEqual(before);
});

test('anchors and code regions keep keyboard navigation and visible focus', async ({ page }) => {
  await fixture(page);
  await page.setViewportSize({ width: 320, height: 800 });
  const link = page.locator('#first-link');
  await link.focus();
  await expect(link).toHaveCSS('text-decoration-line', 'underline');
  await expect(link).toHaveCSS('outline-style', 'solid');
  await expect(link).toHaveCSS('outline-width', '2px');
  await link.press('Enter');
  await expect(page).toHaveURL(/#notes$/);
  const code = page.getByRole('region', { name: 'Example command' });
  await page.keyboard.press('Tab');
  await expect(code).toBeFocused();
  await expect(code).toBeInViewport();
  await expect(code).toHaveCSS('outline-width', '2px');
  expect(await code.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => code.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await page.keyboard.press('Tab');
  await expect(code).not.toBeFocused();
  const destination = await page.evaluate(
    () => document.activeElement?.id || document.activeElement?.tagName,
  );
  // Preserve the engine's native tab order, including its link-navigation preferences.
  await page.locator('link[href="/src/typography.css"]').evaluate((el: HTMLLinkElement) => {
    el.disabled = true;
  });
  await code.focus();
  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName),
  ).toBe(destination);
});

test('palette changes and nested overrides resolve at the text, including links and highlights', async ({
  page,
}) => {
  await fixture(page);
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page.locator('#fixture').evaluate((el, theme) => {
      el.setAttribute('data-theme', theme);
    }, theme);
    const colors = await page.locator('#fixture').evaluate((el) => {
      const probe = document.createElement('span');
      el.append(probe);
      const token = (name: string) => {
        probe.style.color = `var(--t-${name})`;
        return getComputedStyle(probe).color;
      };
      const result = {
        text: [getComputedStyle(el.querySelector('h1')!).color, token('text')],
        link: [getComputedStyle(el.querySelector('a')!).color, token('accent')],
        muted: [getComputedStyle(el.querySelector('.t-muted')!).color, token('muted')],
        mark: [getComputedStyle(el.querySelector('mark')!).color, token('on-accent')],
        highlight: [getComputedStyle(el.querySelector('mark')!).backgroundColor, token('accent')],
      };
      probe.remove();
      return result;
    });
    for (const [kind, [actual, expected]] of Object.entries(colors))
      expect(actual, `${theme}/${kind}`).toBe(expected);
  }
  await page.locator('#fixture').evaluate((el: HTMLElement) => {
    el.style.setProperty('--t-heading-1', '2rem');
    el.style.setProperty('--t-link-color', 'rgb(12, 34, 56)');
  });
  await expect(page.locator('#fixture h1')).toHaveCSS('font-size', '32px');
  await expect(page.locator('#first-link')).toHaveCSS('color', 'rgb(12, 34, 56)');
});

test('prose reflows at 320 pixels, enlarged root text, and WCAG spacing in all palettes', async ({
  page,
}, testInfo) => {
  await fixture(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addStyleTag({
    content:
      'html{font-size:200%} #fixture *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} #fixture p{margin-bottom:2em!important}',
  });
  await expect(page.locator('#fixture h1')).toHaveCSS('font-size', '96px');
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page.locator('html').evaluate((el, theme) => {
      el.setAttribute('data-theme', theme);
    }, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const result = await new AxeBuilder({ page }).include('#fixture').analyze();
    await writeFile(
      testInfo.outputPath(`typography-${theme}-axe-review.json`),
      JSON.stringify(result.incomplete, null, 2),
    );
    expect(result.violations, theme).toEqual([]);
    for (const element of await page
      .locator('#fixture h1, #fixture a, #fixture mark, #fixture kbd')
      .all()) {
      const box = (await element.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
    }
  }
});

test('logical spacing works in RTL and reading tokens inherit into nested content', async ({
  page,
}) => {
  await fixture(page);
  await page.locator('#fixture').evaluate((el: HTMLElement) => {
    el.dir = 'rtl';
    el.style.setProperty('--t-text-leading', '1.9');
    el.style.setProperty('--t-prose-width', '50ch');
  });
  await expect(page.locator('blockquote')).toHaveCSS('border-right-width', '3px');
  await expect(page.locator('blockquote')).toHaveCSS('border-left-width', '0px');
  await expect(page.locator('#fixture ul')).toHaveCSS('padding-right', '28px');
  await expect(page.locator('.t-text-medium')).toHaveCSS('line-height', '30.4px');
});

test('forced colors keep native link color, code boundaries, highlights, and focus', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit does not emulate forced colors.');
  await page.emulateMedia({ forcedColors: 'active' });
  await fixture(page);
  await page.locator('#first-link').focus();
  await expect(page.locator('#first-link')).toHaveCSS('outline-style', 'solid');
  const colors = await page.locator('#fixture').evaluate((el) => {
    const mark = getComputedStyle(el.querySelector('mark')!);
    const pre = getComputedStyle(el.querySelector('pre')!);
    return {
      markText: mark.color,
      markBackground: mark.backgroundColor,
      border: pre.borderTopColor,
      background: pre.backgroundColor,
    };
  });
  expect(colors.markText).not.toBe(colors.markBackground);
  expect(colors.border).not.toBe(colors.background);
  await expect(page.locator('#first-link')).toHaveCSS('text-decoration-line', 'underline');
});
