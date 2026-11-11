import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

for (const tag of ['input', 'textarea', 'select']) {
  test(`external labels focus t-${tag} without adding a keyboard stop`, async ({ page }) => {
    await fixture(
      page,
      `<label for="field">Edit field</label><t-${tag} id="field" label="Field"></t-${tag}><button>Next</button>`,
    );
    const control = page.locator(`t-${tag}`).locator('input,textarea,select');
    await page.getByText('Edit field', { exact: true }).click();
    await expect(control).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(control).toBeFocused();
  });
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

for (const tag of ['t-radio-group', 't-segmented-control', 't-rating', 't-multi-select']) {
  test(`${tag} does not acquire focus on initial render`, async ({ page }) => {
    await fixture(page, `<${tag} label="Choice" required></${tag}>`);
    await page.locator(tag).evaluate(async (element: any) => {
      await element.updateComplete;
    });
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    expect(
      await page.locator(tag).evaluate((element: any) => element.shadowRoot.activeElement),
    ).toBeNull();
  });
}

for (const tag of ['t-radio-group', 't-segmented-control']) {
  test(`${tag} preserves choice identity through live updates without changing selection`, async ({
    page,
  }) => {
    await fixture(
      page,
      `<form><${tag} label="Environment" name="environment" value="b" required help="Choose an environment."></${tag}><button type="button">Outside</button></form>`,
    );
    const host = page.locator(tag);
    await host.evaluate((element: any) => {
      element.options = ['a', 'b', 'c'].map((value) => ({ value, label: value.toUpperCase() }));
      element.events = [];
      for (const type of ['input', 'change'])
        element.addEventListener(type, () => element.events.push(type));
    });
    await page.getByRole('radio', { name: 'B', exact: true }).focus();
    await host.evaluate((element: any) => {
      element.focusedInput = element.shadowRoot.activeElement;
      element.options = [element.options[2], element.options[0], { value: 'b', label: 'Beta' }];
    });
    await expect(page.getByRole('radio', { name: 'Beta', exact: true })).toBeFocused();
    expect(
      await host.evaluate(
        (element: any) => element.focusedInput === element.shadowRoot.activeElement,
      ),
    ).toBe(true);
    await host.evaluate((element: any) => {
      element.options = element.options.filter((option: any) => option.value !== 'b');
    });
    await expect(page.getByRole('radio', { name: 'A', exact: true })).toBeFocused();
    expect(
      await host.evaluate((element: any) => [
        element.value,
        element.validity.valueMissing,
        new FormData(element.closest('form')).has('environment'),
      ]),
    ).toEqual(['b', true, false]);
    await host.evaluate((element: any) => {
      element.options = element.options.map((option: any) => ({
        ...option,
        disabled: option.value === 'a',
      }));
    });
    await expect(page.getByRole('radio', { name: 'C', exact: true })).toBeFocused();
    await host.evaluate((element: any) => {
      element.options = [];
    });
    const group = host.getByRole('group', { name: 'Environment', exact: true });
    await expect(group).toBeFocused();
    await expect(group).toHaveAccessibleDescription('Choose an environment.');
    expect(await group.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe('2px');
    await host.evaluate((element: any) => {
      element.options = [{ value: 'b', label: 'Beta' }];
    });
    await expect(page.getByRole('radio', { name: 'Beta', exact: true })).toBeFocused();
    await expect(page.getByRole('radio', { name: 'Beta', exact: true })).toBeChecked();
    expect(
      await host.evaluate((element: any) => [
        element.events,
        new FormData(element.closest('form')).get('environment'),
      ]),
    ).toEqual([[], 'b']);
    await page.getByRole('button', { name: 'Outside' }).focus();
    await host.evaluate((element: any) => {
      element.options = [{ value: 'a', label: 'Alpha' }];
    });
    await expect(page.getByRole('button', { name: 'Outside' })).toBeFocused();
  });

  test(`${tag} focuses its named empty group for required and custom errors`, async ({
    page,
  }, testInfo) => {
    await fixture(
      page,
      `<form><${tag} label="Environment" name="environment" required help="Choices will appear here."></${tag}><button type="submit">Save</button></form>`,
    );
    const host = page.locator(tag);
    const group = host.getByRole('group', { name: 'Environment', exact: true });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(group).toBeFocused();
    await expect(group).toHaveAccessibleDescription('Select an option.');
    await expect(group).toHaveAttribute('aria-invalid', 'true');
    for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
      await page
        .locator('html')
        .evaluate((element, value) => (element.dataset.theme = value), theme);
      const results = await new AxeBuilder({ page }).include(tag).analyze();
      expect(results.violations, `${theme}: ${JSON.stringify(results.violations)}`).toEqual([]);
      if (results.incomplete.length)
        await testInfo.attach(`${theme}-empty-radio-axe-review`, {
          body: JSON.stringify(results.incomplete, null, 2),
          contentType: 'application/json',
        });
    }
    await host.evaluate((element: any) => {
      element.required = false;
      element.setCustomValidity('No environments are available.');
    });
    expect(await host.evaluate((element: any) => element.validity.customError)).toBe(true);
    await expect(group).toHaveAccessibleDescription('No environments are available.');
    await host.evaluate((element: any) => {
      element.setCustomValidity('');
    });
    expect(await host.evaluate((element: any) => element.checkValidity())).toBe(true);
    await expect(group).toHaveAttribute('aria-invalid', 'false');
    await expect(group).toHaveAccessibleDescription('Choices will appear here.');
    await host.evaluate((element: any) => {
      element.options = [{ value: 'a', label: 'Alpha', disabled: true }];
      element.value = 'a';
      element.required = true;
    });
    await host.evaluate((element: any) => element.reportValidity());
    await expect(group).toBeFocused();
    await expect(group).toHaveAccessibleDescription('Select an option.');
    await expect(host.getByRole('radio', { name: 'Alpha' })).toBeDisabled();
    await host.evaluate((element: any) => {
      element.error = 'Unavailable.';
      element.disabled = true;
    });
    expect(
      await host.evaluate((element: any) => [
        element.validity.valid,
        new FormData(element.closest('form')).has('environment'),
      ]),
    ).toEqual([true, false]);
    await page.getByRole('button', { name: 'Save' }).focus();
    await host.evaluate((element: any) => element.focus());
    await expect(page.getByRole('button', { name: 'Save' })).toBeFocused();
  });
}

test('rating retains a surviving focused value and recovers focus when max shrinks', async ({
  page,
}) => {
  await fixture(page, '<t-rating label="Experience" value="4" required></t-rating>');
  const host = page.locator('t-rating');
  await page.getByRole('radio', { name: '4 of 5 stars', exact: true }).focus();
  await host.evaluate((element: any) => {
    element.max = 6;
  });
  await expect(page.getByRole('radio', { name: '4 of 6 stars', exact: true })).toBeFocused();
  await host.evaluate((element: any) => {
    element.max = 2;
  });
  await expect(page.getByRole('radio', { name: '2 of 2 stars', exact: true })).toBeFocused();
  expect(
    await host.evaluate((element: any) => [element.value, element.validity.valueMissing]),
  ).toEqual(['4', true]);
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('radio', { name: '1 of 2 stars', exact: true })).toBeChecked();
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
