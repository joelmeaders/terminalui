import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import type { TMeter } from '../src/components/meter';

const variants = ['solid', 'segmented-thin', 'segmented-thick'];
const sizes = [
  ['small', 12],
  ['medium', 20],
  ['large', 32],
] as const;
const meter = (attributes = '') =>
  `<t-meter label="Storage used" min="-20" max="80" value="30" value-text="30 GB" ${attributes}></t-meter>`;
async function mount(page: Page, content = meter()) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((el, content) => (el.innerHTML = content), content);
  await page.locator('t-meter meter').first().waitFor({ state: 'attached' });
}

test('all styles and sizes paint the correct proportion and preserve one native measurement', async ({
  page,
}) => {
  await mount(
    page,
    variants
      .flatMap((variant) => sizes.map(([size]) => meter(`variant="${variant}" size="${size}"`)))
      .join(''),
  );
  for (const [index, host] of (await page.locator('t-meter').all()).entries()) {
    const native = host.getByRole('meter', { name: 'Storage used' });
    await expect(native).toHaveCount(1);
    await expect(native).toHaveCSS('height', `${sizes[index % 3][1]}px`);
    await expect(native).toHaveAttribute('aria-valuetext', '30 GB');
    expect(await native.evaluate((el: HTMLMeterElement) => [el.min, el.max, el.value])).toEqual([
      -20, 80, 30,
    ]);
    if (index === 0) {
      await expect(host.locator('[part=fill]')).toHaveCount(0);
    } else {
      await expect(host.locator('.visual')).toHaveAttribute('aria-hidden', 'true');
      const fill = await host.locator('[part=fill]').evaluate((el) => ({
        fraction:
          el.getBoundingClientRect().width / el.parentElement!.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
        gradient: getComputedStyle(el).backgroundImage,
      }));
      expect(fill.fraction).toBeCloseTo(0.5, 3);
      expect(fill.height).toBe(sizes[index % 3][1] - 2);
      if (index < 3) expect(fill.gradient).toBe('none');
      else {
        expect(fill.gradient).toContain(index < 6 ? '2px' : '6px');
        expect(fill.gradient).toContain(index < 6 ? '4px' : '9px');
      }
    }
  }
  await expect(page.locator('t-meter [tabindex], t-meter [aria-live]')).toHaveCount(0);
});

test('live values, empty/full bounds, and unknown presentation options keep safe defaults', async ({
  page,
}) => {
  await mount(page, meter('variant="segmented-thick" size="large" low="0" high="60" optimum="20"'));
  const host = page.locator('t-meter');
  const native = host.getByRole('meter');
  for (const [input, expected, width] of [
    [-50, -20, '0%'],
    [80, 80, '100%'],
    [999, 80, '100%'],
    [12.5, 12.5, '32.5%'],
  ] as const) {
    await host.evaluate((el: TMeter, value) => {
      el.value = value;
    }, input);
    await expect(native).toHaveAttribute('value', String(expected));
    expect(
      await host.locator('[part=fill]').evaluate((el) => (el as HTMLElement).style.width),
    ).toBe(width);
  }
  expect(await native.evaluate((el: HTMLMeterElement) => [el.low, el.high, el.optimum])).toEqual([
    0, 60, 20,
  ]);
  await host.evaluate((el) => {
    el.setAttribute('variant', 'unknown');
    el.setAttribute('size', 'unknown');
  });
  await expect(native).toHaveCSS('height', '12px');
  await expect(host.locator('[part=fill]')).toHaveCount(0);
});

