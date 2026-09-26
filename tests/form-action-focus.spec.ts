import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import type { TTagsInput } from '../src/components/tags-input';
import type { TRating } from '../src/components/rating';

async function fixture(page: Page, tag: 'tags-input' | 'rating') {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate(async (root, tag) => {
    root.innerHTML = `<button id="before">Before</button><form><t-${tag} name="value" label="Skills"${tag === 'rating' ? ' value="3" clearable' : ''}></t-${tag}></form><button id="after">After</button>`;
    const host = root.querySelector(`t-${tag}`)! as TTagsInput | TRating;
    if (tag === 'tags-input') (host as TTagsInput).values = ['Lit', 'TypeScript', 'CSS'];
    await host.updateComplete;
    const events: string[] = [];
    for (const name of ['input', 'change'])
      host.addEventListener(name, () => {
        events.push(name);
        host.dataset.events = JSON.stringify(events);
      });
    host.dataset.events = '[]';
  }, tag);
}

test('tag removal actions retain their names and focus through external reordering', async ({
  page,
}) => {
  await fixture(page, 'tags-input');
  const target = page.getByRole('button', { name: 'Remove TypeScript', exact: true });
  await target.focus();
  await page.locator('t-tags-input').evaluate(async (host: TTagsInput) => {
    host.values = ['CSS', 'Lit', 'TypeScript'];
    await host.updateComplete;
  });
  await expect(target).toBeFocused();
  await expect(page.locator('t-tags-input')).toHaveAttribute('data-events', '[]');
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).getAll('value')),
  ).toEqual(['CSS', 'Lit', 'TypeScript']);
});

test('removing a focused tag through values restores the entry field without user events', async ({
  page,
}) => {
  await fixture(page, 'tags-input');
  await page.getByRole('button', { name: 'Remove TypeScript', exact: true }).focus();
  await page.locator('t-tags-input').evaluate(async (host: TTagsInput) => {
    host.values = ['CSS'];
    await host.updateComplete;
  });
  await expect(page.getByRole('textbox', { name: 'Skills', exact: true })).toBeFocused();
  await expect(page.locator('t-tags-input')).toHaveAttribute('data-events', '[]');
});

test('malformed tag values recover removed action focus and keep validation visible', async ({
  page,
}) => {
  await fixture(page, 'tags-input');
  await page.getByRole('button', { name: 'Remove TypeScript', exact: true }).focus();
  await page.locator('t-tags-input').evaluate(async (host: TTagsInput) => {
    host.value = 'malformed';
    await host.updateComplete;
  });
  const entry = page.getByRole('textbox', { name: 'Skills', exact: true });
  await expect(entry).toBeFocused();
  await expect(entry).toHaveAttribute('aria-invalid', 'true');
  await expect(entry).toHaveAccessibleDescription('The tag value must be a JSON array of strings.');
  await expect(page.locator('t-tags-input')).toHaveAttribute('data-events', '[]');
});

test('hiding the focused rating clear action restores the selected radio', async ({ page }) => {
  await fixture(page, 'rating');
  await page.getByRole('button', { name: 'Clear Skills', exact: true }).focus();
  await page.locator('t-rating').evaluate(async (host: TRating) => {
    host.clearable = false;
    await host.updateComplete;
  });
  await expect(page.getByRole('radio', { name: '3 of 5 stars', exact: true })).toBeFocused();
  await expect(page.locator('t-rating')).toHaveAttribute('data-events', '[]');
});

test('clearing the value externally recovers focus from the disabled rating clear action', async ({
  page,
}) => {
  await fixture(page, 'rating');
  const clear = page.getByRole('button', { name: 'Clear Skills', exact: true });
  await clear.focus();
  await page.locator('t-rating').evaluate(async (host: TRating) => {
    host.value = '';
    await host.updateComplete;
  });
  await expect(clear).toBeDisabled();
  await expect(page.getByRole('radio', { name: '1 of 5 stars', exact: true })).toBeFocused();
  await expect(page.locator('t-rating')).toHaveAttribute('data-events', '[]');
});

