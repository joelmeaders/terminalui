import { expect, test, type Page } from '@playwright/test';
import type { TButton } from '../src/components/button';

async function mountForm(page: Page, markup: string) {
  await page.route('**/@vite/client', (route) => route.abort());
  await page.goto('/tests/fixture.html');
  await page.locator('body[data-ready=true]').waitFor();
  await page.locator('#fixture').evaluate((fixture) => {
    fixture.innerHTML = '<iframe title="Embedded form" style="width:100%;height:450px"></iframe>';
  });
  const frame = page.frameLocator('iframe');
  await frame.locator('body').evaluate((body, markup) => {
    body.innerHTML = markup;
  }, markup);
  await page.locator('#fixture').evaluate(async (fixture) => {
    const owner = fixture.querySelector('iframe')!.contentDocument!;
    // Keep the native controls in their iframe realm. Adopt registered library hosts.
    for (const placeholder of owner.querySelectorAll('t-input,t-button')) {
      const host = document.createElement(placeholder.localName);
      for (const attribute of placeholder.attributes)
        host.setAttribute(attribute.name, attribute.value);
      host.innerHTML = placeholder.innerHTML;
      fixture.append(host);
      placeholder.replaceWith(host);
      await (host as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
    }
    const form = owner.querySelector('form')!;
    const output = owner.querySelector('output')!;
    output.dataset.submissions = '[]';
    const submissions: object[] = [];
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const submitter = (event as SubmitEvent).submitter;
      const view = owner.defaultView as Window & typeof globalThis;
      submissions.push({
        values: Object.fromEntries(
          [...new view.FormData(form, submitter)].sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
        nativeSubmitter:
          submitter === null ||
          submitter instanceof view.HTMLButtonElement ||
          submitter instanceof view.HTMLInputElement,
      });
      output.dataset.submissions = JSON.stringify(submissions);
    });
  });
  return frame;
}

for (const tag of ['button', 'input'])
  test(`adopted field uses the first iframe-native ${tag} submitter and honors cancellation and disabled state`, async ({
    page,
  }) => {
    const first =
      tag === 'button'
        ? '<button id="first" type="submit" name="action" value="first">Native save</button>'
        : '<input id="first" type="submit" name="action" value="first" aria-label="Native save">';
    const frame = await mountForm(
      page,
      `<form><t-input label="Title" name="title" value="Ready"></t-input>${first}<t-button type="submit" name="action" value="later">Later save</t-button></form><output></output>`,
    );
    const output = frame.locator('output');
    await frame.getByRole('textbox', { name: 'Title' }).press('Enter');
    const submitted = '[{"values":{"action":"first","title":"Ready"},"nativeSubmitter":true}]';
    await expect(output).toHaveAttribute('data-submissions', submitted);
    await frame
      .locator('#first')
      .evaluate((button) =>
        button.addEventListener('click', (event) => event.preventDefault(), { once: true }),
      );
    await frame.getByRole('textbox', { name: 'Title' }).press('Enter');
    await expect(output).toHaveAttribute('data-submissions', submitted);
    await frame.locator('#first').evaluate((button: HTMLButtonElement | HTMLInputElement) => {
      button.disabled = true;
    });
    await frame.getByRole('textbox', { name: 'Title' }).press('Enter');
    await frame.locator('t-input').evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    await expect(output).toHaveAttribute('data-submissions', submitted);
  });

test('adopted field counts iframe-native blockers before single-field implicit submission', async ({
  page,
}) => {
  const frame = await mountForm(
    page,
    '<form><t-input label="Title" name="title" value="Ready"></t-input><input id="blocker" name="other" aria-label="Other field"></form><output></output>',
  );
  const field = frame.getByRole('textbox', { name: 'Title' });
  await field.press('Enter');
  await expect(frame.locator('output')).toHaveAttribute('data-submissions', '[]');
  await frame.locator('#blocker').evaluate((blocker) => blocker.remove());
  await field.evaluate((input) =>
    input.addEventListener('keydown', (event) => event.preventDefault(), {
      capture: true,
      once: true,
    }),
  );
  await field.press('Enter');
  await expect(frame.locator('output')).toHaveAttribute('data-submissions', '[]');
  await field.press('Enter');
  await expect(frame.locator('output')).toHaveAttribute(
    'data-submissions',
    '[{"values":{"title":"Ready"},"nativeSubmitter":true}]',
  );
});

test('adopted loading first submitter blocks a later native button and uses an owning-realm proxy when ready', async ({
  page,
}) => {
  const frame = await mountForm(
    page,
    '<form><t-input label="Title" name="title" value="Ready"></t-input><t-button type="submit" name="action" value="save" loading>Save</t-button><button type="submit" name="action" value="later">Later save</button></form><output></output>',
  );
  await frame.getByRole('textbox', { name: 'Title' }).press('Enter');
  await expect(frame.locator('output')).toHaveAttribute('data-submissions', '[]');
  await frame.locator('t-button').evaluate(async (button: TButton) => {
    button.loading = false;
    await button.updateComplete;
  });
  await frame.getByRole('textbox', { name: 'Title' }).press('Enter');
  await expect(frame.locator('output')).toHaveAttribute(
    'data-submissions',
    '[{"values":{"action":"save","title":"Ready"},"nativeSubmitter":true}]',
  );
});

test('adopted externally associated submit button preserves validation, values, and composed click cancellation', async ({
  page,
}) => {
  const frame = await mountForm(
    page,
    '<form id="settings"></form><t-input form="settings" label="Title" name="title" required></t-input><t-button form="settings" type="submit" name="action" value="save">Save</t-button><output></output>',
  );
  const output = frame.locator('output');
  await frame.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(output).toHaveAttribute('data-submissions', '[]');
  await frame.getByRole('textbox', { name: 'Title' }).fill('Ready');
  await frame
    .locator('t-button')
    .evaluate((button) =>
      button.addEventListener('click', (event) => event.preventDefault(), { once: true }),
    );
  await frame.getByRole('button', { name: 'Save', exact: true }).click();
  await frame.locator('t-button').evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
  await expect(output).toHaveAttribute('data-submissions', '[]');
  await frame.getByRole('textbox', { name: 'Title' }).press('Enter');
  await expect(output).toHaveAttribute(
    'data-submissions',
    '[{"values":{"action":"save","title":"Ready"},"nativeSubmitter":true}]',
  );
});
