import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function fixture(page: Page, markup: string) {
  await page.route('**/@vite/client', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' }),
  );
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.evaluate(async () => {
    for (const name of [
      'password-input',
      'number-input',
      'segmented-control',
      'rating',
      'tags-input',
      'color-picker',
    ])
      await import(`/src/components/${name}.ts`);
  });
  await page.locator('#fixture').evaluate((element, html) => {
    element.innerHTML = html;
  }, markup);
}

test('password visibility preserves value, input selection, focus and reset', async ({ page }) => {
  await fixture(
    page,
    '<form><t-password-input label="Account password" name="password" value="secret123" required></t-password-input></form>',
  );
  const input = page.locator('t-password-input input');
  await input.focus();
  await input.evaluate((element: HTMLInputElement) => element.setSelectionRange(2, 6));
  await page.getByRole('button', { name: 'Show Account password' }).click();
  await expect(input).toHaveAttribute('type', 'text');
  await expect(input).toHaveValue('secret123');
  await expect(input).toBeFocused();
  expect(
    await input.evaluate((element: HTMLInputElement) => [
      element.selectionStart,
      element.selectionEnd,
    ]),
  ).toEqual([2, 6]);
  await page.getByRole('button', { name: 'Hide Account password' }).focus();
  await page.keyboard.press('Space');
  await expect(input).toHaveAttribute('type', 'password');
  await expect(page.getByRole('button', { name: 'Show Account password' })).toBeFocused();
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).get('password')),
  ).toBe('secret123');
  await page.locator('t-password-input').evaluate((element: any) => {
    element.revealed = true;
  });
  await page.locator('form').evaluate((form: HTMLFormElement) => form.reset());
  await expect(input).toHaveAttribute('type', 'password');
});

test('number steps enforce bounds, support any step, and keep keyboard focus at limits', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><t-number-input label="Quantity" name="quantity" min="2" max="6" step="2" value="2" required></t-number-input></form>',
  );
  const input = page.getByRole('spinbutton', { name: 'Quantity' });
  await expect(page.getByRole('button', { name: 'Decrease Quantity' })).toBeDisabled();
  await page.getByRole('button', { name: 'Increase Quantity' }).focus();
  await page.keyboard.press('Enter');
  await expect(input).toHaveValue('4');
  await page.keyboard.press('Enter');
  await expect(input).toHaveValue('6');
  await expect(input).toBeFocused();
  await expect(page.getByRole('button', { name: 'Increase Quantity' })).toBeDisabled();
  await input.fill('3');
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
  await page.locator('t-number-input').evaluate((element: any) => {
    element.step = 'any';
    element.value = '3.5';
  });
  await page.getByRole('button', { name: 'Increase Quantity' }).click();
  await expect(input).toHaveValue('4.5');
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).get('quantity')),
  ).toBe('4.5');
});

for (const [tag, value] of [
  ['password-input', 'Example password'],
  ['number-input', '4'],
]) {
  test(`${tag} supports implicit submission without a submit button`, async ({ page }) => {
    await fixture(
      page,
      `<form><t-${tag} name="value" label="Value"></t-${tag}><output></output></form>`,
    );
    await page.locator('form').evaluate((form: HTMLFormElement) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        form.querySelector('output')!.textContent = String(new FormData(form).get('value'));
      });
    });
    const input = page.locator(`t-${tag} input`);
    await input.fill(value);
    await input.press('Enter');
    await expect(page.locator('output')).toHaveText(value);
  });
}

test('segmented choices and ratings use native radios, disabled skipping and clear/reset', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><t-segmented-control label="View" name="view" value="list"></t-segmented-control><t-rating label="Experience" name="rating" required clearable value="3"></t-rating></form>',
  );
  await page.locator('t-segmented-control').evaluate((element: any) => {
    element.options = [
      { value: 'list', label: 'List' },
      { value: 'grid', label: 'Grid', disabled: true },
      { value: 'chart', label: 'Chart' },
    ];
  });
  await page.getByRole('radio', { name: 'List', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Chart', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: '3 of 5 stars' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: '4 of 5 stars' })).toBeChecked();
  await page.getByRole('button', { name: 'Clear Experience' }).click();
  await expect(page.getByRole('radio', { name: '1 of 5 stars' })).toBeFocused();
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
  await page.locator('form').evaluate((form: HTMLFormElement) => form.reset());
  await expect(page.getByRole('radio', { name: '3 of 5 stars' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'List', exact: true })).toBeChecked();
});

