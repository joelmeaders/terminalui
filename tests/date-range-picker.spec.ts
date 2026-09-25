import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mount(page: Page, attributes = 'value="2026-09-24/2026-10-01"') {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((element, attrs) => {
    element.innerHTML = `<form><t-date-range-picker name="mission" label="Mission window" ${attrs}></t-date-range-picker><button type="submit">Submit</button></form>`;
  }, attributes);
  await page.locator('t-date-range-picker #start').waitFor();
}

test('typed dates expose a named group, validate order, and submit one interval', async ({
  page,
}) => {
  await mount(page, 'required min="2026-09-20" max="2026-10-10"');
  const picker = page.locator('t-date-range-picker');
  const start = picker.getByRole('textbox', { name: 'Start date' });
  const end = picker.getByRole('textbox', { name: 'End date' });
  await expect(picker.getByRole('group', { name: 'Mission window', exact: true })).toBeVisible();
  await expect(start).toHaveAttribute('aria-describedby', 'format help');
  await expect(end).toHaveAttribute('aria-describedby', 'format help');
  await expect(picker).toHaveJSProperty('validationMessage', 'Choose a date range.');
  await start.fill('2026-09-24');
  await start.blur();
  await expect(end).toHaveAttribute('aria-invalid', 'true');
  await expect(picker.locator('#help')).toHaveText('Enter an end date.');
  await end.fill('2026-02-30');
  await end.blur();
  await expect(picker.locator('#help')).toHaveText('Enter a valid end date as YYYY-MM-DD.');
  await end.fill('2026-09-23');
  await end.blur();
  await expect(picker.locator('#help')).toHaveText('End date must not be before start date.');
  await end.fill('2026-10-01');
  await end.blur();
  await expect(start).toHaveAttribute('aria-invalid', 'false');
  await expect(end).toHaveAttribute('aria-invalid', 'false');
  await expect(picker).toHaveJSProperty('value', '2026-09-24/2026-10-01');
  expect(
    await page
      .locator('form')
      .evaluate((form) => [...new FormData(form as HTMLFormElement).entries()]),
  ).toEqual([['mission', '2026-09-24/2026-10-01']]);
});

test('bounds and exact ISO parsing reject invalid start and end dates', async ({ page }) => {
  await mount(page, 'value="2026-09-24/2026-10-01" min="2026-09-20" max="2026-10-10"');
  const picker = page.locator('t-date-range-picker');
  const start = picker.getByRole('textbox', { name: 'Start date' });
  const end = picker.getByRole('textbox', { name: 'End date' });
  await start.fill('2026-09-19');
  await start.blur();
  await expect(picker.locator('#help')).toHaveText('Choose 2026-09-20 or a later start date.');
  await start.fill('2026-09-24');
  await end.fill('2026-10-11');
  await end.blur();
  await expect(picker.locator('#help')).toHaveText('Choose 2026-10-10 or an earlier end date.');
  await picker.evaluate((element) => {
    (element as HTMLElement & { min: string }).min = '2026-11-01';
  });
  await expect(picker).toHaveJSProperty(
    'validationMessage',
    'No dates are available in this range.',
  );
});

