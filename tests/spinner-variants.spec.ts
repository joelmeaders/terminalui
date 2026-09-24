import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import type { SpinnerType, TSpinner } from '../src/components/spinner';

const types: SpinnerType[] = [
  'ring',
  'dots',
  'bars',
  'pulse',
  'orbit',
  'cursor',
  'cursor-box',
  'arrow',
  'pixels',
  'blocks',
];
const markup = (size = 'medium') =>
  types
    .map(
      (type) =>
        `<t-spinner id="${type}" type="${type}" size="${size}" label="Loading ${type}"></t-spinner>`,
    )
    .join('');
async function mount(page: Page, content = markup()) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((element, content) => {
    element.innerHTML = content;
  }, content);
  await expect(page.locator('t-spinner').first().locator('[part=indicator]')).toBeVisible();
}

test('default and invalid types keep the ring; properties update without replacing the status region', async ({
  page,
}) => {
  await mount(page, '<t-spinner></t-spinner>');
  const spinner = page.locator('t-spinner');
  await expect(spinner.locator('.ring')).toHaveCSS('animation-name', 'rotate');
  await expect(spinner.getByRole('status')).toHaveText('Loading');
  await spinner.evaluate(async (el: TSpinner) => {
    (window as any).spinnerStatus = el.shadowRoot!.querySelector('[role=status]');
    el.type = 'arrow';
    el.steps = 6;
    el.size = 'large';
    el.label = 'Scanning drives';
    await el.updateComplete;
  });
  await expect(spinner.locator('.arrow')).toHaveCSS('animation-timing-function', 'steps(6)');
  await expect(spinner.getByRole('status')).toHaveText('Scanning drives');
  await expect(spinner.locator('[part=indicator]')).toHaveCSS('width', '40px');
  expect(
    await spinner.evaluate(
      (el) => el.shadowRoot!.querySelector('[role=status]') === (window as any).spinnerStatus,
    ),
  ).toBe(true);
  await spinner.evaluate((el) => el.setAttribute('type', 'unknown'));
  await expect(spinner.locator('.ring')).toBeVisible();
});

