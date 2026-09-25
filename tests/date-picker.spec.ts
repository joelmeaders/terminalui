import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mount(page: Page, attributes = 'value="2026-09-24"') {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((element, attrs) => {
    element.innerHTML = `<form><t-date-picker name="mission" label="Mission date" ${attrs}></t-date-picker><button type="submit">Submit</button></form>`;
  }, attributes);
  await page.locator('t-date-picker input').waitFor();
}

test('typed dates validate exact ISO days and submit one form value', async ({ page }) => {
  await mount(page, 'required min="2026-09-20" max="2026-10-10"');
  const picker = page.locator('t-date-picker');
  const input = picker.getByRole('textbox', { name: 'Mission date' });
  await expect(input).toHaveAttribute('aria-describedby', 'format help');
  await expect(picker.locator('#format')).toHaveText('Format: YYYY-MM-DD');
  await expect(picker).toHaveJSProperty('validationMessage', 'Choose a date.');
  await input.fill('2026-02-30');
  await input.blur();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(picker.locator('#help')).toHaveText('Enter a valid date as YYYY-MM-DD.');
  await input.fill('2026-09-19');
  await input.blur();
  await expect(picker.locator('#help')).toHaveText('Choose 2026-09-20 or a later date.');
  await input.fill('2026-10-11');
  await input.blur();
  await expect(picker.locator('#help')).toHaveText('Choose 2026-10-10 or an earlier date.');
  await input.fill('2026-09-25');
  await input.blur();
  await expect(input).toHaveAttribute('aria-invalid', 'false');
  await expect(picker).toHaveJSProperty('value', '2026-09-25');
  expect(
    await page
      .locator('form')
      .evaluate((form) => [...new FormData(form as HTMLFormElement).entries()]),
  ).toEqual([['mission', '2026-09-25']]);
});