test('tag removal preserves an outside focus move made by the application change handler', async ({
  page,
}) => {
  await fixture(page, 'tags-input');
  await page.locator('t-tags-input').evaluate((host) => {
    host.addEventListener('change', () =>
      document.querySelector<HTMLButtonElement>('#after')!.focus(),
    );
  });
  await page.getByRole('button', { name: 'Remove TypeScript', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#after')).toBeFocused();
  await expect(page.locator('t-tags-input')).toHaveAttribute('data-events', '["input","change"]');
});

test('rating clear preserves an outside focus move made by the application change handler', async ({
  page,
}) => {
  await fixture(page, 'rating');
  await page.locator('t-rating').evaluate((host) => {
    host.addEventListener('change', () =>
      document.querySelector<HTMLButtonElement>('#after')!.focus(),
    );
  });
  await page.getByRole('button', { name: 'Clear Skills', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#after')).toBeFocused();
  await expect(page.locator('t-rating')).toHaveAttribute('data-events', '["input","change"]');
});

test('tag reset recovers removed action focus without changing the initial form value', async ({
  page,
}) => {
  await fixture(page, 'tags-input');
  await page.locator('t-tags-input').evaluate(async (host: TTagsInput) => {
    host.values = ['Temporary'];
    await host.updateComplete;
  });
  await page.getByRole('button', { name: 'Remove Temporary', exact: true }).focus();
  await page.locator('form').evaluate((form: HTMLFormElement) => form.reset());
  await expect(page.getByRole('textbox', { name: 'Skills', exact: true })).toBeFocused();
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).getAll('value')),
  ).toEqual(['Lit', 'TypeScript', 'CSS']);
  await expect(page.locator('t-tags-input')).toHaveAttribute('data-events', '[]');
});

test('keyboard removal returns to the tag entry and emits one input/change pair', async ({
  page,
}) => {
  await fixture(page, 'tags-input');
  await page.getByRole('button', { name: 'Remove TypeScript', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('textbox', { name: 'Skills', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Remove TypeScript', exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Removed TypeScript. 2 tags selected.');
  await expect(page.locator('t-tags-input')).toHaveAttribute('data-events', '["input","change"]');
  expect(
    await page
      .locator('form')
      .evaluate((form: HTMLFormElement) => new FormData(form).getAll('value')),
  ).toEqual(['Lit', 'CSS']);
});

test('keyboard rating clear returns to the first radio and preserves required validation', async ({
  page,
}) => {
  await fixture(page, 'rating');
  await page.locator('t-rating').evaluate(async (host: TRating) => {
    host.required = true;
    await host.updateComplete;
  });
  await page.getByRole('button', { name: 'Clear Skills', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio', { name: '1 of 5 stars', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Clear Skills', exact: true })).toBeDisabled();
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(
    false,
  );
  await expect(page.locator('t-rating')).toHaveAttribute('data-events', '["input","change"]');
});

for (const tag of ['tags-input', 'rating'] as const) {
  test(`${tag} disabling an action recovers to its named region and native Tab can leave it`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await fixture(page, tag);
    await page
      .getByRole('button', {
        name: tag === 'tags-input' ? 'Remove TypeScript' : 'Clear Skills',
        exact: true,
      })
      .focus();
    await page.locator(`t-${tag}`).evaluate(async (host: TTagsInput | TRating) => {
      host.disabled = true;
      await host.updateComplete;
    });
    const region =
      tag === 'tags-input'
        ? page.getByRole('list', { name: 'Skills selected' })
        : page.locator('t-rating legend');
    await expect(region).toBeFocused();
    if (tag === 'rating') {
      await expect(region).toHaveText('Skills');
      await expect(page.getByRole('group', { name: 'Skills', exact: true })).toBeVisible();
    }
    for (const control of await page.locator(`t-${tag}`).locator('input,button').all())
      await expect(control).toBeDisabled();
    const ring = await region.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const extent = Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
      return {
        style: style.outlineStyle,
        width: Number.parseFloat(style.outlineWidth),
        left: box.left - extent,
        right: box.right + extent,
        top: box.top - extent,
        bottom: box.bottom + extent,
        viewport: innerWidth,
        height: innerHeight,
      };
    });
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThan(0);
    expect(ring.left).toBeGreaterThanOrEqual(-0.5);
    expect(ring.right).toBeLessThanOrEqual(ring.viewport + 0.5);
    expect(ring.top).toBeGreaterThanOrEqual(-0.5);
    expect(ring.bottom).toBeLessThanOrEqual(ring.height + 0.5);
    await page.screenshot({ path: testInfo.outputPath(`${tag}-disabled-action-focus.png`) });
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
    await page.locator(`t-${tag}`).evaluate(async (host: TTagsInput | TRating) => {
      host.disabled = false;
      await host.updateComplete;
    });
    await expect(page.locator('#after')).toBeFocused();
    await expect(page.locator(`t-${tag}`)).toHaveAttribute('data-events', '[]');
  });

  test(`${tag} live updates preserve initial and outside focus`, async ({ page }) => {
    await fixture(page, tag);
    await page.locator('#before').focus();
    const initialFocus = await page.locator(`t-${tag}`).evaluate(async (host, tag) => {
      const fresh = document.createElement(`t-${tag}`) as TTagsInput | TRating;
      host.before(fresh);
      await fresh.updateComplete;
      const active = document.activeElement?.id;
      fresh.remove();
      return active;
    }, tag);
    expect(initialFocus).toBe('before');
    await page.locator(`t-${tag}`).evaluate(async (host: TTagsInput | TRating, tag) => {
      if (tag === 'tags-input') (host as TTagsInput).values = [];
      else {
        (host as TRating).clearable = false;
        host.value = '';
      }
      await host.updateComplete;
    }, tag);
    await expect(page.locator('#before')).toBeFocused();
    await expect(page.locator(`t-${tag}`)).toHaveAttribute('data-events', '[]');
  });

  test(`${tag} action recovery stays inside a modal and restores its opener`, async ({ page }) => {
    await fixture(page, tag);
    await page.locator('form').evaluate((form) => {
      const dialog = document.createElement('t-dialog');
      dialog.heading = 'Edit skills';
      document.querySelector('#fixture')!.append(dialog);
      dialog.append(form);
      const opener = document.querySelector<HTMLButtonElement>('#before')!;
      opener.focus();
      dialog.show(opener);
    });
    await page
      .getByRole('button', {
        name: tag === 'tags-input' ? 'Remove TypeScript' : 'Clear Skills',
        exact: true,
      })
      .focus();
    await page.locator(`t-${tag}`).evaluate(async (host: TTagsInput | TRating, tag) => {
      if (tag === 'tags-input') (host as TTagsInput).values = [];
      else (host as TRating).clearable = false;
      await host.updateComplete;
    }, tag);
    const target =
      tag === 'tags-input'
        ? page.getByRole('textbox', { name: 'Skills', exact: true })
        : page.getByRole('radio', { name: '3 of 5 stars', exact: true });
    await expect(target).toBeFocused();
    await expect(page.getByRole('dialog', { name: 'Edit skills' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#before')).toBeFocused();
  });

  test(`${tag} recovers in its owning document and preserves focus outside an inactive frame`, async ({
    page,
  }) => {
    await fixture(page, tag);
    await page.locator(`t-${tag}`).evaluate(async (host: TTagsInput | TRating, tag) => {
      const frame = document.createElement('iframe');
      frame.title = 'Skills application';
      document.querySelector('#fixture')!.append(frame);
      frame.contentDocument!.body.append(host);
      host
        .shadowRoot!.querySelector<HTMLButtonElement>(
          tag === 'tags-input' ? '[aria-label="Remove TypeScript"]' : '[part=clear]',
        )!
        .focus();
      if (tag === 'tags-input') (host as TTagsInput).values = [];
      else (host as TRating).clearable = false;
      await host.updateComplete;
    }, tag);
    const embedded = page.frameLocator('iframe');
    await expect(
      tag === 'tags-input'
        ? embedded.getByRole('textbox', { name: 'Skills', exact: true })
        : embedded.getByRole('radio', { name: '3 of 5 stars', exact: true }),
    ).toBeFocused();
    await page.locator('iframe').evaluate(async (frame: HTMLIFrameElement, tag) => {
      const host = frame.contentDocument!.querySelector(`t-${tag}`)! as TTagsInput | TRating;
      if (tag === 'tags-input') (host as TTagsInput).values = ['TypeScript'];
      else (host as TRating).clearable = true;
      await host.updateComplete;
      host
        .shadowRoot!.querySelector<HTMLButtonElement>(
          tag === 'tags-input' ? '[part=remove]' : '[part=clear]',
        )!
        .focus();
    }, tag);
    await page.locator('#after').focus();
    await page.locator('iframe').evaluate(async (frame: HTMLIFrameElement, tag) => {
      const host = frame.contentDocument!.querySelector(`t-${tag}`)! as TTagsInput | TRating;
      if (tag === 'tags-input') (host as TTagsInput).values = [];
      else (host as TRating).clearable = false;
      await host.updateComplete;
    }, tag);
    await expect(page.locator('#after')).toBeFocused();
  });

  for (const direction of ['ltr', 'rtl'] as const)
    for (const preference of ['normal', 'enlarged', 'spaced'])
      test(`${tag} recovered action focus reflows at 320 pixels: ${direction}, ${preference}`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width: 320, height: 800 });
        await fixture(page, tag);
        await page.locator(`t-${tag}`).evaluate(
          async (host: TTagsInput | TRating, { tag, direction, preference }) => {
            document.documentElement.dir = direction;
            document.documentElement.setAttribute('data-density', 'compact');
            document.body.style.padding = '8px';
            document.body.style.margin = '0';
            if (tag === 'tags-input')
              (host as TTagsInput).values = ['Lit', `terminal_${'A'.repeat(48)}.json`, 'CSS'];
            await host.updateComplete;
            if (preference === 'enlarged') {
              const fonts = [host, ...host.shadowRoot!.querySelectorAll<HTMLElement>('*')].map(
                (element) => ({
                  element,
                  size: Number.parseFloat(getComputedStyle(element).fontSize),
                }),
              );
              for (const { element, size } of fonts) element.style.fontSize = `${size * 2}px`;
            }
            if (preference === 'spaced') {
              const style = document.createElement('style');
              style.textContent =
                '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}';
              host.shadowRoot!.append(style);
            }
          },
          { tag, direction, preference },
        );
        const action =
          tag === 'tags-input'
            ? page.getByRole('button', {
                name: `Remove terminal_${'A'.repeat(48)}.json`,
                exact: true,
              })
            : page.getByRole('button', { name: 'Clear Skills', exact: true });
        await action.focus();
        await page.locator(`t-${tag}`).evaluate(async (host: TTagsInput | TRating, tag) => {
          if (tag === 'tags-input') (host as TTagsInput).values = ['CSS'];
          else (host as TRating).clearable = false;
          await host.updateComplete;
        }, tag);
        const target =
          tag === 'tags-input'
            ? page.getByRole('textbox', { name: 'Skills', exact: true })
            : page.getByRole('radio', { name: '3 of 5 stars', exact: true });
        await expect(target).toBeFocused();
        await expect(target).toBeInViewport({ ratio: 1 });
        const geometry = await target.evaluate((control) => {
          const focusSurface = control;
          const box = focusSurface.getBoundingClientRect();
          const style = getComputedStyle(focusSurface);
          const extent =
            Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
          return {
            outline: style.outlineStyle,
            left: box.left - extent,
            right: box.right + extent,
            top: box.top - extent,
            bottom: box.bottom + extent,
            viewport: innerWidth,
            height: innerHeight,
            documentWidth: document.documentElement.scrollWidth,
          };
        });
        expect(geometry.outline).not.toBe('none');
        expect(geometry.left).toBeGreaterThanOrEqual(-0.5);
        expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 0.5);
        expect(geometry.top).toBeGreaterThanOrEqual(-0.5);
        expect(geometry.bottom).toBeLessThanOrEqual(geometry.height + 0.5);
        expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport + 1);
        if (preference === 'enlarged')
          await page.screenshot({
            path: testInfo.outputPath(`${tag}-${direction}-320-enlarged.png`),
          });
      });

  test(`${tag} live actions retain six-palette axe coverage when enabled and disabled`, async ({
    page,
    browser,
  }, testInfo) => {
    await fixture(page, tag);
    for (const theme of ['amber', 'phosphor', 'ice', 'lunar', 'signal', 'paper']) {
      await page
        .locator('html')
        .evaluate((element, theme) => element.setAttribute('data-theme', theme), theme);
      for (const disabled of [false, true]) {
        await page.locator(`t-${tag}`).evaluate(async (host: TTagsInput | TRating, disabled) => {
          host.disabled = disabled;
          await host.updateComplete;
        }, disabled);
        const axe = await new AxeBuilder({ page }).include(`t-${tag}`).analyze();
        await writeFile(
          testInfo.outputPath(
            `${tag}-action-${theme}-${disabled ? 'disabled' : 'enabled'}-axe-review.json`,
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
}
