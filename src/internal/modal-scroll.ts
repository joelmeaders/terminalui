import type { ReactiveController, ReactiveControllerHost } from 'lit';

type ModalHost = HTMLElement &
  ReactiveControllerHost & { renderRoot: HTMLElement | DocumentFragment };
const locks = new WeakMap<HTMLElement, { count: number; restore: () => void }>();

function lock(element: HTMLElement) {
  const existing = locks.get(element);
  if (existing) {
    existing.count++;
    return;
  }
  const style = element.style;
  const saved = new Map<string, [string, string]>();
  const set = (property: string, value: string) => {
    saved.set(property, [style.getPropertyValue(property), style.getPropertyPriority(property)]);
    style.setProperty(property, value, 'important');
  };
  const computed = getComputedStyle(element);
  const document = element.ownerDocument;
  const scrollbar =
    element === document.documentElement
      ? document.defaultView!.innerWidth - element.clientWidth
      : element.offsetWidth -
        element.clientWidth -
        parseFloat(computed.borderLeftWidth) -
        parseFloat(computed.borderRightWidth);
  // Keep classic scrollbar space without adding a gutter to pages that had none.
  if (scrollbar > 0 && !computed.scrollbarGutter.includes('stable'))
    set('scrollbar-gutter', 'stable');
  set('overflow-x', 'hidden');
  set('overflow-y', 'hidden');
  set('overscroll-behavior-x', 'none');
  set('overscroll-behavior-y', 'none');
  locks.set(element, {
    count: 1,
    restore: () => {
      for (const [property, [value, priority]] of saved) {
        if (value) style.setProperty(property, value, priority);
        else style.removeProperty(property);
      }
    },
  });
}

/** Share scroll locks across stacked modals and release them when a host is removed. */
export class ModalScrollController implements ReactiveController {
  private elements: HTMLElement[] = [];
  constructor(private host: ModalHost) {
    host.addController(this);
  }
  hostConnected() {
    this.host.requestUpdate();
  }
  hostDisconnected() {
    // A removed native dialog can retain `open` after it leaves the top layer.
    // Clear only the native state so reconnecting can call showModal() again.
    this.host.renderRoot?.querySelector('dialog')?.removeAttribute('open');
    this.release();
  }
  acquire() {
    if (this.elements.length) return;
    const document = this.host.ownerDocument;
    const elements = new Set([document.documentElement, document.body]);
    let parent: Element | null = this.host;
    while (parent) {
      if (parent instanceof HTMLElement && !elements.has(parent)) {
        const style = getComputedStyle(parent);
        if (locks.has(parent) || /auto|scroll/.test(`${style.overflowX} ${style.overflowY}`))
          elements.add(parent);
      }
      parent =
        parent.assignedSlot ??
        parent.parentElement ??
        (parent.getRootNode() as ShadowRoot).host ??
        null;
    }
    this.elements = [...elements];
    for (const element of this.elements) lock(element);
  }
  release() {
    for (const element of this.elements) {
      const state = locks.get(element)!;
      if (--state.count === 0) {
        state.restore();
        locks.delete(element);
      }
    }
    this.elements = [];
  }
}
