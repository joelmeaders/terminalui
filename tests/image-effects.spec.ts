import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/image-effects.html');
  await expect(
    page.getByRole('img', { name: 'Dark square and gray circle on a light background' }),
  ).toBeVisible();
  await page.waitForFunction(() => !!(window as any).effects);
});

test('CSS effects switch at runtime and inherit palette tokens', async ({ page }) => {
  const frame = page.locator('#frame');
  await frame.evaluate((element) => {
    element.setAttribute('data-image-scanlines', 'pronounced');
    element.setAttribute('data-image-tint', '');
    element.setAttribute('data-image-scaling', 'pixelated');
  });
  await expect(frame.locator('img')).toHaveCSS('image-rendering', 'pixelated');
  await expect
    .poll(() => frame.evaluate((el) => getComputedStyle(el, '::after').content))
    .not.toBe('none');
  const amber = await frame.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.locator('html').evaluate((el) => el.setAttribute('data-theme', 'ice'));
  await expect
    .poll(() => frame.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(amber);
  await frame.evaluate((el) => {
    el.removeAttribute('data-image-scanlines');
    el.removeAttribute('data-image-tint');
    el.removeAttribute('data-image-scaling');
  });
  await expect(frame.locator('img')).toHaveCSS('image-rendering', 'auto');
  await expect
    .poll(() => frame.evaluate((el) => getComputedStyle(el, '::after').content))
    .toBe('none');
});

test('pixelation is responsive, adjustable, and keeps the source image accessible', async ({
  page,
}) => {
  await page.evaluate(() => {
    (window as any).controller = (window as any).effects.mountPixelation(
      document.querySelector('#source'),
      { pixelSize: 12 },
    );
  });
  const frame = page.locator('#frame');
  await expect(frame).toHaveAttribute('data-image-effect-ready', 'pixelate');
  await expect(frame.locator('canvas')).toHaveAttribute('aria-hidden', 'true');
  await expect(
    page.getByRole('img', { name: 'Dark square and gray circle on a light background' }),
  ).toHaveCount(1);
  await expect(frame.locator('canvas')).toHaveJSProperty('width', 15);
  await page.evaluate(() => (window as any).controller.update({ pixelSize: 6 }));
  await expect(frame.locator('canvas')).toHaveJSProperty('width', 30);
  await frame.evaluate((el) => ((el as HTMLElement).style.width = '120px'));
  await frame.locator('img').evaluate((el) => ((el as HTMLElement).style.width = '120px'));
  await expect(frame.locator('canvas')).toHaveJSProperty('width', 20);
  await page.evaluate(() => (window as any).controller.destroy());
  await expect(frame.locator('canvas')).toHaveCount(0);
  await expect(frame).not.toHaveAttribute('data-image-effect-ready', /.+/);
});

test('ASCII is decorative, updates on demand, and falls back after a read error', async ({
  page,
}) => {
  await page.evaluate(() => {
    (window as any).controller = (window as any).effects.mountAscii(
      document.querySelector('#source'),
    );
  });
  const frame = page.locator('#frame');
  await expect(frame).toHaveAttribute('data-image-effect-ready', 'ascii');
  const output = frame.locator('pre');
  await expect(output).toHaveAttribute('aria-hidden', 'true');
  const first = await output.textContent();
  expect(first).toMatch(/[@#%]/);
  await page.evaluate(() => (window as any).controller.update({ invert: true }));
  await expect.poll(() => output.textContent()).not.toBe(first);
  await expect(
    page.getByRole('img', { name: 'Dark square and gray circle on a light background' }),
  ).toHaveCount(1);
  await page.evaluate(() => (window as any).controller.update({ characters: '' }));
  await expect(frame).not.toHaveAttribute('data-image-effect-ready', /.+/);
  await expect(frame.locator('img')).toHaveCSS('opacity', '1');
  await page.evaluate(() => (window as any).controller.destroy());
  await expect(frame.locator('pre')).toHaveCount(0);
});

test('ASCII reports a cross-origin pixel read failure and shows the original image', async ({
  page,
}) => {
  await page.route('https://images.example.test/portrait.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="120"><rect width="180" height="120" fill="black"/></svg>',
    }),
  );
  await page.evaluate(async () => {
    const image = document.querySelector<HTMLImageElement>('#source')!;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Image did not load.'));
      image.src = 'https://images.example.test/portrait.svg';
    });
    image.addEventListener('t-image-effect-error', ((event: CustomEvent) => {
      (window as any).effectError = { type: event.detail.type, name: event.detail.error.name };
    }) as EventListener);
    (window as any).controller = (window as any).effects.mountAscii(image);
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).effectError))
    .toEqual({
      type: 'ascii',
      name: 'SecurityError',
    });
  await expect(page.locator('#frame')).not.toHaveAttribute('data-image-effect-ready', /.+/);
  await expect(page.locator('#source')).toHaveCSS('opacity', '1');
  await expect(
    page.getByRole('img', { name: 'Dark square and gray circle on a light background' }),
  ).toHaveCount(1);
});

test('increased contrast shows the original image and removes decorative layers', async ({
  page,
}) => {
  await page.emulateMedia({ contrast: 'more' });
  await page.reload();
  await page.waitForFunction(() => !!(window as any).effects);
  await page.evaluate(() => {
    document.querySelector('#frame')!.setAttribute('data-image-scanlines', 'pronounced');
    (window as any).controller = (window as any).effects.mountPixelation(
      document.querySelector('#source'),
    );
  });
  await expect(page.locator('#frame')).toHaveAttribute('data-image-effect-ready', 'pixelate');
  await expect(page.locator('#source')).toHaveCSS('opacity', '1');
  await expect(page.locator('#frame canvas')).toHaveCSS('display', 'none');
  await expect(page.locator('#frame')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});

test('the image remains available at 320 CSS pixels and has no axe violations', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.evaluate(() => {
    (window as any).controller = (window as any).effects.mountAscii(
      document.querySelector('#source'),
    );
  });
  await expect(page.locator('#frame')).toHaveAttribute('data-image-effect-ready', 'ascii');
  await expect(
    page.getByRole('img', { name: 'Dark square and gray circle on a light background' }),
  ).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
