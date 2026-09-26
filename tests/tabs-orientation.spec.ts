import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { TTabs } from '../src/components/tabs';
import { writeFile } from 'node:fs/promises';

async function mount(page: Page, orientation = 'horizontal', activation = 'automatic') {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate(
    (element, [layout, mode]) => {
      element.innerHTML = `<t-tabs label="Record sections" orientation="${layout}" activation="${mode}"><p slot="overview">Overview content.</p><button slot="settings">Save settings</button><p slot="history">History content.</p></t-tabs>`;
      const tabs = element.querySelector('t-tabs')!;
      tabs.tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'locked', label: 'Locked', disabled: true },
        { id: 'settings', label: 'Settings' },
        { id: 'history', label: 'History' },
      ];
      tabs.addEventListener('t-change', (event: Event) => {
        (tabs as HTMLElement).dataset.selection = (event as CustomEvent).detail.value;
        (tabs as HTMLElement).dataset.changeCount = String(
          Number((tabs as HTMLElement).dataset.changeCount ?? 0) + 1,
        );
      });
    },
    [orientation, activation],
  );
  await expect(page.getByRole('tablist', { name: 'Record sections' })).toBeVisible();
}

test('horizontal tabs follow reading direction and skip disabled choices', async ({ page }) => {
  await mount(page);
  const tabs = page.locator('t-tabs');
  const tablist = page.getByRole('tablist', { name: 'Record sections' });
  await expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');
  await tabs.getByRole('tab', { name: 'Overview' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Settings' })).toBeFocused();
  await expect(tabs).toHaveAttribute('data-selection', 'settings');
  await page.keyboard.press('End');
  await expect(tabs.getByRole('tab', { name: 'History' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Overview' })).toBeFocused();
  await tabs.evaluate((element) => element.setAttribute('dir', 'rtl'));
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'History' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.getByRole('tab', { name: 'Overview' })).toBeFocused();
  await expect(tabs.getByRole('tab', { name: 'Locked' })).toBeDisabled();
});

test('vertical tabs use up and down, expose orientation, and preserve panel semantics', async ({
  page,
}) => {
  await mount(page, 'vertical');
  const tabs = page.locator('t-tabs');
  await expect(page.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
  await tabs.getByRole('tab', { name: 'Overview' }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(tabs.getByRole('tab', { name: 'Settings' })).toBeFocused();
  await expect(tabs.getByRole('tabpanel', { name: 'Settings' })).toBeVisible();
  await expect(tabs.getByRole('tabpanel', { name: 'Overview', includeHidden: true })).toBeHidden();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Settings' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(tabs.getByRole('tab', { name: 'History' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(tabs.getByRole('tab', { name: 'Overview' })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(tabs.getByRole('tab', { name: 'History' })).toBeFocused();
});

test('clicking the current tab and programmatic selection do not emit a user change', async ({
  page,
}) => {
  await mount(page);
  const tabs = page.locator('t-tabs');
  await tabs.getByRole('tab', { name: 'Overview' }).click();
  await expect(tabs).not.toHaveAttribute('data-change-count');
  await tabs.evaluate(
    (element) => ((element as HTMLElement & { active: string }).active = 'history'),
  );
  await expect(tabs.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.getByRole('tab', { name: 'History' })).toBeFocused();
  await expect(tabs).not.toHaveAttribute('data-change-count');
  await tabs.getByRole('tab', { name: 'Settings' }).click();
  await expect(tabs).toHaveAttribute('data-change-count', '1');
  await expect(tabs).toHaveAttribute('data-selection', 'settings');
  await expect(tabs.getByRole('tabpanel', { name: 'Settings' })).toBeVisible();
  await expect(tabs.getByRole('button', { name: 'Save settings' })).toBeVisible();
  await tabs.evaluate((element) => {
    (element as HTMLElement & { tabs: { id: string; label: string; disabled?: boolean }[] }).tabs =
      [
        { id: 'overview', label: 'Overview' },
        { id: 'settings', label: 'Settings', disabled: true },
        { id: 'history', label: 'History' },
      ];
  });
  await expect(tabs.getByRole('tab', { name: 'Overview' })).toBeFocused();
  await expect(tabs.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(tabs).toHaveAttribute('data-change-count', '1');
});

test('manual activation moves focus without changing panels until Enter or Space', async ({
  page,
}, testInfo) => {
  await mount(page, 'horizontal', 'manual');
  const tabs = page.locator('t-tabs');
  const overview = tabs.getByRole('tab', { name: 'Overview' });
  const settings = tabs.getByRole('tab', { name: 'Settings' });
  const history = tabs.getByRole('tab', { name: 'History' });
  await overview.focus();
  await page.keyboard.press('ArrowRight');
  await expect(settings).toBeFocused();
  await expect(settings).toHaveAttribute('tabindex', '0');
  await expect(overview).toHaveAttribute('tabindex', '-1');
  await expect(overview).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.getByRole('tabpanel', { name: 'Overview' })).toBeVisible();
  await expect(tabs).not.toHaveAttribute('data-change-count');
  const report = await new AxeBuilder({ page }).include('t-tabs').analyze();
  expect(report.violations).toEqual([]);
  if (report.incomplete.length)
    await testInfo.attach('manual-tabs-axe-review', {
      body: JSON.stringify(report.incomplete, null, 2),
      contentType: 'application/json',
    });
  await page.keyboard.press('ArrowRight');
  await expect(history).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(history).toHaveAttribute('aria-selected', 'true');
  await expect(tabs).toHaveAttribute('data-selection', 'history');
  await expect(tabs).toHaveAttribute('data-change-count', '1');
  await page.keyboard.press('Home');
  await expect(overview).toBeFocused();
  await expect(history).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Space');
  await expect(overview).toHaveAttribute('aria-selected', 'true');
  await expect(tabs).toHaveAttribute('data-change-count', '2');
});

test('manual tab focus resets on exit and survives changing selection and disabled choices', async ({
  page,
}) => {
  await mount(page, 'vertical', 'manual');
  const tabs = page.locator('t-tabs');
  const overview = tabs.getByRole('tab', { name: 'Overview' });
  const settings = tabs.getByRole('tab', { name: 'Settings' });
  await overview.focus();
  await page.keyboard.press('ArrowDown');
  await expect(settings).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(tabs.getByRole('tabpanel', { name: 'Overview' })).toBeFocused();
  await expect(overview).toHaveAttribute('tabindex', '0');
  await expect(settings).toHaveAttribute('tabindex', '-1');
  await settings.focus();
  await tabs.evaluate(
    (element) => ((element as HTMLElement & { active: string }).active = 'history'),
  );
  await expect(tabs.getByRole('tab', { name: 'History' })).toBeFocused();
  await expect(tabs).not.toHaveAttribute('data-change-count');
  await page.keyboard.press('ArrowUp');
  await expect(settings).toBeFocused();
  await tabs.evaluate((element) => {
    (element as HTMLElement & { tabs: { id: string; label: string; disabled?: boolean }[] }).tabs =
      [
        { id: 'overview', label: 'Overview' },
        { id: 'settings', label: 'Settings', disabled: true },
        { id: 'history', label: 'History' },
      ];
  });
  await expect(tabs.getByRole('tab', { name: 'History' })).toBeFocused();
  await expect(tabs.getByRole('tab', { name: 'History' })).toHaveAttribute('tabindex', '0');
});

test('manual activation follows RTL and vertical arrow axes without selecting', async ({
  page,
}) => {
  await mount(page, 'horizontal', 'manual');
  const tabs = page.locator('t-tabs');
  await tabs.evaluate((element) => element.setAttribute('dir', 'rtl'));
  await tabs.getByRole('tab', { name: 'Overview' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.getByRole('tab', { name: 'Settings' })).toBeFocused();
  await expect(tabs.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await tabs.evaluate(
    (element) => ((element as HTMLElement & { orientation: string }).orientation = 'vertical'),
  );
  await page.keyboard.press('ArrowDown');
  await expect(tabs.getByRole('tab', { name: 'History' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.getByRole('tab', { name: 'History' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(tabs.getByRole('tab', { name: 'History' })).toBeFocused();
  await expect(tabs).not.toHaveAttribute('data-change-count');
});

test('vertical tabs reflow at 320 CSS pixels and retain accessible states in six palettes', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 640 });
  await mount(page, 'vertical');
  await page.locator('body').evaluate((element) => {
    element.style.margin = '0';
    element.style.padding = '0';
  });
  const tabs = page.locator('t-tabs');
  await tabs.evaluate((element) => {
    element.style.maxWidth = '320px';
    (element as HTMLElement & { tabs: { id: string; label: string }[] }).tabs = [
      { id: 'overview', label: 'Overview and current mission details' },
      { id: 'settings', label: 'Workspace configuration settings' },
      { id: 'history', label: 'Record history' },
    ];
    element.shadowRoot!.querySelectorAll<HTMLElement>('button, [role=tabpanel]').forEach((node) => {
      node.style.fontSize = '24px';
      node.style.lineHeight = '1.5';
      node.style.letterSpacing = '0.12em';
      node.style.wordSpacing = '0.16em';
    });
  });
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, value) => element.setAttribute('data-theme', value), theme);
    await expect(
      tabs.getByRole('tab', { name: 'Overview and current mission details' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    const report = await new AxeBuilder({ page }).include('t-tabs').analyze();
    expect(report.violations, `${theme}: ${JSON.stringify(report.violations)}`).toEqual([]);
    if (report.incomplete.length)
      await testInfo.attach(`${theme}-tabs-axe-review`, {
        body: JSON.stringify(report.incomplete, null, 2),
        contentType: 'application/json',
      });
  }
});

for (const activation of ['automatic', 'manual']) {
  for (const state of ['empty', 'disabled']) {
    test(`${activation} tabs retain focus through ${state} choices and restore an enabled tab`, async ({
      page,
    }) => {
      await mount(page, 'horizontal', activation);
      const tabs = page.locator('t-tabs');
      const list = tabs.locator('.tablist');
      await tabs.evaluate((element) => {
        const outside = document.createElement('button');
        outside.textContent = 'After tabs';
        element.after(outside);
      });
      await tabs.getByRole('tab', { name: 'Settings' }).click();
      await tabs.evaluate((element, next) => {
        const host = element as TTabs;
        host.tabs = next === 'empty' ? [] : host.tabs.map((tab) => ({ ...tab, disabled: true }));
      }, state);
      await expect(list).toBeFocused();
      await expect(list).toHaveAttribute('role', state === 'empty' ? 'group' : 'tablist');
      await expect(
        tabs.getByRole(state === 'empty' ? 'group' : 'tablist', {
          name: 'Record sections',
          exact: true,
        }),
      ).toHaveCount(1);
      await expect(list).toHaveAttribute('tabindex', '0');
      await expect(tabs).toHaveAttribute('active', '');
      await expect(tabs.getByRole('tabpanel')).toHaveCount(0);
      for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
        await page.keyboard.press(key);
        await expect(list).toBeFocused();
      }
      await tabs.evaluate((element) => {
        (element as TTabs).tabs = [
          { id: 'overview', label: 'Overview' },
          { id: 'settings', label: 'Settings' },
        ];
      });
      await expect(tabs.getByRole('tab', { name: 'Overview' })).toBeFocused();
      await expect(list).toHaveAttribute('tabindex', '-1');
      await expect(list).toHaveAttribute('role', 'tablist');
      await expect(tabs.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(tabs).toHaveAttribute('data-change-count', '1');
      await tabs.evaluate((element, next) => {
        const host = element as TTabs;
        host.tabs = next === 'empty' ? [] : host.tabs.map((tab) => ({ ...tab, disabled: true }));
      }, state);
      await expect(list).toBeFocused();
      await page.keyboard.press('Tab');
      const outside = page.getByRole('button', { name: 'After tabs', exact: true });
      await expect(outside).toBeFocused();
      await tabs.evaluate((element) => {
        (element as TTabs).tabs = [{ id: 'overview', label: 'Overview' }];
      });
      await expect(outside).toBeFocused();
      await expect(tabs).toHaveAttribute('data-change-count', '1');
    });
  }
  test(`${activation} tabs leave focus outside during initial and later empty states`, async ({
    page,
  }) => {
    await mount(page, 'horizontal', activation);
    await page.locator('#fixture').evaluate((element) => {
      const outside = document.createElement('button');
      outside.textContent = 'Outside tabs';
      element.before(outside);
      outside.focus();
      const tabs = element.querySelector('t-tabs')!;
      tabs.tabs = [];
    });
    const outside = page.getByRole('button', { name: 'Outside tabs', exact: true });
    await expect(outside).toBeFocused();
    await page.locator('t-tabs').evaluate(async (element) => {
      const host = element as TTabs;
      host.tabs = [{ id: 'overview', label: 'Overview' }];
      await host.updateComplete;
      host.tabs = [];
      await host.updateComplete;
      const initial = document.createElement('t-tabs');
      initial.label = 'Initially empty';
      element.after(initial);
      await initial.updateComplete;
      initial.tabs = [{ id: 'first', label: 'First', disabled: true }];
      await initial.updateComplete;
    });
    await expect(outside).toBeFocused();
    await expect(page.locator('t-tabs').first()).not.toHaveAttribute('data-change-count');
  });
}

test('empty and disabled tablists retain visible focus and accessible names in all palettes', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await mount(page);
  const tabs = page.locator('t-tabs');
  const list = tabs.locator('.tablist');
  for (const state of ['empty', 'disabled']) {
    await tabs.evaluate((element, next) => {
      (element as TTabs).tabs =
        next === 'empty' ? [] : [{ id: 'overview', label: 'Overview', disabled: true }];
    }, state);
    await list.focus();
    await expect(
      tabs.getByRole(state === 'empty' ? 'group' : 'tablist', {
        name: 'Record sections',
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(list).toHaveAttribute('role', state === 'empty' ? 'group' : 'tablist');
    if (state === 'empty') await expect(list).not.toHaveAttribute('aria-orientation');
    await page.keyboard.press('Shift');
    for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
      await page.locator('html').evaluate((element, palette) => {
        element.dataset.theme = palette;
      }, theme);
      await expect(list).toBeFocused();
      await expect(list).toHaveCSS('outline-style', 'solid');
      await expect(list).toHaveCSS('outline-width', '2px');
      const result = await list.evaluate((element) => {
        const style = getComputedStyle(element);
        const background = getComputedStyle(document.body).backgroundColor;
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
        const values = [luminance(style.outlineColor), luminance(background)].sort((a, b) => b - a);
        return {
          foreground: style.outlineColor,
          background,
          ratio: (values[0] + 0.05) / (values[1] + 0.05),
          height: element.getBoundingClientRect().height,
        };
      });
      expect(result.height).toBeGreaterThanOrEqual(24);
      expect(result.ratio, `${theme}/${state}: ${JSON.stringify(result)}`).toBeGreaterThanOrEqual(
        3,
      );
      const report = await new AxeBuilder({ page }).include('t-tabs').analyze();
      expect(report.violations).toEqual([]);
      expect(
        report.incomplete.filter((finding) => finding.id === 'aria-required-children'),
      ).toEqual([]);
      const path = testInfo.outputPath(`${theme}-${state}-tabs-axe-review.json`);
      await writeFile(
        path,
        JSON.stringify(
          {
            incomplete: report.incomplete,
            focus: result,
            browser: page.context().browser()?.version(),
          },
          null,
          2,
        ),
      );
      await testInfo.attach(`${theme}-${state}-tabs-axe-review`, {
        path,
        contentType: 'application/json',
      });
      if (testInfo.project.name === 'chromium' && ['amber', 'paper'].includes(theme)) {
        await page.screenshot({ path: testInfo.outputPath(`${theme}-${state}-focus.png`) });
      }
    }
  }
});
