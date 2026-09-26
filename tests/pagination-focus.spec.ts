import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import type { TPagination } from '../src/components/pagination';

async function fixture(page: Page, selected = 3) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((root, selected) => {
    root.innerHTML = `<button id="before">Before</button><t-pagination label="Archive pages" total="100" page="${selected}"></t-pagination><button id="after">After</button>`;
    const host = root.querySelector('t-pagination')!;
    const changes: unknown[] = [];
    host.addEventListener('t-change', (event) => {
      changes.push((event as CustomEvent).detail);
      host.dataset.changes = JSON.stringify(changes);
    });
    host.dataset.changes = '[]';
  }, selected);
  await expect(page.getByRole('status')).toHaveText(`Page ${selected} of 10`);
}

for (const [initial, destination] of [
  [3, 4],
  [8, 7],
  [4, 10],
] as const)
  test(`numbered page activation retains focus: ${initial} to ${destination}`, async ({ page }) => {
    await fixture(page, initial);
    const target = page.getByRole('button', { name: `Page ${destination}`, exact: true });
    await target.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toHaveText(`Page ${destination} of 10`);
    await expect(target).toBeFocused();
    await expect(target).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('t-pagination')).toHaveAttribute(
      'data-changes',
      JSON.stringify([{ page: destination, pageSize: 10 }]),
    );
    await page.keyboard.press('Space');
    await expect(page.locator('t-pagination')).toHaveAttribute(
      'data-changes',
      JSON.stringify([{ page: destination, pageSize: 10 }]),
    );
  });

test('live total changes recover focused removed pages to the current page', async ({ page }) => {
  await fixture(page, 4);
  await page.getByRole('button', { name: 'Page 10', exact: true }).focus();
  await page.locator('t-pagination').evaluate(async (host: TPagination) => {
    host.total = 20;
    await host.updateComplete;
  });
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Page 2 of 2');
  await expect(page.locator('t-pagination')).toHaveAttribute('data-changes', '[]');
});

for (const [initial, name, destination] of [
  [2, 'Previous page', 1],
  [9, 'Next page', 10],
] as const)
  test(`reaching page ${destination} recovers focus from the disabled boundary action`, async ({
    page,
  }) => {
    await fixture(page, initial);
    const action = page.getByRole('button', { name, exact: true });
    await action.focus();
    await page.keyboard.press('Enter');
    await expect(action).toBeDisabled();
    await expect(
      page.getByRole('button', { name: `Page ${destination}`, exact: true }),
    ).toBeFocused();
    await expect(page.locator('t-pagination')).toHaveAttribute(
      'data-changes',
      JSON.stringify([{ page: destination, pageSize: 10 }]),
    );
  });

test('enabled previous and next actions retain focus through repeated keyboard changes', async ({
  page,
}) => {
  await fixture(page, 3);
  const next = page.getByRole('button', { name: 'Next page' });
  await next.focus();
  for (const selected of [4, 5, 6]) {
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toHaveText(`Page ${selected} of 10`);
    await expect(next).toBeFocused();
  }
  const previous = page.getByRole('button', { name: 'Previous page' });
  await previous.focus();
  await page.keyboard.press('Space');
  await expect(previous).toBeFocused();
  await expect(page.locator('t-pagination')).toHaveAttribute(
    'data-changes',
    JSON.stringify([4, 5, 6, 5].map((page) => ({ page, pageSize: 10 }))),
  );
});

test('programmatic page changes preserve a surviving action and recover a removed action', async ({
  page,
}) => {
  await fixture(page, 4);
  const selected = page.getByRole('button', { name: 'Page 4', exact: true });
  await selected.focus();
  await page.locator('t-pagination').evaluate(async (host: TPagination) => {
    host.page = 5;
    await host.updateComplete;
  });
  await expect(selected).toBeFocused();
  await expect(selected).toHaveAttribute('aria-current', 'false');
  await page.locator('t-pagination').evaluate(async (host: TPagination) => {
    host.page = 8;
    await host.updateComplete;
  });
  await expect(page.getByRole('button', { name: 'Page 8', exact: true })).toBeFocused();
  await expect(page.locator('t-pagination')).toHaveAttribute('data-changes', '[]');
});

test('changing page size and clearing records preserve a visible focus destination', async ({
  page,
}) => {
  await fixture(page, 8);
  await page.getByRole('button', { name: 'Page 8', exact: true }).focus();
  await page.locator('t-pagination').evaluate(async (host: TPagination) => {
    host.pageSize = 25;
    await host.updateComplete;
  });
  await expect(page.getByRole('button', { name: 'Page 4', exact: true })).toBeFocused();
  await page.locator('t-pagination').evaluate(async (host: TPagination) => {
    host.total = 0;
    await host.updateComplete;
  });
  await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Page 1 of 1');
  await expect(page.locator('t-pagination')).toHaveAttribute('data-changes', '[]');
});

