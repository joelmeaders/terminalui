import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
/**
 * Compact status text. Always include a text label so meaning does not depend on color.
 * @slot - Main content.
 * @slot start - Non-interactive icon or content replacing the status dot.
 * @slot end - Non-interactive icon or content after the status text.
 * @csspart badge - badge element.
 */
export class TBadge extends TerminalElement {
  static properties = { variant: { reflect: true } };
  variant = 'neutral';
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
      }
      span {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 3px 8px;
        border: var(--t-line-width, 1px) solid currentColor;
        box-shadow: var(--_t-edge-glow);
        color: var(--t-muted);
        font-size: 10px;
        line-height: 1.4;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .dot {
        flex: none;
        width: 4px;
        height: 4px;
        background: currentColor;
      }
      :host([variant='success']) span {
        color: var(--t-success);
      }
      :host([variant='warning']) span {
        color: var(--t-warning);
      }
      :host([variant='danger']) span {
        color: var(--t-danger);
      }
      :host([variant='accent']) span {
        color: var(--t-accent);
      }
    `,
  ];
  render() {
    return html`<span part="badge"
      ><slot name="start"><i class="dot" aria-hidden="true"></i></slot><slot></slot
      ><slot name="end"></slot
    ></span>`;
  }
}
customElements.define('t-badge', TBadge);
declare global {
  interface HTMLElementTagNameMap {
    't-badge': TBadge;
  }
}
