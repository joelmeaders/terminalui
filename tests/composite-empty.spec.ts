import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import type { TTree } from '../src/components/tree';
import type { TMenu } from '../src/components/menu';
import type { TCombobox } from '../src/components/combobox';
import type { TCommandPalette } from '../src/components/command-palette';

async function mount(page: Page, tag: string) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((root, name) => {
    root.innerHTML = `<button id="before">Before choices</button><${name} label="Available choices"></${name}><button id="after">After choices</button>`;
  }, tag);
  await page.locator(tag).evaluate(async (element: TTree) => element.updateComplete);
}

for (const tag of ['t-tree', 't-menu', 't-combobox', 't-command-palette']) {
  test(`${tag}: empty state has valid semantics in every palette`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await mount(page, tag);
    const host = page.locator(tag);
    if (tag === 't-tree') await host.getByRole('group', { name: 'Available choices' }).focus();
    if (tag === 't-menu') await host.getByRole('button').click();
    if (tag === 't-combobox') await host.getByRole('combobox').focus();
    if (tag === 't-command-palette')
      await host.evaluate((element: TCommandPalette) => element.show());
    await host.evaluate(async (element: TTree) => element.updateComplete);
    if (tag === 't-menu') {
      await expect(host.getByRole('group', { name: 'Available choices' })).toBeFocused();
      await expect(host.getByRole('button')).not.toHaveAttribute('aria-haspopup');
      await expect(host.getByRole('status')).toHaveText('No actions available.');
    }
    if (tag === 't-combobox' || tag === 't-command-palette') {
      const search = host.getByRole('combobox');
      await expect(search).toBeFocused();
      await expect(search).toHaveAttribute('aria-expanded', 'false');
      await expect(search).not.toHaveAttribute('aria-controls');
      await expect(search).not.toHaveAttribute('aria-activedescendant');
      await expect(host.getByRole('status')).toBeVisible();
      await expect(host.getByRole('listbox')).toHaveCount(0);
    }
    for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
      await page.locator('html').evaluate((element, palette) => {
        element.dataset.theme = palette;
      }, theme);
      const report = await new AxeBuilder({ page }).include(tag).analyze();
      const contrast = await host.evaluate((element) => {
        const root = element.shadowRoot!;
        const targets = [
          root.querySelector('[role=status]'),
          ...(element.localName === 't-menu' ? [root.querySelector('.trigger > span')] : []),
        ].filter((target): target is HTMLElement => target instanceof HTMLElement);
        const luminance = (color: string) =>
          color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((value) => {
              const channel = value / 255;
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
        return targets.map((target) => {
          let ancestor: Element | null = target;
          let background = '';
          while (ancestor) {
            const color = getComputedStyle(ancestor).backgroundColor;
            const alpha = Number(color.match(/[\d.]+/g)?.[3] ?? 1);
            if (alpha === 1) {
              background = color;
              break;
            }
            if (alpha !== 0)
              throw new Error(
                'The empty-state fixture requires an opaque background for this contrast calculation.',
              );
            ancestor =
              ancestor.parentElement ?? (ancestor.getRootNode() as ShadowRoot).host ?? null;
          }
          if (!background) throw new Error('The empty-state fixture has no opaque background.');
          const foreground = getComputedStyle(target).color;
          const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
          return {
            text: target.textContent?.trim(),
            foreground,
            background,
            ratio: (values[0] + 0.05) / (values[1] + 0.05),
          };
        });
      });
      if (tag !== 't-tree') expect(contrast).toHaveLength(tag === 't-menu' ? 2 : 1);
      for (const pair of contrast)
        expect(pair.ratio, `${theme}/${tag}: ${JSON.stringify(pair)}`).toBeGreaterThanOrEqual(4.5);
      const path = testInfo.outputPath(`${tag}-${theme}-empty-axe.json`);
      await writeFile(
        path,
        JSON.stringify(
          {
            violations: report.violations,
            incomplete: report.incomplete,
            contrast,
            browser: page.context().browser()?.version(),
          },
          null,
          2,
        ),
      );
      await testInfo.attach(`${tag}-${theme}-empty-axe`, { path, contentType: 'application/json' });
      expect(report.violations).toEqual([]);
      expect(
        report.incomplete.filter((finding) => finding.id === 'aria-required-children'),
      ).toEqual([]);
      if (testInfo.project.name === 'chromium' && ['amber', 'paper'].includes(theme))
        await page.screenshot({ path: testInfo.outputPath(`${tag}-${theme}-empty.png`) });
    }
  });
}

