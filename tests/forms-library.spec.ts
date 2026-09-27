import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectAxeReport } from './helpers/axe-evidence';

async function fixture(page: Page, markup: string) {
  // Other workers can edit source while this fixture runs. Keep Vite reloads
  // from replacing the document midway through an interaction.
  await page.route('**/@vite/client', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' }),
  );
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.evaluate(async () => {
    for (const name of ['textarea', 'radio-group', 'range', 'switch', 'combobox', 'file-input']) {
      await import(`/src/components/${name}.ts`);
    }
  });
  await page.locator('#fixture').evaluate((element, html) => {
    element.innerHTML = html;
  }, markup);
}

test('new controls submit, reset initial properties, and honor disabled fieldsets', async ({
  page,
}) => {
  await fixture(
    page,
    `<form><fieldset><t-textarea label="Notes" name="notes" value="Initial" required></t-textarea>
    <t-radio-group label="Mode" name="mode" value="a" required></t-radio-group>
    <t-range label="Volume" name="volume" value="30" min="0" max="100" step="10"></t-range>
    <t-switch label="Alerts" name="alerts" checked></t-switch></fieldset><t-button type="reset">Reset</t-button></form>`,
  );
  await page.locator('t-radio-group').evaluate((element: any) => {
    element.options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ];
  });
  await page.getByRole('textbox', { name: 'Notes' }).fill('Updated');
  await page.getByRole('radio', { name: 'Beta' }).check();
  await page.getByRole('slider').focus();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('switch').uncheck();
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => Object.fromEntries(new FormData(form))),
  ).toEqual({ notes: 'Updated', mode: 'b', volume: '40' });
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByRole('textbox')).toHaveValue('Initial');
  await expect(page.getByRole('radio', { name: 'Alpha' })).toBeChecked();
  await expect(page.getByRole('switch')).toBeChecked();
  await expect(page.getByRole('slider')).toHaveValue('30');
  await page
    .locator('fieldset')
    .first()
    .evaluate((element: HTMLFieldSetElement) => {
      element.disabled = true;
    });
  await expect(page.getByRole('textbox')).toBeDisabled();
  await expect(page.getByRole('switch')).toBeDisabled();
  expect(
    await page.locator('form').evaluate((form: HTMLFormElement) => [...new FormData(form)]),
  ).toEqual([]);
});

test('initial property values survive reset and constraint APIs work', async ({ page }) => {
  await fixture(page, '<form></form>');
  await page.locator('form').evaluate((form) => {
    const textarea = document.createElement('t-textarea');
    textarea.label = 'Notes';
    textarea.name = 'notes';
    textarea.value = 'Property default';
    textarea.required = true;
    const checkbox = document.createElement('t-switch');
    checkbox.label = 'Enabled';
    checkbox.checked = true;
    form.append(textarea, checkbox);
  });
  await page.getByRole('textbox').fill('');
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
  await page.getByRole('textbox').fill('Valid');
  await page
    .locator('t-textarea')
    .evaluate((element: any) => element.setCustomValidity('Review this value.'));
  expect(
    await page.locator('t-textarea').evaluate((element: any) => element.validationMessage),
  ).toBe('Review this value.');
  await page.locator('t-textarea').evaluate((element: any) => element.setCustomValidity(''));
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    true,
  );
  await page.getByRole('switch').uncheck();
  await page.locator('form').evaluate((form: HTMLFormElement) => form.reset());
  await expect(page.getByRole('textbox')).toHaveValue('Property default');
  await expect(page.getByRole('switch')).toBeChecked();
});

test('combobox handles constrained keyboard selection, async options, and empty results', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><t-combobox label="Destination" name="destination" required></t-combobox></form>',
  );
  await page.locator('t-combobox').evaluate((element: any) => {
    element.options = [
      { value: 'a', label: 'Alpha', disabled: true },
      { value: 'b', label: 'Beta' },
      { value: 'c', label: 'Charlie' },
    ];
  });
  const input = page.getByRole('combobox');
  await input.focus();
  await page.keyboard.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', 'option-1');
  await page.keyboard.press('Enter');
  await expect(input).toHaveValue('Beta');
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).get('destination')),
  ).toBe('b');
  await input.fill('unknown');
  await expect(page.getByRole('status')).toHaveText('No options found.');
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).has('destination')),
  ).toBe(false);
  await page.locator('t-combobox').evaluate((element: any) => {
    element.options = [{ value: 'new', label: 'Unknown station' }];
  });
  await expect(page.getByRole('option')).toHaveText('Unknown station');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(input).toHaveValue('Unknown station');
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).get('destination')),
  ).toBe('new');
  await page.locator('t-combobox').evaluate((element: any) => {
    element.options = [];
  });
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
});

