import { css, html, nothing } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
/** Inline notice. Emits t-dismiss. Set urgent only for messages that need immediate announcement. */
export class TAlert extends TerminalElement {
  static properties = {
    variant: { reflect: true },
    dismissible: { type: Boolean },
    urgent: { type: Boolean },
    dismissed: { state: true },
  };
  variant = 'info';
  dismissible = false;
  urgent = false;
  private dismissed = false;
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        --notice: var(--t-accent);
      }
      :host([variant='success']) {
        --notice: var(--t-success);
      }
      :host([variant='warning']) {
        --notice: var(--t-warning);
      }
      :host([variant='danger']) {
        --notice: var(--t-danger);
      }
      .notice {
        border: 1px solid var(--t-border);
        border-left: 3px solid var(--notice);
        padding: 14px 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: var(--t-surface);
        font-size: 12px;
      }
      .symbol {
        color: var(--notice);
        flex: none;
      }
      .content {
        flex: 1;
      }
      button {
        border: 0;
        color: var(--t-text);
        background: transparent;
        min-width: 24px;
        min-height: 24px;
        font-size: 18px;
        line-height: 1;
      }
    `,
  ];
  render() {
    return this.dismissed
      ? nothing
      : html`<div class="notice" part="notice" role=${this.urgent ? 'alert' : 'status'}>
          <span class="symbol" aria-hidden="true"
            >${this.variant === 'success' ? '✓' : this.variant === 'info' ? 'ⓘ' : '!'}</span
          >
          <div class="content"><slot></slot></div>
          ${
            this.dismissible
              ? html`<button
                  aria-label="Dismiss notice"
                  @click=${() => {
                    this.dismissed = true;
                    this.emit('t-dismiss');
                  }}
                >
                  ×
                </button>`
              : nothing
          }
        </div>`;
  }
}
customElements.define('t-alert', TAlert);
declare global {
  interface HTMLElementTagNameMap {
    't-alert': TAlert;
  }
}
