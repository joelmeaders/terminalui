import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

type Content = 'wrapped-native' | 'wrapped-component' | 'projected' | 'nested-pane';

async function fixture(page: Page, content: Content = 'wrapped-native', modal = false) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate(
    async (root, { content, modal }) => {
      root.innerHTML = '<button id="outside">Outside action</button>';
      const split = document.createElement('t-split-pane');
      split.id = 'split';
      split.min = 0;
      split.max = 100;
      split.primaryLabel = 'Files';
      split.secondaryLabel = 'Preview';
      split.dataset.events = '0';
      for (const event of ['t-input', 't-change'])
        split.addEventListener(event, () => {
          split.dataset.events = String(Number(split.dataset.events) + 1);
        });
      for (const pane of ['primary', 'secondary']) {
        const wrapper = document.createElement('section');
        wrapper.slot = pane;
        wrapper.id = `${pane}-content`;
        if (content === 'wrapped-native')
          wrapper.innerHTML = `<div><button type="button">${pane} action</button></div>`;
        if (content === 'wrapped-component')
          wrapper.innerHTML = `<div><t-button>${pane} action</t-button></div>`;
        if (content === 'projected') {
          const outer = document.createElement('div');
          outer.attachShadow({ mode: 'open' }).innerHTML = '<div><slot></slot></div>';
          const inner = document.createElement('div');
          inner.attachShadow({ mode: 'open' }).innerHTML = '<section><slot></slot></section>';
          inner.innerHTML = `<t-button>${pane} action</t-button>`;
          outer.append(inner);
          wrapper.append(outer);
        }
        if (content === 'nested-pane')
          wrapper.innerHTML = `<t-split-pane primary-label="Nested ${pane}" secondary-label="Nested details"><div slot="primary"><t-button>${pane} action</t-button></div><p slot="secondary">Nested details</p></t-split-pane>`;
        split.append(wrapper);
      }
      if (modal) {
        const dialog = document.createElement('t-dialog');
        dialog.heading = 'Workspace';
        dialog.append(split);
        root.append(dialog);
        await dialog.updateComplete;
        dialog.show(root.querySelector<HTMLButtonElement>('#outside')!);
        await dialog.updateComplete;
      } else root.append(split);
      await split.updateComplete;
      await Promise.all(
        [...split.querySelectorAll('t-button')].map((button) => button.updateComplete),
      );
    },
    { content, modal },
  );
}

async function setSize(page: Page, size: number, disabled?: boolean) {
  await page.locator('#split').evaluate(
    async (split: import('../src/components/split-pane').TSplitPane, { size, disabled }) => {
      if (disabled !== undefined) split.disabled = disabled;
      split.size = size;
      await split.updateComplete;
    },
    { size, disabled },
  );
}

for (const content of ['wrapped-native', 'wrapped-component', 'projected', 'nested-pane'] as const)
  for (const pane of ['primary', 'secondary'] as const)
    for (const disabled of [false, true])
      test(`collapsed ${pane} recovers ${content} focus with resizing ${disabled ? 'disabled' : 'enabled'}`, async ({
        page,
      }) => {
        await fixture(page, content);
        const split = page.locator('#split');
        const action = page.getByRole('button', { name: `${pane} action`, exact: true });
        await action.focus();
        await expect(action).toBeFocused();
        await setSize(page, pane === 'primary' ? 0 : 100, disabled);
        const destination = disabled
          ? split.locator(`[part="${pane === 'primary' ? 'secondary' : 'primary'}"]`).first()
          : split.getByRole('separator', { name: 'Files', exact: true });
        await expect(destination).toBeFocused();
        await expect(split.locator(`[part="${pane}"]`).first()).toHaveAttribute('hidden', '');
        await expect(action).toBeHidden();
        await expect(split).toHaveAttribute('data-events', '0');
        await setSize(page, 50);
        await expect(action).toBeVisible();
        await expect(destination).toBeFocused();
      });

for (const disabled of [false, true])
  test(`switching collapsed panes restores focus with resizing ${disabled ? 'disabled' : 'enabled'}`, async ({
    page,
  }, testInfo) => {
    await fixture(page, 'wrapped-component');
    const split = page.locator('#split');
    await setSize(page, 0, disabled);
    await page.getByRole('button', { name: 'secondary action', exact: true }).focus();
    await setSize(page, 100);
    await expect(
      disabled ? split.locator('[part="primary"]') : split.getByRole('separator'),
    ).toBeFocused();
    await page.getByRole('button', { name: 'primary action', exact: true }).focus();
    await setSize(page, 0);
    await expect(
      disabled ? split.locator('[part="secondary"]') : split.getByRole('separator'),
    ).toBeFocused();
    await expect(split).toHaveAttribute('data-events', '0');
    await page.screenshot({
      path: testInfo.outputPath(`split-${disabled ? 'disabled' : 'enabled'}-collapse-focus.png`),
    });
  });