test('disabling focused actions recovers to the named region and enabling restores the current page', async ({
  page,
}) => {
  await fixture(page, 4);
  await page.getByRole('button', { name: 'Page 4', exact: true }).focus();
  await page.locator('t-pagination').evaluate(async (host: TPagination) => {
    host.disabled = true;
    await host.updateComplete;
  });
  await expect(page.getByRole('navigation', { name: 'Archive pages' })).toBeFocused();
  for (const button of await page.locator('t-pagination').getByRole('button').all())
    await expect(button).toBeDisabled();
  await page.keyboard.press('Enter');
  await expect(page.locator('t-pagination')).toHaveAttribute('data-changes', '[]');
  await page.locator('t-pagination').evaluate(async (host: TPagination) => {
    host.disabled = false;
    await host.updateComplete;
  });
  await expect(page.getByRole('button', { name: 'Page 4', exact: true })).toBeFocused();
});

test('initial render and outside focus remain unchanged through external updates', async ({
  page,
}) => {
  await fixture(page);
  await page.locator('#before').focus();
  const initialFocus = await page.locator('t-pagination').evaluate(async (host) => {
    const fresh = document.createElement('t-pagination');
    fresh.label = 'Fresh pages';
    fresh.total = 100;
    fresh.page = 4;
    host.before(fresh);
    await fresh.updateComplete;
    const focused = document.activeElement?.id;
    fresh.remove();
    return focused;
  });
  expect(initialFocus).toBe('before');
  await page.locator('t-pagination').evaluate(async (host: TPagination) => {
    host.remove();
    document.querySelector('#before')!.after(host);
    host.total = 0;
    host.disabled = true;
    await host.updateComplete;
  });
  await expect(page.locator('#before')).toBeFocused();
  await page.locator('t-pagination').evaluate(async (host: TPagination) => {
    host.total = 1000;
    host.page = 50;
    host.pageSize = 20;
    host.disabled = false;
    await host.updateComplete;
  });
  await expect(page.locator('#before')).toBeFocused();
  await expect(page.locator('t-pagination')).toHaveAttribute('data-changes', '[]');
});

test('consumer change handlers can move focus outside before the update', async ({ page }) => {
  await fixture(page);
  await page.locator('t-pagination').evaluate((host) => {
    host.addEventListener('t-change', () =>
      document.querySelector<HTMLButtonElement>('#after')!.focus(),
    );
  });
  await page.getByRole('button', { name: 'Page 4', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#after')).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Page 4 of 10');
});

test('a consumer blur handler keeps its outside focus during page activation', async ({ page }) => {
  await fixture(page, 4);
  const target = page.getByRole('button', { name: 'Page 10', exact: true });
  await target.evaluate((button) => {
    button.addEventListener('blur', () => {
      button.dataset.blurred = 'true';
      document.querySelector<HTMLButtonElement>('#after')!.focus();
    });
    // Removal does not fire blur in every engine. Exercise the native blur API explicitly.
    document.querySelector('t-pagination')!.addEventListener('t-change', () => button.blur());
  });
  await target.focus();
  await page.keyboard.press('Enter');
  await expect(target).toHaveAttribute('data-blurred', 'true');
  await expect(page.locator('#after')).toBeFocused();
  await expect(page.locator('t-pagination')).toHaveAttribute(
    'data-changes',
    '[{"page":10,"pageSize":10}]',
  );
});

test('native Tab order follows page buttons after keyboard activation', async ({ page }) => {
  await fixture(page, 3);
  await page.locator('#before').focus();
  for (const name of ['Previous page', 'Page 1', 'Page 2', 'Page 3', 'Page 4']) {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name, exact: true })).toBeFocused();
  }
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Page 4', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Page 5', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Page 4', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Page 10', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Next page' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
});

test('pagination recovery stays inside a modal and Escape restores the opener', async ({
  page,
}) => {
  await fixture(page, 3);
  await page.locator('t-pagination').evaluate((host) => {
    const dialog = document.createElement('t-dialog');
    dialog.heading = 'Archive navigation';
    document.querySelector('#fixture')!.append(dialog);
    dialog.append(host);
    const opener = document.querySelector<HTMLButtonElement>('#before')!;
    opener.focus();
    dialog.show(opener);
  });
  const target = page.getByRole('button', { name: 'Page 4', exact: true });
  await target.focus();
  await page.keyboard.press('Enter');
  await expect(target).toBeFocused();
  await page.locator('t-pagination').evaluate(async (host: TPagination) => {
    host.disabled = true;
    await host.updateComplete;
  });
  await expect(page.getByRole('navigation', { name: 'Archive pages' })).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Archive navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Archive navigation' })).not.toBeVisible();
  await expect(page.locator('#before')).toBeFocused();
});

