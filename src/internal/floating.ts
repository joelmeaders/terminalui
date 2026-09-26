export type Placement = 'top' | 'bottom' | 'left' | 'right';

/** Positions a top-layer surface and follows scrolling, resizing, and content changes. */
export function observeFloating(
  anchor: HTMLElement,
  panel: HTMLElement,
  preferred: Placement = 'bottom',
) {
  const view = anchor.ownerDocument.defaultView ?? window;
  const update = () => {
    const viewport = view.visualViewport;
    const x = viewport?.offsetLeft ?? 0,
      y = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? view.innerWidth,
      height = viewport?.height ?? view.innerHeight;
    const margin = 8,
      gap = 8;
    panel.style.maxWidth = `${Math.max(0, width - margin * 2)}px`;
    panel.style.maxHeight = `${Math.max(0, height - margin * 2)}px`;
    const target = anchor.getBoundingClientRect();
    let box = panel.getBoundingClientRect();
    const room = {
      top: target.top - y,
      bottom: y + height - target.bottom,
      left: target.left - x,
      right: x + width - target.right,
    };
    const opposite: Record<Placement, Placement> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    };
    let side: Placement = ['top', 'bottom', 'left', 'right'].includes(preferred)
      ? preferred
      : 'bottom';
    const need = side === 'top' || side === 'bottom' ? box.height + gap : box.width + gap;
    if (room[side] < need && room[opposite[side]] > room[side]) side = opposite[side];
    if (side === 'top' || side === 'bottom') {
      const available = room[side] - gap - margin;
      if (available > 0) {
        panel.style.maxHeight = `${Math.min(height - margin * 2, available)}px`;
        box = panel.getBoundingClientRect();
      }
    }
    let left = target.left,
      top = target.bottom + gap;
    if (side === 'top') top = target.top - box.height - gap;
    if (side === 'left') {
      left = target.left - box.width - gap;
      top = target.top;
    }
    if (side === 'right') {
      left = target.right + gap;
      top = target.top;
    }
    panel.style.left = `${Math.max(x + margin, Math.min(left, x + width - box.width - margin))}px`;
    panel.style.top = `${Math.max(y + margin, Math.min(top, y + height - box.height - margin))}px`;
  };
  update();
  const observer = new ResizeObserver(update);
  observer.observe(anchor);
  observer.observe(panel);
  view.addEventListener('scroll', update, true);
  view.addEventListener('resize', update);
  view.visualViewport?.addEventListener('resize', update);
  view.visualViewport?.addEventListener('scroll', update);
  return () => {
    observer.disconnect();
    view.removeEventListener('scroll', update, true);
    view.removeEventListener('resize', update);
    view.visualViewport?.removeEventListener('resize', update);
    view.visualViewport?.removeEventListener('scroll', update);
  };
}

/** Finds the deepest focused HTML element in its owning document, including adopted elements. */
export function activeElement(owner: Document = document): HTMLElement | undefined {
  let current = owner.activeElement;
  while (current?.shadowRoot?.activeElement) current = current.shadowRoot.activeElement;
  return current?.namespaceURI === 'http://www.w3.org/1999/xhtml'
    ? (current as HTMLElement)
    : undefined;
}

/** Recover focus after a control changes, unless the consumer moved it elsewhere. */
export function recoverFocus(
  from: HTMLElement | undefined,
  target: HTMLElement | null | undefined,
) {
  if (!target?.isConnected) return;
  const owner = target.ownerDocument;
  const current = activeElement(owner);
  if (current !== from && current !== owner.body) return;
  if (current === target) return;
  target.focus({ preventScroll: true });
  if (activeElement(owner) === target)
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}
