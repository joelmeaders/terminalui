import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { TPopover, TToast } from '../src/index';

async function mount(page: Page, content: string) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page
    .locator('#fixture')
    .evaluate((element, markup) => (element.innerHTML = markup), content);
}

test('popover supports focus, Escape, outside dismissal, disabled state and viewport edges', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 650 });
  await mount(
    page,
    `<button id="outside">Outside</button><div style="position:fixed;right:0;bottom:0;width:120px;height:50px;overflow:hidden"><t-popover label="Settings" heading="Quick settings"><t-input label="Workspace"></t-input><button>Apply</button></t-popover></div>`,
  );
  const trigger = page.getByRole('button', { name: 'Settings', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Quick settings' });
  await expect(dialog).toBeVisible();
  await expect
    .poll(async () => {
      const box = await dialog.boundingBox();
      return (
        !!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 650
      );
    })
    .toBe(true);
  await page.getByRole('textbox', { name: 'Workspace' }).fill('Archive');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.locator('#outside').click();
  await expect(dialog).not.toBeVisible();
  await page.locator('t-popover').evaluate((el: TPopover) => {
    el.disabled = true;
    el.show();
  });
  await expect(trigger).toBeDisabled();
  await expect(dialog).not.toBeVisible();
  await page.locator('t-popover').evaluate((el: TPopover) => {
    el.disabled = false;
    el.show();
  });
  await expect(dialog).toBeVisible();
  await page.locator('t-popover').evaluate((el) => {
    const parent = el.parentElement!;
    el.remove();
    parent.append(el);
  });
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  await expect(dialog).toBeVisible();
});

test('tooltip escapes clipping and dismisses with Escape during pointer use', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 650 });
  await mount(
    page,
    `<div style="position:fixed;left:0;top:0;width:40px;height:40px;overflow:hidden"><t-tooltip label="Help" message="A useful explanation."></t-tooltip></div>`,
  );
  await page.getByRole('button', { name: 'Help', exact: true }).hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  const box = await tooltip.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await expect(tooltip).not.toBeVisible();
});

test('toast timers pause on focus and hover, restart on updates, and return focus on dismissal', async ({
  page,
}) => {
  await mount(
    page,
    `<button id="save">Save</button><t-toast id="toast" duration="1200"></t-toast>`,
  );
  await page
    .locator('#save')
    .evaluate((el) =>
      el.addEventListener('click', () =>
        document.querySelector<TToast>('#toast')!.show('Saved.', el as HTMLElement),
      ),
    );
  await page.locator('#save').click();
  const close = page.getByRole('button', { name: 'Dismiss notification' });
  await close.focus();
  await page.waitForTimeout(1350);
  await expect(close).toBeVisible();
  await close.click();
  await expect(close).not.toBeVisible();
  await expect(page.locator('#save')).toBeFocused();
  await page.locator('#save').click();
  await page.locator('t-toast').hover();
  await page.waitForTimeout(1350);
  await expect(close).toBeVisible();
  await page.mouse.move(380, 600);
  await expect(close).not.toBeVisible({ timeout: 2500 });
  await page.locator('t-toast').evaluate((el: TToast) => {
    el.duration = 120;
    el.show('Fresh message');
  });
  await expect(close).not.toBeVisible({ timeout: 1500 });
});

test('primitives have meaningful names, reduced-motion fallbacks, and responsive layout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 650 });
  await mount(
    page,
    `<t-grid columns="3"><t-avatar name="Ellen Ripley" src="data:image/png;base64,broken"></t-avatar><t-spinner label="Loading archive"></t-spinner><t-icon-button label="Search" name="search"></t-icon-button></t-grid><t-divider></t-divider><t-stack><t-skeleton animated></t-skeleton><t-empty-state heading="No tasks">Everything is up to date.</t-empty-state><t-icon name="folder" label="Folder"></t-icon></t-stack>`,
  );
  await expect(page.getByRole('img', { name: 'Ellen Ripley' })).toHaveText('ER');
  await expect(page.getByRole('status')).toHaveText('Loading archive');
  await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
  await expect(page.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('t-spinner .ring')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('t-skeleton span')).toHaveCSS('animation-name', 'none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const grid = await page
    .locator('t-grid')
    .evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('div')!).gridTemplateColumns);
  expect(grid.trim().split(' ')).toHaveLength(1);
  expect((await new AxeBuilder({ page }).include('#fixture').analyze()).violations).toEqual([]);
});

test('scanline preview uses visible palette stripes and resets to a clear surface', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByText('Display effects', { exact: false }).click();
  await page
    .getByRole('combobox', { name: 'Screen scanlines', exact: true })
    .selectOption('pronounced');
  const preview = page.locator('.scanline-preview');
  await expect(preview).toBeVisible();
  expect(await preview.evaluate((el) => getComputedStyle(el, '::after').backgroundImage)).toContain(
    '0.12',
  );
  expect(await preview.evaluate((el) => getComputedStyle(el, '::after').zIndex)).toBe('-1');
  expect(
    await preview.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--t-scanline-width').trim(),
    ),
  ).toBe('2px');
  await expect(preview).toHaveAttribute('data-scanlines', 'pronounced');
  await page.getByRole('button', { name: 'Reset display styles' }).click();
  expect(await preview.evaluate((el) => getComputedStyle(el, '::after').display)).toBe('none');
});

test('application demo saves real form values, paginates records, and opens settings', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Save request', exact: true }).click();
  await expect(page.locator('#extended-forms output.tiny')).toContainText('archive');
  await expect(page.locator('#library-toast')).toContainText('Request saved');
  await expect(
    page.locator('#library-toast').getByRole('button', { name: 'Dismiss notification' }),
  ).toBeInViewport();
  await page.locator('t-pagination').getByRole('button', { name: 'Page 2', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Crew manifest', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open drawer', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Workspace settings', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Workspace settings', exact: true }),
  ).not.toBeVisible();
});