test('tree retains named empty focus, restores rows, and leaves outside focus unchanged', async ({
  page,
}) => {
  await mount(page, 't-tree');
  const host = page.locator('t-tree');
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await host.evaluate((element: TTree) => {
    element.items = [{ id: 'first', label: 'First' }];
    element.value = 'first';
    element.dataset.events = '0';
    element.addEventListener('t-select', () => {
      element.dataset.events = String(Number(element.dataset.events) + 1);
    });
  });
  await host.getByRole('treeitem', { name: 'First' }).focus();
  await host.evaluate((element: TTree) => {
    element.items = [];
  });
  await expect(host.getByRole('group', { name: 'Available choices' })).toBeFocused();
  await host.evaluate((element: TTree) => {
    element.items = [{ id: 'restored', label: 'Restored' }];
  });
  await expect(host.getByRole('treeitem', { name: 'Restored' })).toBeFocused();
  await host.evaluate((element: TTree) => {
    element.items = [{ id: 'restored', label: 'Restored', disabled: true }];
  });
  await expect(host.getByRole('tree', { name: 'Available choices' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
  await host.evaluate((element: TTree) => {
    element.items = [];
  });
  await expect(page.locator('#after')).toBeFocused();
  await expect(host).toHaveJSProperty('value', 'first');
  await expect(host).toHaveAttribute('data-events', '0');
});

test('menu retains its empty notice, restores actions, and dismisses without selection', async ({
  page,
}) => {
  await mount(page, 't-menu');
  const host = page.locator('t-menu');
  const trigger = host.getByRole('button', { name: 'Available choices', exact: true });
  await host.evaluate((element: TMenu) => {
    element.options = [{ value: 'first', label: 'First action' }];
    element.dataset.events = '0';
    element.addEventListener('t-select', () => {
      element.dataset.events = String(Number(element.dataset.events) + 1);
    });
  });
  await trigger.click();
  await expect(host.getByRole('menuitem', { name: 'First action' })).toBeFocused();
  await host.evaluate((element: TMenu) => {
    element.options = [];
  });
  await expect(host.getByRole('group', { name: 'Available choices' })).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(trigger).not.toHaveAttribute('aria-haspopup');
  await host.evaluate((element: TMenu) => {
    element.options = [{ value: 'line', label: '', separator: true }];
  });
  await expect(host.getByRole('group', { name: 'Available choices' })).toBeFocused();
  await host.evaluate((element: TMenu) => {
    element.options = [{ value: 'next', label: 'Next action' }];
  });
  await expect(host.getByRole('menuitem', { name: 'Next action' })).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  await host.evaluate((element: TMenu) => {
    element.options = [];
  });
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(host).toHaveAttribute('data-events', '0');
  await trigger.click();
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

for (const tag of ['t-combobox', 't-command-palette']) {
  test(`${tag}: loading and filtered choices keep list relationships accurate`, async ({
    page,
  }, testInfo) => {
    await mount(page, tag);
    const host = page.locator(tag);
    if (tag === 't-command-palette')
      await host.evaluate((element: TCommandPalette) =>
        element.show(document.querySelector('#before') as HTMLElement),
      );
    const search = host.getByRole('combobox');
    await search.focus();
    await host.evaluate((element: TCombobox | TCommandPalette) => {
      element.loading = true;
    });
    await expect(search).toHaveAttribute('aria-expanded', 'true');
    await expect(host.getByRole('listbox')).toHaveAttribute('aria-busy', 'true');
    const loading = await new AxeBuilder({ page }).include(tag).analyze();
    expect(loading.violations).toEqual([]);
    expect(loading.incomplete.filter((finding) => finding.id === 'aria-required-children')).toEqual(
      [],
    );
    await testInfo.attach(`${tag}-loading-review`, {
      body: JSON.stringify(loading.incomplete),
      contentType: 'application/json',
    });
    await host.evaluate((element: TCombobox | TCommandPalette, name) => {
      if (name === 't-combobox')
        (element as TCombobox).options = [{ value: 'alpha', label: 'Alpha' }];
      else (element as TCommandPalette).commands = [{ value: 'alpha', label: 'Alpha' }];
      element.loading = false;
    }, tag);
    await expect(search).toBeFocused();
    await expect(search).toHaveAttribute('aria-expanded', 'true');
    await expect(search).toHaveAttribute(
      'aria-controls',
      tag === 't-combobox' ? 'options' : 'commands',
    );
    await expect(host.getByRole('option', { name: 'Alpha', exact: true })).toBeVisible();
    await search.fill('unmatched');
    await expect(search).toBeFocused();
    await expect(search).toHaveAttribute('aria-expanded', 'false');
    await expect(search).not.toHaveAttribute('aria-controls');
    await expect(search).not.toHaveAttribute('aria-activedescendant');
    await expect(host.getByRole('option')).toHaveCount(0);
    await expect(host.getByRole('status')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(search).toBeFocused();
    await search.fill('');
    await expect(search).toHaveAttribute('aria-expanded', 'true');
    await host.evaluate((element: TCombobox | TCommandPalette, name) => {
      if (name === 't-combobox')
        (element as TCombobox).options = [{ value: 'alpha', label: 'Alpha', disabled: true }];
      else
        (element as TCommandPalette).commands = [
          { value: 'alpha', label: 'Alpha', disabled: true },
        ];
    }, tag);
    await expect(host.getByRole('listbox')).toBeVisible();
    await expect(
      host.getByRole('option', {
        name: tag === 't-command-palette' ? 'Alpha Unavailable' : 'Alpha',
        exact: true,
      }),
    ).toHaveAttribute('aria-disabled', 'true');
    await expect(search).not.toHaveAttribute('aria-activedescendant');
    await page.keyboard.press('Enter');
    await expect(search).toBeFocused();
    await host.evaluate((element: TCombobox | TCommandPalette, name) => {
      if (name === 't-combobox')
        (element as TCombobox).options = [{ value: 'alpha', label: 'Alpha' }];
      else (element as TCommandPalette).commands = [{ value: 'alpha', label: 'Alpha' }];
    }, tag);
    await page.keyboard.press('ArrowDown');
    await expect(search).toHaveAttribute(
      'aria-activedescendant',
      tag === 't-combobox' ? 'option-0' : 'command-0',
    );
    await page.keyboard.press('Escape');
    if (tag === 't-command-palette') await expect(page.locator('#before')).toBeFocused();
    else await expect(search).toHaveAttribute('aria-expanded', 'false');
  });
}
