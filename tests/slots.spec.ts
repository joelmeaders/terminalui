import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import type { TInput } from '../src/components/input';
import type { TToast } from '../src/components/toast';

const icon = (slot: string, name = 'search') => `<t-icon slot="${slot}" name="${name}"></t-icon>`;
const inlineTags = ['button', 'link', 'badge', 'accordion', 'menu', 'popover'];
const fieldTags = ['input', 'password-input', 'number-input', 'select', 'combobox'];
async function mount(page: Page, content: string) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((el, content) => {
    el.innerHTML = content;
  }, content);
  await page.locator('#fixture').evaluate(async (el) => {
    for (const child of el.querySelectorAll('*')) await (child as TInput).updateComplete;
  });
}
const gallery = () =>
  `<div style="display:grid;gap:20px">${inlineTags.map((tag) => `<t-${tag} label="Details" href="#details">${icon('start')}${tag === 'button' || tag === 'link' || tag === 'badge' ? 'Details' : ''}${icon('end', 'chevron-right')}</t-${tag}>`).join('')}${fieldTags.map((tag) => `<t-${tag} label="${tag}" value="2" name="${tag}">${icon('start')}<span slot="end">units</span></t-${tag}>`).join('')}<t-alert>${icon('icon', 'check')}Settings saved.</t-alert><t-toast message="Configuration saved" open>${icon('icon', 'check')}<t-button slot="actions" variant="secondary">Undo</t-button></t-toast></div>`;

test('inline slots assign icons and preserve native names, click, submit, and disclosure behavior', async ({
  page,
}) => {
  await mount(
    page,
    `<form><t-button type="submit" name="action" value="save">${icon('start', 'check')}Save${icon('end', 'chevron-right')}</t-button></form><t-accordion label="Details">${icon('start', 'info')}Read the details.</t-accordion><t-link href="#details">${icon('start')}Read details</t-link>`,
  );
  await page.locator('form').evaluate((form) =>
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      (form as HTMLElement).dataset.result = JSON.stringify(
        Object.fromEntries(new FormData(form as HTMLFormElement, (event as SubmitEvent).submitter)),
      );
    }),
  );
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(1);
  await page.locator('t-button t-icon[slot=start]').click();
  await expect(page.locator('form')).toHaveAttribute('data-result', '{"action":"save"}');
  await page.getByRole('button', { name: 'Save', exact: true }).press('Space');
  await page.locator('t-accordion summary').press('Enter');
  await expect(page.locator('t-accordion details')).toHaveAttribute('open', '');
  await expect(page.getByRole('link', { name: 'Read details', exact: true })).toBeVisible();
  for (const slot of await page.locator('t-button slot[name]').all())
    expect(await slot.evaluate((el: HTMLSlotElement) => el.assignedElements().length)).toBe(1);
});

test('fallback status symbols return after dynamic icon removal; empty start/end slots add no gaps', async ({
  page,
}) => {
  await mount(
    page,
    '<t-badge id="plain">Ready</t-badge><t-badge id="changing">Ready</t-badge><t-alert>Saved.</t-alert><t-button>Action</t-button>',
  );
  const before = await page.locator('#changing').boundingBox();
  await page.locator('#changing').evaluate((el) => {
    el.insertAdjacentHTML('afterbegin', '<t-icon slot="start" name="check"></t-icon>');
  });
  await expect(page.locator('#changing .dot')).not.toBeVisible();
  await expect(page.locator('#changing t-icon svg')).toBeVisible();
  await page.locator('#changing t-icon').evaluate((el) => el.remove());
  await expect(page.locator('#changing .dot')).toBeVisible();
  expect((await page.locator('#changing').boundingBox())!.width).toBe(before!.width);
  await page
    .locator('t-alert')
    .evaluate((el) =>
      el.insertAdjacentHTML('afterbegin', '<t-icon slot="icon" name="check"></t-icon>'),
    );
  await expect(page.locator('t-alert t-icon svg')).toBeVisible();
  await page.locator('t-alert t-icon').evaluate((el) => el.remove());
  await expect(page.locator('t-alert .symbol')).toHaveText('ⓘ');
});

