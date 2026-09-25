import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import { activeElement } from '../internal/floating';

/**
 * Roving toolbar for native buttons/links and buttons in open shadow roots.
 * Text fields and other composite widgets must remain outside this toolbar.
 *
 * @slot - Action buttons or links. Native separators may separate action groups.
 *
 * @csspart toolbar - Toolbar container.
 */
export class TToolbar extends TerminalElement {
  static properties = { label: {}, orientation: { reflect: true }, empty: { state: true } };
  /** Accessible toolbar name. */
  label = 'Actions';
  /** Keyboard axis. Horizontal arrows follow text direction. */
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  private empty = true;
  private actions: HTMLElement[] = [];
  private current?: HTMLElement;
  private originals = new Map<HTMLElement, string | null>();
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
        max-width: 100%;
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
    this.restore();
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
    this.observer.disconnect();
    const found: HTMLElement[] = [];
    const visit = (element: Element) => {
      if (!(element instanceof HTMLElement)) return;
      if (element.matches('button,a[href]')) found.push(element);
      if (element.shadowRoot) {
        this.observer.observe(element.shadowRoot, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['disabled', 'aria-disabled', 'hidden', 'style', 'class'],
        });
        for (const child of element.shadowRoot.children) visit(child);
      } else for (const child of element.children) visit(child);
    };
    for (const child of this.children) visit(child);
    this.observer.observe(this, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'hidden', 'style', 'class'],
    });
    for (const [element, value] of this.originals)
      if (!found.includes(element)) {
        if (value === null) element.removeAttribute('tabindex');
        else element.setAttribute('tabindex', value);
        this.originals.delete(element);
      }
    for (const element of found)
      if (!this.originals.has(element))
        this.originals.set(element, element.getAttribute('tabindex'));
    this.actions = found.filter(
      (element) =>
        !element.matches(':disabled,[aria-disabled=true]') &&
        !element.closest('[hidden],[inert]') &&
        getComputedStyle(element).visibility !== 'hidden' &&
        Boolean(element.getClientRects().length),
    );
    const active = activeElement(),
      hadFocus = found.includes(active!);
    if (!this.actions.includes(this.current!)) this.current = this.actions[0];
    if (this.actions.includes(active!)) this.current = active;
    for (const element of found) element.tabIndex = element === this.current ? 0 : -1;
    this.empty = this.actions.length === 0;
    if (hadFocus && !this.actions.includes(active!)) this.current?.focus();
  }
  private focusAction(element: HTMLElement) {
    this.current = element;
    for (const action of this.actions) action.tabIndex = action === element ? 0 : -1;
    element.focus();
  }
  private onFocus(event: FocusEvent) {
    const action = this.actions.find((element) => event.composedPath().includes(element));
    if (action) {
      this.current = action;
      for (const element of this.actions) element.tabIndex = element === action ? 0 : -1;
    }
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
