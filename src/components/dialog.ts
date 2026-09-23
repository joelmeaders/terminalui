import { css, html, type PropertyValues } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import { containModalTab } from '../internal/modal-focus';
/** Modal native dialog with Escape and focus return. Emits t-close. @slot - Body. @slot footer - Actions. */
export class TDialog extends TerminalElement {
  static properties = { open: { type: Boolean, reflect: true }, heading: {} };
  open = false;
  heading = 'Dialog';
  private returnFocus?: HTMLElement;
  static styles = [
    baseStyles,
    css`
      dialog {
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
      header {
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
        width: 32px;
        height: 32px;
      }
      .body {
        padding: 24px;
        font-size: 13px;
      }
      footer {
        padding: 0 24px 24px;
        display: flex;
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
      <div class="body"><slot></slot></div>
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