test('calendar selection updates the field once, submits it, and restores trigger focus', async ({
  page,
}) => {
  await mount(page);
  const picker = page.locator('t-date-picker');
  await picker.evaluate((element: any) => {
    element.events = [];
    for (const name of ['input', 'change', 't-change'])
      element.addEventListener(name, (event: Event) =>
        element.events.push({ name, detail: (event as CustomEvent).detail }),
      );
  });
  const trigger = picker.locator('.trigger');
  await expect(trigger).toHaveAccessibleName('Change date, 2026-09-24');
  await trigger.click();
  await expect(picker.getByRole('dialog', { name: 'Choose Mission date' })).toBeVisible();
  await expect(picker.locator('t-calendar [data-date="2026-09-24"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(picker.locator('t-calendar [data-date="2026-09-25"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(picker.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAccessibleName('Change date, 2026-09-25');
  await expect(picker.getByRole('textbox', { name: 'Mission date' })).toHaveValue('2026-09-25');
  expect(await picker.evaluate((element: any) => element.events)).toEqual([
    { name: 'input', detail: undefined },
    { name: 'change', detail: undefined },
    { name: 't-change', detail: { value: '2026-09-25' } },
  ]);
  expect(
    await page
      .locator('form')
      .evaluate((form) => new FormData(form as HTMLFormElement).get('mission')),
  ).toBe('2026-09-25');
});

test('Escape cancels without changing the value and returns focus', async ({ page }) => {
  await mount(page);
  const picker = page.locator('t-date-picker');
  const trigger = picker.getByRole('button', { name: 'Change date, 2026-09-24' });
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(picker.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(picker).toHaveJSProperty('value', '2026-09-24');
});

test('activating the selected day closes without a duplicate change', async ({ page }) => {
  await mount(page);
  const picker = page.locator('t-date-picker');
  await picker.evaluate((element: any) => {
    element.changes = 0;
    element.addEventListener('change', () => element.changes++);
  });
  const trigger = picker.locator('.trigger');
  await trigger.click();
  await expect(picker.locator('t-calendar [data-date="2026-09-24"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(picker.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(picker).toHaveJSProperty('value', '2026-09-24');
  expect(await picker.evaluate((element: any) => element.changes)).toBe(0);
});

test('disabled, fieldset-disabled, and readonly states prevent editing', async ({ page }) => {
  await mount(page, 'disabled value="2026-09-24"');
  const picker = page.locator('t-date-picker');
  const input = picker.getByRole('textbox', { name: 'Mission date' });
  const trigger = picker.getByRole('button', { name: 'Change date, 2026-09-24' });
  await expect(input).toBeDisabled();
  await expect(trigger).toBeDisabled();
  expect(
    await page
      .locator('form')
      .evaluate((form) => new FormData(form as HTMLFormElement).get('mission')),
  ).toBeNull();
  await picker.evaluate((element: any) => {
    element.disabled = false;
    element.readonly = true;
  });
  await expect(input).toHaveAttribute('readonly', '');
  await expect(trigger).toBeDisabled();
  expect(
    await page
      .locator('form')
      .evaluate((form) => new FormData(form as HTMLFormElement).get('mission')),
  ).toBe('2026-09-24');
  await picker.evaluate((element: any) => {
    element.readonly = false;
    element.parentElement!.innerHTML = `<fieldset disabled><t-date-picker name="mission" label="Mission date" value="2026-09-24"></t-date-picker></fieldset>`;
  });
  await expect(page.locator('t-date-picker input')).toBeDisabled();
  await expect(page.locator('t-date-picker .trigger')).toBeDisabled();
});

test('programmatic values and form reset do not emit user events', async ({ page }) => {
  await mount(page);
  const picker = page.locator('t-date-picker');
  await picker.evaluate((element: any) => {
    element.events = 0;
    element.addEventListener('change', () => element.events++);
    element.value = '2026-10-01';
  });
  await expect(picker.getByRole('textbox', { name: 'Mission date' })).toHaveValue('2026-10-01');
  await page.locator('form').evaluate((form) => (form as HTMLFormElement).reset());
  await expect(picker).toHaveJSProperty('value', '2026-09-24');
  await expect(picker.getByRole('textbox', { name: 'Mission date' })).toHaveValue('2026-09-24');
  expect(await picker.evaluate((element: any) => element.events)).toBe(0);
});

test('Enter in the text field submits through the form submitter', async ({ page }) => {
  await mount(page);
  await page.locator('form').evaluate((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      form.setAttribute('data-submitted', 'true');
    });
  });
  await page.locator('t-date-picker input').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('form')).toHaveAttribute('data-submitted', 'true');
});

test('a single date field submits without a button, but two text fields do not', async ({
  page,
}) => {
  await mount(page);
  const form = page.locator('form');
  await form.evaluate((element) => {
    element.querySelector('button')?.remove();
    element.addEventListener('submit', (event) => {
      event.preventDefault();
      element.setAttribute('data-submitted', 'true');
    });
  });
  const input = page.locator('t-date-picker input');
  await input.focus();
  await page.keyboard.press('Enter');
  await expect(form).toHaveAttribute('data-submitted', 'true');
  await form.evaluate((element) => {
    element.removeAttribute('data-submitted');
    element.insertAdjacentHTML('beforeend', '<t-input name="other" label="Other"></t-input>');
  });
  await page.locator('t-input input').waitFor();
  await input.focus();
  await page.keyboard.press('Enter');
  await expect(form).not.toHaveAttribute('data-submitted');
});

test('programmatic open and disabling release the modal', async ({ page }) => {
  await mount(page);
  const picker = page.locator('t-date-picker');
  await picker.evaluate((element: any) => element.show());
  await expect(picker.getByRole('dialog')).toBeVisible();
  await picker.evaluate((element: any) => {
    element.disabled = true;
  });
  await expect(picker.getByRole('dialog')).toBeHidden();
  await expect(picker.locator('.trigger')).toBeDisabled();
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
});

test('calendar focus movement does not scroll the page behind its modal', async ({ page }) => {
  await mount(page);
  await page.locator('body').evaluate((element) => {
    element.style.minHeight = '2400px';
  });
  await page.locator('#fixture').evaluate((element) => {
    element.style.marginTop = '600px';
  });
  await page.evaluate(() => scrollTo(0, 300));
  await page.locator('t-date-picker .trigger').click();
  const before = await page.evaluate(() => scrollY);
  await page.keyboard.press('PageDown');
  await expect(page.locator('t-date-picker t-calendar [data-date="2026-10-24"]')).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => scrollY)).toBe(before);
});

test('calendar inherits locale, first weekday, bounds, and right-to-left navigation', async ({
  page,
}) => {
  await mount(
    page,
    'value="2026-09-24" min="2026-09-20" max="2026-10-10" locale="fr-FR" first-day-of-week="1"',
  );
  const picker = page.locator('t-date-picker');
  await picker.evaluate((element) => element.setAttribute('dir', 'rtl'));
  await picker.locator('.trigger').click();
  await expect(picker.locator('t-calendar thead th').first()).toHaveAttribute('abbr', 'lundi');
  await expect(picker.locator('t-calendar #month-heading')).toHaveText('septembre 2026');
  await expect(picker.locator('t-calendar [data-date="2026-09-19"]')).toBeDisabled();
  await page.keyboard.press('ArrowLeft');
  await expect(picker.locator('t-calendar [data-date="2026-09-25"]')).toBeFocused();
});

test('six palettes retain contrast and no axe violations', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page);
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, value) => element.setAttribute('data-theme', value), theme);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const picker = page.locator('t-date-picker');
    const contrast = await picker.evaluate((element) => {
      const trigger = element.shadowRoot!.querySelector<HTMLElement>('.trigger')!;
      const input = element.shadowRoot!.querySelector<HTMLElement>('input')!;
      const surface = getComputedStyle(trigger).backgroundColor;
      return {
        border: getComputedStyle(trigger).borderTopColor,
        surface,
        inputBorder: getComputedStyle(input).borderTopColor,
      };
    });
    const ratio = (a: string, b: string) => {
      const lum = (color: string) =>
        color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      const values = [lum(a), lum(b)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    expect(
      ratio(contrast.border, contrast.surface),
      `${theme} trigger border`,
    ).toBeGreaterThanOrEqual(3);
    expect(
      ratio(contrast.inputBorder, contrast.surface),
      `${theme} input border`,
    ).toBeGreaterThanOrEqual(3);
    const report = await new AxeBuilder({ page }).include('t-date-picker').analyze();
    expect(report.violations, `${theme}: ${JSON.stringify(report.violations)}`).toEqual([]);
    if (report.incomplete.length)
      await testInfo.attach(`${theme}-date-picker-axe-review`, {
        body: JSON.stringify(report.incomplete, null, 2),
        contentType: 'application/json',
      });
    await picker.locator('.trigger').click();
    await expect(picker.getByRole('dialog')).toBeVisible();
    const openReport = await new AxeBuilder({ page }).include('t-date-picker').analyze();
    expect(
      openReport.violations,
      `${theme} open: ${JSON.stringify(openReport.violations)}`,
    ).toEqual([]);
    if (openReport.incomplete.length)
      await testInfo.attach(`${theme}-date-picker-open-axe-review`, {
        body: JSON.stringify(openReport.incomplete, null, 2),
        contentType: 'application/json',
      });
    await page.keyboard.press('Escape');
  }
});