test('calendar keeps a draft until the second day and Escape cancels it', async ({ page }) => {
  await mount(page);
  const picker = page.locator('t-date-range-picker');
  await picker.evaluate((element: any) => {
    element.events = [];
    for (const name of ['input', 'change', 't-change'])
      element.addEventListener(name, (event: Event) =>
        element.events.push({ name, detail: (event as CustomEvent).detail }),
      );
  });
  const trigger = picker.getByRole('button', { name: 'Change date range' });
  await trigger.click();
  await expect(picker.getByRole('dialog', { name: 'Choose Mission window' })).toBeVisible();
  await expect(picker.locator('t-calendar [data-date="2026-10-01"]')).toBeFocused();
  await picker.locator('t-calendar [data-date="2026-10-03"]').click();
  await expect(picker.getByText('Choose an end date.')).toBeVisible();
  await expect(picker.locator('t-calendar [data-date="2026-10-03"]')).toHaveAttribute(
    'aria-label',
    /start of range/,
  );
  await expect(picker).toHaveJSProperty('value', '2026-09-24/2026-10-01');
  expect(await picker.evaluate((element: any) => element.events)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(picker.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(picker).toHaveJSProperty('value', '2026-09-24/2026-10-01');
});

test('calendar completes a range once and marks its endpoints and intervening days', async ({
  page,
}) => {
  await mount(page);
  const picker = page.locator('t-date-range-picker');
  await picker.evaluate((element: any) => {
    element.events = [];
    for (const name of ['input', 'change', 't-change'])
      element.addEventListener(name, (event: Event) =>
        element.events.push({ name, detail: (event as CustomEvent).detail }),
      );
  });
  const trigger = picker.getByRole('button', { name: 'Change date range' });
  await trigger.click();
  await picker.locator('t-calendar [data-date="2026-10-03"]').click();
  await picker.locator('t-calendar [data-date="2026-10-05"]').click();
  await expect(picker.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(picker).toHaveJSProperty('value', '2026-10-03/2026-10-05');
  expect(await picker.evaluate((element: any) => element.events)).toEqual([
    { name: 'input', detail: undefined },
    { name: 'change', detail: undefined },
    {
      name: 't-change',
      detail: { start: '2026-10-03', end: '2026-10-05', value: '2026-10-03/2026-10-05' },
    },
  ]);
  await trigger.click();
  await expect(picker.locator('t-calendar td[data-range-start]')).toHaveCount(1);
  await expect(picker.locator('t-calendar td[data-range-end]')).toHaveCount(1);
  await expect(picker.locator('t-calendar td[data-range-between]')).toHaveCount(1);
  await expect(picker.locator('t-calendar [data-date="2026-10-04"]')).toHaveAttribute(
    'aria-label',
    /in selected range/,
  );
});

test('same-day range and earlier second choice remain keyboard operable', async ({ page }) => {
  await mount(page, '');
  const picker = page.locator('t-date-range-picker');
  await picker.getByRole('button', { name: 'Choose date range' }).click();
  const day = picker.locator('t-calendar [data-date="2026-09-24"]');
  await day.focus();
  await page.keyboard.press('Enter');
  await expect(picker.getByText('Choose an end date.')).toBeVisible();
  await day.focus();
  await page.keyboard.press('Enter');
  await expect(picker).toHaveJSProperty('value', '2026-09-24/2026-09-24');
  await picker.getByRole('button', { name: 'Change date range' }).click();
  await picker.locator('t-calendar [data-date="2026-09-28"]').click();
  await picker.locator('t-calendar [data-date="2026-09-26"]').click();
  await expect(picker.getByRole('dialog')).toBeVisible();
  await expect(picker.locator('t-calendar [data-date="2026-09-26"]')).toHaveAttribute(
    'aria-label',
    /start of range/,
  );
  await picker.locator('t-calendar [data-date="2026-09-29"]').click();
  await expect(picker).toHaveJSProperty('value', '2026-09-26/2026-09-29');
});

test('programmatic values, malformed intervals, and reset do not emit user events', async ({
  page,
}) => {
  await mount(page);
  const picker = page.locator('t-date-range-picker');
  await picker.evaluate((element: any) => {
    element.events = 0;
    element.addEventListener('change', () => element.events++);
    element.value = '2026-10-02/2026-10-07';
  });
  await expect(picker.getByRole('textbox', { name: 'Start date' })).toHaveValue('2026-10-02');
  await expect(picker.getByRole('textbox', { name: 'End date' })).toHaveValue('2026-10-07');
  await picker.evaluate((element: any) => (element.value = 'not-an-interval'));
  await expect(picker).toHaveJSProperty(
    'validationMessage',
    'Enter a range as YYYY-MM-DD/YYYY-MM-DD.',
  );
  await expect(picker).toHaveJSProperty('value', 'not-an-interval');
  await page.locator('form').evaluate((form) => (form as HTMLFormElement).reset());
  await expect(picker).toHaveJSProperty('value', '2026-09-24/2026-10-01');
  await expect(picker.getByRole('textbox', { name: 'Start date' })).toHaveValue('2026-09-24');
  await expect(picker.getByRole('textbox', { name: 'End date' })).toHaveValue('2026-10-01');
  expect(await picker.evaluate((element: any) => element.events)).toBe(0);
});

test('readonly and disabled states preserve or omit the form value as expected', async ({
  page,
}) => {
  await mount(page, 'readonly value="2026-09-24/2026-10-01"');
  const picker = page.locator('t-date-range-picker');
  const start = picker.getByRole('textbox', { name: 'Start date' });
  const end = picker.getByRole('textbox', { name: 'End date' });
  await expect(start).toHaveAttribute('readonly', '');
  await expect(end).toHaveAttribute('readonly', '');
  await expect(picker.getByRole('button', { name: 'Change date range' })).toBeDisabled();
  expect(
    await page
      .locator('form')
      .evaluate((form) => new FormData(form as HTMLFormElement).get('mission')),
  ).toBe('2026-09-24/2026-10-01');
  await picker.evaluate((element) => {
    (element as HTMLElement & { readonly: boolean; disabled: boolean }).readonly = false;
    (element as HTMLElement & { readonly: boolean; disabled: boolean }).disabled = true;
  });
  await expect(start).toBeDisabled();
  await expect(end).toBeDisabled();
  expect(
    await page
      .locator('form')
      .evaluate((form) => new FormData(form as HTMLFormElement).get('mission')),
  ).toBeNull();
  await picker.evaluate((element) => {
    element.parentElement!.innerHTML = `<fieldset disabled><t-date-range-picker name="mission" value="2026-09-24/2026-10-01"></t-date-range-picker></fieldset>`;
  });
  await expect(page.locator('t-date-range-picker #start')).toBeDisabled();
  await expect(page.locator('t-date-range-picker #end')).toBeDisabled();
  await expect(page.locator('t-date-range-picker .trigger')).toBeDisabled();
});

test('text entry submits with Enter and calendar interaction locks background scrolling', async ({
  page,
}) => {
  await mount(page);
  await page.locator('form').evaluate((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      form.setAttribute('data-submitted', 'true');
    });
  });
  await page.locator('t-date-range-picker #end').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('form')).toHaveAttribute('data-submitted', 'true');
  await page.locator('body').evaluate((element) => (element.style.minHeight = '2400px'));
  await page.evaluate(() => scrollTo(0, 300));
  await page.locator('t-date-range-picker .trigger').click();
  const before = await page.evaluate(() => scrollY);
  await page.keyboard.press('PageDown');
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => scrollY)).toBe(before);
});

