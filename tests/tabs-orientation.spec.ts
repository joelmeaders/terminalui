import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mount(page: Page, orientation = 'horizontal') {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((element, value) => {
    element.innerHTML = `<t-tabs label="Record sections" orientation="${value}"><p slot="overview">Overview content.</p><button slot="settings">Save settings</button><p slot="history">History content.</p></t-tabs>`;
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
  }, orientation);
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