test('combobox selection has standard events and Escape preserves textbox editing', async ({
  page,
}) => {
  await fixture(page, '<t-combobox label="Station"></t-combobox>');
  await page.locator('t-combobox').evaluate((element: any) => {
    element.options = [
      { value: 'one', label: 'One' },
      { value: 'two', label: 'Two' },
    ];
    element.events = [];
    for (const type of ['input', 'change'])
      element.addEventListener(type, (event: Event) =>
        element.events.push({
          type: event.type,
          standard: !(event instanceof CustomEvent),
          composed: event.composed,
        }),
      );
  });
  await page.getByRole('combobox').focus();
  await page.getByRole('option', { name: 'Two' }).click();
  expect(await page.locator('t-combobox').evaluate((element: any) => element.events)).toEqual([
    { type: 'input', standard: true, composed: true },
    { type: 'change', standard: true, composed: true },
  ]);
  await page.getByRole('combobox').click();
  await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('combobox').fill('draft');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('combobox')).toHaveValue('draft');
});

test('file selection submits native files and reset clears them', async ({ page }) => {
  await fixture(
    page,
    '<form><t-file-input label="Attachments" name="attachments" multiple required></t-file-input></form>',
  );
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
  await page.locator('input[type=file]').setInputFiles([
    { name: 'one.txt', mimeType: 'text/plain', buffer: Buffer.from('one') },
    { name: 'two.txt', mimeType: 'text/plain', buffer: Buffer.from('two') },
  ]);
  expect(
    await page.locator('form').evaluate(async (form: HTMLFormElement) =>
      Promise.all(
        new FormData(form).getAll('attachments').map(async (entry) => ({
          name: (entry as File).name,
          content: await (entry as File).text(),
        })),
      ),
    ),
  ).toEqual([
    { name: 'one.txt', content: 'one' },
    { name: 'two.txt', content: 'two' },
  ]);
  expect(await page.locator('t-file-input').evaluate((element: any) => element.files.length)).toBe(
    2,
  );
  await page.locator('form').evaluate((form: HTMLFormElement) => form.reset());
  await expect(page.locator('input[type=file]')).toHaveValue('');
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => (new FormData(form).get('attachments') as File).name),
  ).toBe('');
});

test('submit buttons preserve validation, external forms, submitter values, and cancellation', async ({
  page,
}) => {
  await fixture(
    page,
    '<form id="settings"><t-input name="title" label="Title" required></t-input><output></output></form><t-button form="settings" type="submit" name="action" value="save">Save</t-button>',
  );
  await page.locator('form').evaluate((form: HTMLFormElement) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      form.querySelector('output')!.textContent = JSON.stringify(
        Object.fromEntries(new FormData(form, (event as SubmitEvent).submitter)),
      );
    });
  });
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('output')).toBeEmpty();
  await page.getByRole('textbox').fill('Ready');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('output')).toHaveText('{"title":"Ready","action":"save"}');
  await page.locator('output').evaluate((element) => {
    element.textContent = '';
  });
  await page
    .locator('t-button')
    .evaluate((element) =>
      element.addEventListener('click', (event) => event.preventDefault(), { once: true }),
    );
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('output')).toBeEmpty();
  await page.getByRole('textbox').press('Enter');
  await expect(page.locator('output')).toContainText('"action":"save"');
});

