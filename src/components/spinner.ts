import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
/** Indeterminate activity indicator with a polite status label. @csspart indicator - Animated ring. */
export class TSpinner extends TerminalElement {
  static properties = { label: {}, size: { reflect: true } };
  label = 'Loading';
  size = 'medium';
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
      }
      .ring {
        display: block;
        width: 24px;
        height: 24px;
        border: var(--t-selection-width, 2px) solid var(--t-border);
        border-top-color: var(--t-accent);
        border-radius: 50%;
        animation: rotate 900ms linear infinite;
      }
      :host([size='small']) .ring {
        width: 16px;
        height: 16px;
      }
      :host([size='large']) .ring {
        width: 40px;
        height: 40px;
      }
      @keyframes rotate {
        to {
          transform: rotate(360deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .ring {
          animation: none;
        }
      }
    `,
  ];
  render() {
    return html`<span role="status"
      ><span class="ring" part="indicator" aria-hidden="true"></span
      ><span class="visually-hidden">${this.label}</span></span
    >`;
  }
}
if (!customElements.get('t-spinner')) customElements.define('t-spinner', TSpinner);
declare global {
  interface HTMLElementTagNameMap {
    't-spinner': TSpinner;
  }
}
