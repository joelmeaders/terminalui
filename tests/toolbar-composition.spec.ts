import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

async function fixture(page: Page, markup: string) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.evaluate(() => {
    customElements.define(
      'test-action-group',
      class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' }).innerHTML =
            '<span><slot name="actions"><button type="button">Fallback</button></slot></span>';
        }
      },
    );
  });
  await page.locator('#fixture').evaluate((element, html) => {
    element.innerHTML = html;
  }, `<button id="before">Before</button>${markup}<button id="after">After</button>`);
}

test('toolbar skips an inert shadow host and restores it after a live change', async ({ page }) => {
  await fixture(
    page,
    '<t-toolbar label="Archive actions"><button>First</button><t-button id="middle" inert>Middle</t-button><button>Last</button></t-toolbar>',
  );
  await page.getByRole('button', { name: 'First', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Last', exact: true })).toBeFocused();
  await page.locator('#middle').evaluate((element: HTMLElement) => (element.inert = false));
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('button', { name: 'Middle', exact: true })).toBeFocused();
  await page.locator('#middle').evaluate((element: HTMLElement) => (element.inert = true));
  await expect(page.getByRole('button', { name: 'Last', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
});

test('toolbar roves projected actions in rendered slot order and restores original tabindex', async ({
  page,
}) => {
  await fixture(
    page,
    '<t-toolbar label="Projected actions"><button>First</button><test-action-group><t-button slot="actions">Projected</t-button><a slot="actions" href="#help" tabindex="-1">Help</a><button>Unassigned</button></test-action-group><button>Last</button></t-toolbar>',
  );
  await page.locator('#before').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'First', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Projected', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('link', { name: 'Help', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Last', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Last', exact: true })).toBeFocused();
  const restored = await page.locator('t-toolbar').evaluate((element) => {
    const projected = element.querySelector('t-button')!.shadowRoot!.querySelector('button')!;
    const link = element.querySelector('a')!;
    element.remove();
    return [projected.getAttribute('tabindex'), link.getAttribute('tabindex')];
  });
  expect(restored).toEqual([null, '-1']);
});

test('toolbar skips collapsed disclosure actions and responds to open changes', async ({
  page,
}) => {
  await fixture(
    page,
    '<t-toolbar label="Disclosure actions"><button>First</button><details style="height:100px"><summary>More actions</summary><t-button>Middle</t-button></details><button>Last</button></t-toolbar>',
  );
  await page.getByRole('button', { name: 'First', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Last', exact: true })).toBeFocused();
  await page.locator('details').evaluate((element: HTMLDetailsElement) => (element.open = true));
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('button', { name: 'Middle', exact: true })).toBeFocused();
  await page.locator('details').evaluate((element: HTMLDetailsElement) => (element.open = false));
  await expect(page.getByRole('button', { name: 'Last', exact: true })).toBeFocused();
});

test('toolbar follows named slot changes and fallback actions without taking outside focus', async ({
  page,
}) => {
  await fixture(
    page,
    '<t-toolbar label="Changing slots"><button>First</button><test-action-group><button slot="actions" tabindex="-1">Projected</button></test-action-group><button>Last</button></t-toolbar>',
  );
  await page.getByRole('button', { name: 'Projected', exact: true }).focus();
  await page.locator('test-action-group > button').evaluate((element) => (element.slot = 'unused'));
  await expect(page.getByRole('button', { name: 'Fallback', exact: true })).toBeFocused();
  await expect(page.locator('test-action-group > button')).toHaveAttribute('tabindex', '-1');
  await page
    .locator('test-action-group slot')
    .evaluate((element: HTMLSlotElement) => (element.name = 'unused'));
  await expect(page.getByRole('button', { name: 'Projected', exact: true })).toBeFocused();
  await page.locator('#after').focus();
  await page.locator('test-action-group > button').evaluate((element) => {
    element.replaceWith(
      Object.assign(document.createElement('button'), {
        slot: 'unused',
        textContent: 'Replacement',
      }),
    );
  });
  await expect(page.locator('#after')).toBeFocused();
  await page.getByRole('button', { name: 'First', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Replacement', exact: true })).toBeFocused();
});

for (const state of ['inert', 'hidden', 'display'] as const)
  test(`toolbar recovers focus when a projected wrapper becomes ${state}`, async ({ page }) => {
    await fixture(
      page,
      '<t-toolbar label="Wrapped actions"><button>First</button><test-action-group><span id="wrapper" slot="actions"><t-button>Middle</t-button></span></test-action-group><button>Last</button></t-toolbar>',
    );
    await page.getByRole('button', { name: 'Middle', exact: true }).focus();
    await page.locator('#wrapper').evaluate((element, state) => {
      if (state === 'display') element.style.display = 'none';
      else element.setAttribute(state, '');
    }, state);
    await expect(page.getByRole('button', { name: 'Last', exact: true })).toBeFocused();
    await page.locator('#wrapper').evaluate((element, state) => {
      if (state === 'display') element.style.removeProperty('display');
      else element.removeAttribute(state);
    }, state);
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('button', { name: 'Middle', exact: true })).toBeFocused();
  });

test('toolbar follows nested slots and text-only assignments without focusing hidden fallback', async ({
  page,
}) => {
  await fixture(
    page,
    '<t-toolbar label="Nested actions"><test-action-group id="outer"><test-action-group slot="actions" id="inner"><t-button slot="actions">Nested</t-button></test-action-group></test-action-group></t-toolbar>',
  );
  await expect(page.locator('#before')).not.toBeFocused();
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.locator('#before').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Nested', exact: true })).toBeFocused();
  await page.locator('#inner').evaluate((element) => {
    element.shadowRoot!.querySelector('slot')!.removeAttribute('name');
    element.replaceChildren(document.createTextNode('No actions available'));
  });
  await expect(page.getByRole('toolbar', { name: 'Nested actions' })).toBeFocused();
  await expect(page.locator('#inner button')).not.toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('toolbar', { name: 'Nested actions' })).toBeFocused();
  await page.locator('#inner').evaluate((element) => element.replaceChildren());
  await expect(page.locator('#outer slot[name=actions] > button')).not.toBeVisible();
  await expect(
    page.locator('#inner').getByRole('button', { name: 'Fallback', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
});

for (const axis of ['rtl', 'vertical'] as const)
  test(`toolbar navigates projected actions with ${axis} keys`, async ({ page }) => {
    await fixture(
      page,
      `<t-toolbar label="Directional actions" ${axis === 'rtl' ? 'dir="rtl"' : 'orientation="vertical"'}><button>First</button><test-action-group><t-button slot="actions">Middle</t-button><t-button slot="actions" disabled>Disabled</t-button></test-action-group><button>Last</button></t-toolbar>`,
    );
    await page.getByRole('button', { name: 'First', exact: true }).focus();
    await page.keyboard.press(axis === 'rtl' ? 'ArrowLeft' : 'ArrowDown');
    await expect(page.getByRole('button', { name: 'Middle', exact: true })).toBeFocused();
    await page.keyboard.press(axis === 'rtl' ? 'ArrowLeft' : 'ArrowDown');
    await expect(page.getByRole('button', { name: 'Last', exact: true })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.getByRole('button', { name: 'First', exact: true })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('button', { name: 'Last', exact: true })).toBeFocused();
  });

test('detached toolbar changes preserve restored tabindex values and reconnect without taking focus', async ({
  page,
}) => {
  await fixture(
    page,
    '<t-toolbar label="Reconnected actions"><button>First</button><t-button>Middle</t-button><a href="#help" tabindex="-1">Help</a></t-toolbar>',
  );
  await page.getByRole('button', { name: 'Middle', exact: true }).focus();
  const restored = await page.locator('t-toolbar').evaluate(async (element) => {
    const actions = [
      element.querySelector('button')!,
      element.querySelector('t-button')!.shadowRoot!.querySelector('button')!,
      element.querySelector('a')!,
    ];
    (window as Window & { detachedToolbar?: Element }).detachedToolbar = element;
    element.remove();
    element.append(document.createElement('span'));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return actions.map((action) => action.getAttribute('tabindex'));
  });
  expect(restored).toEqual([null, null, '-1']);
  await page.locator('#after').focus();
  await page
    .locator('#fixture')
    .evaluate((element) =>
      element.prepend((window as Window & { detachedToolbar?: Element }).detachedToolbar!),
    );
  await expect(page.locator('#after')).toBeFocused();
  await page.getByRole('button', { name: 'First', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Middle', exact: true })).toBeFocused();
});

test('projected toolbar actions remain one tab stop inside a modal', async ({ page }) => {
  await fixture(
    page,
    '<t-dialog label="Archive dialog"><button id="modal-before">Before toolbar</button><t-toolbar label="Dialog actions"><button>First</button><test-action-group><t-button slot="actions">Middle</t-button></test-action-group><button>Last</button></t-toolbar><button id="modal-after">After toolbar</button></t-dialog>',
  );
  await page.locator('#before').focus();
  await page
    .locator('t-dialog')
    .evaluate((element: import('../src/components/dialog').TDialog) => element.show());
  await page.locator('#modal-before').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'First', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Middle', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#modal-after')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Middle', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#before')).toBeFocused();
});

test('composed toolbar actions retain semantics in all shipped palettes', async ({
  page,
}, testInfo) => {
  await fixture(
    page,
    '<t-toolbar label="Composed archive actions"><t-button>Refresh</t-button><test-action-group><t-button slot="actions">Export</t-button><a slot="actions" href="#help">Help</a></test-action-group><span inert><t-button>Unavailable</t-button></span></t-toolbar>',
  );
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, value) => element.setAttribute('data-theme', value), theme);
    const axe = await new AxeBuilder({ page }).include('t-toolbar').analyze();
    await writeFile(
      testInfo.outputPath(`toolbar-composed-${theme}-axe-review.json`),
      JSON.stringify({ violations: axe.violations, incomplete: axe.incomplete }, null, 2),
    );
    expect(axe.violations, `${theme}: ${JSON.stringify(axe.violations)}`).toEqual([]);
  }
});
