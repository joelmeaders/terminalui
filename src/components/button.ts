import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';

/**
 * An action, submit, or reset button. Submit uses a temporary native submitter.
 * @slot - Button label.
 * @slot start - Non-interactive icon or content before the label.
 * @slot end - Non-interactive icon or content after the label.
 * @csspart button - button element.
 */
export class TButton extends TerminalElement {
  static formAssociated = true;
  static properties = {
    variant: { reflect: true },
    disabled: { type: Boolean, reflect: true },
    loading: { type: Boolean, reflect: true },
    size: { reflect: true },
    type: { reflect: true },
    name: { reflect: true },
    value: {},
    fieldsetDisabled: { state: true },
  };
  variant = 'primary';
  disabled = false;
  loading = false;
  size = 'medium';
  /** Button action. Defaults to button to prevent accidental submission. */
  type: 'button' | 'submit' | 'reset' = 'button';
  /** Submitter field name and value, included only when this button submits. */
  name = '';
  value = '';
  private internals = this.attachInternals();
  private fieldsetDisabled = false;
  get form() {
    return this.internals.form;
  }
  private get isDisabled() {
    return this.disabled || this.loading || this.fieldsetDisabled;
  }
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      if (this.isDisabled) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      // Run after listeners can cancel the composed click.
      setTimeout(() => {
        if (event.defaultPrevented || this.isDisabled || !this.form) return;
        if (this.type === 'reset') this.form.reset();
        if (this.type !== 'submit') return;
        const proxy = this.ownerDocument.createElement('button');
        proxy.type = 'submit';
        proxy.name = this.name;
        proxy.value = this.value;
        proxy.hidden = true;
        const form = this.form;
        form.append(proxy);
        try {
          form.requestSubmit(proxy);
        } finally {
          proxy.remove();
        }
      }, 0);
    });
  }
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
    const button = this.renderRoot?.querySelector('button');
    if (button) button.disabled = disabled || this.loading;
    queueMicrotask(() => this.requestUpdate());
  }
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
        max-width: 100%;
      }
      button {
        max-width: 100%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: var(--t-control-height, 42px);
        padding: 9px 17px;
        border: var(--t-line-width, 1px) solid var(--t-accent);
        box-shadow: var(--_t-edge-glow);
        border-radius: 0;
        color: var(--t-on-accent);
        background: var(--t-accent);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        transition:
          filter var(--_t-motion-duration, var(--t-motion-fast, 120ms)),
          transform var(--_t-motion-duration, var(--t-motion-fast, 120ms));
      }
      button:hover:not(:disabled) {
        filter: brightness(1.12);
      }
      button:active:not(:disabled) {
        transform: var(--_t-active-transform, translateY(1px));
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
        animation: var(--_t-motion-name, spin) 0.8s linear infinite;
      }
      .label {
        min-width: 0;
        overflow-wrap: anywhere;
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
      ?disabled=${this.isDisabled}
      aria-busy=${this.loading ? 'true' : 'false'}
    >
      ${this.loading ? html`<span class="spinner" aria-hidden="true"></span>` : ''}<slot
        name="start"
      ></slot
      ><span class="label"><slot></slot></span><slot name="end"></slot>
    </button>`;
  }
}
if (!customElements.get('t-button')) customElements.define('t-button', TButton);
declare global {
  interface HTMLElementTagNameMap {
    't-button': TButton;
  }
}