test('adopted pagination recovers focus in its owning document without taking main-page focus', async ({
  page,
}) => {
  await fixture(page, 4);
  await page.locator('t-pagination').evaluate(async (host: TPagination) => {
    const frame = document.createElement('iframe');
    frame.title = 'Archive application';
    document.querySelector('#fixture')!.append(frame);
    frame.contentDocument!.body.append(host);
    host.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Page 10"]')!.focus();
    host.total = 20;
    await host.updateComplete;
  });
  const adopted = page.frameLocator('iframe').getByRole('button', { name: 'Page 2', exact: true });
  await expect(adopted).toBeFocused();
  await page.locator('#after').focus();
  await page.locator('iframe').evaluate(async (frame: HTMLIFrameElement) => {
    const host = frame.contentDocument!.querySelector('t-pagination')!;
    document.querySelector('#fixture')!.append(host);
    host.total = 100;
    await host.updateComplete;
  });
  await expect(page.locator('#after')).toBeFocused();
  await expect(page.locator('t-pagination')).toHaveAttribute('data-changes', '[]');
});

for (const direction of ['ltr', 'rtl'] as const)
  for (const preference of ['normal', 'enlarged', 'spaced'])
    test(`recovered pagination focus remains visible at 320 pixels: ${direction}, ${preference}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await fixture(page, 3);
      await page.locator('t-pagination').evaluate(
        async (host: TPagination, { direction, preference }) => {
          document.documentElement.dir = direction;
          document.documentElement.setAttribute('data-density', 'compact');
          document.body.style.padding = '8px';
          document.body.style.margin = '0';
          if (preference === 'enlarged')
            host.style.setProperty(
              '--t-font-size',
              `${Number.parseFloat(getComputedStyle(host).fontSize) * 2}px`,
            );
          if (preference === 'spaced') {
            const style = document.createElement('style');
            style.textContent =
              '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}';
            host.shadowRoot!.append(style);
          }
          await host.updateComplete;
        },
        { direction, preference },
      );
      const target = page.getByRole('button', { name: 'Page 4', exact: true });
      await target.focus();
      await page.keyboard.press('Enter');
      await expect(target).toBeFocused();
      await expect(target).toBeInViewport({ ratio: 1 });
      const geometry = await target.evaluate((button) => {
        const box = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        const extent =
          Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
        return {
          width: box.width,
          height: box.height,
          outline: style.outlineStyle,
          left: box.left - extent,
          right: box.right + extent,
          top: box.top - extent,
          bottom: box.bottom + extent,
          viewport: innerWidth,
          viewportHeight: innerHeight,
          documentWidth: document.documentElement.scrollWidth,
        };
      });
      expect(geometry.width).toBeGreaterThanOrEqual(24);
      expect(geometry.height).toBeGreaterThanOrEqual(24);
      expect(geometry.outline).not.toBe('none');
      expect(geometry.left).toBeGreaterThanOrEqual(-0.5);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 0.5);
      expect(geometry.top).toBeGreaterThanOrEqual(-0.5);
      expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 0.5);
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport + 1);
      if (preference === 'enlarged')
        await page.screenshot({
          path: testInfo.outputPath(`pagination-${direction}-320-enlarged.png`),
        });
    });

test('pagination focus recovery retains six-palette axe coverage in enabled and disabled states', async ({
  page,
  browser,
}, testInfo) => {
  await fixture(page, 3);
  for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
    await page
      .locator('html')
      .evaluate((element, theme) => element.setAttribute('data-theme', theme), theme);
    for (const disabled of [false, true]) {
      await page.locator('t-pagination').evaluate(async (host: TPagination, disabled) => {
        host.disabled = disabled;
        await host.updateComplete;
      }, disabled);
      await (
        disabled
          ? page.getByRole('navigation', { name: 'Archive pages' })
          : page.getByRole('button', { name: 'Page 4', exact: true })
      ).focus();
      if (!disabled) await page.keyboard.press('Enter');
      const axe = await new AxeBuilder({ page }).include('t-pagination').analyze();
      await writeFile(
        testInfo.outputPath(
          `pagination-focus-${theme}-${disabled ? 'disabled' : 'enabled'}-axe-review.json`,
        ),
        JSON.stringify(
          {
            browser: browser.version(),
            os: process.platform,
            violations: axe.violations,
            incomplete: axe.incomplete,
          },
          null,
          2,
        ),
      );
      expect(axe.violations, `${theme}: ${JSON.stringify(axe.violations)}`).toEqual([]);
    }
  }
});
