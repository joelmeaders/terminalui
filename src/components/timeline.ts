import { css, html, nothing } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  date?: string;
  dateTime?: string;
  status?: string;
}
/** Semantic ordered history. Dates and statuses remain visible as text.
 * @csspart list - Ordered timeline.
 * @csspart item - History entry.
 */
export class TTimeline extends TerminalElement {
  static properties = {
    items: { attribute: false },
    label: {},
    emptyText: { attribute: 'empty-text' },
  };
  /** History entries, ordered by the application. IDs must be unique. */
  items: TimelineItem[] = [];
  /** Accessible list name. */
  label = 'Activity timeline';
  /** Message displayed when no entries exist. */
  emptyText = 'No activity yet.';
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      ol {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      li {
        position: relative;
        border-inline-start: var(--t-divider-width, 1px) solid var(--t-border);
        padding: 0 0 24px 24px;
        padding-inline: 24px 0;
        overflow-wrap: anywhere;
      }
      li:last-child {
        padding-bottom: 0;
      }
      li::before {
        content: '';
        position: absolute;
        inset-inline-start: -4px;
        top: 0.5em;
        width: 7px;
        height: 7px;
        background: var(--t-accent);
      }
      strong,
      time,
      .status {
        display: block;
      }
      time,
      .status,
      .empty {
        color: var(--t-muted);
      }
      p {
        margin: 8px 0 0;
      }
    `,
  ];
  render() {
    return this.items.length
      ? html`<ol part="list" aria-label=${this.label}>
          ${this.items.map(
            (item) =>
              html`<li part="item">
                <article aria-label=${item.title}>
                  <strong>${item.title}</strong
                  >${item.date || item.dateTime ? html`<time datetime=${item.dateTime ?? nothing}>${item.date ?? item.dateTime}</time>` : nothing}${item.status ? html`<span class="status">${item.status}</span>` : nothing}${item.description ? html`<p>${item.description}</p>` : nothing}
                </article>
              </li>`,
          )}
        </ol>`
      : html`<p class="empty">${this.emptyText}</p>`;
  }
}
if (!customElements.get('t-timeline')) customElements.define('t-timeline', TTimeline);
declare global {
  interface HTMLElementTagNameMap {
    't-timeline': TTimeline;
  }
}
