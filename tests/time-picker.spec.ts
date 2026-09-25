import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mount(page: Page, attributes = 'value="09:30"') {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((element, attrs) => {
    element.innerHTML = `<form><t-time-picker name="launch" label="Launch time" ${attrs}></t-time-picker><button type="submit">Submit</button></form>`;
  }, attributes);
  await page.locator('t-time-picker input').waitFor();
}

test('typed times validate exact 24-hour values and submit one form value', async ({ page }) => {
  await mount(page, 'required min="09:15" max="17:45"');
  const picker = page.locator('t-time-picker');
  const input = picker.getByRole('textbox', { name: 'Launch time' });
  await expect(input).toHaveAttribute('aria-describedby', 'format help');
  await expect(picker.locator('#format')).toHaveText('Format: HH:mm, 24-hour time');
  await expect(picker).toHaveJSProperty('validationMessage', 'Choose a time.');
  await input.fill('25:90');
  await input.blur();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(picker.locator('#help')).toHaveText('Enter a valid time as HH:mm.');
  await input.fill('09:14');
  await input.blur();
  await expect(picker.locator('#help')).toHaveText('Choose 09:15 or a later time.');
  await input.fill('17:46');
  await input.blur();
  await expect(picker.locator('#help')).toHaveText('Choose 17:45 or an earlier time.');
  await input.fill('17:45');
  await input.blur();
  await expect(input).toHaveAttribute('aria-invalid', 'false');
  expect(
    await page.locator('form').evaluate((form) => [...new FormData(form as HTMLFormElement)]),
  ).toEqual([['launch', '17:45']]);
});