test('field affixes preserve labels, help, form values, validation and reset', async ({ page }) => {
  await mount(
    page,
    `<form>${fieldTags.map((tag) => `<t-${tag} name="${tag}" label="${tag}" help="Instructions for ${tag}" required value="2">${icon('start')}<span slot="end">units</span></t-${tag}>`).join('')}<button type="reset">Reset</button></form>`,
  );
  await page.locator('t-select,t-combobox').evaluateAll((elements) =>
    elements.forEach((el) => {
      (el as any).options = [
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' },
      ];
    }),
  );
  for (const tag of fieldTags) {
    const host = page.locator(`t-${tag}`);
    const control = host.locator('input,select').first();
    await expect(control).toHaveAccessibleName(tag);
    await expect(control).toHaveAccessibleDescription(`Instructions for ${tag}`);
    await host.locator('label').click();
    await expect(control).toBeFocused();
    if (tag === 'select') await control.selectOption('3');
    else if (tag === 'combobox') {
      await control.fill('Thr');
      await control.press('ArrowDown');
      await control.press('Enter');
    } else await control.fill('3');
  }
  expect(
    await page
      .locator('form')
      .evaluate((form) => Object.fromEntries(new FormData(form as HTMLFormElement))),
  ).toEqual(Object.fromEntries(fieldTags.map((tag) => [tag, '3'])));
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  expect(
    await page
      .locator('form')
      .evaluate((form) => Object.fromEntries(new FormData(form as HTMLFormElement))),
  ).toEqual(Object.fromEntries(fieldTags.map((tag) => [tag, '2'])));
  const host = page.locator('t-input');
  await host.locator('input').fill('');
  expect(await host.evaluate((el: TInput) => el.checkValidity())).toBe(false);
  await expect(host.locator('input')).toHaveAttribute('aria-invalid', 'true');
});

test('slotted actions have their own keyboard stop and become inert in disabled fields without losing author state', async ({
  page,
}) => {
  await mount(
    page,
    `<form><fieldset><t-input label="Search" name="query" value="initial">${icon('start')}<button slot="end" type="button">Clear search</button></t-input><t-select label="Destination"><t-icon-button slot="end" label="Destination help" name="info"></t-icon-button></t-select></fieldset><button type="button" id="after">After</button></form>`,
  );
  await page.locator('t-input button').evaluate((button) =>
    button.addEventListener('click', () => {
      (button.parentElement as TInput).value = '';
      (button.parentElement as TInput).focus();
    }),
  );
  await page.getByRole('textbox', { name: 'Search', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Clear search', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Search', exact: true })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'Search', exact: true })).toBeFocused();
  await page.locator('fieldset').evaluate((el) => {
    (el as HTMLFieldSetElement).disabled = true;
  });
  await expect(page.locator('t-input slot[name=end]')).toHaveAttribute('inert', '');
  await expect(page.locator('t-select slot[name=end]')).toHaveAttribute('inert', '');
  await page.locator('#after').focus();
  await page.keyboard.press('Shift+Tab');
  expect(
    await page
      .locator('t-input button,t-icon-button button')
      .evaluateAll((elements) => elements.some((el) => el.matches(':focus'))),
  ).toBe(false);
  expect(
    await page.locator('form').evaluate((form) => [...new FormData(form as HTMLFormElement)]),
  ).toEqual([]);
  await page.locator('fieldset').evaluate((el) => {
    (el as HTMLFieldSetElement).disabled = false;
  });
  await expect(page.locator('t-input slot[name=end]')).not.toHaveAttribute('inert', '');
  await expect(page.locator('t-input button')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Destination help', exact: true })).toBeEnabled();
});

