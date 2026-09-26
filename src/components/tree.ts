import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { baseStyles, TerminalElement } from '../internal/base';

export interface TreeItem {
  id: string;
  label: string;
  disabled?: boolean;
  children?: TreeItem[];
}
interface VisibleItem {
  item: TreeItem;
  level: number;
  parent?: string;
  position: number;
  size: number;
}
/**
 * Single-select tree with roving focus, arrows, Home/End, typeahead, and sibling expansion.
 * Empty hierarchies use a named group. Restored items retain focus without changing selection.
 *
 * @fires {CustomEvent<{ value: string; item: TreeItem }>} t-select - Selection changed: `{ value, item }`.
 *
 * @fires {CustomEvent<{ id: string; expanded: boolean; expandedIds: string[] }>} t-toggle - Branch changed: `{ id, expanded, expandedIds }`.
 *
 * @csspart tree - Hierarchy container, including the empty group.
 *
 * @csspart item - Tree item with its optional expanded child group.
 *
 * @csspart row - Visible label, toggle, selection, and focus surface.
 *
 * @csspart group - Expanded child group owned by its parent item.
 */
export class TTree extends TerminalElement {
  static properties = {
    label: {},
    items: { attribute: false },
    value: {},
    expandedIds: { attribute: false },
    focusedId: { state: true },
  };
  /** Accessible tree name. */
  label = 'Files';
  /** Hierarchy with globally unique identifiers. Replace the array to update it. */
  items: TreeItem[] = [];
  /** Selected identifier. Selection does not follow keyboard focus. */
  value = '';
  /** Expanded branch identifiers. Replace the array for external updates. Collapsing a focused descendant restores focus to a visible ancestor. */
  expandedIds: string[] = [];
  private focusedId = '';
  private search = '';
  private searchTime = 0;
  private restoreFocus = false;
  private previousVisible: VisibleItem[] = [];
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }
      [part='tree'] {
        border: var(--t-line-width, 1px) solid var(--t-border);
        padding: var(--t-space-2, 8px);
        box-shadow: var(--_t-edge-glow);
      }
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 36px;
        padding-block: 6px;
        padding-inline-end: 12px;
        cursor: pointer;
      }
      [role='treeitem']:focus-visible {
        outline: none;
      }
      [role='treeitem']:focus-visible > .row {
        outline: 2px solid var(--t-focus);
        outline-offset: -2px;
      }
      [aria-selected='true'] > .row {
        color: var(--t-accent);
        background: var(--t-raised);
      }
      [aria-disabled='true'] > .row {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        align-self: stretch;
        flex: none;
      }
    `,
  ];
  private visible(): VisibleItem[] {
    const entries: VisibleItem[] = [];
    const visit = (items: TreeItem[], level: number, parent?: string) =>
      items.forEach((item, index) => {
        entries.push({ item, level, parent, position: index + 1, size: items.length });
        if (item.children?.length && this.expandedIds.includes(item.id))
          visit(item.children, level + 1, item.id);
      });
    visit(this.items, 1);
    return entries;
  }
  protected willUpdate(changed: PropertyValues) {
    const rows = this.visible();
    const visible = rows.filter((entry) => !entry.item.disabled);
    const hasFocus = Boolean(this.shadowRoot?.activeElement);
    this.restoreFocus = hasFocus && (changed.has('items') || changed.has('expandedIds'));
    if (!visible.some((entry) => entry.item.id === this.focusedId)) {
      const previous = this.previousVisible.find((entry) => entry.item.id === this.focusedId);
      let parent = previous?.parent;
      while (parent && !visible.some((entry) => entry.item.id === parent))
        parent = this.previousVisible.find((entry) => entry.item.id === parent)?.parent;
      const previousIndex = this.previousVisible.findIndex(
        (entry) => entry.item.id === this.focusedId,
      );
      this.focusedId = hasFocus
        ? (parent ??
          rows.slice(Math.max(0, previousIndex)).find((entry) => !entry.item.disabled)?.item.id ??
          visible.at(-1)?.item.id ??
          '')
        : (visible.find((entry) => entry.item.id === this.value)?.item.id ??
          visible[0]?.item.id ??
          '');
    }
    this.previousVisible = rows;
  }
  protected updated() {
    if (!this.restoreFocus) return;
    this.restoreFocus = false;
    (
      this.renderRoot.querySelector<HTMLElement>('[role=treeitem][tabindex="0"]') ??
      this.renderRoot.querySelector<HTMLElement>('[part=tree]')
    )?.focus();
  }
  private async focusItem(id?: string) {
    if (!id) return;
    this.focusedId = id;
    await this.updateComplete;
    [...this.renderRoot.querySelectorAll<HTMLElement>('[role=treeitem]')]
      .find((element) => element.dataset.id === id)
      ?.focus();
  }
  private toggle(item: TreeItem, expanded = !this.expandedIds.includes(item.id)) {
    if (item.disabled || !item.children?.length) return;
    this.expandedIds = expanded
      ? [...new Set([...this.expandedIds, item.id])]
      : this.expandedIds.filter((id) => id !== item.id);
    this.emit('t-toggle', { id: item.id, expanded, expandedIds: [...this.expandedIds] });
  }
  private select(item: TreeItem) {
    if (item.disabled) return;
    this.value = item.id;
    void this.focusItem(item.id);
    this.emit('t-select', { value: item.id, item });
  }
  private onKey(event: KeyboardEvent, entry: VisibleItem) {
    const visible = this.visible(),
      enabled = visible.filter((row) => !row.item.disabled),
      index = enabled.findIndex((row) => row.item.id === entry.item.id);
    let next: string | undefined;
    if (event.key === 'ArrowDown') next = enabled[Math.min(enabled.length - 1, index + 1)]?.item.id;
    else if (event.key === 'ArrowUp') next = enabled[Math.max(0, index - 1)]?.item.id;
    else if (event.key === 'Home') next = enabled[0]?.item.id;
    else if (event.key === 'End') next = enabled.at(-1)?.item.id;
    else if (event.key === 'ArrowRight') {
      if (!this.expandedIds.includes(entry.item.id)) this.toggle(entry.item, true);
      else next = enabled.find((row) => row.parent === entry.item.id)?.item.id;
    } else if (event.key === 'ArrowLeft') {
      if (this.expandedIds.includes(entry.item.id)) this.toggle(entry.item, false);
      else {
        let parent = visible.find((row) => row.item.id === entry.parent);
        while (parent?.item.disabled)
          parent = visible.find((row) => row.item.id === parent?.parent);
        next = parent?.item.id;
      }
    } else if (event.key === 'Enter' || event.key === ' ') this.select(entry.item);
    else if (event.key === '*')
      enabled
        .filter((row) => row.parent === entry.parent)
        .forEach((row) => this.toggle(row.item, true));
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      this.search = now - this.searchTime > 700 ? event.key : this.search + event.key;
      this.searchTime = now;
      const search = [...this.search].every((c) => c === this.search[0])
        ? this.search[0]
        : this.search;
      const match = [...enabled.slice(index + 1), ...enabled.slice(0, index + 1)].find((row) =>
        row.item.label.toLocaleLowerCase().startsWith(search.toLocaleLowerCase()),
      );
      next = match?.item.id;
    } else return;
    event.preventDefault();
    event.stopPropagation();
    if (next) void this.focusItem(next);
  }
  private renderItems(items: TreeItem[], level: number, parent?: string): TemplateResult {
    return html`
      ${repeat(
        items,
        (item) => item.id,
        (item, index) => {
          const entry = { item, level, parent, position: index + 1, size: items.length };
          return html`<div
            part="item"
            role="treeitem"
            aria-label=${item.label}
            data-id=${entry.item.id}
            tabindex=${entry.item.disabled ? nothing : entry.item.id === this.focusedId ? 0 : -1}
            aria-level=${entry.level}
            aria-posinset=${entry.position}
            aria-setsize=${entry.size}
            aria-expanded=${entry.item.children?.length ? String(this.expandedIds.includes(entry.item.id)) : nothing}
            aria-selected=${entry.item.id === this.value}
            aria-disabled=${Boolean(entry.item.disabled)}
            @focus=${() => {
              if (!entry.item.disabled) this.focusedId = entry.item.id;
            }}
            @keydown=${(event: KeyboardEvent) => this.onKey(event, entry)}
            @click=${(event: Event) => {
              if ((event.target as Element).closest('[role="treeitem"]') === event.currentTarget)
                this.select(item);
            }}
          >
            <div class="row" part="row" style=${`padding-inline-start: ${(level - 1) * 20}px`}>
              <span
                class="toggle"
                aria-hidden="true"
                @click=${(event: Event) => {
                  if (entry.item.children?.length) {
                    event.stopPropagation();
                    if (!entry.item.disabled) {
                      void this.focusItem(entry.item.id);
                      this.toggle(entry.item);
                    }
                  }
                }}
                >${entry.item.children?.length ? (this.expandedIds.includes(entry.item.id) ? '▾' : '▸') : '·'}</span
              ><span>${entry.item.label}</span>
            </div>
            ${
              item.children?.length && this.expandedIds.includes(item.id)
                ? html`<div role="group" part="group">
                    ${this.renderItems(item.children, level + 1, item.id)}
                  </div>`
                : nothing
            }
          </div>`;
        },
      )}
    `;
  }
  render() {
    return html`<div
      part="tree"
      role=${this.items.length ? 'tree' : 'group'}
      aria-label=${this.label}
      tabindex=${this.focusedId ? -1 : 0}
    >
      ${this.renderItems(this.items, 1)}
    </div>`;
  }
}
if (!customElements.get('t-tree')) customElements.define('t-tree', TTree);
declare global {
  interface HTMLElementTagNameMap {
    't-tree': TTree;
  }
}