test('modal choices emit one change, submit, and restore trigger focus', async ({ page }) => {
  await mount(page);
  const picker = page.locator('t-time-picker');
  await picker.evaluate((element: any) => {
    element.events = [];
    for (const name of ['input', 'change', 't-change'])
      element.addEventListener(name, (event: Event) =>
        element.events.push({ name, detail: (event as CustomEvent).detail }),
      );
  });
  const trigger = picker.locator('.trigger');
  await expect(trigger).toHaveAccessibleName('Change time, 09:30');
  await trigger.click();
  await expect(picker.getByRole('dialog', { name: 'Choose Launch time' })).toBeVisible();
  const hours = picker.getByRole('combobox', { name: 'Hours' });
  const minutes = picker.getByRole('combobox', { name: 'Minutes' });
  await expect(hours).toBeFocused();
  await expect(hours).toHaveValue('9');
  await expect(minutes).toHaveValue('30');
  await hours.selectOption('10');
  await minutes.selectOption('45');
  await expect(picker.locator('output')).toHaveText('10:45');
  await picker.getByRole('button', { name: 'Use time' }).click();
  await expect(picker.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(picker.getByRole('textbox', { name: 'Launch time' })).toHaveValue('10:45');
  expect(await picker.evaluate((element: any) => element.events)).toEqual([
    { name: 'input', detail: undefined },
    { name: 'change', detail: undefined },
    { name: 't-change', detail: { value: '10:45' } },
  ]);
  expect(
    await page
      .locator('form')
      .evaluate((form) => new FormData(form as HTMLFormElement).get('launch')),
  ).toBe('10:45');
});

test('Escape and Cancel discard drafts; applying unchanged value emits nothing', async ({
  page,
}) => {
  await mount(page);
  const picker = page.locator('t-time-picker');
  await picker.evaluate((element: any) => {
    element.events = 0;
    element.addEventListener('change', () => element.events++);
  });
  const trigger = picker.locator('.trigger');
  await trigger.click();
  await picker.getByRole('combobox', { name: 'Hours' }).selectOption('10');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(picker).toHaveJSProperty('value', '09:30');
  await trigger.click();
  await picker.getByRole('combobox', { name: 'Minutes' }).selectOption('45');
  await picker.getByRole('button', { name: 'Cancel' }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await picker.getByRole('button', { name: 'Use time' }).click();
  expect(await picker.evaluate((element: any) => element.events)).toBe(0);
});

test('bounds disable unavailable choices and impossible range cannot apply', async ({ page }) => {
  await mount(page, 'min="09:15" max="10:30" value="09:20"');
  const picker = page.locator('t-time-picker');
  await picker.locator('.trigger').click();
  const hours = picker.getByRole('combobox', { name: 'Hours' });
  const minutes = picker.getByRole('combobox', { name: 'Minutes' });
  await expect(hours.locator('option[value="8"]')).toHaveAttribute('disabled', '');
  await expect(hours.locator('option[value="10"]')).not.toHaveAttribute('disabled', '');
  await expect(minutes.locator('option[value="14"]')).toHaveAttribute('disabled', '');
  await hours.selectOption('10');
  await expect(minutes.locator('option[value="31"]')).toHaveAttribute('disabled', '');
  await expect(picker.locator('output')).toHaveText('10:20');
  await page.keyboard.press('Escape');
  await picker.evaluate((element: any) => {
    element.min = '11:00';
    element.max = '10:00';
  });
  await expect(picker).toHaveJSProperty(
    'validationMessage',
    'No times are available in this range.',
  );
  await picker.locator('.trigger').click();
  await expect(hours).toBeDisabled();
  await expect(minutes).toBeDisabled();
  await expect(picker.getByRole('button', { name: 'Use time' })).toBeDisabled();
});

test('disabled, readonly, fieldset-disabled, and reset keep form semantics', async ({ page }) => {
  await mount(page, 'disabled value="09:30"');
  const picker = page.locator('t-time-picker');
  const input = picker.getByRole('textbox', { name: 'Launch time' });
  const trigger = picker.locator('.trigger');
  await expect(input).toBeDisabled();
  await expect(trigger).toBeDisabled();
  expect(
    await page
      .locator('form')
      .evaluate((form) => new FormData(form as HTMLFormElement).get('launch')),
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
      .evaluate((form) => new FormData(form as HTMLFormElement).get('launch')),
  ).toBe('09:30');
  await picker.evaluate((element: any) => {
    element.readonly = false;
    element.value = '11:00';
  });
  await expect(input).toHaveValue('11:00');
  await page.locator('form').evaluate((form) => (form as HTMLFormElement).reset());
  await expect(input).toHaveValue('09:30');
  await picker.evaluate((element: any) => {
    element.parentElement!.innerHTML =
      '<fieldset disabled><t-time-picker name="launch" label="Launch time" value="09:30"></t-time-picker></fieldset>';
  });
  await expect(page.locator('t-time-picker input')).toBeDisabled();
  await expect(page.locator('t-time-picker .trigger')).toBeDisabled();
});

test('programmatic open and disabling release the dialog', async ({ page }) => {
  await mount(page);
  const picker = page.locator('t-time-picker');
  await picker.evaluate((element: any) => element.show());
  await expect(picker.getByRole('dialog')).toBeVisible();
  await picker.evaluate((element: any) => {
    element.disabled = true;
  });
  await expect(picker.getByRole('dialog')).toBeHidden();
  await expect(picker.locator('.trigger')).toBeDisabled();
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
});

test('icon slots stay decorative and disabled slots are inert', async ({ page }) => {
  await mount(page, 'value="09:30"');
  const picker = page.locator('t-time-picker');
  await picker.evaluate((element) => {
    element.innerHTML =
      '<span slot="start">⌚</span><span slot="end">UTC</span><span slot="trigger-icon">CLOCK</span>';
  });
  const input = picker.getByRole('textbox', { name: 'Launch time' });
  const trigger = picker.locator('.trigger');
  await expect(trigger).toHaveAccessibleName('Change time, 09:30');
  await expect(input).toHaveAccessibleName('Launch time');
  await picker.evaluate((element: any) => {
    element.disabled = true;
  });
  await expect(picker.locator('slot[name="start"]')).toHaveAttribute('inert', '');
  await expect(picker.locator('slot[name="end"]')).toHaveAttribute('inert', '');
});

test('Enter submits one field and modal locks background scrolling', async ({ page }) => {
  await mount(page);
  const form = page.locator('form');
  await form.evaluate((element) => {
    element.querySelector('button')?.remove();
    element.addEventListener('submit', (event) => {
      event.preventDefault();
      element.setAttribute('data-submitted', 'true');
    });
  });
  await page.locator('t-time-picker input').focus();
  await page.keyboard.press('Enter');
  await expect(form).toHaveAttribute('data-submitted', 'true');
  await page.locator('body').evaluate((element) => {
    element.style.minHeight = '2400px';
  });
  await page.evaluate(() => scrollTo(0, 300));
  await page.locator('t-time-picker .trigger').click();
  const before = await page.evaluate(() => scrollY);
  await page.keyboard.press('PageDown');
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => scrollY)).toBe(before);
});

