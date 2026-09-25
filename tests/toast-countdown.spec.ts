import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import type { TToast } from '../src/components/toast';

async function fixture(page: Page, countdown = 'bar', unit = 'seconds', clock = true) {
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate(
    (element, { countdown, unit }) => {
      element.innerHTML = `<button id="opener">Notify</button><t-toast duration="5000" countdown="${countdown}" countdown-unit="${unit}" style="--t-motion-normal:0ms"></t-toast>`;
      const toast = element.querySelector('t-toast')!;
      (window as any).toastClosures = [];
      toast.addEventListener('t-close', (event) => {
        (window as any).toastClosures.push({
          reason: (event as CustomEvent).detail.reason,
          value: toast.shadowRoot!.querySelector('[part=countdown-value]')?.textContent,
          progress: toast
            .shadowRoot!.querySelector<HTMLElement>('.countdown-bar')
            ?.style.getPropertyValue('--_t-countdown-progress'),
        });
      });
      element.querySelector<HTMLButtonElement>('#opener')!.onclick = (event) =>
        toast.show('Settings saved.', event.currentTarget as HTMLElement);
    },
    { countdown, unit },
  );
  if (clock) {
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
  }
}

async function show(page: Page) {
  await page.locator('#opener').click();
  await expect(page.getByRole('button', { name: 'Dismiss notification' })).toBeVisible();
}

const progress = (page: Page) =>
  page
    .locator('.countdown-bar')
    .evaluate((element) =>
      Number((element as HTMLElement).style.getPropertyValue('--_t-countdown-progress')),
    );
const number = (page: Page) =>
  page.locator('[part=countdown-value]').evaluate((element) => parseInt(element.textContent!, 10));

test('bar shrinks with the real remaining duration and reaches zero when it closes', async ({
  page,
}) => {
  await fixture(page);
  await show(page);
  expect(await progress(page)).toBe(1);
  await page.clock.runFor(1250);
  expect(await progress(page)).toBeCloseTo(0.75, 1);
  const track = await page.locator('.countdown-bar').boundingBox();
  const fill = await page.locator('[part=countdown-bar]').boundingBox();
  expect(fill!.height).toBeGreaterThanOrEqual(3);
  expect(fill!.width / track!.width).toBeCloseTo(0.75, 1);
  await page.clock.runFor(3749);
  await expect(page.locator('t-toast')).toHaveJSProperty('open', true);
  await page.clock.runFor(1);
  await expect(page.locator('t-toast')).toHaveJSProperty('open', false);
  expect(await page.evaluate(() => (window as any).toastClosures)).toEqual([
    { reason: 'timeout', progress: '0', value: undefined },
  ]);
});

for (const unit of ['seconds', 'milliseconds']) {
  test(`spinner counts down in ${unit} and reaches zero exactly at dismissal`, async ({ page }) => {
    await fixture(page, 'spinner', unit);
    await show(page);
    expect(await number(page)).toBe(unit === 'seconds' ? 5 : 5000);
    await expect(page.locator('.countdown-ring')).toHaveCSS('animation-name', 'countdown-spin');
    await page.clock.runFor(1250);
    const value = await number(page);
    if (unit === 'seconds') expect(value).toBe(4);
    else {
      expect(value).toBeGreaterThanOrEqual(3750);
      expect(value).toBeLessThan(3790);
    }
    await page.clock.runFor(3750);
    await expect(page.locator('t-toast')).toHaveJSProperty('open', false);
    expect((await page.evaluate(() => (window as any).toastClosures))[0].value).toBe(
      unit === 'seconds' ? '0s' : '0ms',
    );
  });
}

for (const mode of ['bar', 'spinner']) {
  test(`${mode} freezes on hover and focus, then resumes without losing the remaining time`, async ({
    page,
  }) => {
    await fixture(page, mode, 'milliseconds');
    await show(page);
    await page.clock.runFor(1250);
    await page.locator('.notice').hover({ force: true });
    const read = mode === 'bar' ? progress : number;
    const paused = await read(page);
    if (mode === 'spinner')
      await expect(page.locator('.countdown-ring')).toHaveCSS('animation-play-state', 'paused');
    await page.clock.runFor(6000);
    expect(await read(page)).toBe(paused);
    await page.getByRole('button', { name: 'Dismiss notification' }).focus();
    await page.mouse.move(0, 0);
    await page.clock.runFor(6000);
    expect(await read(page)).toBe(paused);
    await expect(page.locator('t-toast')).toHaveJSProperty('open', true);
    await page.locator('#opener').focus();
    await page.clock.runFor(3749);
    await expect(page.locator('t-toast')).toHaveJSProperty('open', true);
    await page.clock.runFor(1);
    await expect(page.locator('t-toast')).toHaveJSProperty('open', false);
  });
}