for (const disabled of [false, true])
  test(`collapsed content leaves the native Tab sequence with resizing ${disabled ? 'disabled' : 'enabled'}`, async ({
    page,
  }) => {
    await fixture(page);
    const split = page.locator('#split');
    await page.getByRole('button', { name: 'primary action', exact: true }).focus();
    await setSize(page, 0, disabled);
    if (!disabled) {
      await page.keyboard.press('Tab');
      await expect(split.locator('[part="secondary"]')).toBeFocused();
    }
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'secondary action', exact: true })).toBeFocused();
    await setSize(page, 100);
    await page.keyboard.press(disabled ? 'Tab' : 'Shift+Tab');
    await expect(page.getByRole('button', { name: 'primary action', exact: true })).toBeFocused();
    await expect(split).toHaveAttribute('data-events', '0');
  });

test('initial rendering and live collapse preserve outside and surviving-pane focus', async ({
  page,
}) => {
  await fixture(page, 'projected');
  const outside = page.locator('#outside');
  await outside.focus();
  await setSize(page, 0);
  await expect(outside).toBeFocused();
  await setSize(page, 100);
  await expect(outside).toBeFocused();
  const primary = page.getByRole('button', { name: 'primary action', exact: true });
  await primary.focus();
  await setSize(page, 75);
  await expect(primary).toBeFocused();
  await page
    .locator('#split')
    .evaluate(async (split: import('../src/components/split-pane').TSplitPane) => {
      const other = document.createElement('t-split-pane');
      other.min = 0;
      other.size = 0;
      split.parentElement!.append(other);
      await other.updateComplete;
    });
  await expect(primary).toBeFocused();
});

test('disabled recovery respects focus moved outside by a collapse blur handler', async ({
  page,
}) => {
  await fixture(page, 'wrapped-component');
  const action = page.getByRole('button', { name: 'primary action', exact: true });
  await action.evaluate((button) =>
    button.addEventListener(
      'blur',
      () => document.querySelector<HTMLButtonElement>('#outside')!.focus(),
      { once: true },
    ),
  );
  await action.focus();
  await setSize(page, 0, true);
  await expect(page.locator('#outside')).toBeFocused();
});

test('collapse recovery remains inside a modal and preserves its Tab cycle and opener', async ({
  page,
}, testInfo) => {
  await fixture(page, 'projected', true);
  const split = page.locator('#split');
  const secondary = page.getByRole('button', { name: 'secondary action', exact: true });
  await secondary.focus();
  await setSize(page, 100);
  await expect(split.getByRole('separator', { name: 'Files' })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('split-modal-collapse-focus.png') });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close dialog', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(split.getByRole('separator', { name: 'Files' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#outside')).toBeFocused();
});

test('wrapped collapsed panes retain semantics and palette axe coverage', async ({
  page,
}, testInfo) => {
  await fixture(page, 'wrapped-component');
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, theme) => element.setAttribute('data-theme', theme), theme);
    await setSize(page, 50);
    await page.getByRole('button', { name: 'primary action', exact: true }).focus();
    await setSize(page, 0);
    await expect(page.locator('#split').getByRole('separator')).toBeFocused();
    const axe = await new AxeBuilder({ page }).include('#split').analyze();
    await writeFile(
      testInfo.outputPath(`split-focus-${theme}-axe-review.json`),
      JSON.stringify({ violations: axe.violations, incomplete: axe.incomplete }, null, 2),
    );
    expect(axe.violations, `${theme}: ${JSON.stringify(axe.violations)}`).toEqual([]);
  }
});

for (const disabled of [false, true])
  test(`adopted split panes use their owning document with resizing ${disabled ? 'disabled' : 'enabled'}`, async ({
    page,
  }) => {
    await fixture(page);
    await page
      .locator('#split')
      .evaluate(async (split: import('../src/components/split-pane').TSplitPane) => {
        for (const wrapper of [...split.children]) {
          const button = wrapper.querySelector('button')!;
          button.slot = wrapper.getAttribute('slot')!;
          split.append(button);
          wrapper.remove();
        }
        const frame = document.createElement('iframe');
        frame.id = 'host-frame';
        frame.title = 'Embedded workspace';
        frame.style.cssText = 'width:100%;height:500px';
        document.querySelector('#fixture')!.append(frame);
        frame.contentDocument!.body.append(frame.contentDocument!.adoptNode(split));
        await split.updateComplete;
      });
    const embedded = page.frameLocator('#host-frame');
    const split = embedded.locator('#split');
    await embedded.getByRole('button', { name: 'primary action', exact: true }).focus();
    await split.evaluate(
      async (element: import('../src/components/split-pane').TSplitPane, disabled) => {
        element.disabled = disabled;
        element.size = 0;
        await element.updateComplete;
      },
      disabled,
    );
    await expect(
      disabled ? split.locator('[part="secondary"]') : split.getByRole('separator'),
    ).toBeFocused();
    await expect(split).toHaveAttribute('data-events', '0');
    await page.locator('#outside').focus();
    await split.evaluate(async (element: import('../src/components/split-pane').TSplitPane) => {
      const parent = window.parent.document.querySelector('#fixture')!;
      parent.append(parent.ownerDocument.adoptNode(element));
      element.size = 50;
      await element.updateComplete;
    });
    await expect(page.locator('#outside')).toBeFocused();
    await page.getByRole('button', { name: 'secondary action', exact: true }).focus();
    await setSize(page, 100);
    await expect(
      disabled
        ? page.locator('#split [part="primary"]')
        : page.locator('#split').getByRole('separator'),
    ).toBeFocused();
  });
