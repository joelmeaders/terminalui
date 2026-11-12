import { css, html } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { baseStyles, HullframeElement } from '../internal/base';
/**
 * Auto-fitting grid. Set columns for a fixed maximum; it collapses at narrow container widths.
 * @slot - Cells.
 * @csspart layout - Grid.
 * @cssprop --t-grid-min - Minimum automatic column width, capped by the container width. Defaults to 240px. Does not apply when columns is set.
 * @cssprop --t-grid-gap - Gap between rows and columns. Defaults to --t-space (16px in comfortable density, 12px in compact).
 */
export class TGrid extends HullframeElement {
  static properties = { columns: { type: Number } };
  /** Zero selects automatic columns using --t-grid-min (default 240px). */
  columns = 0;
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
        container-type: inline-size;
      }
      .layout {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--t-grid-min, 240px)), 1fr));
        gap: var(--t-grid-gap, var(--t-space, 16px));
      }
      .fixed {
        grid-template-columns: repeat(var(--_columns), minmax(0, 1fr));
      }
      ::slotted(*) {
        min-width: 0;
      }
      @container (max-width:600px) {
        .fixed {
          grid-template-columns: 1fr;
        }
      }
    `,
  ];
  render() {
    const columns = Number.isFinite(this.columns)
      ? Math.max(0, Math.min(12, Math.floor(this.columns)))
      : 0;
    return html`<div
      class=${columns ? 'layout fixed' : 'layout'}
      part="layout"
      style=${styleMap({ '--_columns': String(columns || 1) })}
    >
      <slot></slot>
    </div>`;
  }
}
if (!customElements.get('t-grid')) customElements.define('t-grid', TGrid);
declare global {
  interface HTMLElementTagNameMap {
    't-grid': TGrid;
  }
}