test('simulated page visibility pauses the countdown and resumes its remaining duration', async ({
  page,
}) => {
  await fixture(page, 'spinner', 'milliseconds');
  await show(page);
  await page.clock.runFor(1250);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const paused = await number(page);
  await page.clock.runFor(10000);
  expect(await number(page)).toBe(paused);
  await page.evaluate(() => {
    delete (document as any).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(3750);
  await expect(page.locator('t-toast')).toHaveJSProperty('open', false);
});

test('changing the countdown style or unit preserves time; message, duration and show restart it', async ({
  page,
}) => {
  await fixture(page);
  await show(page);
  await page.clock.runFor(1250);
  await page.locator('t-toast').evaluate((toast: TToast) => {
    toast.countdown = 'spinner';
    toast.countdownUnit = 'milliseconds';
  });
  await expect.poll(() => number(page)).toBe(3750);
  await page.clock.runFor(1250);
  await page.locator('t-toast').evaluate((toast: TToast) => (toast.message = 'New message.'));
  await expect.poll(() => number(page)).toBe(5000);
  await page.clock.runFor(1250);
  await page.locator('t-toast').evaluate((toast: TToast) => (toast.duration = 2000));
  await expect.poll(() => number(page)).toBe(2000);
  await page.clock.runFor(1250);
  await page.locator('t-toast').evaluate((toast: TToast) => toast.show());
  await expect.poll(() => number(page)).toBe(2000);
  await page.clock.runFor(2000);
  await expect(page.locator('t-toast')).toHaveJSProperty('open', false);
  expect((await page.evaluate(() => (window as any).toastClosures)).length).toBe(1);
});

test('persistent and invalid durations show no countdown; turning the indicator off preserves auto-dismiss', async ({
  page,
}) => {
  await fixture(page, 'spinner');
  for (const duration of [0, -1, NaN, Infinity]) {
    await page.locator('t-toast').evaluate((toast: TToast, duration) => {
      toast.duration = duration;
      toast.show('Persistent.');
    }, duration);
    await expect(page.locator('[part=countdown]')).toHaveCount(0);
    await page.clock.runFor(6000);
    await expect(page.locator('t-toast')).toHaveJSProperty('open', true);
  }
  await page.locator('t-toast').evaluate((toast: TToast) => (toast.duration = 2_147_483_648));
  await page.clock.runFor(6000);
  await expect(page.locator('t-toast')).toHaveJSProperty('open', true);
  await page.locator('t-toast').evaluate((toast: TToast) => {
    toast.duration = 2000;
    toast.countdown = 'none';
  });
  await expect(page.locator('[part=countdown]')).toHaveCount(0);
  await page.clock.runFor(2000);
  await expect(page.locator('t-toast')).toHaveJSProperty('open', false);
});

test('disconnect stops countdown work and reconnect restarts cleanly after hover', async ({
  page,
}) => {
  await fixture(page, 'spinner', 'milliseconds');
  await show(page);
  await page.locator('.notice').hover({ force: true });
  await page.locator('t-toast').evaluate((toast) => {
    (window as any).removedToast = toast;
    toast.remove();
  });
  await page.mouse.move(0, 0);
  await page.clock.runFor(10000);
  expect(await page.evaluate(() => (window as any).toastClosures)).toEqual([]);
  await page.evaluate(() =>
    document.querySelector('#fixture')!.append((window as any).removedToast),
  );
  await expect.poll(() => number(page)).toBe(5000);
  await page.clock.runFor(5000);
  await expect(page.locator('t-toast')).toHaveJSProperty('open', false);
});

test('countdown updates stay outside the persistent live region and manual dismissal restores focus', async ({
  page,
}) => {
  await fixture(page, 'spinner', 'milliseconds');
  await expect(page.getByRole('status')).toHaveCount(1);
  await show(page);
  await page.getByRole('status').evaluate((element) => {
    (window as any).messageChanges = [];
    new MutationObserver((records) =>
      (window as any).messageChanges.push(...records.map((record) => record.type)),
    ).observe(element, { subtree: true, childList: true, characterData: true, attributes: true });
  });
  await page.clock.runFor(1250);
  expect(await page.evaluate(() => (window as any).messageChanges)).toEqual([]);
  await expect(page.getByRole('status')).toHaveText('Settings saved.');
  await expect(page.locator('[part=countdown]')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('status').locator('[part=countdown]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Dismiss notification' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#opener')).toBeFocused();
  await expect(page.locator('.notice')).not.toBeVisible();
  expect((await page.evaluate(() => (window as any).toastClosures))[0].reason).toBe('dismiss');
});

for (const preference of ['off', 'reduce', 'normal']) {
  test(`motion ${preference} preserves the timeout and controls visual countdown updates`, async ({
    page,
  }) => {
    if (preference === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' });
    await fixture(page, 'spinner', 'milliseconds');
    if (preference === 'off')
      await page.locator('html').evaluate((element) => element.setAttribute('data-motion', 'off'));
    await show(page);
    await page.clock.runFor(32);
    const first = await number(page);
    await page.clock.runFor(500);
    if (preference === 'normal') expect(await number(page)).toBeLessThan(first);
    else {
      expect(await number(page)).toBe(first);
      await expect(page.locator('.countdown-ring')).toHaveCSS('animation-name', 'none');
    }
    await page.clock.runFor(4468);
    await expect(page.locator('t-toast')).toHaveJSProperty('open', false);
  });
}

test('countdowns retain labels, contrast and readable layout in all palettes at 320 CSS pixels', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await fixture(page, 'spinner', 'milliseconds', false);
  await page.locator('t-toast').evaluate((toast: TToast) => {
    toast.shadowRoot!.querySelector<HTMLElement>('.notice')!.style.fontSize = '26px';
    toast.duration = 120000;
    toast.show('Your workspace configuration was saved.');
  });
  await page.getByRole('button', { name: 'Dismiss notification' }).focus();
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, theme) => element.setAttribute('data-theme', theme), theme);
    const report = await new AxeBuilder({ page }).include('t-toast').analyze();
    const reportPath = testInfo.outputPath(`toast-${theme}-axe-review.json`);
    await writeFile(
      reportPath,
      JSON.stringify({ violations: report.violations, incomplete: report.incomplete }, null, 2),
    );
    await testInfo.attach(`toast-${theme}-axe-review.json`, {
      path: reportPath,
      contentType: 'application/json',
    });
    if (report.incomplete.length)
      console.log(
        `${theme} toast axe review items: ${report.incomplete.map((item) => item.id).join(', ')}`,
      );
    expect(report.violations, theme).toEqual([]);
    expect(report.incomplete, `${theme} countdown review items`).toEqual([]);
    const colors = await page.locator('[part=countdown-value]').evaluate((element) => {
      const style = getComputedStyle(element);
      return { text: style.color, background: style.backgroundColor };
    });
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
    const [light, dark] = [luminance(colors.text), luminance(colors.background)].sort(
      (a, b) => b - a,
    );
    expect(colors.background, `${theme} opaque countdown background`).toMatch(/^rgb\(/);
    expect(
      (light + 0.05) / (dark + 0.05),
      `${theme} countdown text contrast`,
    ).toBeGreaterThanOrEqual(4.5);
    const value = page.locator('[part=countdown-value]');
    const bounds = await value.boundingBox();
    const ring = await page.locator('.countdown-spinner').boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(ring!.x);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(ring!.x + ring!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole('button', { name: 'Dismiss notification' })).toBeInViewport();
  }
});

test('workbench settings switch notifications between both countdown styles and units', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Quick settings', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Notification countdown', exact: true })
    .selectOption('spinner');
  await page
    .getByRole('combobox', { name: 'Countdown unit', exact: true })
    .selectOption('milliseconds');
  await page.getByRole('spinbutton', { name: 'Dismiss after (seconds)', exact: true }).fill('12');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Show notification', exact: true }).click();
  await expect(page.locator('#library-toast .countdown-spinner')).toBeVisible();
  await expect(page.locator('#library-toast .countdown-unit')).toHaveText('ms');
  expect(await page.locator('#library-toast').evaluate((toast: TToast) => toast.duration)).toBe(
    12000,
  );
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await page.getByRole('button', { name: 'Quick settings', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Notification countdown', exact: true })
    .selectOption('bar');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Show notification', exact: true }).click();
  await expect(page.locator('#library-toast .countdown-bar')).toBeVisible();
});
