export type Placement = 'top' | 'bottom' | 'left' | 'right';

/** Positions a top-layer surface and follows scrolling, resizing, and content changes. */
export function observeFloating(
  anchor: HTMLElement,
  panel: HTMLElement,
  preferred: Placement = 'bottom',
) {
  const update = () => {
    const viewport = window.visualViewport;
    const x = viewport?.offsetLeft ?? 0,
      y = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? window.innerWidth,
      height = viewport?.height ?? window.innerHeight;
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
  window.addEventListener('scroll', update, true);
  window.addEventListener('resize', update);
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  return () => {
    observer.disconnect();
    window.removeEventListener('scroll', update, true);
    window.removeEventListener('resize', update);
    window.visualViewport?.removeEventListener('resize', update);
    window.visualViewport?.removeEventListener('scroll', update);
  };
}

export function activeElement(): HTMLElement | undefined {
  let current = document.activeElement;
  while (current?.shadowRoot?.activeElement) current = current.shadowRoot.activeElement;
  return current instanceof HTMLElement ? current : undefined;
}
