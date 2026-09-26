import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { baseStyles, TerminalElement } from '../internal/base';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}
export type TableRow = Record<string, unknown>;
/**
 * Native table with local filtering, sorting, paging, and optional row selection.
 * No virtualization or cell editing.
 *
 * @fires {CustomEvent<{ query: string }>} t-filter - User changed the local query: `{ query }`.
 * @fires {CustomEvent<{ key: string; direction: 'ascending' | 'descending' }>} t-sort - Sort changed: `{ key, direction }`.
 * @fires {CustomEvent<{ page: number; pageSize: number }>} t-page-change - User changed the one-based page: `{ page, pageSize }`.
 *
 * @fires {CustomEvent<{ selectedKeys: (string | number)[] }>} t-selection-change - Selection changed: `{ selectedKeys }`.
 *
 * @csspart filter - Optional labeled search field.
 * @csspart pagination - Page navigation landmark.
 * @csspart container - Horizontal scroll container.
 *
 * @csspart table - Native table.
 *
 * @csspart row - Body row.
 */
export class TTable extends TerminalElement {
  static properties = {
    caption: {},
    columns: { attribute: false },
    rows: { attribute: false },
    rowKey: { attribute: 'row-key' },
    sortKey: { attribute: 'sort-key' },
    sortDirection: { attribute: 'sort-direction' },
    selectable: { type: Boolean },
    selectedKeys: { attribute: false },
    loading: { type: Boolean },
    emptyText: { attribute: 'empty-text' },
    noResultsText: { attribute: 'no-results-text' },
    filterable: { type: Boolean },
    query: {},
    page: { type: Number },
    pageSize: { type: Number, attribute: 'page-size' },
    statusText: { state: true },
  };
  /** Visible table caption and accessible name. */
  caption = 'Data';
  /** Column definitions. Keys read plain-text row values. */
  columns: TableColumn[] = [];
  /** Row objects. Replace the array to update it. */
  rows: TableRow[] = [];
  /** Field with a unique string or number identifier. Missing identifiers use the source index. */
  rowKey = 'id';
  /** Locally sorted column key. Empty means source order. */
  sortKey = '';
  /** Local sort direction. */
  sortDirection: 'ascending' | 'descending' = 'ascending';
  /** Adds native row selection checkboxes. */
  selectable = false;
  /** Selected identifiers. Replace the array for external updates. */
  selectedKeys: (string | number)[] = [];
  /** Displays the loading state instead of rows. */
  loading = false;
  /** Empty state message. */
  emptyText = 'No records.';
  /** Message shown when a query matches no rows. */
  noResultsText = 'No matching records.';
  /** Show the local filter field. Query also works when this is false. */
  filterable = false;
  /** Case-insensitive text search across visible columns. */
  query = '';
  /** One-based page of locally filtered and sorted rows. */
  page = 1;
  /** Rows per page. Zero disables paging. */
  pageSize = 0;
  private statusText = '';
  private statusTimer?: ReturnType<typeof setTimeout>;
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      .tools {
        display: flex;
        flex-wrap: wrap;
        align-items: end;
        gap: var(--t-space-3, 12px);
        margin-bottom: var(--t-space-3, 12px);
      }
      .tools label {
        display: grid;
        gap: 4px;
        flex: 1 1 220px;
        min-width: 0;
      }
      .tools input {
        width: 100%;
        min-height: var(--t-control-height, 42px);
        padding: 8px 10px;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        background: var(--t-bg);
        color: var(--t-text);
        box-shadow: var(--_t-edge-glow);
      }
      .count {
        color: var(--t-muted);
      }
      .container {
        overflow-x: auto;
        border: var(--t-line-width, 1px) solid var(--t-border);
        box-shadow: var(--_t-edge-glow);
      }
      table {
        border-collapse: collapse;
        width: 100%;
        text-align: start;
      }
      caption {
        padding: var(--t-space-3, 12px);
        text-align: start;
        color: var(--t-accent);
      }
      th,
      td {
        padding: var(--t-space-3, 12px);
        border-top: var(--t-divider-width, 1px) solid var(--t-border);
        text-align: start;
      }
      th {
        background: var(--t-raised);
        font-weight: 600;
      }
      th button {
        color: inherit;
        background: transparent;
        border: 0;
        min-width: 24px;
        min-height: 24px;
        padding: 4px;
        text-align: start;
      }
      .pagination {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--t-space-2, 8px);
        margin-top: var(--t-space-3, 12px);
      }
      .pagination button {
        min-width: 36px;
        min-height: 36px;
        padding: 6px 10px;
        color: var(--t-text);
        background: var(--t-surface);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        box-shadow: var(--_t-edge-glow);
      }
      .pagination .status {
        color: var(--t-muted);
      }
      tr[data-selected] {
        background: var(--t-raised);
      }
      input {
        accent-color: var(--t-accent);
        width: 18px;
        height: 18px;
      }
      .message {
        color: var(--t-muted);
        text-align: center;
        padding: 24px;
      }
      @media (forced-colors: active) {
        .tools input,
        .pagination button {
          border-color: ButtonText;
        }
      }
    `,
  ];
  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.statusTimer);
  }
  protected willUpdate(changed: PropertyValues) {
    this.pageSize =
      Number.isFinite(this.pageSize) && this.pageSize > 0
        ? Math.max(1, Math.floor(this.pageSize))
        : 0;
    if (this.hasUpdated && changed.has('query')) this.page = 1;
    const count = this.filteredEntries().length;
    const pages = this.pageSize ? Math.max(1, Math.ceil(count / this.pageSize)) : 1;
    this.page = Math.min(
      pages,
      Math.max(1, Number.isFinite(this.page) ? Math.floor(this.page) : 1),
    );
  }
  private key(row: TableRow, index: number) {
    const value = row[this.rowKey];
    return typeof value === 'string' || typeof value === 'number' ? value : index;
  }
  private filteredEntries() {
    const query = this.query.trim().toLocaleLowerCase();
    return this.rows
      .map((row, index) => ({ row, key: this.key(row, index) }))
      .filter(
        (entry) =>
          !query ||
          this.columns.some((column) =>
            String(entry.row[column.key] ?? '')
              .toLocaleLowerCase()
              .includes(query),
          ),
      );
  }
  private changePage(page: number, count: number) {
    const pages = Math.max(1, Math.ceil(count / this.pageSize));
    if (this.loading || page < 1 || page > pages || page === this.page) return;
    this.page = page;
    this.announce(`Page ${page} of ${pages}.`);
    this.emit('t-page-change', { page, pageSize: this.pageSize });
  }
  private announce(message: string, delay = 0) {
    clearTimeout(this.statusTimer);
    if (!delay) {
      this.statusText = message;
      return;
    }
    this.statusText = '';
    this.statusTimer = setTimeout(() => {
      this.statusText = message;
    }, delay);
  }
  private sort(column: TableColumn) {
    this.sortDirection =
      this.sortKey === column.key && this.sortDirection === 'ascending'
        ? 'descending'
        : 'ascending';
    this.sortKey = column.key;
    this.announce(`Sorted by ${column.label}, ${this.sortDirection}.`);
    this.emit('t-sort', { key: this.sortKey, direction: this.sortDirection });
  }
  private selection(keys: (string | number)[]) {
    this.selectedKeys = keys;
    this.emit('t-selection-change', { selectedKeys: [...keys] });
  }
  private toggle(key: string | number) {
    this.selection(
      this.selectedKeys.includes(key)
        ? this.selectedKeys.filter((value) => value !== key)
        : [...this.selectedKeys, key],
    );
  }
  render() {
    const filtered = this.filteredEntries();
    if (
      this.sortKey &&
      this.columns.some((column) => column.key === this.sortKey && column.sortable)
    )
      filtered.sort((a, b) => {
        const left = a.row[this.sortKey],
          right = b.row[this.sortKey];
        const value =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true });
        return this.sortDirection === 'descending' ? -value : value;
      });
    const pageCount = this.pageSize ? Math.max(1, Math.ceil(filtered.length / this.pageSize)) : 1;
    const entries = this.pageSize
      ? filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize)
      : filtered;
    const all =
      entries.length > 0 && entries.every((entry) => this.selectedKeys.includes(entry.key));
    const some = entries.some((entry) => this.selectedKeys.includes(entry.key));
    return html`${
        this.filterable
          ? html`<div class="tools">
              <label for="filter"
                >Filter ${this.caption}<input
                  id="filter"
                  part="filter"
                  type="search"
                  aria-controls="records"
                  .value=${this.query}
                  ?disabled=${this.loading}
                  @input=${(event: Event) => {
                    event.stopPropagation();
                    this.query = (event.target as HTMLInputElement).value;
                    const count = this.filteredEntries().length;
                    this.announce(
                      count ? `${count} matching ${count === 1 ? 'record' : 'records'}.` : '',
                      count ? 250 : 0,
                    );
                    this.emit('t-filter', { query: this.query });
                  }}
                  @change=${(event: Event) => event.stopPropagation()}
              /></label>
              <span class="count">${filtered.length} of ${this.rows.length} records</span>
            </div>`
          : nothing
      }
      <div
        class="container"
        part="container"
        tabindex="0"
        role="region"
        aria-label=${`${this.caption} table`}
      >
        <table id="records" part="table" aria-busy=${this.loading}>
          <caption>
            ${this.caption}
          </caption>
          <thead>
            <tr>
              ${this.selectable ? html`<th scope="col"><input type="checkbox" aria-label=${this.query || this.pageSize ? 'Select all visible rows' : 'Select all rows'} .checked=${all} .indeterminate=${some && !all} ?disabled=${this.loading || !entries.length} @change=${() => this.selection(all ? this.selectedKeys.filter((key) => !entries.some((entry) => entry.key === key)) : [...new Set([...this.selectedKeys, ...entries.map((entry) => entry.key)])])} /></th>` : nothing}
              ${this.columns.map((column) => html`<th scope="col" aria-sort=${column.sortable ? (this.sortKey === column.key ? this.sortDirection : 'none') : nothing}>${column.sortable ? html`<button type="button" aria-label=${`Sort by ${column.label}`} @click=${() => this.sort(column)}>${column.label} <span aria-hidden="true">${this.sortKey === column.key ? (this.sortDirection === 'ascending' ? '↑' : '↓') : '↕'}</span></button>` : column.label}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${
              this.loading || !entries.length
                ? html`<tr>
                    <td
                      class="message"
                      colspan=${Math.max(1, this.columns.length + Number(this.selectable))}
                    >
                      <span role="status"
                        >${this.loading ? 'Loading…' : this.query && this.rows.length ? this.noResultsText : this.emptyText}</span
                      >
                    </td>
                  </tr>`
                : repeat(
                    entries,
                    (entry) => entry.key,
                    (entry) =>
                      html`<tr part="row" ?data-selected=${this.selectedKeys.includes(entry.key)}>
                        ${this.selectable ? html`<td><input type="checkbox" aria-label=${`Select row ${entry.key}`} .checked=${this.selectedKeys.includes(entry.key)} @change=${() => this.toggle(entry.key)} /></td>` : nothing}
                        ${this.columns.map((column) => html`<td>${String(entry.row[column.key] ?? '')}</td>`)}
                      </tr>`,
                  )
            }
          </tbody>
        </table>
      </div>
      ${
        this.pageSize
          ? html`<nav class="pagination" part="pagination" aria-label=${`${this.caption} pages`}>
              <button
                type="button"
                aria-label=${`Previous page for ${this.caption}`}
                ?disabled=${this.loading || this.page === 1}
                @click=${() => this.changePage(this.page - 1, filtered.length)}
              >
                Previous
              </button>
              <button
                type="button"
                aria-label=${`Next page for ${this.caption}`}
                ?disabled=${this.loading || this.page === pageCount}
                @click=${() => this.changePage(this.page + 1, filtered.length)}
              >
                Next
              </button>
              <span class="status">Page ${this.page} of ${pageCount}</span>
            </nav>`
          : nothing
      }${
        this.loading || !entries.length
          ? nothing
          : html`<span class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"
              >${this.statusText}</span
            >`
      }`;
  }
}
if (!customElements.get('t-table')) customElements.define('t-table', TTable);
declare global {
  interface HTMLElementTagNameMap {
    't-table': TTable;
  }
}
