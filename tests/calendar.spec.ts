import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mount(page: Page, attributes = 'value="2026-09-24" month="2026-09"') {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((element, attrs) => {
    const locale = attrs.includes('locale=') ? '' : 'locale="en-US"';
    element.innerHTML = `<t-calendar label="Mission date" ${locale} ${attrs}></t-calendar>`;
  }, attributes);
  await page.locator('t-calendar [role=grid]').waitFor({ state: 'attached' });
}

test('the named grid has one day in the tab order and a selected gridcell', async ({ page }) => {
  await mount(page);
  const calendar = page.locator('t-calendar');
  await expect(page.getByRole('group', { name: 'Mission date' })).toBeVisible();
  await expect(page.getByRole('grid', { name: 'September 2026' })).toBeVisible();
  await expect(calendar.locator('tbody tr')).toHaveCount(6);
  await expect(calendar.locator('button[data-date]')).toHaveCount(42);
  await expect(calendar.locator('button[data-date][tabindex="0"]')).toHaveCount(1);
  await expect(calendar.locator('button[data-date="2026-09-24"]')).toHaveAttribute('tabindex', '0');
  await expect(calendar.getByRole('gridcell', { selected: true })).toContainText('24');
  await expect(calendar.locator('thead th')).toHaveCount(7);
  await expect(calendar.locator('thead th').first()).toHaveAttribute('abbr', 'Sunday');
  await expect(calendar.locator('button[data-date="2026-09-24"]')).toHaveAttribute(
    'aria-label',
    'Thursday, September 24, 2026',
  );
});

test('arrows, Home/End, and Page keys move focus without changing the selected date', async ({
  page,
}) => {
  await mount(page, 'value="2024-03-01" month="2024-03"');
  const calendar = page.locator('t-calendar');
  await calendar.evaluate((element: any) => {
    element.monthEvents = [];
    element.addEventListener('t-month-change', (event: CustomEvent) =>
      element.monthEvents.push(event.detail.month),
    );
  });
  await calendar.locator('[data-date="2024-03-01"]').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(calendar.locator('[data-date="2024-02-29"]')).toBeFocused();
  await expect(calendar.locator('#month-heading')).toHaveText('February 2024');
  expect(await calendar.evaluate((element: any) => element.monthEvents)).toEqual(['2024-02']);
  await page.keyboard.press('Home');
  await expect(calendar.locator('[data-date="2024-02-25"]')).toBeFocused();
  await page.keyboard.press('End');
  await expect(calendar.locator('[data-date="2024-03-02"]')).toBeFocused();
  await page.keyboard.press('PageUp');
  await expect(calendar.locator('[data-date="2024-02-02"]')).toBeFocused();
  await page.keyboard.press('Shift+PageDown');
  await expect(calendar.locator('[data-date="2025-02-02"]')).toBeFocused();
  await expect(calendar).toHaveJSProperty('value', '2024-03-01');
  await expect(calendar.locator('button[data-date][tabindex="0"]')).toHaveCount(1);
  expect(await calendar.evaluate((element: any) => element.monthEvents)).toEqual([
    '2024-02',
    '2024-03',
    '2024-02',
    '2025-02',
  ]);
});

