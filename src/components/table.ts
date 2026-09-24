import { css, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { baseStyles, TerminalElement } from '../internal/base';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}
export type TableRow = Record<string, unknown>;
/**
 * Native table with local sorting and optional row selection. No virtualization or cell editing.
 *
 * @fires t-sort - Sort changed: `{ key, direction }`.
 *
 * @fires t-selection-change - Selection changed: `{ selectedKeys }`.
 *
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
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
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
      button {
        color: inherit;
        background: transparent;
        border: 0;
        padding: 0;
        text-align: start;
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
    `,
  ];
  private key(row: TableRow, index: number) {
    const value = row[this.rowKey];
    return typeof value === 'string' || typeof value === 'number' ? value : index;
  }
  private sort(column: TableColumn) {
    this.sortDirection =
      this.sortKey === column.key && this.sortDirection === 'ascending'
        ? 'descending'
        : 'ascending';
    this.sortKey = column.key;
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
    const entries = this.rows.map((row, index) => ({ row, key: this.key(row, index) }));
    if (
      this.sortKey &&
      this.columns.some((column) => column.key === this.sortKey && column.sortable)
    )
      entries.sort((a, b) => {
        const left = a.row[this.sortKey],
          right = b.row[this.sortKey];
        const value =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true });
        return this.sortDirection === 'descending' ? -value : value;
      });
    const all =
      entries.length > 0 && entries.every((entry) => this.selectedKeys.includes(entry.key));
    const some = entries.some((entry) => this.selectedKeys.includes(entry.key));
    return html`<div
      class="container"
      part="container"
      tabindex="0"
      role="region"
      aria-label=${`${this.caption} table`}
    >
      <table part="table" aria-busy=${this.loading}>
        <caption>
          ${this.caption}
        </caption>
        <thead>
          <tr>
            ${this.selectable ? html`<th scope="col"><input type="checkbox" aria-label="Select all rows" .checked=${all} .indeterminate=${some && !all} ?disabled=${this.loading || !entries.length} @change=${() => this.selection(all ? this.selectedKeys.filter((key) => !entries.some((entry) => entry.key === key)) : [...new Set([...this.selectedKeys, ...entries.map((entry) => entry.key)])])} /></th>` : nothing}
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
                    <span role="status">${this.loading ? 'Loading…' : this.emptyText}</span>
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
    </div>`;
  }
}
if (!customElements.get('t-table')) customElements.define('t-table', TTable);
declare global {
  interface HTMLElementTagNameMap {
    't-table': TTable;
  }
}