for (const nested of [false, true]) {
  test(`${nested ? 'nested scroll region' : 'page'}: reveal waits for entry and runs once without stretching segments`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    const content = `<div style="height:900px"></div>${meter('animated variant="segmented-thin" style="--t-meter-duration:10s;--t-motion-ease:linear"')}<div style="height:200px"></div>`;
    await mount(
      page,
      nested
        ? `<section id="scroll" style="height:300px;overflow:auto">${content}</section>`
        : content,
    );
    const host = page.locator('t-meter');
    const visual = host.locator('.visual');
    const fill = host.locator('[part=fill]');
    await expect(visual).toHaveAttribute('data-phase', 'pending');
    await expect(fill).toHaveCSS('animation-play-state', 'paused');
    await expect(fill).toHaveCSS('clip-path', 'inset(0px 100% 0px 0px)');
    await expect(host.getByRole('meter')).toHaveAttribute('value', '30');
    await host.scrollIntoViewIfNeeded();
    await expect(visual).toHaveAttribute('data-phase', 'entering');
    const frames = await fill.evaluate((el) => {
      const animation = el.getAnimations()[0];
      animation.pause();
      return [0, 5000, 10000].map((time) => {
        animation.currentTime = time;
        const style = getComputedStyle(el);
        return {
          clip: style.clipPath,
          gradient: style.backgroundImage,
          width: el.getBoundingClientRect().width,
        };
      });
    });
    expect(frames.map((frame) => frame.clip)).toEqual([
      'inset(0px 100% 0px 0px)',
      'inset(0px 50% 0px 0px)',
      'inset(0px 0% 0px 0px)',
    ]);
    expect(new Set(frames.map((frame) => frame.width)).size).toBe(1);
    expect(new Set(frames.map((frame) => frame.gradient)).size).toBe(1);
    await host.evaluate(async (el: TMeter) => {
      el.value = 60;
      await el.updateComplete;
    });
    await expect(host.getByRole('meter')).toHaveAttribute('value', '60');
    await fill.evaluate((el) => el.getAnimations()[0]?.finish());
    await expect(visual).toHaveAttribute('data-phase', 'complete');
    if (nested)
      await page.locator('#scroll').evaluate((el) => {
        el.scrollTop = 0;
      });
    else await page.evaluate(() => window.scrollTo(0, 0));
    await expect(host).not.toBeInViewport();
    await host.scrollIntoViewIfNeeded();
    await expect(visual).toHaveAttribute('data-phase', 'complete');
    await expect(fill).toHaveCSS('animation-name', 'none');
    await expect(fill).toHaveCSS('clip-path', 'none');
  });
}

for (const mode of ['off', 'reduce'] as const) {
  test(`${mode}: full value appears immediately and turning motion back on does not replay`, async ({
    page,
  }) => {
    if (mode === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(
      page,
      `<section id="scope" data-motion="${mode === 'off' ? 'off' : 'auto'}">${meter('animated variant="segmented-thick"')}</section>`,
    );
    const host = page.locator('t-meter');
    await expect(host.locator('.visual')).toHaveAttribute('data-phase', 'complete');
    await expect(host.locator('[part=fill]')).toHaveCSS('animation-name', 'none');
    await expect(host.locator('[part=fill]')).toHaveCSS('clip-path', 'none');
    if (mode === 'reduce') await page.emulateMedia({ reducedMotion: 'no-preference' });
    else
      await page.locator('#scope').evaluate((el) => {
        el.setAttribute('data-motion', 'auto');
      });
    await expect(host.locator('[part=fill]')).toHaveCSS('animation-name', 'none');
    await expect(host.getByRole('meter')).toHaveAttribute('aria-valuetext', '30 GB');
  });
}

test('nested auto allows entry and a runtime reduced-motion change finishes without restarting', async ({
  page,
}) => {
  await mount(
    page,
    `<section data-motion="off"><section data-motion="auto">${meter('animated variant="segmented-thick" style="--t-meter-duration:10s"')}</section></section>`,
  );
  const visual = page.locator('.visual');
  const fill = page.locator('[part=fill]');
  await expect(visual).toHaveAttribute('data-phase', 'entering');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(fill).toHaveCSS('animation-name', 'none');
  await expect(fill).toHaveCSS('clip-path', 'none');
  await expect(visual).toHaveAttribute('data-phase', 'complete');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(fill).toHaveCSS('animation-name', 'none');
});

test('disabling animation stops a pending observer; reconnecting allows a new entrance', async ({
  page,
}) => {
  await mount(
    page,
    `<div style="height:1500px"></div>${meter('animated variant="segmented-thin" style="--t-meter-duration:10s"')}`,
  );
  const host = page.locator('t-meter');
  await expect(host.locator('.visual')).toHaveAttribute('data-phase', 'pending');
  await host.evaluate(async (el: TMeter) => {
    el.animated = false;
    await el.updateComplete;
  });
  await host.scrollIntoViewIfNeeded();
  await expect(host.locator('.visual')).toHaveAttribute('data-phase', 'complete');
  await expect(host.locator('[part=fill]')).toHaveCSS('clip-path', 'none');
  await host.evaluate((el: TMeter) => {
    el.animated = true;
  });
  await expect(host.locator('.visual')).toHaveAttribute('data-phase', 'entering');
  await host.locator('[part=fill]').evaluate((el) => el.getAnimations()[0].finish());
  await expect(host.locator('.visual')).toHaveAttribute('data-phase', 'complete');
  await host.evaluate((el) => {
    const parent = el.parentElement!;
    el.remove();
    parent.append(el);
  });
  await expect(host.locator('.visual')).toHaveAttribute('data-phase', 'entering');
});

test('without IntersectionObserver the measurement is immediately complete', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).IntersectionObserver = undefined;
  });
  await mount(page, meter('animated variant="segmented-thick"'));
  await expect(page.locator('.visual')).toHaveAttribute('data-phase', 'complete');
  await expect(page.locator('[part=fill]')).toHaveCSS('clip-path', 'none');
});