test('locale, weekday order, and RTL navigation reach the range calendar', async ({ page }) => {
  await mount(page, 'value="2026-09-24/2026-10-01" locale="fr-FR" first-day-of-week="1"');
  const picker = page.locator('t-date-range-picker');
  await picker.evaluate((element) => element.setAttribute('dir', 'rtl'));
  await picker.locator('.trigger').click();
  await expect(picker.locator('t-calendar thead th').first()).toHaveAttribute('abbr', 'lundi');
  await expect(picker.locator('t-calendar #month-heading')).toHaveText('octobre 2026');
  await page.keyboard.press('ArrowLeft');
  await expect(picker.locator('t-calendar [data-date="2026-10-02"]')).toBeFocused();
});

test('six palettes retain control boundaries and no axe violations in both states', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page);
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, value) => element.setAttribute('data-theme', value), theme);
    const picker = page.locator('t-date-range-picker');
    const colors = await picker.evaluate((element) => {
      const trigger = element.shadowRoot!.querySelector<HTMLElement>('.trigger')!;
      const input = element.shadowRoot!.querySelector<HTMLElement>('#start')!;
      return {
        border: getComputedStyle(trigger).borderTopColor,
        surface: getComputedStyle(trigger).backgroundColor,
        inputBorder: getComputedStyle(input).borderTopColor,
      };
    });
    const ratio = (a: string, b: string) => {
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
      const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    expect(ratio(colors.border, colors.surface), `${theme} trigger border`).toBeGreaterThanOrEqual(
      3,
    );
    expect(
      ratio(colors.inputBorder, colors.surface),
      `${theme} field border`,
    ).toBeGreaterThanOrEqual(3);
    const report = await new AxeBuilder({ page }).include('t-date-range-picker').analyze();
    expect(report.violations, `${theme}: ${JSON.stringify(report.violations)}`).toEqual([]);
    if (report.incomplete.length)
      await testInfo.attach(`${theme}-date-range-axe-review`, {
        body: JSON.stringify(report.incomplete, null, 2),
        contentType: 'application/json',
      });
    await picker.locator('.trigger').click();
    const open = await new AxeBuilder({ page }).include('t-date-range-picker').analyze();
    expect(open.violations, `${theme} open: ${JSON.stringify(open.violations)}`).toEqual([]);
    if (open.incomplete.length)
      await testInfo.attach(`${theme}-date-range-open-axe-review`, {
        body: JSON.stringify(open.incomplete, null, 2),
        contentType: 'application/json',
      });
    await page.keyboard.press('Escape');
  }
});

test('range fields and calendar reflow at 320 CSS pixels with simulated enlargement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await mount(page);
  await page.locator('body').evaluate((element) => {
    element.style.margin = '0';
    element.style.padding = '0';
  });
  const picker = page.locator('t-date-range-picker');
  await picker.evaluate((element) => {
    const style = (root: ShadowRoot) => {
      for (const node of root.querySelectorAll<HTMLElement>('*')) {
        node.style.fontSize = '26px';
        node.style.letterSpacing = '0.12em';
        node.style.wordSpacing = '0.16em';
        node.style.lineHeight = '1.5';
        if (node.shadowRoot) style(node.shadowRoot);
      }
    };
    style(element.shadowRoot!);
  });
  await picker.locator('.trigger').click();
  await expect(picker.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const rect = await picker.getByRole('dialog').boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(321);
  const grid = picker.locator('t-calendar .grid-scroll');
  expect(await grid.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  const focused = picker.locator('t-calendar [data-date="2026-10-01"]');
  await expect(focused).toBeFocused();
  expect(
    await focused.evaluate((button) => {
      const scroll = button.closest('.grid-scroll')!.getBoundingClientRect();
      const target = button.getBoundingClientRect();
      return target.left >= scroll.left - 1 && target.right <= scroll.right + 1;
    }),
  ).toBe(true);
});
