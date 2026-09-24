import { expect, test, type Page } from '@playwright/test';

async function fixture(page: Page) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.addStyleTag({ url: '/src/typography.css' });
  await page.locator('#fixture').evaluate((el) => {
    el.classList.add('t-prose');
    const sample = (id: string) =>
      `<div id="${id}"><p class="reading-text">${id} native text</p><t-button variant="secondary">${id} action</t-button><t-input label="${id} field"></t-input><t-spinner label="${id} loading"></t-spinner><button class="t-native">${id} native</button><section class="t-screen"><p>${id} screen</p></section></div>`;
    el.innerHTML = `${sample('inherited')}
      <section id="local" data-theme="paper" data-density="comfortable" data-lines="standard" data-glow="off" data-scanlines="off" data-motion="auto">
        ${sample('local-child')}
        <section id="deep" data-theme="amber">${sample('deep-child')}</section>
      </section>
      <t-card id="slotted"><span slot="heading">Slotted content</span>${sample('slot-child')}</t-card>
      <div id="shadow-wrapper"></div>`;
    el.querySelector('#shadow-wrapper')!.attachShadow({ mode: 'open' }).innerHTML =
      '<t-button variant="secondary">Shadow action</t-button>';
  });
  await expect(page.locator('#inherited t-button button')).toBeVisible();
}

async function appearance(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      color: style.color,
      border: style.borderTopWidth,
      height: style.minHeight,
      glow: style.textShadow,
      font: style.fontFamily,
      motion: style.transitionDuration,
      scheme: style.colorScheme,
    };
  });
}

async function texture(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const style = getComputedStyle(el),
      pseudo = getComputedStyle(el, '::after');
    return {
      display: pseudo.display,
      gradient: pseudo.backgroundImage,
      position: pseudo.position,
      pointer: pseudo.pointerEvents,
      layer: pseudo.zIndex,
      background: style.backgroundColor,
      opacity: style.getPropertyValue('--t-scanline-opacity').trim(),
      width: style.getPropertyValue('--t-scanline-width').trim(),
    };
  });
}

for (const root of ['html', 'body']) {
  test(`${root} appearance inherits through ordinary DOM, slots, and shadow roots; deeper overrides stay independent`, async ({
    page,
  }) => {
    await fixture(page);
    await page.locator(root).evaluate((el) => {
      Object.assign(el.dataset, {
        theme: 'phosphor',
        density: 'compact',
        lines: 'bold',
        glow: 'strong',
        scanlines: 'pronounced',
        motion: 'off',
      });
      el.style.setProperty('--t-font', 'monospace');
      el.style.setProperty('--t-motion-fast', '0.37s');
    });
    const inherited = '#inherited t-button button';
    await expect
      .poll(() => appearance(page, inherited))
      .toMatchObject({
        color: 'rgb(166, 237, 145)',
        border: '2px',
        height: '34px',
        motion: '0s, 0s',
        scheme: 'dark',
        font: 'monospace',
      });
    for (const selector of ['#slot-child t-button button', '#shadow-wrapper t-button button'])
      expect(await appearance(page, selector)).toEqual(await appearance(page, inherited));
    await expect(page.locator('#inherited t-input input')).toHaveCSS('min-height', '34px');
    await expect(page.locator('#inherited .t-native')).toHaveCSS('border-top-width', '2px');
    await expect(page.locator('#inherited t-spinner .indicator')).toHaveCSS(
      'animation-name',
      'none',
    );
    expect((await appearance(page, inherited)).glow).toContain('9px');
    expect(await texture(page, '#inherited .t-screen')).toMatchObject({
      display: 'block',
      opacity: '0.12',
      width: '2px',
      pointer: 'none',
      layer: '-1',
    });
    expect(await texture(page, 'body')).toMatchObject({ display: 'block', position: 'fixed' });
    await expect
      .poll(() => appearance(page, '#local-child t-button button'))
      .toMatchObject({
        color: 'rgb(59, 80, 56)',
        border: '1px',
        height: '42px',
        scheme: 'light',
        motion: '0.37s, 0.37s',
      });
    const deep = '#deep-child t-button button';
    await expect(page.locator('#local-child .reading-text')).toHaveCSS('color', 'rgb(37, 45, 39)');
    await expect(page.locator('#local-child .t-screen p')).toHaveCSS('color', 'rgb(37, 45, 39)');
    await expect(page.locator('#deep-child .reading-text')).toHaveCSS(
      'color',
      'rgb(238, 233, 217)',
    );
    await expect
      .poll(() => appearance(page, deep))
      .toMatchObject({
        color: 'rgb(245, 186, 91)',
        border: '1px',
        height: '42px',
        scheme: 'dark',
        font: 'monospace',
        motion: '0.37s, 0.37s',
      });
    expect((await appearance(page, deep)).glow).toContain('0px');
    expect((await texture(page, '#deep-child .t-screen')).display).toBe('none');
    await expect(page.locator('#local-child t-spinner .indicator')).not.toHaveCSS(
      'animation-name',
      'none',
    );

    // A palette change must not reset inherited compact spacing or custom motion/font tokens.
    await page.locator('#local').evaluate((el) => {
      el.removeAttribute('data-density');
    });
    await expect(page.locator('#deep-child t-button button')).toHaveCSS('min-height', '34px');
    await expect(page.locator('#deep')).toHaveCSS('--t-space', '12px');
    // Remove overrides one axis at a time. The nearest remaining setting becomes effective.
    await page.locator('#local').evaluate((el) => {
      for (const key of ['theme', 'lines', 'glow', 'scanlines', 'motion'])
        el.removeAttribute(`data-${key}`);
    });
    await page.locator('#deep').evaluate((el) => el.removeAttribute('data-theme'));
    await expect.poll(() => appearance(page, deep)).toEqual(await appearance(page, inherited));
    expect(await texture(page, '#deep-child .t-screen')).toMatchObject({
      display: 'block',
      opacity: '0.12',
      width: '2px',
    });
    // A direct component override affects only its descendants.
    await page.locator('#deep-child t-button').evaluate((el) => {
      Object.assign(el.dataset, {
        theme: 'ice',
        density: 'comfortable',
        lines: 'standard',
        glow: 'off',
      });
    });
    await expect
      .poll(() => appearance(page, deep))
      .toMatchObject({ color: 'rgb(142, 219, 233)', border: '1px', height: '42px' });
    await expect(page.locator('#deep-child t-input input')).toHaveCSS('min-height', '34px');
  });
}