test('implicit submit never bypasses disabled fieldsets or their first submit button', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><t-input label="Name"></t-input><fieldset disabled><button type="submit">Native save</button><t-button type="submit">Custom save</t-button></fieldset><output>0</output></form>',
  );
  await page.locator('form').evaluate((form: HTMLFormElement) =>
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      form.querySelector('output')!.textContent = '1';
    }),
  );
  await expect(page.getByRole('button', { name: 'Custom save' })).toBeDisabled();
  await page.getByRole('textbox').press('Enter');
  await expect(page.locator('output')).toHaveText('0');
  await page
    .locator('button')
    .filter({ hasText: 'Native save' })
    .evaluate((element) => element.remove());
  await page.getByRole('textbox').press('Enter');
  await expect(page.locator('output')).toHaveText('0');
  await page.locator('fieldset').evaluate((element: HTMLFieldSetElement) => {
    element.disabled = false;
  });
  await page.getByRole('textbox').press('Enter');
  await expect(page.locator('output')).toHaveText('1');
});

test('native constraints, radio keyboard navigation, and range clamping', async ({ page }) => {
  await fixture(
    page,
    '<form><t-input type="number" label="Count" min="2" max="10" step="2" value="3"></t-input><t-input label="Code" pattern="[A-Z]{3}" value="abc"></t-input><t-radio-group label="Channel" required></t-radio-group><t-range label="Level" value="200" max="10"></t-range></form>',
  );
  await page.locator('t-radio-group').evaluate((element: any) => {
    element.options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta', disabled: true },
      { value: 'c', label: 'Charlie' },
    ];
  });
  expect(
    await page
      .locator('t-input')
      .first()
      .evaluate((element: any) => element.validity.stepMismatch),
  ).toBe(true);
  expect(
    await page
      .locator('t-input')
      .nth(1)
      .evaluate((element: any) => element.validity.patternMismatch),
  ).toBe(true);
  await expect(page.getByRole('slider')).toHaveValue('10');
  await page.getByRole('radio', { name: 'Alpha' }).check();
  await page.getByRole('radio', { name: 'Alpha' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Charlie' })).toBeChecked();
  expect(await page.locator('t-radio-group').evaluate((element: any) => element.value)).toBe('c');
});

test('new form controls expose labels and pass automated accessibility checks', async ({
  page,
}) => {
  await fixture(
    page,
    '<t-textarea label="Notes" help="Describe the change."></t-textarea><t-radio-group label="Mode"></t-radio-group><t-range label="Volume"></t-range><t-switch label="Alerts"></t-switch><t-combobox label="Destination"></t-combobox><t-file-input label="Attachments"></t-file-input>',
  );
  await page.locator('t-radio-group').evaluate((element: any) => {
    element.options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ];
  });
  await page.locator('t-combobox').evaluate((element: any) => {
    element.options = [{ value: 'a', label: 'Alpha' }];
  });
  await page.getByRole('combobox').focus();
  await expectAxeReport(
    await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze(),
  );
});

test('own disabled toggles recover across controls and preserve ancestor disabling', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><fieldset><t-input label="Name"></t-input><t-select label="Destination"></t-select><t-checkbox label="Confirm"></t-checkbox><t-textarea label="Notes"></t-textarea><t-radio-group label="Mode"></t-radio-group><t-range label="Level"></t-range><t-switch label="Alerts"></t-switch><t-combobox label="Station"></t-combobox><t-file-input label="Files"></t-file-input><t-button>Action</t-button></fieldset></form>',
  );
  await page.locator('t-radio-group').evaluate((element: any) => {
    element.options = [{ value: 'a', label: 'Alpha' }];
  });
  await page.locator('form > fieldset').evaluate(async (fieldset) => {
    for (const control of Array.from(fieldset.children) as any[]) control.disabled = true;
    await Promise.all(Array.from(fieldset.children).map((control: any) => control.updateComplete));
  });
  await expect(
    page.locator('input:disabled, textarea:disabled, select:disabled, button:disabled'),
  ).toHaveCount(10);
  await page.locator('form > fieldset').evaluate(async (fieldset) => {
    for (const control of Array.from(fieldset.children) as any[]) control.disabled = false;
    await Promise.all(Array.from(fieldset.children).map((control: any) => control.updateComplete));
  });
  await expect(
    page.locator('input:disabled, textarea:disabled, select:disabled, button:disabled'),
  ).toHaveCount(0);
  await page.locator('form > fieldset').evaluate((fieldset: HTMLFieldSetElement) => {
    fieldset.disabled = true;
  });
  await page.locator('t-input').evaluate((control: any) => {
    control.disabled = true;
  });
  await page.locator('t-input').evaluate((control: any) => {
    control.disabled = false;
  });
  await expect(page.locator('t-input input')).toBeDisabled();
  await page.locator('t-input').evaluate((control: any) => {
    control.disabled = true;
  });
  await page.locator('form > fieldset').evaluate((fieldset: HTMLFieldSetElement) => {
    fieldset.disabled = false;
  });
  await expect(page.locator('t-input input')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Action' })).toBeEnabled();
});

