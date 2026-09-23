import { css, html, type PropertyValues } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import { containModalTab } from '../internal/modal-focus';

/**
 * Modal side panel built on a native dialog. Escape closes it and restores focus.
 * @slot - Drawer body.
 * @slot footer - Footer actions.
 * @fires t-close - The drawer closed.
 * @csspart dialog - Native modal panel.
 * @csspart body - Scrollable body.
 */
export class TDrawer extends TerminalElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    heading: {},
    placement: { reflect: true },
  };
  /** Whether the drawer is open. */
  open = false;
  /** Visible heading and accessible name. */
  heading = 'Details';
  /** Logical screen edge. */
  placement: 'start' | 'end' = 'end';
  private returnFocus?: HTMLElement;
  static styles = [
    baseStyles,
    css`
      dialog {
        position: fixed;
        inset: 0;
        margin: 0;
        margin-inline-start: auto;
        width: min(420px, 100vw);
        height: 100dvh;
        max-height: none;
        max-width: 100vw;
        padding: 0;
        color: var(--t-text);
        background: var(--t-surface);
        border: var(--t-line-width, 1px) solid var(--t-accent);
        box-shadow:
          var(--_t-edge-glow),
          0 0 80px #0008;
      }
      dialog[open] {
        display: flex;
        flex-direction: column;
      }
      :host([placement='start']) dialog {
        margin-inline-start: 0;
        margin-inline-end: auto;
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.72);
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: var(--t-space-4, 16px);
        background: var(--t-raised);
        border-bottom: var(--t-divider-width, 1px) solid var(--t-border);
      }
      h2 {
        font: inherit;
        font-weight: 600;
        margin: 0;
      }
      button {
        color: var(--t-text);
        background: transparent;
        border: 0;
        min-width: 32px;
        min-height: 32px;
        font-size: 22px;
      }
      .body {
        padding: var(--t-space-4, 16px);
        flex: 1;
        overflow: auto;
      }
      footer {
        padding: var(--t-space-4, 16px);
        display: flex;
        gap: 12px;
        justify-content: end;
      }
    `,
  ];
  /** Opens the modal and remembers the optional focus return target. */
  show(opener?: HTMLElement) {
    this.returnFocus = opener;
    this.open = true;
  }
  /** Closes the modal. */
  close() {
    this.open = false;
  }
  protected updated(_changed: PropertyValues) {
    const dialog = this.renderRoot.querySelector('dialog')!;
    if (this.open && !dialog.open) {
      if (!this.returnFocus) {
        let active = document.activeElement;
        while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
        if (active instanceof HTMLElement) this.returnFocus = active;
      }
      dialog.showModal();
    } else if (!this.open && dialog.open) dialog.close();
  }
  private onClose() {
    this.open = false;
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    this.returnFocus = undefined;
    this.emit('t-close');
  }
  private onKeydown(event: KeyboardEvent) {
    containModalTab(event, event.currentTarget as HTMLDialogElement);
  }
  render() {
    return html`<dialog
      part="dialog"
      aria-labelledby="title"
      @close=${this.onClose}
      @keydown=${this.onKeydown}
      @cancel=${() => {
        this.open = false;
      }}
    >
      <header>
        <h2 id="title">${this.heading}</h2>
        <button type="button" aria-label="Close drawer" @click=${this.close}>×</button>
      </header>
      <div class="body" part="body"><slot></slot></div>
      <footer><slot name="footer"></slot></footer>
    </dialog>`;
  }
}
if (!customElements.get('t-drawer')) customElements.define('t-drawer', TDrawer);
declare global {
  interface HTMLElementTagNameMap {
    't-drawer': TDrawer;
  }
}
