import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

type RGB = [number, number, number];
function rgb(value: string): RGB {
  if (value.startsWith('#'))
    return value
      .slice(1)
      .match(/../g)!
      .map((v) => parseInt(v, 16)) as RGB;
  return value
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map(Number) as RGB;
}
function luminance(color: RGB) {
  return color
    .map((v) => {
      const channel = v / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
function ratio(a: RGB, b: RGB) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
  test(`${theme}: text, control boundaries and focus retain contrast on all surfaces and scanlines`, async ({
    page,
  }, testInfo) => {
    await page.route('**/@vite/client', (route) => route.abort());
    await page.goto('/tests/fixture.html');
    await page.locator('body[data-ready=true]').waitFor();
    await page.locator('html').evaluate((el, palette) => {
      el.dataset.theme = palette;
    }, theme);
    const results: { pair: string; ratio: number; minimum: number }[] = [];
    for (const effect of ['off', 'subtle', 'pronounced']) {
      for (const surface of ['bg', 'surface', 'raised']) {
        await page.locator('#fixture').evaluate(
          (el, { effect, surface }) => {
            el.innerHTML = `<section class="t-screen" data-scanlines="${effect}" style="padding:20px;background:var(--t-${surface})">
            ${['text', 'muted', 'accent', 'danger', 'warning', 'success'].map((token) => `<span data-token="${token}" style="color:var(--t-${token})">Sample ${token} text</span>`).join(' ')}
            <t-input label="Operator" help="Enter a callsign"></t-input>
            <t-textarea label="Message"></t-textarea><t-select label="Destination"></t-select>
            <t-checkbox label="Enabled"></t-checkbox><t-switch label="Power"></t-switch>
            <t-combobox label="Search"></t-combobox><t-file-input label="Attachment"></t-file-input>
            <t-radio-group label="Priority"></t-radio-group><t-range label="Signal"></t-range>
            <t-icon-button label="Settings"></t-icon-button><t-menu label="Actions"></t-menu>
            <t-popover label="Details"></t-popover><t-tooltip label="Help" message="Instructions"></t-tooltip>
            <t-pagination total="50"></t-pagination><input class="t-native" aria-label="Native input">
            <t-button>Primary action</t-button><t-card>Decorative panel frame</t-card>
          </section>`;
            el.querySelector('t-radio-group')!.options = [{ value: 'normal', label: 'Normal' }];
          },
          { effect, surface },
        );
        await expect(page.locator('t-input input')).toBeVisible();
        const data = await page.locator('.t-screen').evaluate((el) => {
          const style = getComputedStyle(el);
          const colors: Record<string, string> = {};
          for (const name of ['control-border', 'border', 'focus', 'accent', 'on-accent'])
            colors[name] = style.getPropertyValue(`--t-${name}`).trim();
          const texture = getComputedStyle(el, '::after');
          return {
            colors,
            background: style.backgroundColor,
            text: Array.from(el.querySelectorAll<HTMLElement>('[data-token]'), (node) => ({
              name: node.dataset.token!,
              color: getComputedStyle(node).color,
            })),
            opacity:
              texture.display === 'none' || texture.content === 'none'
                ? 0
                : Number(style.getPropertyValue('--t-scanline-opacity')),
            zIndex: texture.zIndex,
          };
        });
        if (effect !== 'off')
          expect(data.zIndex, 'Texture must not wash over text or control edges').toBe('-1');
        const background = rgb(data.background);
        const stripe = background.map(
          (value, index) =>
            value * (1 - data.opacity) + rgb(data.colors.accent)[index] * data.opacity,
        ) as RGB;
        for (const adjacent of [background, stripe]) {
          for (const text of data.text)
            results.push({
              pair: `${surface}/${effect}/${text.name}`,
              ratio: ratio(rgb(text.color), adjacent),
              minimum: 4.5,
            });
          for (const token of ['control-border', 'focus'])
            results.push({
              pair: `${surface}/${effect}/${token}`,
              ratio: ratio(rgb(data.colors[token]), adjacent),
              minimum: 3,
            });
        }
        // These rendered controls must consume a semantic boundary, even on a card.
        for (const selector of [
          't-input input',
          't-textarea textarea',
          't-select select',
          't-checkbox input',
          't-switch input',
          't-combobox input',
          't-file-input input',
          't-radio-group input',
          't-icon-button button',
          't-menu button',
          't-popover button',
          't-tooltip button',
          't-pagination button:not(:disabled)',
          '.t-native',
        ]) {
          const border = await page
            .locator(selector)
            .first()
            .evaluate((el) => getComputedStyle(el).borderTopColor);
          results.push({
            pair: `${surface}/${effect}/${selector}`,
            ratio: ratio(rgb(border), stripe),
            minimum: 3,
          });
        }
        await page.locator('t-input input').focus();
        const focus = await page.locator('t-input input').evaluate((el) => {
          const style = getComputedStyle(el);
          return { color: style.outlineColor, width: style.outlineWidth, type: style.outlineStyle };
        });
        expect(focus.type).toBe('solid');
        expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2);
        results.push({
          pair: `${surface}/${effect}/rendered focus`,
          ratio: ratio(rgb(focus.color), stripe),
          minimum: 3,
        });
        const primary = await page.locator('t-button button').evaluate((el) => {
          const style = getComputedStyle(el);
          return { text: style.color, background: style.backgroundColor };
        });
        results.push({
          pair: `${surface}/${effect}/filled button`,
          ratio: ratio(rgb(primary.text), rgb(primary.background)),
          minimum: 4.5,
        });
        await expect(page.locator('t-card')).toHaveCSS(
          'border-top-color',
          data.colors.border.startsWith('#')
            ? `rgb(${rgb(data.colors.border).join(', ')})`
            : data.colors.border,
        );
      }
    }
    const evidencePath = testInfo.outputPath('contrast-pairs.json');
    await writeFile(evidencePath, JSON.stringify(results, null, 2));
    await testInfo.attach('contrast-pairs', {
      path: evidencePath,
      contentType: 'application/json',
    });
    expect(results.filter((entry) => entry.ratio < entry.minimum)).toEqual([]);
  });
}

for (const timing of ['before load', 'while open'])
  test(`increased contrast ${timing} removes glow and scanlines, including the root CRT preset`, async ({
    page,
  }) => {
    if (timing === 'before load') await page.emulateMedia({ contrast: 'more' });
    await page.goto('/tests/fixture.html');
    await page.locator('body[data-ready=true]').waitFor();
    await page.locator('html').evaluate((el) => {
      el.dataset.effects = 'crt';
      el.dataset.glow = 'strong';
    });
    await page.locator('#fixture').evaluate((el) => {
      el.innerHTML =
        '<style>.contrast-probe{display:block}@media(prefers-contrast:more){.contrast-probe{display:none}}</style><div class="contrast-probe" aria-hidden="true"></div><section class="t-screen" data-glow="strong" data-scanlines="pronounced"><t-button>Continue</t-button></section>';
    });
    await expect(page.locator('t-button button')).toBeVisible();
    expect(
      await page.locator('body').evaluate((el) => getComputedStyle(el, '::after').zIndex),
    ).toBe('-1');
    if (timing === 'while open') await page.emulateMedia({ contrast: 'more' });
    expect(await page.evaluate(() => matchMedia('(prefers-contrast: more)').matches)).toBe(true);
    // Check a plain native CSS rule independently of the library. Some Firefox
    // emulation builds change matchMedia without restyling existing media rules.
    if (timing === 'while open')
      test.skip(
        await page
          .locator('.contrast-probe')
          .evaluate((el) => getComputedStyle(el).display !== 'none'),
        'Runtime contrast emulation did not update native CSS; OS preference changes need manual verification.',
      );
    await expect(page.locator('t-button button')).toHaveCSS('box-shadow', 'none');
    await expect(page.locator('t-button button')).toHaveCSS('text-shadow', 'none');
    for (const selector of ['body', '.t-screen'])
      expect(
        await page.locator(selector).evaluate((el) => getComputedStyle(el, '::after').display),
      ).toBe('none');
  });