test('zero duration and RTL preserve a visible, correctly aligned measurement', async ({
  page,
}) => {
  await mount(
    page,
    `<section dir="rtl">${meter('animated variant="segmented-thin" style="--t-meter-duration:10s;--t-motion-ease:linear"')}</section>${meter('animated variant="segmented-thick" style="--t-meter-duration:0ms"')}`,
  );
  const host = page.locator('t-meter').first();
  const fill = host.locator('[part=fill]');
  await expect(fill).toHaveCSS('animation-name', 'meter-enter-rtl');
  expect(
    await fill.evaluate((el) => {
      const animation = el.getAnimations()[0];
      animation.pause();
      animation.currentTime = 5000;
      return {
        clip: getComputedStyle(el).clipPath,
        end: el.getBoundingClientRect().right - el.parentElement!.getBoundingClientRect().right,
      };
    }),
  ).toEqual({ clip: 'inset(0px 0px 0px 50%)', end: 0 });
  await expect(page.locator('t-meter').last().locator('.visual')).toHaveAttribute(
    'data-phase',
    'complete',
  );
});

test('all palettes pass axe and preserve readable values at 320px with enlarged, spaced text', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await mount(
    page,
    `<section data-motion="off">${variants.map((variant) => meter(`variant="${variant}" size="large" animated`)).join('')}</section>`,
  );
  await page.locator('t-meter').evaluateAll((elements) =>
    elements.forEach((el) => {
      (el as HTMLElement).style.setProperty('--t-font-size', '28px');
      const style = document.createElement('style');
      style.textContent =
        '* {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}';
      el.shadowRoot!.append(style);
    }),
  );
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page.locator('html').evaluate((el, theme) => {
      el.dataset.theme = theme;
    }, theme);
    const result = await new AxeBuilder({ page }).include('#fixture').analyze();
    expect(result.violations, theme).toEqual([]);
    await writeFile(
      testInfo.outputPath(`meters-${theme}-axe-review.json`),
      JSON.stringify(result.incomplete, null, 2),
    );
    for (const host of await page.locator('t-meter').all()) {
      await expect(host.getByRole('meter', { name: 'Storage used' })).toHaveAttribute(
        'aria-valuetext',
        '30 GB',
      );
      const geometry = await host.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return [...el.shadowRoot!.querySelectorAll('.label span, meter')].every((node) => {
          const child = node.getBoundingClientRect();
          return child.left >= rect.left && child.right <= rect.right + 1 && child.height > 0;
        });
      });
      expect(geometry).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('forced colors use a visible native measurement and no decorative animation', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'WebKit cannot emulate forced colors; real OS checks remain pending.',
  );
  await page.emulateMedia({ forcedColors: 'active' });
  await mount(
    page,
    variants.map((variant) => meter(`variant="${variant}" animated size="large"`)).join(''),
  );
  for (const host of await page.locator('t-meter').all()) {
    await expect(host.getByRole('meter')).toBeVisible();
    await expect(host.getByRole('meter')).toHaveCSS('appearance', 'auto');
    await expect(host.locator('.visual')).not.toBeVisible();
    await expect(host.locator('.fill')).toHaveCSS('animation-name', 'none');
    await expect(host.getByRole('meter')).toHaveAttribute('value', '30');
    const halfFilled = await host.getByRole('meter').screenshot({ animations: 'disabled' });
    await host.evaluate((el: TMeter) => {
      el.value = 80;
    });
    await expect(host.getByRole('meter')).toHaveAttribute('value', '80');
    const full = await host.getByRole('meter').screenshot({ animations: 'disabled' });
    expect(halfFilled.equals(full), 'The native fill must visibly change with its value.').toBe(
      false,
    );
  }
});
