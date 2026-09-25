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

test('native choices support keyboard, filtering, events, FormData and reset', async ({ page }) => {
  await fixture(
    page,
    '<form><t-multi-select name="departments" label="Departments" help="Choose departments." searchable required value=\'["archive"]\'></t-multi-select></form>',
  );
  await page.locator('t-multi-select').evaluate((element: any) => {
    element.options = [
      { value: 'archive', label: 'Archive' },
      { value: 'engineering', label: 'Engineering' },
      { value: 'restricted', label: 'Restricted', disabled: true },
    ];
    element.events = [];
    element.addEventListener('input', () => element.events.push('input'));
    element.addEventListener('change', () => element.events.push('change'));
  });
  const archive = page.getByRole('checkbox', { name: 'Archive' });
  const engineering = page.getByRole('checkbox', { name: 'Engineering' });
  const restricted = page.getByRole('checkbox', { name: 'Restricted' });
  await expect(archive).toBeChecked();
  await expect(restricted).toBeDisabled();
  await expect(archive).toHaveAccessibleDescription('Choose departments.');
  await engineering.focus();
  await page.keyboard.press('Space');
  await expect(engineering).toBeChecked();
  expect(await page.locator('t-multi-select').evaluate((element: any) => element.values)).toEqual([
    'archive',
    'engineering',
  ]);
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).getAll('departments')),
  ).toEqual(['archive', 'engineering']);
  expect(await page.locator('t-multi-select').evaluate((element: any) => element.events)).toEqual([
    'input',
    'change',
  ]);
  await page.getByRole('searchbox', { name: 'Filter Departments' }).fill('engine');
  await expect(engineering).toBeVisible();
  await expect(archive).toHaveCount(0);
  expect(await page.locator('t-multi-select').evaluate((element: any) => element.values)).toEqual([
    'archive',
    'engineering',
  ]);
  await page.locator('form').evaluate((form: HTMLFormElement) => form.reset());
  await expect(archive).toBeChecked();
  await expect(engineering).not.toBeChecked();
  await expect(page.getByRole('searchbox', { name: 'Filter Departments' })).toHaveValue('');
  expect(await page.locator('t-multi-select').evaluate((element: any) => element.values)).toEqual([
    'archive',
  ]);
});

test('live options keep focus on the same choice or move it within the named group', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><t-multi-select name="teams" label="Teams"></t-multi-select></form><button id="after">After</button>',
  );
  const host = page.locator('t-multi-select');
  await host.evaluate((element: import('../src').TMultiSelect) => {
    element.options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
      { value: 'c', label: 'Gamma' },
    ];
    element.values = ['b'];
  });
  await page.getByRole('checkbox', { name: 'Beta' }).focus();
  await host.evaluate((element: import('../src').TMultiSelect) => {
    element.options = [
      { value: 'b', label: 'Beta' },
      { value: 'c', label: 'Gamma' },
      { value: 'a', label: 'Alpha' },
    ];
  });
  await expect(page.getByRole('checkbox', { name: 'Beta' })).toBeFocused();
  await expect(page.getByRole('checkbox', { name: 'Beta' })).toBeChecked();
  await host.evaluate((element: import('../src').TMultiSelect) => {
    element.options = [
      { value: 'b', label: 'Beta', disabled: true },
      { value: 'c', label: 'Gamma' },
      { value: 'a', label: 'Alpha' },
    ];
  });
  await expect(page.getByRole('checkbox', { name: 'Gamma' })).toBeFocused();
  await host.evaluate((element: import('../src').TMultiSelect) => {
    element.options = [];
  });
  await expect(page.getByRole('group', { name: 'Teams' })).toBeFocused();
  await host.evaluate((element: import('../src').TMultiSelect) => {
    element.options = [{ value: 'd', label: 'Delta' }];
  });
  await expect(page.getByRole('checkbox', { name: 'Delta' })).toBeFocused();
  await page.locator('#after').focus();
  await host.evaluate((element: import('../src').TMultiSelect) => {
    element.options = [{ value: 'e', label: 'Echo' }];
  });
  await expect(page.locator('#after')).toBeFocused();
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).getAll('teams')),
  ).toEqual([]);
  const axe = await new AxeBuilder({ page }).include('t-multi-select').analyze();
  expect(axe.violations, JSON.stringify(axe.violations)).toEqual([]);
});

test('required and custom errors target the actual choices and clear on correction', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><t-multi-select name="teams" label="Teams" required searchable></t-multi-select><button type="submit">Save</button></form>',
  );
  const host = page.locator('t-multi-select');
  await host.evaluate((element: any) => {
    element.options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ];
  });
  await expect.poll(() => host.evaluate((element: any) => element.checkValidity())).toBe(false);
  await expect(page.getByRole('group', { name: 'Teams required' })).toBeVisible();
  await page.getByRole('button', { name: 'Save' }).click();
  const alpha = page.getByRole('checkbox', { name: 'Alpha' });
  await expect(alpha).toBeFocused();
  await expect(alpha).toHaveAttribute('aria-invalid', 'true');
  await expect(alpha).toHaveAccessibleDescription('Choose at least one option.');
  await alpha.check();
  await expect(alpha).toHaveAttribute('aria-invalid', 'false');
  await expect.poll(() => host.evaluate((element: any) => element.checkValidity())).toBe(true);
  await host.evaluate((element: any) => element.setCustomValidity('This team is unavailable.'));
  await expect(alpha).toHaveAccessibleDescription('This team is unavailable.');
  await host.evaluate((element: any) => element.setCustomValidity(''));
  await expect(alpha).toHaveAccessibleDescription('');
  await host.evaluate((element: any) => {
    element.values = ['b'];
  });
  await expect(page.getByRole('checkbox', { name: 'Beta' })).toBeChecked();
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).getAll('teams')),
  ).toEqual(['b']);
});