test('date field and open dialog reflow at 320 CSS pixels with enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await mount(page);
  await page.locator('body').evaluate((element) => {
    element.style.padding = '0';
    element.style.margin = '0';
    element.style.setProperty('--t-font-size', '28px');
  });
  const picker = page.locator('t-date-picker');
  await picker.evaluate((element) => {
    const styleShadow = (root: ShadowRoot) => {
      for (const node of root.querySelectorAll<HTMLElement>('*')) {
        node.style.fontSize = '26px';
        node.style.letterSpacing = '0.12em';
        node.style.wordSpacing = '0.16em';
        node.style.lineHeight = '1.5';
        if (node.shadowRoot) styleShadow(node.shadowRoot);
      }
    };
    styleShadow(element.shadowRoot!);
  });
  await picker.locator('.trigger').click();
  await expect(picker.getByRole('dialog')).toBeVisible();
  const selectedDay = picker.locator('t-calendar [data-date="2026-09-24"]');
  await expect(selectedDay).toBeFocused();
  const grid = picker.locator('t-calendar .grid-scroll');
  expect(
    await selectedDay.evaluate((button) => {
      const scroll = button.closest('.grid-scroll')!.getBoundingClientRect();
      const target = button.getBoundingClientRect();
      return target.left >= scroll.left - 1 && target.right <= scroll.right + 1;
    }),
  ).toBe(true);
  const readable = await grid.evaluate((element) => {
    const textFits = [...element.querySelectorAll<HTMLElement>('th, td button')].every((cell) => {
      const range = document.createRange();
      range.selectNodeContents(cell);
      const text = range.getBoundingClientRect();
      const box = cell.getBoundingClientRect();
      return text.left >= box.left - 1 && text.right <= box.right + 1;
    });
    return { textFits, scrolls: element.scrollWidth > element.clientWidth };
  });
  expect(readable).toEqual({ textFits: true, scrolls: true });
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const saturday = picker.locator('t-calendar [data-date="2026-09-26"]');
  await expect(saturday).toBeFocused();
  expect(
    await saturday.evaluate((button) => {
      const scroll = button.closest('.grid-scroll')!.getBoundingClientRect();
      const target = button.getBoundingClientRect();
      return target.left >= scroll.left - 1 && target.right <= scroll.right + 1;
    }),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const rect = await picker.getByRole('dialog').boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(321);
});

test('standard text shows every weekday column in the 320 CSS pixel dialog', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await mount(page);
  await page.locator('body').evaluate((element) => {
    element.style.padding = '0';
    element.style.margin = '0';
  });
  await page.locator('t-date-picker .trigger').click();
  const grid = page.locator('t-date-picker t-calendar .grid-scroll');
  await expect(grid).toBeVisible();
  expect(await grid.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true,
  );
  await expect(page.locator('t-date-picker t-calendar thead th')).toHaveCount(7);
});
