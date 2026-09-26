import { css, html, type PropertyValues } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import { containModalTab } from '../internal/modal-focus';
import { ModalScrollController } from '../internal/modal-scroll';
/**
 * Modal native dialog with Escape and focus return. Emits t-close.
 * @slot - Body.
 * @slot footer - Actions.
 * @csspart dialog - dialog element.
 * @csspart body - Scrollable dialog content.
 * @fires {CustomEvent<null>} t-close - The dialog closed. No detail payload.
 */
export class TDialog extends TerminalElement {
  static properties = { open: { type: Boolean, reflect: true }, heading: {} };
  open = false;
  heading = 'Dialog';
  private returnFocus?: HTMLElement;
  private scrollLock = new ModalScrollController(this);
  static styles = [
    baseStyles,
    css`
      dialog {
        overscroll-behavior: contain;
        border: var(--t-line-width, 1px) solid var(--t-accent);
        padding: 0;
        background: var(--t-surface);
        color: var(--t-text);
        width: min(520px, calc(100vw - 32px));
        max-height: calc(100dvh - 32px);
        box-shadow:
          var(--_t-edge-glow),
          0 24px 100px #0008;
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.72);
      }
      dialog[open] {
        display: flex;
        flex-direction: column;
      }
      header {
        flex: none;
        display: flex;
        gap: 20px;
        align-items: center;
        justify-content: space-between;
        border-bottom: var(--t-divider-width, 1px) solid var(--t-border);
        padding: 14px 20px;
        background: var(--t-raised);
      }
      h2 {
        font: inherit;
        font-size: 14px;
        margin: 0;
      }
      button {
        color: var(--t-text);
        background: transparent;
        border: 0;
        font-size: 22px;
        min-width: 32px;
        min-height: 32px;
        flex: none;
      }
      .body {
        overscroll-behavior: contain;
        min-height: 0;
        overflow: auto;
        padding: 24px;
        font-size: 13px;
      }
      footer {
        flex: none;
        padding: 0 24px 24px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: flex-end;
      }
    `,
  ];
  show(opener?: HTMLElement) {
    this.returnFocus = opener;
    this.open = true;
  }
  close() {
    this.open = false;
  }
  protected updated(_changed: PropertyValues) {
    if (!this.isConnected) return;
    const dialog = this.renderRoot.querySelector('dialog')!;
    if (this.open && !dialog.open) {
      if (!this.returnFocus) {
        let active = document.activeElement;
        while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
        if (active instanceof HTMLElement) this.returnFocus = active;
      }
      this.scrollLock.acquire();
      dialog.showModal();
    } else if (!this.open) {
      if (dialog.open) dialog.close();
      this.scrollLock.release();
    }
  }
  private onClose() {
    if (this.renderRoot.querySelector('dialog')?.open) return;
    this.scrollLock.release();
    this.open = false;
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
    this.returnFocus = undefined;
    this.emit('t-close');
  }
  render() {
    return html`<dialog
      part="dialog"
      aria-labelledby="title"
      @close=${this.onClose}
      @keydown=${(event: KeyboardEvent) => containModalTab(event, event.currentTarget as HTMLDialogElement)}
      @cancel=${() => {
        this.open = false;
      }}
    >
      <header>
        <h2 id="title">${this.heading}</h2>
        <button aria-label="Close dialog" @click=${this.close}>×</button>
      </header>
      <div class="body" part="body"><slot></slot></div>
      <footer><slot name="footer"></slot></footer>
    </dialog>`;
  }
}
customElements.define('t-dialog', TDialog);
declare global {
  interface HTMLElementTagNameMap {
    't-dialog': TDialog;
  }
}