test('an empty required choice group remains a focusable validation target', async ({ page }) => {
  await fixture(
    page,
    '<form><t-multi-select name="teams" label="Teams" required></t-multi-select><button type="submit">Save</button></form>',
  );
  await page.getByRole('button', { name: 'Save' }).click();
  const group = page.getByRole('group', { name: 'Teams required' });
  await expect(group).toBeFocused();
  await expect(group).toHaveAccessibleDescription('Choose at least one option.');
  await expect(group).toHaveCSS('outline-width', '2px');
  const axe = await new AxeBuilder({ page }).include('t-multi-select').analyze();
  expect(axe.violations, JSON.stringify(axe.violations)).toEqual([]);
});

test('disabled and unavailable options do not submit; palettes have no axe violations', async ({
  page,
}, testInfo) => {
  await fixture(
    page,
    '<form><t-multi-select name="teams" label="Teams" searchable></t-multi-select></form>',
  );
  const host = page.locator('t-multi-select');
  await host.evaluate((element: any) => {
    element.options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta', disabled: true },
    ];
    element.values = ['a', 'b', 'missing'];
  });
  await expect(page.getByRole('checkbox', { name: 'Alpha' })).toBeChecked();
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).getAll('teams')),
  ).toEqual(['a']);
  await host.evaluate((element: any) => {
    element.disabled = true;
  });
  await expect(page.getByRole('checkbox', { name: 'Alpha' })).toBeDisabled();
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).getAll('teams')),
  ).toEqual([]);
  await host.evaluate((element: any) => {
    element.disabled = false;
    element.values = ['a'];
  });
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, value) => element.setAttribute('data-theme', value), theme);
    const results = await new AxeBuilder({ page }).include('t-multi-select').analyze();
    expect(results.violations, `${theme}: ${JSON.stringify(results.violations)}`).toEqual([]);
    if (results.incomplete.length)
      await testInfo.attach(`${theme}-multi-select-axe-review`, {
        body: JSON.stringify(results.incomplete, null, 2),
        contentType: 'application/json',
      });
  }
});

test('host focus skips disabled choices and outer disabled fieldsets suppress form data', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><fieldset><t-multi-select name="teams" label="Teams"></t-multi-select></fieldset></form>',
  );
  const host = page.locator('t-multi-select');
  await host.evaluate((element: any) => {
    element.options = [
      { value: 'a', label: 'Alpha', disabled: true },
      { value: 'b', label: 'Beta' },
    ];
    element.values = ['b'];
  });
  await host.evaluate((element: any) => element.focus());
  await expect(page.getByRole('checkbox', { name: 'Beta' })).toBeFocused();
  await page.locator('form > fieldset').evaluate((element: HTMLFieldSetElement) => {
    element.disabled = true;
  });
  await expect(page.getByRole('checkbox', { name: 'Beta' })).toBeDisabled();
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).getAll('teams')),
  ).toEqual([]);
});

test('malformed JSON value is reported and a values update recovers', async ({ page }) => {
  await fixture(
    page,
    '<form><t-multi-select name="teams" label="Teams" value="not-json"></t-multi-select></form>',
  );
  const host = page.locator('t-multi-select');
  await host.evaluate((element: any) => {
    element.options = [{ value: 'a', label: 'Alpha' }];
  });
  await expect(page.getByRole('checkbox', { name: 'Alpha' })).toHaveAccessibleDescription(
    'The value must be a JSON array of strings.',
  );
  await expect.poll(() => host.evaluate((element: any) => element.checkValidity())).toBe(false);
  await host.evaluate((element: any) => {
    element.values = ['a'];
  });
  await expect(page.getByRole('checkbox', { name: 'Alpha' })).toBeChecked();
  await expect.poll(() => host.evaluate((element: any) => element.checkValidity())).toBe(true);
});

test('narrow layout keeps every choice and filter reachable with enlarged text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await fixture(
    page,
    '<t-multi-select label="Departments with long names" searchable></t-multi-select>',
  );
  await page.locator('t-multi-select').evaluate((element: any) => {
    element.options = [
      { value: 'a', label: 'A department with a very long descriptive name' },
      { value: 'b', label: 'Another department with a very long descriptive name' },
    ];
  });
  await page.locator('t-multi-select').evaluate((element: HTMLElement) => {
    for (const node of element.shadowRoot!.querySelectorAll<HTMLElement>(
      'legend,.filter-label span,.option span,.help',
    )) {
      const size = Number.parseFloat(getComputedStyle(node).fontSize);
      node.style.fontSize = `${size * 2}px`;
      node.style.lineHeight = '1.5';
      node.style.letterSpacing = '.12em';
      node.style.wordSpacing = '.16em';
    }
  });
  await expect(
    page.getByRole('checkbox', { name: 'A department with a very long descriptive name' }),
  ).toBeVisible();
  await expect(
    page.getByRole('searchbox', { name: 'Filter Departments with long names' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