test('rating orientation changes layout without changing focus, events, or form behavior', async ({
  page,
}) => {
  await fixture(
    page,
    '<button id="outside">Outside</button><form><t-rating label="Experience" name="rating" required value="2"></t-rating></form>',
  );
  const host = page.locator('t-rating');
  const choices = host.locator('.options');
  await expect(choices).toHaveCSS('flex-direction', 'row');
  await expect(choices).toHaveCSS('gap', '16px');
  await page.locator('#outside').focus();
  await host.evaluate((element: any) => {
    (window as any).ratingEvents = [];
    for (const name of ['input', 'change'])
      element.addEventListener(name, (event: Event) => {
        (window as any).ratingEvents.push({ name: event.type, value: element.value });
      });
    element.orientation = 'vertical';
  });
  await expect(choices).toHaveCSS('flex-direction', 'column');
  await expect(choices).toHaveCSS('gap', '8px');
  await expect(page.locator('#outside')).toBeFocused();
  await page.getByRole('radio', { name: '2 of 5 stars' }).focus();
  await page.keyboard.press('ArrowDown');
  const selected = page.getByRole('radio', { name: '3 of 5 stars' });
  await expect(selected).toBeChecked();
  await expect(selected).toBeFocused();
  expect(await page.evaluate(() => (window as any).ratingEvents)).toEqual([
    { name: 'input', value: '3' },
    { name: 'change', value: '3' },
  ]);
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).get('rating')),
  ).toBe('3');
  await host.evaluate((element: any) => {
    element.orientation = 'horizontal';
  });
  await expect(choices).toHaveCSS('flex-direction', 'row');
  await expect(selected).toBeFocused();
  expect(await page.evaluate(() => (window as any).ratingEvents)).toHaveLength(2);
  await page.locator('form').evaluate((form: HTMLFormElement) => form.reset());
  await expect(page.getByRole('radio', { name: '2 of 5 stars' })).toBeChecked();
});

test('tags support entry, removal, duplicate/max validation, repeated FormData and reset', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><t-tags-input label="Skills" name="skills" required max-tags="2" value=\'["Lit"]\'></t-tags-input></form>',
  );
  const input = page.getByRole('textbox', { name: 'Skills' });
  await input.fill('TypeScript');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: 'Remove TypeScript' })).toBeVisible();
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).getAll('skills')),
  ).toEqual(['Lit', 'TypeScript']);
  await input.fill('Lit');
  await input.press('Enter');
  await expect(input).toHaveAccessibleDescription('Lit is already selected.');
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
  await input.fill('CSS');
  await input.press('Enter');
  await expect(input).toHaveAccessibleDescription('Use no more than 2 tags.');
  await input.fill('');
  await input.press('Backspace');
  await expect(page.getByRole('button', { name: 'Remove TypeScript' })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Removed TypeScript. 1 tag selected.');
  await input.fill('CSS');
  await input.press(',');
  expect(await page.locator('t-tags-input').evaluate((element: any) => element.values)).toEqual([
    'Lit',
    'CSS',
  ]);
  await page.locator('form').evaluate((form: HTMLFormElement) => form.reset());
  expect(await page.locator('t-tags-input').evaluate((element: any) => element.values)).toEqual([
    'Lit',
  ]);
  await page.getByRole('button', { name: 'Remove Lit' }).click();
  await expect(input).toBeFocused();
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
});

test('tags accept reactive array and JSON values and reject malformed representations', async ({
  page,
}) => {
  await fixture(page, '<form><t-tags-input label="Tags" name="tags"></t-tags-input></form>');
  await page.locator('t-tags-input').evaluate((element: any) => {
    element.values = [' alpha ', 'alpha', 'beta'];
  });
  await expect(page.getByRole('button', { name: 'Remove alpha' })).toHaveCount(1);
  expect(await page.locator('t-tags-input').evaluate((element: any) => element.value)).toBe(
    '["alpha","beta"]',
  );
  await page.locator('t-tags-input').evaluate((element: any) => {
    element.value = '["gamma"]';
  });
  await expect(page.getByRole('button', { name: 'Remove gamma' })).toBeVisible();
  await page.locator('t-tags-input').evaluate((element: any) => {
    element.value = 'not-json';
  });
  await expect(page.getByRole('textbox')).toHaveAccessibleDescription(
    'The tag value must be a JSON array of strings.',
  );
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
  await page.locator('t-tags-input').evaluate((element: any) => {
    element.values = ['fixed'];
  });
  await expect(page.getByRole('button', { name: 'Remove fixed' })).toBeVisible();
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    true,
  );
});

