const blockingTypes = new Set([
  'text',
  'email',
  'password',
  'search',
  'tel',
  'url',
  'number',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
]);

/** Preserve native single-field and first-submitter behavior for shadow-root text fields. */
export function submitOnEnter(event: KeyboardEvent, form: HTMLFormElement | null, type = 'text') {
  if (
    !blockingTypes.has(type) ||
    event.key !== 'Enter' ||
    event.isComposing ||
    event.defaultPrevented ||
    !form
  )
    return;
  const submitter = Array.from(form.elements).find(
    (element) =>
      ((element instanceof HTMLButtonElement || element instanceof HTMLInputElement) &&
        element.type === 'submit') ||
      (element.localName === 't-button' &&
        (element as HTMLElement & { type: string }).type === 'submit'),
  ) as (HTMLElement & { loading?: boolean }) | undefined;
  if (submitter) {
    event.preventDefault();
    if (!submitter.matches(':disabled') && !submitter.loading) submitter.click();
    return;
  }
  const blockers = Array.from(form.elements).filter(
    (element) =>
      (element instanceof HTMLInputElement && blockingTypes.has(element.type)) ||
      (['t-input', 't-password-input', 't-number-input'].includes(element.localName) &&
        blockingTypes.has((element as HTMLElement & { type: string }).type)) ||
      element.localName === 't-date-picker',
  );
  if (blockers.length === 1) {
    event.preventDefault();
    form.requestSubmit();
  }
}
