import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function fixture(page: Page, markup: string) {
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((el, html) => {
    el.innerHTML = html;
  }, markup);
}

test('form values, validation, reset, disabled fieldset, and reactive properties', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><fieldset><t-input label="Name" name="name" required></t-input><t-input type="email" label="Email" name="email" required></t-input><t-select label="Destination" name="destination" required></t-select><t-checkbox label="Logging" name="logging" checked></t-checkbox></fieldset><button type="submit">Save</button><button type="reset">Reset</button><output></output></form>',
  );
  await page.locator('t-select').evaluate((el: any) => {
    el.options = [
      { value: '', label: 'Choose' },
      { value: 'app', label: 'Application' },
    ];
  });
  await page.locator('form').evaluate((el: HTMLFormElement) => {
    el.addEventListener('submit', (event) => {
      event.preventDefault();
      el.querySelector('output')!.textContent = JSON.stringify(
        Object.fromEntries(new FormData(el)),
      );
    });
  });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('t-input[name=name]')).toHaveAttribute('invalid', '');
  await page.getByRole('textbox', { name: 'Name', exact: false }).fill('Explorer');
  await page.getByRole('textbox', { name: 'Email', exact: false }).fill('invalid');
  await page.getByRole('combobox').selectOption('app');
  expect(await page.locator('form').evaluate((el: HTMLFormElement) => el.checkValidity())).toBe(
    false,
  );
  await page.getByRole('textbox', { name: 'Email', exact: false }).fill('crew@example.com');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('output')).toContainText('"name":"Explorer"');
  await expect(page.locator('output')).toContainText('"destination":"app"');
  await expect(page.locator('output')).toContainText('"logging":"on"');
  await page.getByRole('checkbox').uncheck();
  expect(
    await page.locator('form').evaluate((el: HTMLFormElement) => new FormData(el).has('logging')),
  ).toBe(false);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Name', exact: false })).toHaveValue('');
  await expect(page.getByRole('checkbox')).toBeChecked();
  await page.locator('fieldset').evaluate((el: HTMLFieldSetElement) => (el.disabled = true));
  await expect(page.getByRole('textbox', { name: 'Name', exact: false })).toBeDisabled();
  expect(
    await page.locator('form').evaluate((el: HTMLFormElement) => [...new FormData(el).keys()]),
  ).toEqual([]);
  await page.locator('fieldset').evaluate((el: HTMLFieldSetElement) => (el.disabled = false));
  await page.locator('t-input[name=name]').evaluate((el: any) => (el.value = 'Updated from JS'));
  await expect(page.getByRole('textbox', { name: 'Name', exact: false })).toHaveValue(
    'Updated from JS',
  );
});

test('tabs skip disabled items, wrap, and maintain one tab stop', async ({ page }) => {
  await fixture(
    page,
    '<t-tabs label="Sections"><p slot="one">First panel</p><p slot="two">Second panel</p><p slot="three">Third panel</p></t-tabs>',
  );
  await page.locator('t-tabs').evaluate(
    (el: any) =>
      (el.tabs = [
        { id: 'one', label: 'One' },
        { id: 'two', label: 'Two', disabled: true },
        { id: 'three', label: 'Three' },
      ]),
  );
  await page.getByRole('tab', { name: 'One', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Three', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Three', exact: true })).toBeVisible();
  await expect(page.getByText('Third panel', { exact: true })).toBeVisible();
  await expect(page.getByText('First panel', { exact: true })).not.toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'One', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Three', exact: true })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'One', exact: true })).toBeFocused();
  await expect(page.locator('t-tabs [role=tab][tabindex="0"]')).toHaveCount(1);
});

test('dialog moves focus to its actions, closes on Escape, and restores focus', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open dialog' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close dialog', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Discard demo', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('tooltip, disclosure, and dismissible notice respond to keyboard', async ({ page }) => {
  await fixture(
    page,
    '<t-tooltip label="Help" message="Details here"></t-tooltip><t-accordion label="More">Expanded content</t-accordion><t-alert dismissible>Notice</t-alert>',
  );
  await page.getByRole('button', { name: 'Help', exact: true }).focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).not.toBeVisible();
  await page.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Expanded content')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss notice', exact: true }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('demo preferences persist and form submission reports real values', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Phosphor', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Compact', exact: true }).check();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'phosphor');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  await page.getByRole('textbox', { name: 'Callsign', exact: false }).fill('Explorer');
  await page.getByRole('combobox', { name: 'Destination', exact: false }).selectOption('website');
  await page.getByRole('button', { name: 'Save configuration', exact: true }).click();
  await expect(page.locator('.event-console')).toContainText('Explorer / website');
  await page.getByRole('tab', { name: 'Specification', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A small, explicit API.', exact: true }),
  ).toBeVisible();
});

for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
  test(`theme ${theme}: automated accessibility and responsive layout`, async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: theme[0].toUpperCase() + theme.slice(1), exact: true })
      .click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    await testInfo.attach('axe-demo-review-needed.json', {
      body: JSON.stringify(results.incomplete, null, 2),
      contentType: 'application/json',
    });
    await page.getByRole('checkbox', { name: 'Bold lines', exact: true }).check();
    await page.locator('.display-settings summary').click();
    await page.getByRole('combobox', { name: 'Phosphor glow', exact: true }).selectOption('strong');
    await page
      .getByRole('combobox', { name: 'Screen scanlines', exact: true })
      .selectOption('pronounced');
    const effectsResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(effectsResults.violations).toEqual([]);
    await testInfo.attach('axe-demo-effects-review-needed.json', {
      body: JSON.stringify(effectsResults.incomplete, null, 2),
      contentType: 'application/json',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(
      page.getByRole('button', { name: 'Save configuration', exact: true }),
    ).toBeVisible();
  });
}