test('all styles draw visible static geometry at every size without overflowing at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await mount(
    page,
    `<section data-motion="off" style="display:flex;flex-wrap:wrap;gap:12px">${markup()}</section>`,
  );
  for (const [size, pixels] of [
    ['small', 16],
    ['medium', 24],
    ['large', 40],
  ] as const) {
    await page
      .locator('t-spinner')
      .evaluateAll(
        (elements, size) => elements.forEach((el) => el.setAttribute('size', size)),
        size,
      );
    for (const type of types) {
      const indicator = page.locator(`#${type} [part=indicator]`);
      await expect(indicator).toHaveCSS('width', `${pixels}px`);
      await expect(indicator).toHaveCSS('height', `${pixels}px`);
      const geometry = await indicator.evaluate((el) => {
        const parent = el.getBoundingClientRect();
        return Array.from(el.querySelectorAll('.item, path'), (item) => {
          const rect = item.getBoundingClientRect();
          const style = getComputedStyle(item);
          return {
            width: rect.width,
            height: rect.height,
            opacity: Number(style.opacity),
            inside:
              rect.left >= parent.left - 0.1 &&
              rect.top >= parent.top - 0.1 &&
              rect.right <= parent.right + 0.1 &&
              rect.bottom <= parent.bottom + 0.1,
          };
        });
      });
      if (type === 'ring') await expect(indicator).toHaveCSS('border-top-width', '2px');
      else expect(geometry.length).toBeGreaterThan(0);
      for (const shape of geometry) {
        expect(shape.width, type).toBeGreaterThan(0);
        expect(shape.height, type).toBeGreaterThan(0);
        expect(shape.opacity, type).toBeGreaterThan(0);
        expect(shape.inside, type).toBe(true);
      }
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('each style animates its geometry while the status label remains stable', async ({ page }) => {
  await mount(page);
  for (const type of types) {
    const frames = await page.locator(`#${type}`).evaluate((el) => {
      const root = el.shadowRoot!;
      const nodes = Array.from(root.querySelectorAll('.indicator,.item'));
      const animations = nodes.flatMap((node) => node.getAnimations());
      const snapshot = () =>
        nodes
          .map((node) => {
            const s = getComputedStyle(node);
            return [s.transform, s.opacity].join('/');
          })
          .join('|');
      const samples = [0, 320, 700, 1050].map((time) => {
        for (const a of animations) {
          a.pause();
          a.currentTime = time;
        }
        return snapshot();
      });
      return {
        count: animations.length,
        samples,
        label: root.querySelector('[role=status]')!.textContent!.trim(),
      };
    });
    expect(frames.count, type).toBeGreaterThan(0);
    expect(new Set(frames.samples).size, type).toBeGreaterThan(1);
    expect(frames.label).toBe(`Loading ${type}`);
    await expect(page.locator(`#${type} [part=indicator]`)).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator(`#${type}`).getByRole('status')).toHaveCount(1);
  }
  await expect(page.getByRole('img')).toHaveCount(0);
  await expect(page.locator('t-spinner [tabindex]')).toHaveCount(0);
});

for (const steps of [6, 8]) {
  test(`arrow holds exactly ${steps} fixed positions without interpolation`, async ({ page }) => {
    await mount(page, `<t-spinner type="arrow" steps="${steps}"></t-spinner>`);
    const angles = await page.locator('.arrow').evaluate((el, steps) => {
      const animation = el.getAnimations()[0];
      animation.pause();
      return Array.from({ length: steps }, (_, i) =>
        [0.1, 0.9].map((offset) => {
          animation.currentTime = ((i + offset) * 1200) / steps;
          const matrix = new DOMMatrix(getComputedStyle(el).transform);
          return ((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI + 360) % 360;
        }),
      );
    }, steps);
    angles.forEach(([start, end], i) => {
      expect(start).toBeCloseTo((i * 360) / steps, 2);
      expect(end).toBeCloseTo(start, 2);
    });
    await page.locator('t-spinner').evaluate((el) => el.setAttribute('steps', '7'));
    await expect(page.locator('.arrow')).toHaveCSS('animation-timing-function', 'steps(8)');
  });
}

test('pixel highlight travels clockwise through eight distinct cells around an empty center', async ({
  page,
}) => {
  await mount(page, '<t-spinner type="pixels"></t-spinner>');
  const cells = await page.locator('.pixels').evaluate((el) => {
    const items = Array.from(el.children);
    const animations = items.map((item) => item.getAnimations()[0]);
    return Array.from({ length: 8 }, (_, frame) => {
      for (const a of animations) {
        a.pause();
        a.currentTime = 1700 + frame * 200;
      }
      return items
        .filter((item) => getComputedStyle(item).opacity === '1')
        .map((item) => {
          const style = getComputedStyle(item);
          return [Number(style.gridRowStart), Number(style.gridColumnStart)];
        });
    });
  });
  expect(cells).toEqual([
    [[1, 1]],
    [[1, 2]],
    [[1, 3]],
    [[2, 3]],
    [[3, 3]],
    [[3, 2]],
    [[3, 1]],
    [[2, 1]],
  ]);
});

test('cursors use a slow blink and remain visible when motion is disabled mid-blink', async ({
  page,
}) => {
  await mount(
    page,
    '<section id="scope"><t-spinner type="cursor"></t-spinner><t-spinner type="cursor-box"></t-spinner></section>',
  );
  for (const item of await page.locator('.item').all()) {
    await expect(item).toHaveCSS('animation-duration', '1.2s');
    await item.evaluate((el) => {
      const a = el.getAnimations()[0];
      a.pause();
      a.currentTime = 700;
    });
    await expect(item).toHaveCSS('opacity', '0');
  }
  await page.locator('#scope').evaluate((el) => el.setAttribute('data-motion', 'off'));
  for (const item of await page.locator('.item').all()) {
    await expect(item).toHaveCSS('animation-name', 'none');
    await expect(item).toHaveCSS('opacity', '1');
  }
});

for (const mode of ['off', 'reduce'] as const) {
  test(`${mode}: every animated descendant stops and can resume when allowed`, async ({ page }) => {
    if (mode === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(
      page,
      `<section id="scope" data-motion="${mode === 'off' ? 'off' : 'auto'}">${markup()}</section>`,
    );
    for (const element of await page.locator('.indicator,.item').all()) {
      await expect(element).toHaveCSS('animation-name', 'none');
      expect(await element.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(
        0,
      );
    }
    if (mode === 'reduce') await page.emulateMedia({ reducedMotion: 'no-preference' });
    else await page.locator('#scope').evaluate((el) => el.setAttribute('data-motion', 'auto'));
    for (const spinner of await page.locator('t-spinner').all()) {
      await expect
        .poll(() =>
          spinner.evaluate((el) =>
            Array.from(el.shadowRoot!.querySelectorAll('*')).some(
              (node) => node.getAnimations().length > 0,
            ),
          ),
        )
        .toBe(true);
    }
  });
}

test('nested auto regions restore child animation but cannot override the device preference', async ({
  page,
}) => {
  await mount(
    page,
    `<section data-motion="off"><section id="stopped">${markup()}</section><section id="nested" data-motion="auto">${markup()}</section></section>`,
  );
  for (const spinner of await page.locator('#nested t-spinner').all())
    expect(
      await spinner.evaluate((el) =>
        Array.from(el.shadowRoot!.querySelectorAll('*')).some(
          (node) => node.getAnimations().length > 0,
        ),
      ),
    ).toBe(true);
  for (const node of await page.locator('#stopped .indicator,#stopped .item').all())
    await expect(node).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const node of await page.locator('#nested .indicator,#nested .item').all())
    await expect(node).toHaveCSS('animation-name', 'none');
});

test('all palettes inherit their accent, allow overrides, and expose no axe violations', async ({
  page,
}, testInfo) => {
  await mount(
    page,
    `<section data-motion="off" style="display:flex;flex-wrap:wrap;gap:12px">${markup()}</section><span id="accent" style="color:var(--t-accent)">Loading examples</span>`,
  );
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page.locator('html').evaluate((el, theme) => (el.dataset.theme = theme), theme);
    const color = await page.locator('#accent').evaluate((el) => getComputedStyle(el).color);
    for (const indicator of await page.locator('.indicator').all())
      await expect(indicator).toHaveCSS('color', color);
    const results = await new AxeBuilder({ page }).include('#fixture').analyze();
    expect(results.violations, theme).toEqual([]);
    await writeFile(
      testInfo.outputPath(`spinners-${theme}-axe-review.json`),
      JSON.stringify(results.incomplete, null, 2),
    );
  }
  await page
    .locator('#fixture')
    .evaluate((el) => el.style.setProperty('--t-spinner-color', 'rgb(100, 200, 150)'));
  for (const indicator of await page.locator('.indicator').all())
    await expect(indicator).toHaveCSS('color', 'rgb(100, 200, 150)');
});

test('forced colors preserve painted shapes and arrow strokes', async ({ page, browserName }) => {
  test.skip(
    browserName === 'webkit',
    'WebKit does not emulate forced colors. Real OS checks remain pending.',
  );
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await mount(page);
  for (const item of await page.locator('.item:not(svg)').all()) {
    const colors = await item.evaluate((el) => ({
      shape: getComputedStyle(el).backgroundColor,
      page: getComputedStyle(document.body).backgroundColor,
    }));
    expect(colors.shape).not.toBe(colors.page);
    expect(colors.shape).not.toBe('rgba(0, 0, 0, 0)');
  }
  const stroke = await page.locator('.arrow path').evaluate((el) => getComputedStyle(el).stroke);
  expect(stroke).not.toBe('none');
  await expect(page.locator('.ring')).not.toHaveCSS('border-top-color', 'transparent');
});
