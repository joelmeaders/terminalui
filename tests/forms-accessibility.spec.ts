import { test, expect, type Page } from '@playwright/test';

async function fixture(page: Page, markup: string) {
  await page.route('**/@vite/client', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' }),
  );
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((element, html) => {
    element.innerHTML = html;
  }, markup);
}

test('all form controls expose one persistent description for asynchronous and custom errors', async ({
  page,
}) => {
  const tags = [
    'input',
    'textarea',
    'select',
    'checkbox',
    'switch',
    'radio-group',
    'range',
    'combobox',
    'file-input',
  ];
  await fixture(
    page,
    tags
      .map((tag) => `<t-${tag} label="${tag}" help="Choose an available value."></t-${tag}>`)
      .join(''),
  );
  await page.locator('t-select,t-radio-group,t-combobox').evaluateAll((elements) => {
    for (const element of elements as any[])
      element.options = [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ];
  });
  for (const tag of tags) {
    const host = page.locator(`t-${tag}`);
    const control = host.locator('input,textarea,select').first();
    await expect(control).toHaveAccessibleDescription('Choose an available value.');
    await host.evaluate((element: any) => {
      element.originalDescription = element.shadowRoot.querySelector('#help');
      element.error = 'This value is unavailable. Choose another value.';
    });
    await expect(control).toHaveAttribute('aria-invalid', 'true');
    await expect(control).toHaveAccessibleDescription(
      'This value is unavailable. Choose another value.',
    );
    expect(
      await host.evaluate(
        (element: any) => element.originalDescription === element.shadowRoot.querySelector('#help'),
      ),
    ).toBe(true);
    await expect(
      host.locator(
        '[aria-live="polite"], [aria-live="assertive"], [role="alert"], [role="status"]',
      ),
    ).toHaveCount(1);
    await host.evaluate((element: any) => {
      element.error = '';
    });
    await expect(control).toHaveAttribute('aria-invalid', 'false');
    await expect(control).toHaveAccessibleDescription('Choose an available value.');
    await host.evaluate((element: any) => element.setCustomValidity('Please review this value.'));
    await expect(control).toHaveAttribute('aria-invalid', 'true');
    await expect(control).toHaveAccessibleDescription('Please review this value.');
    await host.evaluate((element: any) => {
      element.checkValidity();
      element.setCustomValidity('');
    });
    await expect(control).toHaveAttribute('aria-invalid', 'false');
    await expect(control).toHaveAccessibleDescription('Choose an available value.');
  }
});

test('native validation focuses its field and programmatic correction clears stale error state', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><t-input label="Callsign" name="callsign" required help="Enter your callsign."></t-input><button type="submit">Save</button></form>',
  );
  const input = page.getByRole('textbox', { name: 'Callsign', exact: true });
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  const message = await page
    .locator('t-input')
    .evaluate((element: any) => element.validationMessage);
  expect(message.length).toBeGreaterThan(0);
  await expect(input).toHaveAccessibleDescription(message);
  await page.locator('t-input').evaluate((element: any) => {
    element.value = 'Explorer';
  });
  await expect(input).toHaveAttribute('aria-invalid', 'false');
  await expect(input).toHaveAccessibleDescription('Enter your callsign.');
});

test('radio focus chooses the selected enabled radio and errors describe every choice', async ({
  page,
}) => {
  await fixture(
    page,
    '<t-radio-group label="Environment" value="c" required help="Choose an environment."></t-radio-group>',
  );
  await page.locator('t-radio-group').evaluate((element: any) => {
    element.options = [
      { value: 'a', label: 'Alpha', disabled: true },
      { value: 'b', label: 'Beta' },
      { value: 'c', label: 'Charlie' },
    ];
  });
  await expect(page.getByRole('radio', { name: 'Charlie' })).toBeChecked();
  await page.locator('t-radio-group').evaluate((element: any) => element.focus());
  await expect(page.getByRole('radio', { name: 'Charlie' })).toBeFocused();
  await page.locator('t-radio-group').evaluate((element: any) => {
    element.error = 'This environment is unavailable.';
  });
  for (const name of ['Alpha', 'Beta', 'Charlie']) {
    await expect(page.getByRole('radio', { name })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('radio', { name })).toHaveAccessibleDescription(
      'This environment is unavailable.',
    );
  }
  await page.locator('t-radio-group').evaluate((element: any) => {
    element.value = '';
    element.error = '';
  });
  await page.locator('t-radio-group').evaluate((element: any) => element.focus());
  await expect(page.getByRole('radio', { name: 'Beta' })).toBeFocused();
});

test('slider exposes a stable name and native value without a second live value', async ({
  page,
}) => {
  await fixture(
    page,
    '<t-range label="Signal" step="5" help="Adjust the signal level."></t-range>',
  );
  const slider = page.getByRole('slider', { name: 'Signal', exact: true });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('55');
  await expect(slider).toHaveAccessibleName('Signal');
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.locator('t-range [aria-live]')).toHaveCount(1);
  await expect(slider).toHaveAccessibleDescription('Adjust the signal level.');
});

test('editable combobox preserves text cursor and selection keys before list navigation', async ({
  page,
}) => {
  await fixture(page, '<t-combobox label="Station"></t-combobox>');
  await page.locator('t-combobox').evaluate((element: any) => {
    element.options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Alpine' },
    ];
  });
  const input = page.getByRole('combobox');
  await input.fill('Al');
  await page.keyboard.press('Home');
  expect(await input.evaluate((element: HTMLInputElement) => element.selectionStart)).toBe(0);
  await page.keyboard.press('Shift+ArrowRight');
  expect(
    await input.evaluate((element: HTMLInputElement) => [
      element.selectionStart,
      element.selectionEnd,
    ]),
  ).toEqual([0, 1]);
  await page.keyboard.press('End');
  expect(await input.evaluate((element: HTMLInputElement) => element.selectionStart)).toBe(2);
  await expect(input).not.toHaveAttribute('aria-activedescendant');
  await page.keyboard.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', 'option-0');
  await page.keyboard.press('End');
  await expect(input).toHaveAttribute('aria-activedescendant', 'option-1');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(input).not.toHaveAttribute('aria-activedescendant');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowLeft');
  await expect(input).not.toHaveAttribute('aria-activedescendant');
  await expect(input).toBeFocused();
});

test('forced colors retains textarea and switch boundaries and keyboard focus', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit does not emulate forced colors.');
  await page.emulateMedia({ forcedColors: 'active' });
  await fixture(
    page,
    '<t-textarea label="Notes"></t-textarea><t-switch label="Alerts"></t-switch><t-combobox label="Station"></t-combobox>',
  );
  await page.getByRole('textbox', { name: 'Notes' }).focus();
  const styles = await page.getByRole('textbox', { name: 'Notes' }).evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      border: style.borderTopColor,
      background: style.backgroundColor,
      outline: style.outlineStyle,
      width: style.outlineWidth,
    };
  });
  expect(styles.border).not.toBe(styles.background);
  expect(styles.outline).not.toBe('none');
  expect(parseFloat(styles.width)).toBeGreaterThanOrEqual(2);
  const toggle = page.getByRole('switch');
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toBeChecked();
  expect(await toggle.evaluate((element) => getComputedStyle(element).appearance)).toBe('auto');
});