test('body overrides html, dark palettes restore color scheme, and attribute changes reach existing controls', async ({
  page,
}) => {
  await fixture(page);
  await page.locator('html').evaluate((el) => {
    Object.assign(el.dataset, {
      theme: 'paper',
      density: 'comfortable',
      lines: 'standard',
      glow: 'off',
      scanlines: 'off',
      motion: 'off',
    });
  });
  await page.locator('body').evaluate((el) => {
    Object.assign(el.dataset, {
      density: 'compact',
      lines: 'bold',
      glow: 'subtle',
      scanlines: 'subtle',
      motion: 'auto',
    });
  });
  for (const [theme, color] of [
    ['amber', 'rgb(245, 186, 91)'],
    ['phosphor', 'rgb(166, 237, 145)'],
    ['ice', 'rgb(142, 219, 233)'],
    ['lunar', 'rgb(198, 186, 242)'],
    ['signal', 'rgb(238, 242, 232)'],
  ]) {
    await page.locator('body').evaluate((el, theme) => {
      el.dataset.theme = theme;
    }, theme);
    await expect
      .poll(() => appearance(page, '#inherited t-button button'))
      .toMatchObject({
        color,
        scheme: 'dark',
        height: '34px',
        border: '2px',
        motion: '0.12s, 0.12s',
      });
    expect((await appearance(page, '#inherited t-button button')).glow).toContain('5px');
    expect(await texture(page, '#inherited .t-screen')).toMatchObject({
      opacity: '0.06',
      width: '1px',
    });
  }
  await page.locator('body').evaluate((el) => {
    for (const key of ['theme', 'density', 'lines', 'glow', 'scanlines', 'motion'])
      el.removeAttribute(`data-${key}`);
  });
  await expect
    .poll(() => appearance(page, '#inherited t-button button'))
    .toMatchObject({
      color: 'rgb(59, 80, 56)',
      scheme: 'light',
      height: '42px',
      border: '1px',
      motion: '0s, 0s',
    });
  expect((await texture(page, 'body')).display).toBe('none');
});

