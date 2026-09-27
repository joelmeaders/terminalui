import { expect, test, type Page } from '@playwright/test';
import type { TMenu } from '../src/components/menu';
import type { TPopover } from '../src/components/popover';
import type { TDialog } from '../src/components/dialog';
import type { TDrawer } from '../src/components/drawer';
import type { TCommandPalette } from '../src/components/command-palette';
import type { TRadioGroup } from '../src/components/radio-group';
import type { TMultiSelect } from '../src/components/multi-select';
import type { TToast } from '../src/components/toast';
import type { TDatePicker } from '../src/components/date-picker';

async function mountFrame(page: Page, tags: string[]) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((fixture) => {
    fixture.innerHTML =
      '<button id="outside">Outside frame</button><iframe title="Embedded application" style="width:100%;height:650px"></iframe>';
  });
  const frame = page.frameLocator('iframe');
  await frame.locator('body').evaluate((body) => {
    const embedded = body.ownerDocument;
    body.innerHTML = '<button id="before">Before</button><input id="after" aria-label="After">';
    const sheet = embedded.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = '/src/themes.css';
    embedded.head.append(sheet);
  });
  await page.locator('#fixture').evaluate(async (fixture, tags) => {
    const embedded = fixture.querySelector('iframe')!.contentDocument!;
    const hosts = tags.map((tag) => {
      const host = document.createElement(tag);
      // Connect in the original document first, then adopt it while listeners exist.
      fixture.append(host);
      return host;
    });
    await Promise.all(
      hosts.map(
        (host) => (host as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete,
      ),
    );
    await Promise.all(
      hosts
        .flatMap((host) => [...(host.shadowRoot?.querySelectorAll('t-dialog,t-calendar') ?? [])])
        .map((host) => (host as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete),
    );
    for (const host of hosts) embedded.body.insertBefore(host, embedded.querySelector('#after'));
    await Promise.all(
      hosts.map(
        (host) => (host as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete,
      ),
    );
  }, tags);
  return frame;
}

test('adopted menu dismisses in its owning document and removes original-document listeners', async ({
  page,
}) => {
  const frame = await mountFrame(page, ['t-menu']);
  const menu = frame.locator('t-menu');
  await menu.evaluate((menu: TMenu) => {
    menu.options = [{ value: 'open', label: 'Open project' }];
  });
  await frame.locator('#before').focus();
  await frame.getByRole('button', { name: 'Actions' }).click();
  await expect(frame.getByRole('menuitem', { name: 'Open project' })).toBeFocused();
  await page.evaluate(() =>
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })),
  );
  await expect(frame.getByRole('menu', { name: 'Actions' })).toBeVisible();
  await frame.locator('#after').click();
  await expect(frame.getByRole('menu', { name: 'Actions' })).toBeHidden();
  await expect(frame.locator('#after')).toBeFocused();
});

test('adopted tooltip receives Escape outside its trigger in the owning document', async ({
  page,
}) => {
  const frame = await mountFrame(page, ['t-tooltip']);
  await frame.locator('t-tooltip').evaluate((host) => {
    host.setAttribute('message', 'Embedded help');
  });
  await frame.getByRole('button', { name: 'More information' }).hover();
  await expect(frame.getByRole('tooltip')).toBeVisible();
  await frame
    .locator('body')
    .evaluate((body) =>
      body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );
  await expect(frame.getByRole('tooltip')).toBeHidden();
});

test('adopted popover restores its embedded programmatic opener and preserves outside pointer focus', async ({
  page,
}) => {
  const frame = await mountFrame(page, ['t-popover']);
  const popover = frame.locator('t-popover');
  await popover.evaluate((host: TPopover) => {
    host.innerHTML = '<input aria-label="Embedded setting">';
  });
  await frame.locator('#before').focus();
  await popover.evaluate((host: TPopover) => host.show());
  await frame.getByRole('textbox', { name: 'Embedded setting' }).focus();
  await popover.evaluate((host: TPopover) => host.close());
  await expect(frame.locator('#before')).toBeFocused();
  await frame.getByRole('button', { name: 'Details' }).click();
  await frame.getByRole('textbox', { name: 'Embedded setting' }).focus();
  await frame.locator('#after').click();
  await expect(frame.getByRole('dialog', { name: 'Details' })).toBeHidden();
  await expect(frame.locator('#after')).toBeFocused();
});

