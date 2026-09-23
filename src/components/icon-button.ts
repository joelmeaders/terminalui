import { css, html, nothing } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import { type IconName } from './icon';
import './icon';
/** Named native icon button. @slot - Optional replacement icon. @csspart button - Native button. */
export class TIconButton extends TerminalElement {
  static properties = {
    name: {},
    label: {},
    disabled: { type: Boolean, reflect: true },
    pressed: { type: Boolean },
    size: { reflect: true },
  };
  name: IconName = 'settings';
  label = 'Action';
  disabled = false;
  /** Null means a regular action; true/false exposes a toggle button. */
  pressed: boolean | null = null;
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
        width: var(--t-control-height, 42px);
        height: var(--t-control-height, 42px);
        padding: 6px;
        background: var(--t-surface);
        color: var(--t-accent);
        border: var(--t-line-width, 1px) solid var(--t-border);
        box-shadow: var(--_t-edge-glow);
      }
      button:hover:not(:disabled),
      button[aria-pressed='true'] {
        background: var(--t-raised);
        border-color: var(--t-accent);
      }
      :host([size='small']) button {
        width: 32px;
        height: 32px;
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
      aria-label=${this.label}
      aria-pressed=${this.pressed === null ? nothing : String(this.pressed)}
      ?disabled=${this.disabled}
    >
      <slot><t-icon .name=${this.name}></t-icon></slot>
    </button>`;
  }
}
if (!customElements.get('t-icon-button')) customElements.define('t-icon-button', TIconButton);
declare global {
  interface HTMLElementTagNameMap {
    't-icon-button': TIconButton;
  }
}