test('bounds block unavailable days and clamp keyboard focus', async ({ page }) => {
  await mount(page, 'value="2026-09-24" min="2026-09-20" max="2026-10-10"');
  const calendar = page.locator('t-calendar');
  await expect(page.getByRole('button', { name: 'Previous month' })).toBeDisabled();
  await expect(calendar.locator('[data-date="2026-09-19"]')).toBeDisabled();
  await calendar.locator('[data-date="2026-09-20"]').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(calendar.locator('[data-date="2026-09-20"]')).toBeFocused();
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(calendar.locator('#month-heading')).toHaveText('October 2026');
  await expect(calendar.locator('[data-date="2026-10-11"]')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next month' })).toBeDisabled();
  await expect(calendar.locator('button[data-date][tabindex="0"]')).toHaveCount(1);
  await calendar.evaluate((element: any) => {
    element.month = '2025-01';
  });
  await expect(calendar.locator('#month-heading')).toHaveText('September 2026');
});

test('user selection emits one input, change, and t-change; programmatic changes do not', async ({
  page,
}) => {
  await mount(page);
  const calendar = page.locator('t-calendar');
  await calendar.evaluate((element: any) => {
    element.events = [];
    for (const name of ['input', 'change', 't-change', 't-month-change'])
      element.addEventListener(name, (event: Event) =>
        element.events.push({ name, detail: (event as CustomEvent).detail }),
      );
  });
  await calendar.locator('[data-date="2026-09-25"]').click();
  await expect(calendar).toHaveJSProperty('value', '2026-09-25');
  await expect(calendar.getByRole('gridcell', { selected: true })).toContainText('25');
  expect(await calendar.evaluate((element: any) => element.events)).toEqual([
    { name: 'input', detail: undefined },
    { name: 'change', detail: undefined },
    { name: 't-change', detail: { value: '2026-09-25' } },
  ]);
  await calendar.locator('[data-date="2026-09-25"]').click();
  expect(await calendar.evaluate((element: any) => element.events)).toHaveLength(3);
  await calendar.evaluate((element: any) => {
    element.value = '2026-10-12';
  });
  await expect(calendar.locator('#month-heading')).toHaveText('October 2026');
  await expect(calendar).toHaveJSProperty('value', '2026-10-12');
  expect(await calendar.evaluate((element: any) => element.events)).toHaveLength(3);
});

test('an empty selection and an invalid date range keep the grid understandable', async ({
  page,
}) => {
  await mount(page, 'month="2026-09" min="2026-10-12" max="2026-09-01"');
  const calendar = page.locator('t-calendar');
  await expect(calendar.getByRole('status')).toHaveText('No dates are available in this range.');
  await expect(calendar.locator('button[data-date]:not([disabled])')).toHaveCount(0);
  await expect(calendar.getByRole('gridcell', { selected: true })).toHaveCount(0);
  await calendar.evaluate((element: any) => {
    element.min = '';
    element.max = '';
  });
  await expect(calendar.getByRole('status')).toHaveCount(0);
  await expect(calendar.locator('button[data-date][tabindex="0"]')).toHaveCount(1);
  await calendar.evaluate((element: any) => {
    element.value = '2026-02-30';
  });
  await expect(calendar.getByRole('status')).toHaveText(
    'The selected date is invalid. Use YYYY-MM-DD.',
  );
  await calendar.evaluate((element: any) => {
    element.value = '2026-09-24';
    element.min = '2026-10-12';
  });
  await expect(calendar.getByRole('status')).toHaveText(
    'The selected date 2026-09-24 is outside the available range.',
  );
  await expect(calendar.locator('#month-heading')).toHaveText('October 2026');
  await calendar.locator('[data-date="2026-10-15"]').click();
  await expect(calendar.getByRole('status')).toHaveCount(0);
  await expect(calendar).toHaveJSProperty('value', '2026-10-15');
});

test('weekday order, locale, RTL, and disabled state stay understandable', async ({ page }) => {
  await mount(page, 'value="2026-09-24" first-day-of-week="1" locale="fr-FR"');
  const calendar = page.locator('t-calendar');
  await expect(calendar.locator('thead th').first()).toHaveAttribute('abbr', 'lundi');
  await expect(calendar.locator('#month-heading')).toHaveText('septembre 2026');
  await calendar.evaluate((element) => {
    element.setAttribute('dir', 'rtl');
  });
  await calendar.locator('[data-date="2026-09-24"]').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(calendar.locator('[data-date="2026-09-25"]')).toBeFocused();
  await calendar.evaluate((element: any) => {
    element.disabled = true;
  });
  await expect(calendar.locator('button[data-date]:not([disabled])')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next month' })).toBeDisabled();
});

function rgb(value: string) {
  return value
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map(Number);
}
function luminance(values: number[]) {
  return values
    .map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
function ratio(left: string, right: string) {
  const values = [luminance(rgb(left)), luminance(rgb(right))].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('all six palettes retain names, selected contrast, boundaries, and no axe violations', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page);
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, value) => element.setAttribute('data-theme', value), theme);
    const colors = await page.locator('t-calendar').evaluate((element) => {
      const selected = element.shadowRoot!.querySelector<HTMLButtonElement>(
        '[data-date="2026-09-24"]',
      )!;
      const next = element.shadowRoot!.querySelector<HTMLButtonElement>('[part=next]')!;
      const surface = element.shadowRoot!.querySelector<HTMLElement>('.calendar')!;
      return {
        foreground: getComputedStyle(selected).color,
        selected: getComputedStyle(selected).backgroundColor,
        border: getComputedStyle(next).borderTopColor,
        surface: getComputedStyle(surface).backgroundColor,
      };
    });
    expect(
      ratio(colors.foreground, colors.selected),
      `${theme}: selected date`,
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      ratio(colors.border, colors.surface),
      `${theme}: month button border`,
    ).toBeGreaterThanOrEqual(3);
    const report = await new AxeBuilder({ page }).include('t-calendar').analyze();
    expect(report.violations, `${theme}: ${JSON.stringify(report.violations)}`).toEqual([]);
    if (report.incomplete.length)
      await testInfo.attach(`${theme}-calendar-axe-review`, {
        body: JSON.stringify(report.incomplete, null, 2),
        contentType: 'application/json',
      });
  }
});

test('calendar reflows at 320 CSS pixels with enlarged and spaced text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await mount(page);
  await page.locator('body').evaluate((element) => {
    element.style.padding = '0';
    element.style.margin = '0';
    element.style.setProperty('--t-font-size', '28px');
  });
  await page.locator('t-calendar').evaluate((element) => {
    for (const node of element.shadowRoot!.querySelectorAll<HTMLElement>('*')) {
      node.style.letterSpacing = '0.12em';
      node.style.wordSpacing = '0.16em';
      node.style.lineHeight = '1.5';
    }
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  const grid = page.locator('t-calendar .grid-scroll');
  await expect(grid).toBeVisible();
  await page.locator('t-calendar [data-date="2026-09-24"]').focus();
  await expect(page.locator('t-calendar [data-date="2026-09-24"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('t-calendar [data-date="2026-09-25"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  const saturday = page.locator('t-calendar [data-date="2026-09-26"]');
  await expect(saturday).toBeFocused();
  expect(
    await saturday.evaluate((button) => {
      const cell = button.closest('.grid-scroll')!;
      const buttonRect = button.getBoundingClientRect();
      const scrollRect = cell.getBoundingClientRect();
      return buttonRect.left >= scrollRect.left && buttonRect.right <= scrollRect.right + 1;
    }),
  ).toBe(true);
});

test('forced colors preserve selection and focus', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit does not emulate forced colors.');
  await page.emulateMedia({ forcedColors: 'active' });
  await mount(page);
  const selected = page.locator('t-calendar [data-date="2026-09-24"]');
  await selected.focus();
  await expect(selected).toBeFocused();
  const styles = await selected.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
    outline: getComputedStyle(element).outlineStyle,
  }));
  expect(styles.background).not.toBe(styles.color);
  expect(styles.outline).not.toBe('none');
});
