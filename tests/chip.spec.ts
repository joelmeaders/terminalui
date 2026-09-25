import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mount(page: Page, markup = '<t-chip label="Engineering"></t-chip>') {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((element, value) => {
    element.innerHTML = value;
  }, markup);
  await page.locator('t-chip .chip').first().waitFor();
}

test('static chips remain text; decorative slots do not change action names', async ({ page }) => {
  await mount(
    page,
    '<t-chip label="Operational" variant="success"><t-icon slot="start" name="check"></t-icon></t-chip>',
  );
  const chip = page.locator('t-chip');
  await expect(chip.getByText('Operational')).toBeVisible();
  await expect(chip.getByRole('button')).toHaveCount(0);
  await expect(chip.locator('slot[name="start"]')).toHaveAttribute('data-filled');
  await expect(chip.locator('t-icon svg path')).toHaveCount(1);
  await chip.evaluate(
    (element) => ((element as HTMLElement & { selectable: boolean }).selectable = true),
  );
  await expect(chip.getByRole('button', { name: 'Operational', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await chip.locator('t-icon').evaluate((element) => element.remove());
  await expect(chip.locator('slot[name="start"]')).not.toHaveAttribute('data-filled');
});

test('selection uses one pressed button and emits only user changes', async ({ page }) => {
  await mount(page, '<t-chip label="Engineering" selectable></t-chip>');
  const chip = page.locator('t-chip');
  const action = chip.getByRole('button', { name: 'Engineering' });
  await chip.evaluate((element: any) => {
    element.events = [];
    element.addEventListener('t-toggle', (event: CustomEvent) => element.events.push(event.detail));
  });
  await action.focus();
  await page.keyboard.press('Space');
  await expect(action).toBeFocused();
  await expect(action).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Enter');
  await expect(action).toHaveAttribute('aria-pressed', 'false');
  expect(await chip.evaluate((element: any) => element.events)).toEqual([
    { selected: true, label: 'Engineering' },
    { selected: false, label: 'Engineering' },
  ]);
  await chip.evaluate((element: any) => (element.selected = true));
  await expect(action).toHaveAttribute('aria-pressed', 'true');
  expect(await chip.evaluate((element: any) => element.events)).toHaveLength(2);
});

test('removal is a separate named request and applications can restore focus', async ({ page }) => {
  await mount(
    page,
    '<form><t-chip id="first" label="Engineering" selectable removable></t-chip><t-chip id="next" label="Science" selectable></t-chip></form>',
  );
  const first = page.locator('#first');
  const next = page.locator('#next');
  const remove = first.getByRole('button', { name: 'Remove Engineering' });
  await page.locator('form').evaluate((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      form.setAttribute('data-submitted', 'true');
    });
  });
  await first.evaluate((element: any) => {
    element.events = [];
    element.addEventListener('t-toggle', () => element.events.push('toggle'));
    element.addEventListener('t-remove', (event: CustomEvent) =>
      element.events.push(event.detail.label),
    );
  });
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(first).toBeAttached();
  expect(await first.evaluate((element: any) => element.events)).toEqual(['Engineering']);
  await expect(first).toHaveJSProperty('selected', false);
  await expect(page.locator('form')).not.toHaveAttribute('data-submitted');
  await first.evaluate((element) => {
    element.addEventListener('t-remove', () => {
      const next = document.querySelector<HTMLElement>('#next')!;
      element.remove();
      next.focus();
    });
  });
  await remove.click();
  await expect(first).toHaveCount(0);
  await expect(next.getByRole('button', { name: 'Science' })).toBeFocused();
});

test('disabled actions block selection and removal, then recover on enable', async ({ page }) => {
  await mount(page, '<t-chip label="Engineering" selectable removable disabled></t-chip>');
  const chip = page.locator('t-chip');
  const action = chip.getByRole('button', { name: 'Engineering', exact: true });
  const remove = chip.getByRole('button', { name: 'Remove Engineering' });
  await expect(action).toBeDisabled();
  await expect(remove).toBeDisabled();
  await chip.evaluate((element: any) => {
    element.events = 0;
    element.addEventListener('t-toggle', () => element.events++);
    element.addEventListener('t-remove', () => element.events++);
    element.shadowRoot.querySelector('.action').click();
    element.shadowRoot.querySelector('.remove').click();
  });
  expect(await chip.evaluate((element: any) => element.events)).toBe(0);
  await chip.evaluate((element: any) => (element.disabled = false));
  await action.click();
  await remove.click();
  expect(await chip.evaluate((element: any) => element.events)).toBe(2);
});

test('long chips and compact controls remain reachable at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await mount(
    page,
    '<t-chip label="Atmospheric processing and environmental monitoring" size="small" selectable removable></t-chip>',
  );
  await page.locator('body').evaluate((element) => {
    element.style.margin = '0';
    element.style.padding = '8px';
  });
  const chip = page.locator('t-chip');
  await chip.evaluate((element) => {
    for (const node of element.shadowRoot!.querySelectorAll<HTMLElement>('*')) {
      node.style.fontSize = '26px';
      node.style.letterSpacing = '0.12em';
      node.style.wordSpacing = '0.16em';
      node.style.lineHeight = '1.5';
    }
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  for (const name of [
    'Atmospheric processing and environmental monitoring',
    'Remove Atmospheric processing and environmental monitoring',
  ]) {
    const button = chip.getByRole('button', { name, exact: true });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(24);
    expect(box!.height).toBeGreaterThanOrEqual(24);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(321);
  }
});

test('all palettes keep interactive boundaries and no axe violations', async ({
  page,
}, testInfo) => {
  await mount(
    page,
    '<t-chip label="Engineering" variant="accent" selectable selected removable></t-chip>',
  );
  const chip = page.locator('t-chip');
  const ratio = (a: string, b: string) => {
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
    const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, value) => element.setAttribute('data-theme', value), theme);
    const colors = await chip.evaluate((element) => {
      const surface = element.shadowRoot!.querySelector<HTMLElement>('.chip')!;
      const text = element.shadowRoot!.querySelector<HTMLElement>('.label')!;
      return {
        background: getComputedStyle(surface).backgroundColor,
        border: getComputedStyle(surface).borderTopColor,
        text: getComputedStyle(text).color,
      };
    });
    expect(ratio(colors.border, colors.background), `${theme} boundary`).toBeGreaterThanOrEqual(3);
    expect(ratio(colors.text, colors.background), `${theme} text`).toBeGreaterThanOrEqual(4.5);
    const report = await new AxeBuilder({ page }).include('t-chip').analyze();
    expect(report.violations, `${theme}: ${JSON.stringify(report.violations)}`).toEqual([]);
    if (report.incomplete.length)
      await testInfo.attach(`${theme}-chip-axe-review`, {
        body: JSON.stringify(report.incomplete, null, 2),
        contentType: 'application/json',
      });
  }
});

test('forced colors preserve selection and focus', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors.');
  await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, '<t-chip label="Engineering" selectable selected removable></t-chip>');
  const chip = page.locator('t-chip');
  const action = chip.getByRole('button', { name: 'Engineering', exact: true });
  await action.focus();
  await expect(action).toHaveAttribute('aria-pressed', 'true');
  const colors = await chip.evaluate((element) => {
    const surface = element.shadowRoot!.querySelector<HTMLElement>('.chip')!;
    const action = element.shadowRoot!.querySelector<HTMLElement>('.action')!;
    return {
      border: getComputedStyle(surface).borderTopColor,
      text: getComputedStyle(action).color,
      outline: getComputedStyle(action).outlineStyle,
    };
  });
  expect(colors.border).not.toBe('transparent');
  expect(colors.text).not.toBe('transparent');
  expect(colors.outline).toBe('solid');
});