test('dynamic affixes resize the frame without replacing a focused input or its selection', async ({
  page,
}) => {
  await mount(page, '<t-input label="Callsign" value="EXPLORER"></t-input>');
  const host = page.locator('t-input');
  const before = await host.locator('input').boundingBox();
  await host.locator('input').focus();
  await host.evaluate((el) => {
    const input = el.shadowRoot!.querySelector('input')!;
    input.setSelectionRange(2, 5);
    (window as any).savedInput = input;
    el.insertAdjacentHTML('afterbegin', '<t-icon slot="start" name="user"></t-icon>');
  });
  await expect(host.locator('slot[name=start]')).toHaveAttribute('data-filled', '');
  expect((await host.locator('input').boundingBox())!.width).toBeLessThan(before!.width);
  expect(
    await host.evaluate((el) => {
      const input = el.shadowRoot!.querySelector('input')!;
      return [
        input === (window as any).savedInput,
        el.shadowRoot!.activeElement === input,
        input.selectionStart,
        input.selectionEnd,
      ];
    }),
  ).toEqual([true, true, 2, 5]);
  await host.locator('t-icon').evaluate((el) => el.remove());
  await expect(host.locator('slot[name=start]')).not.toHaveAttribute('data-filled', '');
  expect((await host.locator('input').boundingBox())!.width).toBe(before!.width);
});

test('start/end positions follow RTL and combobox popup tracks the complete frame', async ({
  page,
}) => {
  await mount(
    page,
    `<section dir="rtl"><t-button>${icon('start')}Search${icon('end', 'check')}</t-button><t-combobox label="Destination">${icon('start')}<span slot="end">unit</span></t-combobox></section>`,
  );
  const start = await page.locator('t-button t-icon[slot=start]').boundingBox();
  const end = await page.locator('t-button t-icon[slot=end]').boundingBox();
  expect(start!.x).toBeGreaterThan(end!.x);
  await page.locator('t-combobox').evaluate((el) => {
    (el as any).options = [{ value: '1', label: 'Archive' }];
  });
  await page.getByRole('combobox').focus();
  await expect(page.getByRole('listbox')).toBeVisible();
  const frame = await page.locator('t-combobox [part=control]').boundingBox();
  const list = await page.locator('t-combobox [part=listbox]').boundingBox();
  expect(list!.width).toBeCloseTo(frame!.width, 0);
  expect(list!.x).toBeCloseTo(frame!.x, 0);
});

test('toast actions remain outside the announcement, pause auto-dismiss, and hide on close', async ({
  page,
}) => {
  await page.clock.install();
  await mount(
    page,
    `<button id="opener">Notify</button><t-toast message="Saved" duration="5000">\n  ${icon('icon', 'check')}\n  <button slot="actions" type="button">Undo</button>\n</t-toast>`,
  );
  await page.locator('#opener').click();
  await page
    .locator('t-toast')
    .evaluate((el: TToast) => el.show(undefined, document.querySelector('#opener') as HTMLElement));
  const toast = page.locator('t-toast');
  await expect(toast.getByRole('status')).toHaveText('Saved');
  await expect(toast.getByRole('status').getByRole('button')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).focus();
  await page.clock.runFor(7000);
  await expect(toast).toHaveAttribute('open', '');
  await toast.evaluate((el: TToast) => el.close());
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).not.toBeVisible();
  await expect(toast.locator('t-icon svg')).not.toBeVisible();
  await expect(page.locator('#opener')).toBeFocused();
});

test('toast message fallback survives whitespace, reactive text, slot changes, and reconnect', async ({
  page,
}) => {
  await mount(
    page,
    `<t-toast message="Fallback message" open>\n ${icon('icon', 'check')}\n</t-toast>`,
  );
  const toast = page.locator('t-toast');
  const status = toast.getByRole('status');
  await expect(status).toHaveText('Fallback message');
  await toast.evaluate((el) => (el.firstChild!.textContent = 'Custom message'));
  await expect(status).toMatchAriaSnapshot('- status: Custom message');
  await toast.evaluate((el) => (el.firstChild!.textContent = '\n '));
  await expect(status).toHaveText('Fallback message');
  await toast.evaluate((el) =>
    el.insertAdjacentHTML('beforeend', '<span id="custom-message">Rich message</span>'),
  );
  await expect(status).toMatchAriaSnapshot('- status: Rich message');
  await toast.locator('#custom-message').evaluate((el) => el.setAttribute('slot', 'actions'));
  await expect(status).toHaveText('Fallback message');
  await toast.evaluate((el) => {
    const parent = el.parentElement!;
    el.remove();
    el.querySelector('#custom-message')!.removeAttribute('slot');
    parent.append(el);
  });
  await expect(status).toMatchAriaSnapshot('- status: Rich message');
});

