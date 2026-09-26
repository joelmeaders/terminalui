import { css, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { baseStyles, TerminalElement } from '../internal/base';
import { activeElement } from '../internal/floating';

/**
 * Bounded pagination. Displays the first, last, and nearby pages.
 * Numbered actions retain focus by page. Removed or disabled actions recover to the current page,
 * or the named navigation region when all actions are disabled. Outside focus remains unchanged.
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
  private focusRecovery?: { from: HTMLElement; key?: string };
  get pageCount() {
    return Math.max(
      1,
      Math.ceil(
        Math.max(0, Number.isFinite(this.total) ? this.total : 0) /
          (Number.isFinite(this.pageSize) && this.pageSize > 0 ? this.pageSize : 10),
      ),
    );
  }
  protected willUpdate() {
    const from = this.shadowRoot?.activeElement as HTMLElement | null;
    this.focusRecovery = from ? { from, key: from.dataset.page } : undefined;
    this.pageSize =
      Number.isFinite(this.pageSize) && this.pageSize > 0
        ? Math.max(1, Math.floor(this.pageSize))
        : 10;
    this.page = Math.min(
      this.pageCount,
      Math.max(1, Number.isFinite(this.page) ? Math.floor(this.page) : 1),
    );
  }
  protected updated() {
    const recovery = this.focusRecovery;
    this.focusRecovery = undefined;
    if (!this.isConnected || !recovery) return;
    const active = activeElement(this.ownerDocument);
    if (active !== recovery.from && active !== this.ownerDocument.body) return;
    const target =
      this.renderRoot.querySelector<HTMLButtonElement>(
        `button[data-page="${recovery.key}"]:not(:disabled)`,
      ) ??
      this.renderRoot.querySelector<HTMLButtonElement>(
        'button[aria-current="page"]:not(:disabled)',
      ) ??
      this.renderRoot.querySelector<HTMLElement>('nav');
    if (target && target !== active) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  }
  disconnectedCallback() {
    this.focusRecovery = undefined;
    super.disconnectedCallback();
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
    return html`<nav part="nav" aria-label=${this.label} tabindex="-1">
      <button
        part="button"
        type="button"
        data-page="previous"
        aria-label="Previous page"
        ?disabled=${this.disabled || this.page <= 1}
        @click=${() => this.select(this.page - 1)}
      >
        Previous
      </button>
      ${repeat(
        pages,
        (page) => page,
        (page, index) =>
          html`${
              index && page - pages[index - 1] > 1 ? html`<span aria-hidden="true">…</span>` : ''
            }<button
              part="button"
              type="button"
              data-page=${page}
              aria-label=${`Page ${page}`}
              aria-current=${page === this.page ? 'page' : 'false'}
              ?disabled=${this.disabled}
              @click=${() => this.select(page)}
            >
              ${page}
            </button>`,
      )}
      <button
        part="button"
        type="button"
        data-page="next"
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