for (const tag of ['dialog', 'drawer', 'command-palette'] as const) {
  test(`adopted ${tag} restores the owning-document opener and contains iframe-native controls`, async ({
    page,
  }) => {
    const frame = await mountFrame(page, [`t-${tag}`]);
    const host = frame.locator(`t-${tag}`);
    if (tag !== 'command-palette')
      await host.evaluate((host: TDialog | TDrawer) => {
        host.innerHTML =
          '<details><summary>More</summary><button>Hidden action</button></details><button slot="footer">Embedded last action</button>';
      });
    await frame.locator('#before').focus();
    await host.evaluate((host: TDialog | TDrawer | TCommandPalette) => host.show());
    const close = frame.getByRole('button', {
      name: tag === 'command-palette' ? 'Close command palette' : `Close ${tag}`,
    });
    await close.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(
      tag === 'command-palette'
        ? frame.getByRole('combobox', { name: 'Search commands' })
        : frame.getByRole('button', { name: 'Embedded last action' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(frame.locator('#before')).toBeFocused();
  });
}

test('adopted toolbar finds iframe-native and shadow actions and preserves inactive-frame focus', async ({
  page,
}) => {
  const frame = await mountFrame(page, ['t-toolbar']);
  const toolbar = frame.locator('t-toolbar');
  await toolbar.evaluate((host) => {
    const owner = host.ownerDocument;
    host.innerHTML = '<button>First</button><div id="shadow"></div><button>Last</button>';
    const root = host.querySelector('#shadow')!.attachShadow({ mode: 'open' });
    const action = owner.createElement('button');
    action.textContent = 'Shadow action';
    root.append(action);
  });
  await frame.getByRole('button', { name: 'First', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(frame.getByRole('button', { name: 'Shadow action' })).toBeFocused();
  await toolbar.evaluate((host) => host.querySelector('#shadow')!.setAttribute('inert', ''));
  await expect(frame.getByRole('button', { name: 'Last', exact: true })).toBeFocused();
  await page.locator('#outside').focus();
  await toolbar.evaluate((host) => host.querySelector('button:last-child')!.remove());
  await expect(page.locator('#outside')).toBeFocused();
});

for (const tag of ['radio-group', 'multi-select'] as const) {
  test(`adopted ${tag} recovers live choices and preserves inactive-frame focus`, async ({
    page,
  }) => {
    const frame = await mountFrame(page, [`t-${tag}`]);
    const host = frame.locator(`t-${tag}`);
    await host.evaluate((host: TRadioGroup | TMultiSelect) => {
      host.label = 'Mode';
      host.options = [
        { value: 'alpha', label: 'Alpha' },
        { value: 'beta', label: 'Beta' },
      ];
    });
    const role = tag === 'radio-group' ? 'radio' : 'checkbox';
    await frame.getByRole(role, { name: 'Beta', exact: true }).focus();
    await host.evaluate((host: TRadioGroup | TMultiSelect) => {
      host.options = [{ value: 'alpha', label: 'Alpha' }];
    });
    await expect(frame.getByRole(role, { name: 'Alpha', exact: true })).toBeFocused();
    await page.locator('#outside').focus();
    await host.evaluate((host: TRadioGroup | TMultiSelect) => {
      host.options = [];
    });
    await expect(page.locator('#outside')).toBeFocused();
  });
}

test('adopted toast uses owning visibility, embedded content and opener focus', async ({
  page,
}) => {
  const frame = await mountFrame(page, ['t-toast']);
  const toast = frame.locator('t-toast');
  await toast.evaluate((toast: TToast) => {
    toast.innerHTML = '<span>Embedded notice</span>';
    toast.duration = 60_000;
    toast.countdown = 'spinner';
  });
  await frame.locator('#before').focus();
  await toast.evaluate((toast: TToast) => toast.show('Fallback message'));
  await expect(frame.getByRole('status')).toBeVisible();
  await expect(frame.getByText('Embedded notice', { exact: true })).toBeVisible();
  await expect(frame.getByText('Fallback message')).toHaveCount(0);
  const paused = await toast.evaluate(async (toast: TToast) => {
    const owner = toast.ownerDocument;
    Object.defineProperty(owner, 'hidden', { configurable: true, get: () => true });
    owner.dispatchEvent(new Event('visibilitychange'));
    await toast.updateComplete;
    const result =
      toast.shadowRoot!.querySelector<HTMLElement>('[part=countdown-ring]')!.style
        .animationPlayState === 'paused';
    delete (owner as unknown as { hidden?: boolean }).hidden;
    owner.dispatchEvent(new Event('visibilitychange'));
    return result;
  });
  expect(paused).toBe(true);
  await frame.getByRole('button', { name: 'Dismiss notification' }).focus();
  await toast.evaluate((toast: TToast) => toast.close());
  await expect(frame.locator('#before')).toBeFocused();
});

test('dialog registration remains valid when a second module copy evaluates', async ({ page }) => {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  expect(
    await page.evaluate(async () => {
      const original = customElements.get('t-dialog');
      const modulePath = '/src/components/dialog.ts?registration-check';
      await import(modulePath);
      return original === customElements.get('t-dialog');
    }),
  ).toBe(true);
});

test('adopted modal locks iframe-native scrolling ancestors and restores their styles on removal', async ({
  page,
}) => {
  const frame = await mountFrame(page, ['t-dialog']);
  const modal = frame.locator('t-dialog');
  const saved = await modal.evaluate((modal: TDialog) => {
    const owner = modal.ownerDocument;
    const app = owner.createElement('section');
    app.id = 'app';
    app.style.cssText =
      'height:320px;overflow-x:scroll!important;overflow-y:auto;overscroll-behavior-y:contain!important;scrollbar-gutter:stable;border:2px solid';
    modal.before(app);
    app.innerHTML = '<div style="height:120px"></div>';
    app.append(modal);
    const filler = owner.createElement('div');
    filler.style.height = '1800px';
    app.append(filler);
    modal.innerHTML =
      '<button>Content action</button><div style="height:1800px">Long content</div>';
    owner.documentElement.style.setProperty('overscroll-behavior-y', 'contain', 'important');
    app.scrollTop = 80;
    return {
      styles: [owner.documentElement.style.cssText, owner.body.style.cssText, app.style.cssText],
      appScroll: app.scrollTop,
      pageScroll: owner.defaultView!.scrollY,
    };
  });
  await modal.evaluate((modal: TDialog) => modal.show());
  const app = frame.locator('#app');
  await expect(app).toHaveCSS('overflow-y', 'hidden');
  if (await app.evaluate(() => CSS.supports('overscroll-behavior-y', 'none')))
    await expect(app).toHaveCSS('overscroll-behavior-y', 'none');
  const position = () =>
    app.evaluate((app) => ({
      appScroll: app.scrollTop,
      pageScroll: app.ownerDocument.defaultView!.scrollY,
    }));
  const initialPosition = { appScroll: saved.appScroll, pageScroll: saved.pageScroll };
  expect(await position()).toEqual(initialPosition);
  const content = modal.locator('.body');
  await content.hover();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => content.evaluate((content) => content.scrollTop)).toBeGreaterThan(0);
  expect(await position()).toEqual(initialPosition);
  await content.evaluate((content) => (content.scrollTop = content.scrollHeight));
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(250);
  expect(await position()).toEqual(initialPosition);
  await modal.evaluate((modal) => modal.remove());
  const restored = await app.evaluate((app: HTMLElement) => [
    app.ownerDocument.documentElement.style.cssText,
    app.ownerDocument.body.style.cssText,
    app.style.cssText,
  ]);
  expect(restored).toEqual(saved.styles);
  expect(await position()).toEqual(initialPosition);
  await app.hover();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => app.evaluate((app) => app.scrollTop)).toBeGreaterThan(saved.appScroll);
});

test('adopted styles survive round trips, reconnection, reactive updates and nested shadow hosts', async ({
  page,
}) => {
  const frame = await mountFrame(page, ['t-date-picker']);
  const picker = frame.locator('t-date-picker');
  await picker.evaluate((picker: TDatePicker) => {
    picker.style.setProperty('--t-space', '21px');
    picker.style.setProperty('--t-font', 'Georgia');
    picker.label = 'Departure';
    picker.value = '2026-09-15';
    const applicationStyle = picker.ownerDocument.createElement('style');
    applicationStyle.textContent = ':host { --application-token: retained; }';
    picker.shadowRoot!.append(applicationStyle);
    const applicationSheet = new CSSStyleSheet();
    applicationSheet.replaceSync(':host { --sheet-token: retained; }');
    picker.shadowRoot!.adoptedStyleSheets = [applicationSheet];
  });
  await expect(picker).toHaveCSS('--sheet-token', 'retained');
  expect(await picker.evaluate((picker) => picker.shadowRoot!.adoptedStyleSheets.length)).toBe(1);
  await frame.getByRole('button', { name: 'Change date, 2026-09-15' }).click();
  await expect(picker.locator('t-dialog dialog')).toHaveCSS('display', 'flex');
  await expect(picker.locator('t-calendar .calendar')).toHaveCSS('padding-top', '21px');
  await expect(picker.locator('t-calendar .header')).toHaveCSS('display', 'flex');
  await expect(picker.locator('t-calendar')).toHaveCSS('font-family', 'Georgia');
  await expect(picker.locator('t-calendar .header button').first()).toHaveCSS('min-height', '36px');
  await picker.evaluate((picker: TDatePicker) => picker.close());
  await expect(picker.locator('t-dialog dialog')).toBeHidden();
  await frame.locator('body').evaluate(() => {
    (window as Window & { litNonce?: string }).litNonce = 'embedded-nonce';
  });
  await page.evaluate(async () => {
    const embedded = document.querySelector('iframe')!.contentDocument!;
    const picker = embedded.querySelector('t-date-picker')! as TDatePicker;
    document.querySelector('#fixture')!.append(picker);
    await picker.updateComplete;
    embedded.body.insertBefore(picker, embedded.querySelector('#after'));
    await picker.updateComplete;
    picker.remove();
    embedded.body.insertBefore(picker, embedded.querySelector('#after'));
    picker.label = 'Return';
    await picker.updateComplete;
  });
  await expect(frame.getByRole('textbox', { name: 'Return' })).toBeVisible();
  await expect(picker.locator('.field-row')).toHaveCSS('display', 'flex');
  await expect(picker).toHaveCSS('--application-token', 'retained');
  const styles = await picker.evaluate((picker) => {
    const roots = [
      picker.shadowRoot!,
      picker.shadowRoot!.querySelector('t-dialog')!.shadowRoot!,
      picker.shadowRoot!.querySelector('t-calendar')!.shadowRoot!,
    ];
    return roots.map((root) => ({
      libraryStyles: [...root.querySelectorAll('style')].filter((style) =>
        style.textContent!.includes('box-sizing: border-box'),
      ).length,
      nonce: root.querySelector<HTMLStyleElement>('style')!.nonce,
    }));
  });
  expect(styles).toEqual(Array(3).fill({ libraryStyles: 1, nonce: 'embedded-nonce' }));
  await frame.getByRole('button', { name: 'Change date, 2026-09-15' }).click();
  await expect(picker.locator('t-calendar .calendar')).toHaveCSS('padding-top', '21px');
  await expect(picker.locator('t-dialog dialog')).toHaveCSS('display', 'flex');
});

test('components first connected after adoption receive their static styles', async ({ page }) => {
  const frame = await mountFrame(page, []);
  await page.evaluate(async () => {
    const modal = document.createElement('t-dialog');
    document.querySelector('iframe')!.contentDocument!.body.append(modal);
    await modal.updateComplete;
    modal.show();
  });
  await expect(frame.locator('t-dialog dialog')).toHaveCSS('display', 'flex');
  await expect(frame.getByRole('button', { name: 'Close dialog' })).toHaveCSS('min-height', '32px');
});
