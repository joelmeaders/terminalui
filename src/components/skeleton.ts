import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
/** Decorative loading placeholder. Set aria-busy on the content region it represents. @csspart placeholder - Shape. */
export class TSkeleton extends TerminalElement {
  static properties = { shape: { reflect: true }, animated: { type: Boolean, reflect: true } };
  shape = 'text';
  animated = false;
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }
      span {
        display: block;
        width: var(--t-skeleton-width, 100%);
        height: var(--t-skeleton-height, 1em);
        background: var(--t-raised);
        border: var(--t-line-width, 1px) solid var(--t-border);
      }
      :host([shape='circle']) span {
        width: var(--t-skeleton-width, 48px);
        height: var(--t-skeleton-height, 48px);
        border-radius: 50%;
      }
      :host([shape='rectangle']) span {
        height: var(--t-skeleton-height, 100px);
      }
      :host([animated]) span {
        animation: pulse 1.8s ease-in-out infinite;
      }
      @keyframes pulse {
        50% {
          opacity: 0.4;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        span {
          animation: none !important;
        }
      }
    `,
  ];
  render() {
    return html`<span part="placeholder" aria-hidden="true"></span>`;
  }
}
if (!customElements.get('t-skeleton')) customElements.define('t-skeleton', TSkeleton);
declare global {
  interface HTMLElementTagNameMap {
    't-skeleton': TSkeleton;
  }
}
