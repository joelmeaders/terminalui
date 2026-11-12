import { css, html } from 'lit';
import { baseStyles, HullframeElement } from '../internal/base';
import { activeElement } from '../internal/floating';

const actionChanges: MutationObserverInit = {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: [
    'disabled',
    'aria-disabled',
    'hidden',
    'inert',
    'open',
    'slot',
    'name',
    'style',
    'class',
  ],
};

/**
 * Roving toolbar for native buttons/links, rendered slots, and open shadow roots.
 * Disabled, hidden, inert, and collapsed actions are skipped.
 * Focus moves to an available action when the focused action becomes unavailable.
 * Long action labels wrap. Keyboard focus scrolls the full action into view immediately.
 * Text fields and other composite widgets must remain outside this toolbar.
 *
 * @slot - Action buttons or links. Native separators may separate action groups.
 *
 * @csspart toolbar - Toolbar container.
 */
export class TToolbar extends HullframeElement {
  static properties = { label: {}, orientation: { reflect: true }, empty: { state: true } };
  /** Accessible toolbar name. */
  label = 'Actions';
  /** Keyboard axis. Horizontal arrows follow text direction. */
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  private empty = true;
  private actions: HTMLElement[] = [];
  private current?: HTMLElement;
  private focusedAction?: HTMLElement;
  private originals = new Map<HTMLElement, string | null>();
  private slots = new Set<HTMLSlotElement>();
  private onSlotChange = () => this.syncActions();
  private observer = new MutationObserver(() => this.syncActions());
  private resize = new ResizeObserver(() => this.syncActions());
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      [role='toolbar'] {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border: var(--t-line-width, 1px) solid var(--t-border);
        background: var(--t-surface);
      }
      :host([orientation='vertical']) [role='toolbar'] {
        flex-direction: column;
        align-items: stretch;
      }
      ::slotted(*) {
        box-sizing: border-box;
        min-width: 0;
        max-width: 100%;
        overflow-wrap: anywhere;
        scroll-margin: 8px;
      }
      ::slotted(button) {
        min-height: var(--t-control-height, 42px);
        padding: 8px 12px;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        background: var(--t-surface);
        color: var(--t-text);
        font: inherit;
      }
      ::slotted(a[href]) {
        padding: 8px 12px;
        color: var(--t-accent);
        text-decoration: underline;
      }
    `,
  ];
  connectedCallback() {
    super.connectedCallback();
    this.resize.observe(this);
    this.requestUpdate();
  }
  disconnectedCallback() {
    this.observer.disconnect();
    this.resize.disconnect();
    for (const slot of this.slots) slot.removeEventListener('slotchange', this.onSlotChange);
    this.slots.clear();
    this.restore();
    this.focusedAction = undefined;
    this.current = undefined;
    this.actions = [];
    super.disconnectedCallback();
  }
  protected updated() {
    queueMicrotask(() => {
      if (this.isConnected) this.syncActions();
    });
  }
  private restore() {
    for (const [element, value] of this.originals) {
      if (value === null) element.removeAttribute('tabindex');
      else element.setAttribute('tabindex', value);
    }
    this.originals.clear();
  }
  private syncActions() {
    if (!this.isConnected) return;
    this.observer.disconnect();
    const previousIndex = this.actions.indexOf(this.focusedAction!);
    const found: HTMLElement[] = [];
    const slots = new Set<HTMLSlotElement>();
    const visit = (node: Element) => {
      if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml') return;
      const element = node as HTMLElement;
      if (element.localName === 'slot') {
        const slot = element as HTMLSlotElement;
        slots.add(slot);
        for (const child of slot.assignedElements({ flatten: true })) visit(child);
        return;
      }
      if (element.matches('button,a[href]')) found.push(element);
      if (element.shadowRoot) {
        this.observer.observe(element.shadowRoot, actionChanges);
        for (const child of element.shadowRoot.children) visit(child);
      } else for (const child of element.children) visit(child);
    };
    for (const child of this.children) visit(child);
    this.observer.observe(this, actionChanges);
    for (const slot of this.slots)
      if (!slots.has(slot)) slot.removeEventListener('slotchange', this.onSlotChange);
    for (const slot of slots)
      if (!this.slots.has(slot)) slot.addEventListener('slotchange', this.onSlotChange);
    this.slots = slots;
    for (const [element, value] of this.originals)
      if (!found.includes(element)) {
        if (value === null) element.removeAttribute('tabindex');
        else element.setAttribute('tabindex', value);
        this.originals.delete(element);
      }
    for (const element of found)
      if (!this.originals.has(element))
        this.originals.set(element, element.getAttribute('tabindex'));
    this.actions = found.filter((element) => this.isAvailable(element));
    const active = activeElement(this.ownerDocument),
      toolbar = this.renderRoot.querySelector<HTMLElement>('[role=toolbar]'),
      lostAction = previousIndex >= 0 && !this.actions.includes(this.focusedAction!);
    if (lostAction) this.current = this.actions[Math.min(previousIndex, this.actions.length - 1)];
    if (!this.actions.includes(this.current!)) this.current = this.actions[0];
    if (this.actions.includes(active!)) this.current = active;
    for (const element of found) element.tabIndex = element === this.current ? 0 : -1;
    this.empty = this.actions.length === 0;
    if (this.ownerDocument.hasFocus() && (lostAction || active === toolbar)) {
      if (this.current) this.focusAction(this.current);
      else toolbar?.focus();
    }
  }
  private isAvailable(element: HTMLElement) {
    if (
      !element.isConnected ||
      element.matches(':disabled,[aria-disabled=true]') ||
      getComputedStyle(element).visibility !== 'visible' ||
      !element.getClientRects().length
    )
      return false;
    let child: Element = element;
    while (child) {
      if (child.matches('[hidden],[inert]')) return false;
      const root = child.getRootNode();
      const parent: Element | null =
        child.assignedSlot ??
        child.parentElement ??
        ('host' in root ? (root as ShadowRoot).host : null);
      if (parent?.localName === 'details' && !(parent as HTMLDetailsElement).open) {
        const summary = Array.from(parent.children).find((item) => item.tagName === 'SUMMARY');
        if (child !== summary) return false;
      }
      if (!parent) break;
      child = parent;
    }
    return true;
  }
  private focusAction(element: HTMLElement) {
    this.current = element;
    for (const action of this.actions) action.tabIndex = action === element ? 0 : -1;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
  private onFocus(event: FocusEvent) {
    const action = this.actions.find((element) => event.composedPath().includes(element));
    if (action) {
      this.current = action;
      this.focusedAction = action;
      for (const element of this.actions) element.tabIndex = element === action ? 0 : -1;
    } else this.focusedAction = undefined;
  }
  private onFocusOut() {
    queueMicrotask(() => {
      const active = activeElement(this.ownerDocument);
      if (
        !this.actions.includes(active!) &&
        (active !== this.ownerDocument.body ||
          (this.focusedAction && this.isAvailable(this.focusedAction)))
      )
        this.focusedAction = undefined;
    });
  }
  private onKey(event: KeyboardEvent) {
    const action = this.actions.find((element) => event.composedPath().includes(element));
    if (!action) return;
    const index = this.actions.indexOf(action),
      rtl = getComputedStyle(this).direction === 'rtl';
    let next = index;
    const forward =
        this.orientation === 'vertical' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight',
      backward = this.orientation === 'vertical' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) next = (index + 1) % this.actions.length;
    else if (event.key === backward) next = (index - 1 + this.actions.length) % this.actions.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = this.actions.length - 1;
    else return;
    event.preventDefault();
    this.focusAction(this.actions[next]);
  }
  render() {
    return html`<div
      part="toolbar"
      role="toolbar"
      aria-label=${this.label}
      aria-orientation=${this.orientation}
      tabindex=${this.empty ? 0 : -1}
      @focusin=${this.onFocus}
      @focusout=${this.onFocusOut}
      @keydown=${this.onKey}
    >
      <slot @slotchange=${this.syncActions}></slot>
    </div>`;
  }
}
if (!customElements.get('t-toolbar')) customElements.define('t-toolbar', TToolbar);
declare global {
  interface HTMLElementTagNameMap {
    't-toolbar': TToolbar;
  }
}