test('color text validates real hex values, swatches submit, and native selection stays synchronized', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><t-color-picker label="Accent" name="accent" required></t-color-picker></form>',
  );
  await page.locator('t-color-picker').evaluate((element: any) => {
    element.swatches = [
      { value: '#00ff00', label: 'Green' },
      { value: '#0000ff', label: 'Blue' },
    ];
  });
  const input = page.getByRole('textbox', { name: 'Accent', exact: true });
  await input.fill('orange');
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
  await expect(input).toHaveAccessibleDescription(
    'Enter a color with # and six hexadecimal digits.',
  );
  await expect(input).toHaveValue('orange');
  await page.getByRole('button', { name: 'Green' }).click();
  await expect(input).toHaveValue('#00ff00');
  await expect(page.locator('input[type=color]')).toHaveValue('#00ff00');
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).get('accent')),
  ).toBe('#00ff00');
  await page.locator('input[type=color]').fill('#112233');
  await expect(input).toHaveValue('#112233');
  await page.locator('form').evaluate((form: HTMLFormElement) => form.reset());
  await expect(input).toHaveValue('#f5ba5b');
});

test('disabled fieldsets disable every native entry and action and omit all values', async ({
  page,
}) => {
  await fixture(
    page,
    '<form><fieldset><t-password-input name="password" value="secret"></t-password-input><t-number-input name="number" value="2"></t-number-input><t-segmented-control label="View" name="view"></t-segmented-control><t-rating name="rating" value="3" clearable></t-rating><t-tags-input name="tags" value=\'["one"]\'></t-tags-input><t-color-picker name="color"></t-color-picker></fieldset></form>',
  );
  await page.locator('t-segmented-control').evaluate((element: any) => {
    element.options = [{ value: 'a', label: 'Alpha' }];
  });
  await page.locator('form > fieldset').evaluate((element: HTMLFieldSetElement) => {
    element.disabled = true;
  });
  for (const control of await page.locator('input,button').all())
    await expect(control).toBeDisabled();
  expect(
    await page.locator('form').evaluate((form: HTMLFormElement) => [...new FormData(form)]),
  ).toEqual([]);
  await page.locator('form > fieldset').evaluate((element: HTMLFieldSetElement) => {
    element.disabled = false;
  });
  await expect(page.locator('t-password-input input')).toBeEnabled();
  await expect(page.locator('t-color-picker input[type=color]')).toBeEnabled();
});

test('extended controls remain named, keyboard reachable, and usable at narrow enlarged text', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await fixture(
    page,
    '<t-password-input></t-password-input><t-number-input></t-number-input><t-segmented-control label="Display mode"></t-segmented-control><t-rating clearable></t-rating><t-tags-input></t-tags-input><t-color-picker></t-color-picker>',
  );
  await page.locator('t-segmented-control').evaluate((element: any) => {
    element.options = [
      { value: 'a', label: 'A longer segment label that wraps' },
      { value: 'b', label: 'Another segment' },
    ];
  });
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page.locator('html').evaluate((element, theme) => {
      element.dataset.theme = theme;
    }, theme);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations, `${theme} accessibility violations`).toEqual([]);
    // Axe cannot classify a minus-only label. Measure the actual glyph colors.
    const stepContrast = await page
      .locator('t-number-input [part=decrease]')
      .evaluate((element) => {
        const style = getComputedStyle(element);
        const luminance = (color: string) => {
          const channels = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((value) => {
              const channel = value / 255;
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };
        const foreground = luminance(style.color),
          background = luminance(style.backgroundColor);
        return (
          (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
        );
      });
    expect(stepContrast, `${theme} number step glyph contrast`).toBeGreaterThanOrEqual(4.5);
    if (results.incomplete.length) {
      console.info(
        `${theme} axe review items: ${results.incomplete.map((result) => result.id).join(', ')}`,
      );
      if (theme === 'amber')
        console.info(
          JSON.stringify(
            results.incomplete.map((result) => ({
              rule: result.id,
              nodes: result.nodes.map((node) => ({
                target: node.target,
                summary: node.failureSummary,
              })),
            })),
          ),
        );
      await testInfo.attach(`${theme}-axe-review-items`, {
        body: JSON.stringify(results.incomplete),
        contentType: 'application/json',
      });
    }
  }
  await page.evaluate(() => {
    document.querySelectorAll('#fixture > *').forEach((element) => {
      const root = element.shadowRoot!;
      const sizes = [...root.querySelectorAll<HTMLElement>('*')].map(
        (node) => [node, parseFloat(getComputedStyle(node).fontSize)] as const,
      );
      for (const [node, size] of sizes) {
        node.style.setProperty('font-size', `${size * 2}px`, 'important');
        node.style.setProperty('letter-spacing', '.12em', 'important');
        node.style.setProperty('word-spacing', '.16em', 'important');
        node.style.setProperty('line-height', '1.5', 'important');
      }
    });
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const button of await page.locator('button').all()) {
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(24);
    expect(box!.width).toBeGreaterThanOrEqual(24);
  }
});
