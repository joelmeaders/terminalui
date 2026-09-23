import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';

/** An action button. Use a native button for submit/reset semantics. @slot Default - Button label. */
export class TButton extends TerminalElement {
  static properties = {
    variant: { reflect: true },
    disabled: { type: Boolean, reflect: true },
    loading: { type: Boolean, reflect: true },
    size: { reflect: true },
  };
  variant = 'primary';
  disabled = false;
  loading = false;
  size = 'medium';
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
      }
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: var(--t-control-height, 42px);
        padding: 9px 17px;
        border: 1px solid var(--t-accent);
        border-radius: 0;
        color: var(--t-on-accent);
        background: var(--t-accent);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        transition: filter 0.15s;
      }
      button:hover:not(:disabled) {
        filter: brightness(1.12);
      }
      button:active:not(:disabled) {
        transform: translateY(1px);
      }
      :host([variant='secondary']) button {
        background: transparent;
        color: var(--t-accent);
      }
      :host([variant='ghost']) button {
        background: transparent;
        border-color: transparent;
        color: var(--t-text);
      }
      :host([variant='danger']) button {
        background: var(--t-danger);
        border-color: var(--t-danger);
        color: var(--t-bg);
      }
      :host([size='small']) button {
        min-height: 32px;
        padding: 5px 10px;
        font-size: 11px;
      }
      :host([size='large']) button {
        min-height: 50px;
        padding: 12px 24px;
      }
      .spinner {
        width: 12px;
        height: 12px;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ];
  focus(options?: FocusOptions) {
    this.renderRoot.querySelector('button')?.focus(options);
  }
  render() {
    return html`<button
      part="button"
      type="button"
      ?disabled=${this.disabled || this.loading}
      aria-busy=${this.loading ? 'true' : 'false'}
    >
      ${this.loading ? html`<span class="spinner" aria-hidden="true"></span>` : ''}<slot></slot>
    </button>`;
  }
}
customElements.define('t-button', TButton);
declare global {
  interface HTMLElementTagNameMap {
    't-button': TButton;
  }
}
