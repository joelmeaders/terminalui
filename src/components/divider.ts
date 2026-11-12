import { css, html } from 'lit';
import { baseStyles, HullframeElement } from '../internal/base';
/**
 * Themed separator.
 * @csspart line - Separator.
 * @cssprop --t-divider-width - Line thickness in either orientation. Standard lines use 1px; bold lines use 2px.
 */
export class TDivider extends HullframeElement {
  static properties = { vertical: { type: Boolean, reflect: true } };
  vertical = false;
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }
      div {
        border-top: var(--t-divider-width, 1px) solid var(--t-border);
        margin: var(--t-space, 16px) 0;
      }
      :host([vertical]) {
        display: inline-flex;
        align-self: stretch;
      }
      :host([vertical]) div {
        border-top: 0;
        border-left: var(--t-divider-width, 1px) solid var(--t-border);
        min-height: 1em;
        margin: 0 var(--t-space, 16px);
      }
    `,
  ];
  render() {
    return html`<div
      part="line"
      role="separator"
      aria-orientation=${this.vertical ? 'vertical' : 'horizontal'}
    ></div>`;
  }
}
if (!customElements.get('t-divider')) customElements.define('t-divider', TDivider);
declare global {
  interface HTMLElementTagNameMap {
    't-divider': TDivider;
  }
}