test('notification actions wrap before they squeeze the message into single-character lines', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await mount(
    page,
    `<t-toast style="width:224px;max-width:100%" message="Draft archived." open>${icon('icon', 'check')}<t-button slot="actions" variant="secondary">Undo archive</t-button></t-toast>`,
  );
  const message = await page.locator('t-toast .message').boundingBox();
  expect(message!.width).toBeGreaterThanOrEqual(90);
  expect(message!.height).toBeLessThan(60);
  await expect(page.getByRole('button', { name: 'Undo archive' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Dismiss notification' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('disabled and loading buttons cannot activate through their icons', async ({ page }) => {
  await mount(
    page,
    `<t-button disabled>${icon('start')}Disabled</t-button><t-button loading>${icon('end')}Loading</t-button>`,
  );
  await page.locator('t-button').evaluateAll((elements) =>
    elements.forEach((el) =>
      el.addEventListener('click', () => {
        (el as HTMLElement).dataset.clicked = 'true';
      }),
    ),
  );
  for (const icon of await page.locator('t-icon').all()) await icon.dispatchEvent('click');
  await expect(page.locator('t-button[data-clicked]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Loading', exact: true })).toBeDisabled();
});

test('field frames retain boundaries and keyboard focus with slots in forced colors', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit does not emulate forced colors.');
  await page.emulateMedia({ forcedColors: 'active' });
  await mount(
    page,
    `<t-input label="Search">${icon('start')}<t-icon-button slot="end" name="close" label="Clear search"></t-icon-button></t-input>`,
  );
  const input = page.getByRole('textbox', { name: 'Search', exact: true });
  await input.focus();
  const styles = await input.evaluate((element) => {
    const frame = getComputedStyle(element.parentElement!);
    return {
      border: frame.borderTopColor,
      width: frame.borderTopWidth,
      background: frame.backgroundColor,
      outline: frame.outlineStyle,
      focusWidth: frame.outlineWidth,
    };
  });
  expect(styles.border).not.toBe(styles.background);
  expect(parseFloat(styles.width)).toBeGreaterThanOrEqual(1);
  expect(styles.outline).not.toBe('none');
  expect(parseFloat(styles.focusWidth)).toBeGreaterThanOrEqual(2);
  await input.press('Tab');
  await expect(page.getByRole('button', { name: 'Clear search' })).toBeFocused();
  await expect(page.locator('t-icon[slot=start] svg')).toBeVisible();
});

test('slot compositions reflow with enlarged text and pass six-palette axe checks', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page, gallery());
  await page.locator('t-select,t-combobox').evaluateAll((elements) =>
    elements.forEach((el) => {
      (el as any).options = [{ value: '2', label: 'Two' }];
    }),
  );
  await page.locator('#fixture').evaluate((el) => {
    for (const host of el.querySelectorAll('*')) {
      if (!host.shadowRoot) continue;
      const style = document.createElement('style');
      style.textContent =
        'input,select,.label,summary,.message,[part=button],[part=badge],[part=trigger],[part=link]{font-size:20px!important;line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}';
      host.shadowRoot.append(style);
    }
  });
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page.locator('html').evaluate((el, theme) => {
      el.dataset.theme = theme;
    }, theme);
    const result = await new AxeBuilder({ page }).include('#fixture').analyze();
    expect(result.violations, theme).toEqual([]);
    await writeFile(
      testInfo.outputPath(`slots-${theme}-axe-review.json`),
      JSON.stringify(result.incomplete, null, 2),
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const icon of await page.locator('t-icon svg').all()) {
      await expect(icon).toBeVisible();
      expect((await icon.boundingBox())!.width).toBeGreaterThan(0);
    }
  }
});