test('combobox placeholder options cannot validate unmatched input', async ({ page }) => {
  await fixture(
    page,
    '<form><t-combobox name="choice" label="Choice" required></t-combobox></form>',
  );
  await page.locator('t-combobox').evaluate((element: any) => {
    element.options = [
      { value: '', label: 'Choose a value' },
      { value: 'a', label: 'Alpha' },
    ];
  });
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
  await page.getByRole('combobox').fill('unlisted');
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).has('choice')),
  ).toBe(false);
});

test('combobox escapes clipping, follows its anchor, and stays within viewport edges', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await fixture(
    page,
    '<div id="clip" style="position:fixed;right:0;bottom:0;width:220px;height:80px;overflow:hidden"><t-combobox label="Destination"></t-combobox><div style="height:300px"></div></div>',
  );
  await page.locator('t-combobox').evaluate((element: any) => {
    element.options = Array.from({ length: 20 }, (_, index) => ({
      value: String(index),
      label: `Station ${index}`,
    }));
  });
  const input = page.getByRole('combobox');
  const panel = page.locator('t-combobox [popover]');
  await input.focus();
  await expect(panel).toBeVisible();
  await expect(input).toBeFocused();
  expect(await panel.evaluate((element) => element.matches(':popover-open'))).toBe(true);
  const anchor = await input.boundingBox();
  const box = await panel.boundingBox();
  expect(box!.width).toBeCloseTo(anchor!.width, 0);
  expect(box!.height).toBeLessThanOrEqual(240);
  expect(box!.y + box!.height).toBeLessThan(anchor!.y);
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.x + box!.width).toBeLessThanOrEqual(382);
  await page.locator('#clip').evaluate((element) => {
    element.scrollTop = 12;
  });
  await expect.poll(async () => (await panel.boundingBox())!.y).toBeLessThan(box!.y - 10);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await expect(input).toHaveAttribute('aria-activedescendant', 'option-19');
  await page.keyboard.press('Enter');
  await expect(input).toHaveValue('Station 19');
  await expect(input).toBeFocused();
  await expect(panel).not.toBeVisible();
  await input.click();
  await page.setViewportSize({ width: 320, height: 480 });
  await expect
    .poll(async () => {
      const bounds = await panel.boundingBox();
      return bounds ? bounds.x + bounds.width : Infinity;
    })
    .toBeLessThanOrEqual(312);
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
});

test('combobox closes on disable and disconnect, then reopens after reconnect', async ({
  page,
}) => {
  await fixture(page, '<t-combobox label="Destination"></t-combobox><button>Outside</button>');
  await page.locator('t-combobox').evaluate((element: any) => {
    element.options = [{ value: 'a', label: 'Alpha' }];
  });
  const input = page.getByRole('combobox');
  const panel = page.locator('t-combobox [popover]');
  await input.focus();
  await expect(panel).toBeVisible();
  await page.locator('t-combobox').evaluate((element: any) => {
    element.disabled = true;
  });
  await expect(panel).not.toBeVisible();
  await page.locator('t-combobox').evaluate((element: any) => {
    element.disabled = false;
  });
  await input.focus();
  await expect(panel).toBeVisible();
  await page.locator('t-combobox').evaluate((element: any) => {
    const parent = element.parentElement;
    element.remove();
    parent.append(element);
  });
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).not.toBeVisible();
  await input.focus();
  await expect(panel).toBeVisible();
  await page.getByRole('button', { name: 'Outside' }).focus();
  await expect(panel).not.toBeVisible();
});
