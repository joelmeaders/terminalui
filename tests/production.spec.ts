import { test, expect } from '@playwright/test';
for (const width of [1440, 390]) {
  test(`default component appearance: ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    // Original base-components references remain in git history and this directory.
    // These references include the intentional accessibility contrast corrections.
    await page.locator('.display-settings').evaluate((el: HTMLElement) => {
      el.style.display = 'none';
    });
    await expect(page.locator('.component-grid')).toHaveScreenshot(
      `accessible-components-${width}.png`,
      {
        animations: 'disabled',
        maxDiffPixelRatio: 0.002,
      },
    );
  });
}

test('production demo retains component registration and working interactions', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  expect(
    await page.evaluate(() =>
      [
        't-button',
        't-input',
        't-select',
        't-checkbox',
        't-card',
        't-badge',
        't-alert',
        't-progress',
        't-accordion',
        't-tabs',
        't-dialog',
        't-tooltip',
        't-textarea',
        't-radio-group',
        't-range',
        't-switch',
        't-combobox',
        't-file-input',
        't-menu',
        't-breadcrumb',
        't-pagination',
        't-table',
        't-drawer',
        't-tree',
        't-icon',
        't-icon-button',
        't-spinner',
        't-skeleton',
        't-divider',
        't-avatar',
        't-empty-state',
        't-stack',
        't-grid',
        't-popover',
        't-toast',
        't-password-input',
        't-number-input',
        't-segmented-control',
        't-rating',
        't-tags-input',
        't-color-picker',
        't-command-palette',
        't-steps',
        't-timeline',
        't-meter',
        't-description-list',
        't-link',
        't-toolbar',
        't-split-pane',
        't-copy-button',
      ].every((tag) => !!customElements.get(tag)),
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Initialize', exact: false }).click();
  await expect(page.locator('.event-console')).toContainText('Primary action activated.');
  await page.getByRole('button', { name: 'Paper', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
  await page.getByRole('textbox', { name: 'Callsign', exact: false }).fill('PRODUCTION');
  await page
    .getByRole('combobox', { name: 'Destination', exact: false })
    .selectOption('application');
  await page.getByRole('textbox', { name: 'Callsign', exact: false }).press('Enter');
  await expect(page.locator('.event-console')).toContainText('PRODUCTION / application');
  expect(errors).toEqual([]);
});
test('production extensions preserve form, search, copy, icons, and motion behavior', async ({
  page,
  context,
  request,
}) => {
  await page.goto('/');
  await expect(page.locator('.hero-meta')).toContainText('50 COMPONENTS');
  await page.getByRole('spinbutton', { name: 'Crew size', exact: true }).fill('7');
  await page.getByRole('textbox', { name: 'Mission tags', exact: true }).fill('science');
  await page.getByRole('textbox', { name: 'Mission tags', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Save example preferences', exact: true }).click();
  await expect(page.locator('#extensions output')).toContainText(
    'Crew: 7. Mode: balanced. Tags: survey, navigation, science.',
  );
  await expect(page.getByRole('button', { name: 'Remove science', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Find a command', exact: true }).click();
  await page.getByRole('combobox', { name: 'Search commands', exact: true }).fill('icons');
  await page.getByRole('combobox', { name: 'Search commands', exact: true }).press('Enter');
  await expect(page.getByRole('dialog', { name: 'Mission commands' })).not.toBeVisible();
  await expect(page.locator('.event-console')).toContainText('Explore icon providers');
  await expect(page.locator('#icon-providers t-icon svg[data-provider]')).toHaveCount(9);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy status command', exact: true }).click();
  await expect(page.locator('t-copy-button [role=status]')).toHaveText('Copied to clipboard.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('mission --status');
  await page.locator('.display-settings summary').click();
  await page.getByRole('combobox', { name: 'Component motion', exact: true }).selectOption('off');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await expect(page.locator('t-spinner .ring')).toHaveCSS('animation-name', 'none');
  const credits = await request.get('/icon-licenses/index.html');
  expect(credits.ok()).toBe(true);
  expect(await credits.text()).toContain('Font Awesome Free');
  const notice = await request.get('/icon-licenses/font-awesome/NOTICE');
  expect(notice.ok()).toBe(true);
  expect(await notice.text()).toContain('Creative Commons');
});

test('built meter controls and viewport story expose the styles, sizes, and replay', async ({
  page,
}) => {
  await page.goto('/#extensions');
  await page.locator('summary').filter({ hasText: 'Meter options' }).click();
  const host = page.locator('#extensions t-meter');
  for (const variant of ['solid', 'segmented-thin', 'segmented-thick']) {
    await page.getByRole('combobox', { name: 'Meter style', exact: true }).selectOption(variant);
    await expect(host).toHaveAttribute('variant', variant);
  }
  for (const [size, height] of [
    ['small', '12px'],
    ['medium', '20px'],
    ['large', '32px'],
  ]) {
    await page.getByRole('combobox', { name: 'Meter size', exact: true }).selectOption(size);
    await expect(host.getByRole('meter')).toHaveCSS('height', height);
  }
  await page
    .locator('#extensions')
    .evaluate((el) => (el as HTMLElement).style.setProperty('--t-meter-duration', '10s'));
  const previous = await host.elementHandle();
  await page.getByRole('button', { name: 'Replay meter entrance', exact: true }).click();
  expect(await previous!.evaluate((el) => el.isConnected)).toBe(false);
  await expect(host.getByRole('meter')).toHaveAttribute('value', '82');
  await host.scrollIntoViewIfNeeded();
  await expect(host.locator('.visual')).toHaveAttribute('data-phase', 'entering');
  await page.goto('/storybook/iframe.html?id=data-meter--viewport-entry&viewMode=story');
  await expect(page.locator('t-meter .visual')).toHaveAttribute('data-phase', 'pending');
  const region = page.getByRole('region', { name: 'Viewport entry preview' });
  await region.focus();
  await region.press('End');
  await expect(page.locator('t-meter')).toBeInViewport();
  await expect(page.locator('t-meter .visual')).toHaveAttribute('data-phase', 'complete');
  await expect(page.getByRole('meter', { name: 'Oxygen reserve' })).toHaveAttribute(
    'aria-valuetext',
    '82 percent',
  );
});

test('built Storybook serves documentation and the real component canvas', async ({ page }) => {
  await page.goto('/storybook/?path=/docs/components-button--docs');
  const frame = page.frameLocator('#storybook-preview-iframe');
  await expect(frame.getByRole('heading', { name: 'Button', exact: true })).toBeVisible();
  await expect(frame.locator('t-button button').first()).toBeVisible();
  await page.goto('/storybook/iframe.html?id=components-input--required&viewMode=story');
  await expect(page.getByRole('textbox')).toBeVisible();
  await page.getByRole('textbox').fill('Built story');
  await expect(page.getByRole('textbox')).toHaveValue('Built story');
  await page.goto(
    '/storybook/iframe.html?id=components-button--secondary&viewMode=story&globals=theme:phosphor;lines:bold;glow:subtle;scanlines:pronounced',
  );
  await expect(page.locator('t-button button')).toHaveCSS('border-top-width', '2px');
  await expect(page.locator('.t-screen')).toHaveAttribute('data-glow', 'subtle');
  await expect(page.locator('.t-screen')).toHaveAttribute('data-scanlines', 'pronounced');
  await page.goto('/storybook/iframe.html?id=patterns-icon-providers--providers&viewMode=story');
  await expect(page.locator('t-icon svg[data-provider]')).toHaveCount(7);
  await page.goto('/storybook/iframe.html?id=patterns-motion--disabled&viewMode=story');
  await expect(page.locator('t-button .spinner')).toHaveCSS('animation-name', 'none');
});

test('built spinner styles work in the demo selector and Storybook gallery', async ({ page }) => {
  await page.goto('/#status-components');
  const spinner = page.locator('#status-components t-spinner');
  for (const type of [
    'ring',
    'dots',
    'bars',
    'pulse',
    'orbit',
    'cursor',
    'cursor-box',
    'arrow',
    'pixels',
    'blocks',
  ]) {
    await page.getByRole('combobox', { name: 'Spinner style', exact: true }).selectOption(type);
    await expect(spinner.locator(`[part=indicator].${type}`)).toBeVisible();
    await expect(spinner.getByRole('status')).toHaveText('Loading example');
  }
  await page.getByRole('combobox', { name: 'Spinner style', exact: true }).selectOption('arrow');
  await page.getByRole('combobox', { name: 'Arrow positions', exact: true }).selectOption('6');
  await expect(spinner.locator('.arrow')).toHaveCSS('animation-timing-function', 'steps(6)');
  await page.goto('/storybook/iframe.html?id=components-spinner--motion-off&viewMode=story');
  await expect(page.getByRole('status')).toHaveCount(10);
  for (const item of await page.locator('t-spinner .indicator,t-spinner .item').all())
    await expect(item).toHaveCSS('animation-name', 'none');
});

// Earlier page references remain available alongside the reviewed spinner-selector layout.
for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
  test(`visual reference: ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    await page
      .getByRole('button', { name: theme[0].toUpperCase() + theme.slice(1), exact: true })
      .click();
    await expect(page).toHaveScreenshot(`spinner-${theme}-desktop.png`, {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });
}

test('visual reference: mobile and dialog', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Save configuration', exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('spinner-amber-mobile.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.002,
  });
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveScreenshot('amber-dialog.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.002,
  });
});

for (const profile of [
  { name: 'bold-amber', theme: 'Amber', glow: 'off', scanlines: 'off', width: 1440 },
  {
    name: 'phosphor-screen',
    theme: 'Phosphor',
    glow: 'subtle',
    scanlines: 'pronounced',
    width: 1440,
  },
  {
    name: 'paper-effects-mobile',
    theme: 'Paper',
    glow: 'strong',
    scanlines: 'pronounced',
    width: 390,
  },
]) {
  test(`visual effects: ${profile.name}`, async ({ page }) => {
    await page.setViewportSize({ width: profile.width, height: 1000 });
    await page.goto('/');
    await page.getByRole('button', { name: profile.theme, exact: true }).click();
    await page.getByRole('checkbox', { name: 'Bold lines', exact: true }).check();
    await page.locator('.display-settings summary').click();
    await page
      .getByRole('combobox', { name: 'Phosphor glow', exact: true })
      .selectOption(profile.glow);
    await page
      .getByRole('combobox', { name: 'Screen scanlines', exact: true })
      .selectOption(profile.scanlines);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page).toHaveScreenshot(`spinner-${profile.name}.png`, {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });
}