test('six palettes have control boundaries and no axe violations', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page);
  const ratio = (a: string, b: string) => {
    const lum = (color: string) =>
      color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((value) => {
          const n = value / 255;
          return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const values = [lum(a), lum(b)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
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
    const picker = page.locator('t-time-picker');
    const colors = await picker.evaluate((element) => {
      const input = element.shadowRoot!.querySelector<HTMLElement>('input')!;
      const trigger = element.shadowRoot!.querySelector<HTMLElement>('.trigger')!;
      return {
        inputBorder: getComputedStyle(input).borderTopColor,
        triggerBorder: getComputedStyle(trigger).borderTopColor,
        surface: getComputedStyle(trigger).backgroundColor,
      };
    });
    expect(
      ratio(colors.inputBorder, colors.surface),
      `${theme} input border`,
    ).toBeGreaterThanOrEqual(3);
    expect(
      ratio(colors.triggerBorder, colors.surface),
      `${theme} trigger border`,
    ).toBeGreaterThanOrEqual(3);
    for (const open of [false, true]) {
      if (open) await picker.locator('.trigger').click();
      const report = await new AxeBuilder({ page }).include('t-time-picker').analyze();
      expect(
        report.violations,
        `${theme} ${open ? 'open' : 'closed'}: ${JSON.stringify(report.violations)}`,
      ).toEqual([]);
      if (report.incomplete.length)
        await testInfo.attach(`${theme}-${open ? 'open' : 'closed'}-time-picker-axe-review`, {
          body: JSON.stringify(report.incomplete, null, 2),
          contentType: 'application/json',
        });
      if (open) await page.keyboard.press('Escape');
    }
  }
});

test('forced colors keep native choices and clear control edges', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === 'webkit',
    'WebKit Playwright does not emulate forced colors.',
  );
  await page.emulateMedia({ forcedColors: 'active' });
  await mount(page);
  const picker = page.locator('t-time-picker');
  await picker.locator('.trigger').click();
  await expect(picker.getByRole('combobox', { name: 'Hours' })).toBeFocused();
  const colors = await picker.evaluate((element) => {
    const trigger = element.shadowRoot!.querySelector<HTMLElement>('.trigger')!;
    const input = element.shadowRoot!.querySelector<HTMLElement>('input')!;
    return {
      trigger: getComputedStyle(trigger).borderTopColor,
      input: getComputedStyle(input).borderTopColor,
    };
  });
  expect(colors.trigger).not.toBe('rgba(0, 0, 0, 0)');
  expect(colors.input).not.toBe('rgba(0, 0, 0, 0)');
  await expect(picker.getByRole('button', { name: 'Use time' })).toBeVisible();
});

test('field and modal reflow at 320 CSS pixels with enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await mount(page);
  await page.locator('body').evaluate((element) => {
    element.style.padding = '0';
    element.style.margin = '0';
    element.style.setProperty('--t-font-size', '28px');
  });
  const picker = page.locator('t-time-picker');
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
  await expect(picker.getByRole('combobox', { name: 'Hours' })).toBeFocused();
  const dialog = await picker.getByRole('dialog').boundingBox();
  expect(dialog).not.toBeNull();
  expect(dialog!.x).toBeGreaterThanOrEqual(0);
  expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(321);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await expect(picker.getByRole('button', { name: 'Use time' })).toBeInViewport();
});
