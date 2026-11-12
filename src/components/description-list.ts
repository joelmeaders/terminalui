import { css, html } from 'lit';
import { baseStyles, HullframeElement } from '../internal/base';

export interface DescriptionItem {
  term: string;
  value: string | number;
}
/**
 * Responsive term/value pairs with native description-list semantics.
 *
 * @slot - Additional native dt/dd pairs, optionally wrapped in div elements.
 *
 * @csspart list - Native description list.
 *
 * @csspart term - Term.
 *
 * @csspart value - Description.
 */
export class TDescriptionList extends HullframeElement {
  static properties = { items: { attribute: false } };
  /** Plain-text terms and values. Replace the array to update entries. */
  items: DescriptionItem[] = [];
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
        container-type: inline-size;
      }
      dl {
        margin: 0;
      }
      .pair {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
        gap: 8px 24px;
        padding: 12px 0;
        border-bottom: var(--t-divider-width, 1px) solid var(--t-border);
      }
      dt,
      dd {
        margin: 0;
        overflow-wrap: anywhere;
      }
      dt {
        color: var(--t-muted);
      }
      @container (max-width:400px) {
        .pair {
          grid-template-columns: 1fr;
        }
      }
      ::slotted(*) {
        margin: 0;
        overflow-wrap: anywhere;
      }
    `,
  ];
  render() {
    return html`<dl part="list">
      ${this.items.map(
        (item) =>
          html`<div class="pair">
            <dt part="term">${item.term}</dt>
            <dd part="value">${item.value}</dd>
          </div>`,
      )}<slot></slot>
    </dl>`;
  }
}
if (!customElements.get('t-description-list'))
  customElements.define('t-description-list', TDescriptionList);
declare global {
  interface HTMLElementTagNameMap {
    't-description-list': TDescriptionList;
  }
}
