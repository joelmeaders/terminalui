import { expect, test, type Page } from '@playwright/test';

const tags = ['t-dialog', 't-drawer', 't-command-palette'] as const;
type ModalTag = (typeof tags)[number];

async function fixture(page: Page, tag: ModalTag, long = false, container = false) {
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate(
    (element, { tag, long, container }) => {
      document.documentElement.dataset.motion = 'off';
      element.innerHTML = `
      <div style="height: 900px"></div>
      <section id="app" ${container ? 'style="height: 400px; overflow: auto; scrollbar-gutter: stable"' : ''}>
        ${container ? '<div style="height: 600px"></div>' : ''}
        <button id="opener">Open modal</button>
        <${tag} heading="Scroll test">
          <button id="body-focus">Content action</button>
          ${long ? '<div style="height: 1800px">Long content</div>' : ''}
          <textarea aria-label="Notes">First line\nSecond line</textarea>
          <button slot="footer">Save</button>
        </${tag}>
        <div style="height: 2400px"></div>
      </section>`;
      const modal = element.querySelector(tag)!;
      if (tag === 't-command-palette') {
        (modal as HTMLElementTagNameMap['t-command-palette']).commands = Array.from(
          { length: long ? 70 : 2 },
          (_, index) => ({ value: String(index), label: `Command ${index}` }),
        );
      }
      element.querySelector<HTMLButtonElement>('#opener')!.onclick = (event) =>
        modal.show(event.currentTarget as HTMLElement);
    },
    { tag, long, container },
  );
  await page.locator('#opener').scrollIntoViewIfNeeded();
}

async function position(page: Page) {
  return page.evaluate(() => ({
    x: scrollX,
    y: scrollY,
    app: document.querySelector('#app')!.scrollTop,
  }));
}

// Wheel and keyboard scrolling can run after the input event, on the compositor.
async function settledPosition(page: Page) {
  await page.waitForTimeout(250);
  return position(page);
}

for (const tag of tags) {
  for (const container of [false, true]) {
    test(`${tag} locks ${container ? 'application container' : 'page'} wheel and keyboard scrolling`, async ({
      page,
    }) => {
      await fixture(page, tag, false, container);
      const before = await position(page);
      const openerBox = await page.locator('#opener').boundingBox();
      await page.locator('#opener').click();
      await expect(page.locator(`${tag} dialog`)).toBeVisible();
      expect(await position(page)).toEqual(before);
      expect(await page.locator('#opener').boundingBox()).toEqual(openerBox);

      // The backdrop and a short modal must not pass wheel input to the page.
      await page.mouse.move(5, 5);
      await page.mouse.wheel(0, 700);
      expect(await settledPosition(page)).toEqual(before);
      await page.locator(`${tag} header`).hover();
      await page.mouse.wheel(0, -700);
      expect(await settledPosition(page)).toEqual(before);
      await page.locator(`${tag} header button`).focus();
      for (const key of ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'End', 'Home']) {
        await page.keyboard.press(key);
        expect(await settledPosition(page), key).toEqual(before);
      }
      await page.locator(`${tag} h2`).evaluate((element: HTMLElement) => {
        element.tabIndex = -1;
        element.focus();
      });
      await page.keyboard.press('Space');
      expect(await settledPosition(page)).toEqual(before);
      await page.keyboard.press('Escape');
      await expect(page.locator(`${tag} dialog`)).not.toBeVisible();
      await expect(page.locator('#opener')).toBeFocused();
      expect(await position(page)).toEqual(before);
      await page.locator('#opener').hover();
      await page.mouse.wheel(0, 500);
      await expect
        .poll(async () => (await position(page))[container ? 'app' : 'y'])
        .toBeGreaterThan(before[container ? 'app' : 'y']);
    });
  }

  test(`${tag} keeps long content scrollable and contains scrolling at its edge`, async ({
    page,
  }) => {
    await fixture(page, tag, true);
    const before = await position(page);
    await page.locator('#opener').click();
    const content = page.locator(`${tag} ${tag === 't-command-palette' ? '.results' : '.body'}`);
    await content.hover();
    await page.mouse.wheel(0, 450);
    await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    expect(await position(page)).toEqual(before);
    await content.evaluate((element) => (element.scrollTop = element.scrollHeight));
    await page.mouse.wheel(0, 800);
    expect(await settledPosition(page)).toEqual(before);

    if (tag === 't-command-palette') {
      await page.getByRole('combobox').focus();
      await page.keyboard.press('Home');
      await expect(page.getByRole('option', { selected: true })).toHaveText('Command 0');
      await page.keyboard.press('End');
      await expect(page.getByRole('option', { selected: true })).toHaveText('Command 69');
      await expect(page.getByRole('option', { selected: true })).toBeInViewport();
    } else {
      await page.locator('#body-focus').focus();
      await content.evaluate((element) => (element.scrollTop = 0));
      await page.keyboard.press('PageDown');
      await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      const notes = page.getByRole('textbox', { name: 'Notes' });
      await notes.focus();
      await notes.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(0, 0));
      await page.keyboard.press('ArrowDown');
      await expect
        .poll(() => notes.evaluate((element: HTMLTextAreaElement) => element.selectionStart))
        .toBeGreaterThan(0);
    }
    expect(await position(page)).toEqual(before);
  });

  test(`${tag} releases its lock on removal and restores modality on reconnect`, async ({
    page,
  }) => {
    await fixture(page, tag);
    await page.locator('#opener').click();
    await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
    await page.locator(tag).evaluate((element) => {
      (window as any).removedModal = element;
      element.remove();
    });
    await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
    await page.evaluate(() => document.querySelector('#app')!.append((window as any).removedModal));
    await expect(page.locator(`${tag} dialog`)).toHaveJSProperty('open', true);
    expect(
      await page.locator(`${tag} dialog`).evaluate((element) => element.matches(':modal')),
    ).toBe(true);
    await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
  });
}

