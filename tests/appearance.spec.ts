import { test, expect, type Page } from '@playwright/test';

async function fixture(page: Page) {
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((el) => {
    el.innerHTML = `
      <section id="settings">
        <t-card><span slot="heading">Controls</span>
          <t-button id="inherited" variant="secondary">Initialize</t-button>
          <t-input label="Operator" value="Ready"></t-input>
          <t-checkbox label="Power" switch checked></t-checkbox>
          <button class="t-native">Native action</button>
        </t-card>
        <section id="local" data-theme="phosphor"><t-button variant="secondary">Local action</t-button></section>
        <section id="screen" class="t-screen" style="padding:20px">
          <t-button id="screen-action">Screen action</t-button>
          <section id="nested" class="t-screen" data-scanlines="pronounced"><p>Nested screen</p></section>
        </section>
        <section id="clear" class="t-screen"><p>Clear screen</p></section>
      </section>`;
    el.querySelector('#screen-action')!.addEventListener('click', () => {
      el.querySelector('#screen-action')!.textContent = 'Action received';
    });
  });
}

test('appearance settings inherit through shadow roots and support local resets and palette changes', async ({
  page,
}) => {
  await fixture(page);
  const action = page.locator('#inherited button');
  const local = page.locator('#local button');
  const initialShadow = await action.evaluate((el) => getComputedStyle(el).boxShadow);
  await page.locator('#settings').evaluate((el) => {
    el.dataset.lines = 'bold';
    el.dataset.glow = 'subtle';
  });
  await expect(action).toHaveCSS('border-top-width', '2px');
  await expect(page.locator('t-card')).toHaveCSS('border-top-width', '2px');
  await expect(page.locator('t-input input')).toHaveCSS('border-top-width', '2px');
  await expect(page.locator('.t-native')).toHaveCSS('border-top-width', '2px');
  expect(await action.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe(initialShadow);
  const greenGlow = await local.evaluate((el) => getComputedStyle(el).boxShadow);
  await page.locator('#local').evaluate((el) => {
    el.dataset.theme = 'ice';
  });
  expect(await local.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe(greenGlow);
  await page.locator('#local').evaluate((el) => {
    el.dataset.lines = 'standard';
    el.dataset.glow = 'off';
  });
  await expect(local).toHaveCSS('border-top-width', '1px');
  await expect(local).toHaveCSS('box-shadow', initialShadow);
  await expect(action).toHaveCSS('border-top-width', '2px');
  await page.locator('#settings').evaluate((el) => {
    el.style.setProperty('--t-line-width', '3px');
  });
  await expect(action).toHaveCSS('border-top-width', '3px');
  await action.focus();
  await expect(action).toHaveCSS('outline-style', 'solid');
  await expect(action).toHaveCSS('outline-width', '2px');
  // A thicker track must not push the switch thumb outside its border.
  expect(
    await page.locator('t-checkbox input').evaluate((el) => {
      const track = getComputedStyle(el),
        thumb = getComputedStyle(el, '::before');
      return parseFloat(thumb.left) + parseFloat(thumb.width) <= el.clientWidth;
    }),
  ).toBe(true);
});

test('scanlines stay inside explicit screens, do not stack, and allow pointer and keyboard input', async ({
  page,
}) => {
  await fixture(page);
  const overlay = (id: string) =>
    page.locator(id).evaluate((el) => {
      const css = getComputedStyle(el, '::after');
      return {
        content: css.content,
        display: css.display,
        position: css.position,
        inset: css.inset,
        pointerEvents: css.pointerEvents,
      };
    });
  expect((await overlay('#screen')).content).toBe('none');
  expect((await overlay('#nested')).display).not.toBe('none');
  await page.locator('#screen').evaluate((el) => {
    el.dataset.scanlines = 'subtle';
  });
  expect(await overlay('#screen')).toMatchObject({
    position: 'absolute',
    inset: '0px',
    pointerEvents: 'none',
  });
  expect((await overlay('#nested')).display).toBe('none');
  expect((await overlay('#clear')).content).toBe('none');
  await page.getByRole('button', { name: 'Screen action', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Action received', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Action received', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Action received', exact: true })).toBeFocused();
  await page.locator('#screen').evaluate((el) => {
    el.dataset.scanlines = 'off';
  });
  expect((await overlay('#screen')).display).toBe('none');
  expect((await overlay('#nested')).display).not.toBe('none');
});

test('CRT remains a convenience preset with explicit overrides and forced-colors disables decoration', async ({
  page,
}) => {
  await fixture(page);
  await page.locator('html').evaluate((el) => {
    el.dataset.effects = 'crt';
  });
  expect(
    await page.locator('html').evaluate((el) => getComputedStyle(el, '::after').position),
  ).toBe('fixed');
  await page.locator('html').evaluate((el) => {
    el.dataset.glow = 'off';
    el.dataset.scanlines = 'off';
  });
  expect(await page.locator('html').evaluate((el) => getComputedStyle(el, '::after').display)).toBe(
    'none',
  );
  await page.locator('#screen').evaluate((el) => {
    el.dataset.effects = 'crt';
    el.dataset.glow = 'strong';
  });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expect(page.locator('#screen-action button')).toHaveCSS('box-shadow', 'none');
  await expect(page.locator('#screen-action button')).toHaveCSS('text-shadow', 'none');
  expect(
    await page.locator('#screen').evaluate((el) => getComputedStyle(el, '::after').display),
  ).toBe('none');
});

test('demo style settings persist, migrate CRT preferences, and reset independently of palette and density', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'terminal-kit',
      JSON.stringify({ theme: 'phosphor', compact: true, effects: true }),
    ),
  );
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-glow', 'subtle');
  await expect(page.locator('.event-console')).toHaveAttribute('data-scanlines', 'subtle');
  await page.getByRole('checkbox', { name: 'Bold lines', exact: true }).check();
  await page.getByText('Display effects', { exact: false }).click();
  await page.getByRole('combobox', { name: 'Phosphor glow', exact: true }).selectOption('strong');
  await page
    .getByRole('combobox', { name: 'Screen scanlines', exact: true })
    .selectOption('pronounced');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-lines', 'bold');
  await expect(page.locator('html')).toHaveAttribute('data-glow', 'strong');
  await expect(page.locator('.event-console')).toHaveAttribute('data-scanlines', 'pronounced');
  await page.getByText('Display effects', { exact: false }).click();
  await expect(page.getByRole('combobox', { name: 'Phosphor glow', exact: true })).toHaveValue(
    'strong',
  );
  await page.getByRole('button', { name: 'Reset display styles', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-glow', 'off');
  await expect(page.locator('html')).toHaveAttribute('data-lines', 'standard');
  await expect(page.locator('.event-console')).toHaveAttribute('data-scanlines', 'off');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'phosphor');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
});