test('scanline overrides pass through plain wrappers and nested screens mask their ancestor texture', async ({
  page,
}) => {
  await fixture(page);
  await page.locator('#fixture').evaluate((el) => {
    el.innerHTML =
      '<section id="outer" class="t-screen" data-theme="phosphor" data-scanlines="pronounced"><p>Outer</p><div data-scanlines="off"><section id="clear" class="t-screen"><p>Clear</p><div id="override" data-theme="paper" data-scanlines="subtle"><section id="inner" class="t-screen"><a href="#target">Jump to target</a><p id="target">Target</p></section></div></section></div></section>';
  });
  expect(await texture(page, '#outer')).toMatchObject({ display: 'block', opacity: '0.12' });
  expect(await texture(page, '#clear')).toMatchObject({
    display: 'none',
    background: 'rgb(13, 22, 16)',
  });
  expect(await texture(page, '#inner')).toMatchObject({
    display: 'block',
    opacity: '0.06',
    background: 'rgb(237, 234, 221)',
  });
  const paper = (await texture(page, '#inner')).gradient;
  await page.locator('#override').evaluate((el) => {
    el.dataset.theme = 'ice';
  });
  expect((await texture(page, '#inner')).gradient).not.toBe(paper);
  await page.locator('#override').evaluate((el) => {
    el.removeAttribute('data-scanlines');
  });
  expect((await texture(page, '#inner')).display).toBe('none');
  await page.getByRole('link', { name: 'Jump to target' }).click();
  await expect(page).toHaveURL(/#target$/);
});

test('CRT and off presets inherit, while explicit axes on the same element take precedence', async ({
  page,
}) => {
  await fixture(page);
  await page.locator('body').evaluate((el) => {
    el.dataset.effects = 'crt';
  });
  expect(await texture(page, 'body')).toMatchObject({
    display: 'block',
    position: 'fixed',
    opacity: '0.06',
  });
  expect((await appearance(page, '#inherited t-button button')).glow).toContain('5px');
  await page.locator('#inherited').evaluate((el) => {
    el.dataset.effects = 'off';
  });
  expect((await texture(page, '#inherited .t-screen')).display).toBe('none');
  expect((await appearance(page, '#inherited t-button button')).glow).toContain('0px');
  await page.locator('#inherited').evaluate((el) => {
    Object.assign(el.dataset, { glow: 'strong', scanlines: 'pronounced' });
  });
  expect((await appearance(page, '#inherited t-button button')).glow).toContain('9px');
  expect(await texture(page, '#inherited .t-screen')).toMatchObject({
    display: 'block',
    opacity: '0.12',
  });
  await page.locator('body').evaluate((el) => {
    Object.assign(el.dataset, { glow: 'off', scanlines: 'off' });
  });
  expect((await texture(page, 'body')).display).toBe('none');
  expect((await texture(page, '#inherited .t-screen')).display).toBe('block');
});

test('device preferences override nested appearance opt-ins', async ({ page }) => {
  await page.emulateMedia({ contrast: 'more', reducedMotion: 'reduce' });
  await fixture(page);
  await page.locator('body').evaluate((el) => {
    el.dataset.effects = 'crt';
    el.dataset.glow = 'strong';
  });
  await page.locator('#deep').evaluate((el) => {
    Object.assign(el.dataset, {
      effects: 'crt',
      motion: 'auto',
      glow: 'strong',
      scanlines: 'pronounced',
    });
  });
  for (const scope of ['#inherited', '#deep-child']) {
    await expect(page.locator(`${scope} t-button button`)).toHaveCSS('text-shadow', 'none');
    await expect(page.locator(`${scope} t-button button`)).toHaveCSS('box-shadow', 'none');
    await expect(page.locator(`${scope} t-spinner .indicator`)).toHaveCSS('animation-name', 'none');
    expect((await texture(page, `${scope} .t-screen`)).display).toBe('none');
  }
  expect((await texture(page, 'body')).display).toBe('none');
});

test('open dialogs keep their ancestor appearance in the top layer and update without reopening', async ({
  page,
}) => {
  await fixture(page);
  await page.locator('body').evaluate((el) => {
    Object.assign(el.dataset, {
      theme: 'phosphor',
      lines: 'bold',
      density: 'compact',
      motion: 'off',
    });
  });
  await page.locator('#local').evaluate((el) => {
    const dialog = document.createElement('t-dialog');
    dialog.heading = 'Local appearance';
    dialog.innerHTML = '<t-button slot="footer" variant="secondary">Dialog action</t-button>';
    el.append(dialog);
    dialog.show();
  });
  const dialog = page.locator('t-dialog dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS('background-color', 'rgb(248, 245, 234)');
  await expect(dialog).toHaveCSS('border-top-width', '1px');
  await expect(page.locator('t-dialog t-button button')).toHaveCSS('min-height', '42px');
  await page.locator('#local').evaluate((el) => {
    el.dataset.theme = 'ice';
    el.dataset.lines = 'bold';
    el.dataset.density = 'compact';
  });
  await expect(dialog).toHaveCSS('background-color', 'rgb(23, 35, 42)');
  await expect(dialog).toHaveCSS('border-top-width', '2px');
  await expect(page.locator('t-dialog t-button button')).toHaveCSS('min-height', '34px');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
