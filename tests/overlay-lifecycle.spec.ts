import { test, expect, type Page } from '@playwright/test';

test('modal boundaries use the selected radio and skip closed details content', async ({
  page,
}) => {
  await fixture(
    page,
    '<t-dialog open><t-radio-group slot="footer" label="Mode" value="a"></t-radio-group></t-dialog>',
  );
  await page.locator('t-radio-group').evaluate(
    (element: import('../src/components/radio-group').TRadioGroup) =>
      (element.options = [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
        { value: 'c', label: 'Gamma' },
      ]),
  );
  const close = page.getByRole('button', { name: 'Close dialog' });
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('radio', { name: 'Alpha', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.getByRole('radio', { name: 'Beta', exact: true }).check();
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('radio', { name: 'Beta', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.locator('t-dialog').evaluate((element) => {
    element.innerHTML = '<details><summary>More</summary><button>Hidden action</button></details>';
  });
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.locator('details').evaluate((element: HTMLDetailsElement) => (element.open = true));
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Hidden action' })).toBeFocused();
});

async function fixture(page: Page, markup: string) {
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((element, html) => {
    element.innerHTML = html;
  }, markup);
}

test('tooltip remains visible across the hover gap and works after reconnection', async ({
  page,
}) => {
  await fixture(page, '<t-tooltip label="Help" message="Additional information"></t-tooltip>');
  const trigger = page.getByRole('button', { name: 'Help' });
  await trigger.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  const origin = (await trigger.boundingBox())!;
  const box = (await tooltip.boundingBox())!;
  const start = { x: origin.x + origin.width / 2, y: origin.y + origin.height / 2 };
  const finish = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  for (let step = 1; step <= 10; step++) {
    await page.mouse.move(
      start.x + ((finish.x - start.x) * step) / 10,
      start.y + ((finish.y - start.y) * step) / 10,
    );
    await page.waitForTimeout(80);
  }
  // Stay over the help longer than the close delay to prove it remains hoverable.
  await page.waitForTimeout(450);
  await expect(tooltip).toBeVisible();
  await page.mouse.move(600, 500);
  await expect(tooltip).toBeHidden();
  await trigger.hover();
  await expect(tooltip).toBeVisible();
  await page.evaluate(() => {
    const tooltip = document.querySelector('t-tooltip')!;
    tooltip.remove();
    document.querySelector('#fixture')!.append(tooltip);
  });
  await page.mouse.move(600, 500);
  await trigger.hover();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
});

test('popover restores native and programmatic openers for slotted shadow controls', async ({
  page,
}) => {
  await fixture(
    page,
    '<button id="before">Before</button><t-popover label="Settings"><t-input label="Workspace"></t-input></t-popover><input id="outside" aria-label="Outside">',
  );
  const trigger = page.getByRole('button', { name: 'Settings' });
  await trigger.click();
  await page.getByRole('textbox', { name: 'Workspace' }).fill('Hullframe');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.locator('#before').focus();
  await page.evaluate(() => document.querySelector('t-popover')!.show());
  await page.getByRole('textbox', { name: 'Workspace' }).fill('Programmatic');
  await page.evaluate(() => document.querySelector('t-popover')!.close());
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#before')).toBeFocused();
  await trigger.click();
  await page.getByRole('textbox', { name: 'Workspace' }).focus();
  await page.locator('#outside').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#outside')).toBeFocused();
  await page.locator('#before').focus();
  await page.evaluate(() => document.querySelector('t-popover')!.show());
  await page.locator('#outside').focus();
  await page.evaluate(() => document.querySelector('t-popover')!.close());
  await expect(page.locator('#outside')).toBeFocused();
});

test('dialog wraps Tab across slotted shadow controls and restores its opener', async ({
  page,
}) => {
  await fixture(
    page,
    '<button id="open">Open dialog</button><t-dialog heading="Edit"><t-input label="Name"></t-input><t-button slot="footer">Save</t-button></t-dialog><button>After</button>',
  );
  await page
    .locator('#open')
    .evaluate((element) =>
      element.addEventListener('click', () =>
        document.querySelector('t-dialog')!.show(element as HTMLElement),
      ),
    );
  await page.getByRole('button', { name: 'Open dialog' }).click();
  const close = page.getByRole('button', { name: 'Close dialog' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Save' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Name' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open dialog' })).toBeFocused();
});
