import { css, html, type PropertyValues } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';

/**
 * Bounded pagination. Displays the first, last, and nearby pages.
 *
 * @fires {CustomEvent<{ page: number; pageSize: number }>} t-change - User navigation: `{ page, pageSize }`.
 *
 * @csspart nav - Navigation landmark.
 *
 * @csspart button - Page and previous/next buttons.
 */
export class TPagination extends TerminalElement {
  static properties = {
    page: { type: Number },
    total: { type: Number },
    pageSize: { type: Number, attribute: 'page-size' },
    label: {},
    disabled: { type: Boolean, reflect: true },
  };
  /** Current one-based page. Invalid values are clamped. */
  page = 1;
  /** Total number of items. */
  total = 0;
  /** Items per page. Must be positive. */
  pageSize = 10;
  /** Navigation landmark name. */
  label = 'Pagination';
  /** Prevents navigation. */
  disabled = false;
  get pageCount() {
    return Math.max(
      1,
      Math.ceil(
        Math.max(0, Number.isFinite(this.total) ? this.total : 0) /
          (Number.isFinite(this.pageSize) && this.pageSize > 0 ? this.pageSize : 10),
      ),
    );
  }
  protected willUpdate(_changed: PropertyValues) {
    this.pageSize =
      Number.isFinite(this.pageSize) && this.pageSize > 0
        ? Math.max(1, Math.floor(this.pageSize))
        : 10;
    this.page = Math.min(
      this.pageCount,
      Math.max(1, Number.isFinite(this.page) ? Math.floor(this.page) : 1),
    );
  }
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--t-space-2, 8px);
      }
      button {
        color: var(--t-text);
        background: var(--t-surface);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        padding: 6px 10px;
        min-width: 36px;
        box-shadow: var(--_t-edge-glow);
      }
      [aria-current='page'] {
        color: var(--t-on-accent, var(--t-bg));
        background: var(--t-accent);
        border-color: var(--t-accent);
      }
      .status {
        color: var(--t-muted);
      }
    `,
  ];
  private select(page: number) {
    if (this.disabled || page === this.page || page < 1 || page > this.pageCount) return;
    this.page = page;
    this.emit('t-change', { page, pageSize: this.pageSize });
  }
  render() {
    const pages = [...new Set([1, this.page - 1, this.page, this.page + 1, this.pageCount])]
      .filter((page) => page >= 1 && page <= this.pageCount)
      .sort((a, b) => a - b);
    return html`<nav part="nav" aria-label=${this.label}>
      <button
        part="button"
        type="button"
        aria-label="Previous page"
        ?disabled=${this.disabled || this.page <= 1}
        @click=${() => this.select(this.page - 1)}
      >
        Previous
      </button>
      ${pages.map((page, index) => html`${index && page - pages[index - 1] > 1 ? html`<span aria-hidden="true">…</span>` : ''}<button part="button" type="button" aria-label=${`Page ${page}`} aria-current=${page === this.page ? 'page' : 'false'} ?disabled=${this.disabled} @click=${() => this.select(page)}>${page}</button>`)}
      <button
        part="button"
        type="button"
        aria-label="Next page"
        ?disabled=${this.disabled || this.page >= this.pageCount}
        @click=${() => this.select(this.page + 1)}
      >
        Next
      </button>
      <span class="status" role="status">Page ${this.page} of ${this.pageCount}</span>
    </nav>`;
  }
}
if (!customElements.get('t-pagination')) customElements.define('t-pagination', TPagination);
declare global {
  interface HTMLElementTagNameMap {
    't-pagination': TPagination;
  }
}
