import { activeElement } from './floating';

/** Wraps modal Tab boundaries through slots and open shadow roots. */
export function containModalTab(event: KeyboardEvent, dialog: HTMLDialogElement) {
  if (event.key !== 'Tab') return;
  const controls: HTMLElement[] = [];
  const visit = (node: Element) => {
    if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml') return;
    const element = node as HTMLElement;
    if (element.localName === 'slot') {
      const assigned = (element as HTMLSlotElement).assignedElements({ flatten: true });
      for (const child of assigned.length ? assigned : element.children) visit(child);
      return;
    }
    if (element.hidden || element.inert || getComputedStyle(element).display === 'none') return;
    if (
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      getComputedStyle(element).visibility !== 'hidden' &&
      element.getClientRects().length
    )
      controls.push(element);
    if (element.localName === 'details' && !(element as HTMLDetailsElement).open) {
      // Some engines retain geometry for content hidden by a closed disclosure.
      const summary = [...element.children].find((child) => child.tagName === 'SUMMARY');
      if (summary) visit(summary);
      return;
    }
    for (const child of element.shadowRoot?.children ?? element.children) visit(child);
  };
  // Firefox gives the dialog itself tabIndex=0. Only its contents form the cycle.
  for (const child of dialog.children) visit(child);
  const candidates = controls
    .map((element, index) => ({ element, index }))
    .sort((a, b) => {
      const left = a.element.tabIndex || Infinity,
        right = b.element.tabIndex || Infinity;
      return left === right ? a.index - b.index : left - right;
    })
    .map((entry) => entry.element);
  const ordered = candidates.filter((element) => {
    const input = element as HTMLInputElement;
    if (element.localName !== 'input' || input.type !== 'radio' || !input.name) return true;
    const group = candidates.filter(
      (candidate): candidate is HTMLInputElement =>
        candidate.localName === 'input' &&
        (candidate as HTMLInputElement).type === 'radio' &&
        (candidate as HTMLInputElement).name === input.name &&
        (candidate as HTMLInputElement).form === input.form &&
        candidate.getRootNode() === element.getRootNode(),
    );
    const stop = group.find((radio) => radio.checked) ?? (event.shiftKey ? group.at(-1) : group[0]);
    return element === stop;
  });
  const active = activeElement(dialog.ownerDocument);
  if (event.shiftKey && active === ordered[0]) {
    event.preventDefault();
    ordered.at(-1)?.focus();
  } else if (!event.shiftKey && active === ordered.at(-1)) {
    event.preventDefault();
    ordered[0]?.focus();
  }
}