for (const first of ['outer', 'inner']) {
  test(`stacked modals retain the lock when ${first} closes first and restore author styles`, async ({
    page,
  }) => {
    await fixture(page, 't-dialog', false, true);
    const saved = await page.evaluate(() => {
      const root = document.documentElement.style;
      root.setProperty('overflow-x', 'clip', 'important');
      root.setProperty('overflow-y', 'scroll');
      root.setProperty('overscroll-behavior-y', 'contain', 'important');
      root.setProperty('scrollbar-gutter', 'stable both-edges');
      document.body.style.overflow = 'visible';
      return [
        root.cssText,
        document.body.style.cssText,
        document.querySelector<HTMLElement>('#app')!.style.cssText,
      ];
    });
    await page.locator('#opener').click();
    await page.locator('t-dialog').evaluate((element) => {
      const drawer = document.createElement('t-drawer');
      element.append(drawer);
      drawer.show();
    });
    await expect(page.locator('t-drawer dialog')).toBeVisible();
    await page
      .locator(first === 'outer' ? 't-dialog' : 't-drawer')
      .evaluate((element: HTMLElementTagNameMap['t-dialog' | 't-drawer']) => element.close());
    // Wait for the close update, then confirm the remaining modal still owns the lock.
    await expect(page.locator(first === 'outer' ? 't-dialog' : 't-drawer')).not.toHaveAttribute(
      'open',
      '',
    );
    await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
    await expect(page.locator('#app')).toHaveCSS('overflow-y', 'hidden');
    const remaining = first === 'outer' ? 't-drawer' : 't-dialog';
    await page
      .locator(remaining)
      .evaluate((element) => element.shadowRoot!.querySelector('dialog')!.close());
    await expect(page.locator(remaining)).not.toHaveAttribute('open', '');
    const restored = await page.evaluate(() => [
      document.documentElement.style.cssText,
      document.body.style.cssText,
      document.querySelector<HTMLElement>('#app')!.style.cssText,
    ]);
    expect(restored).toEqual(saved);
  });
}
