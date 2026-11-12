import { css, html, nothing, type PropertyValues } from 'lit';
import { baseStyles, HullframeElement } from '../internal/base';
import { parseDate } from '../internal/date';
import { activeElement, recoverFocus } from '../internal/floating';
const isoDate = (date: Date) =>
  `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
const isoMonth = (date: Date) => isoDate(date).slice(0, 7);
const firstOfMonth = (date: Date) => {
  const first = new Date(date);
  first.setUTCDate(1);
  return first;
};
function addDays(date: Date, count: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + count);
  return next;
}
function addMonths(date: Date, count: number) {
  const first = firstOfMonth(date);
  first.setUTCMonth(first.getUTCMonth() + count);
  const lastDay = addDays(addMonthsFirst(first, 1), -1).getUTCDate();
  first.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return first;
}
function addMonthsFirst(date: Date, count: number) {
  const next = firstOfMonth(date);
  next.setUTCMonth(next.getUTCMonth() + count);
  return next;
}
const today = () => {
  const now = new Date();
  return parseDate(
    `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  )!;
};

/**
 * Inline calendar for selecting one ISO date. Use a form control for native date entry and submission.
 * The seven-column grid has one day in the tab order. Arrow, Home/End, and Page keys move that focus.
 * Range mode marks the days between rangeStart and rangeEnd. Selection events still report one chosen day.
 *
 * @fires input - User selected a date. Read `event.target.value`.
 * @fires change - User selected a date. Read `event.target.value`.
 * @fires {CustomEvent<{ value: string }>} t-change - User selected a date: `{ value }`.
 * @fires {CustomEvent<{ month: string }>} t-month-change - User changed the displayed month: `{ month }`.
 *
 * @csspart calendar - Calendar surface.
 * @csspart previous - Previous-month button.
 * @csspart next - Next-month button.
 * @csspart grid - Scrollable calendar grid.
 * @csspart day - Day button.
 */
export class TCalendar extends HullframeElement {
  static properties = {
    label: {},
    value: {},
    month: {},
    min: {},
    max: {},
    locale: {},
    firstDayOfWeek: { type: Number, attribute: 'first-day-of-week' },
    disabled: { type: Boolean, reflect: true },
    range: { type: Boolean, reflect: true },
    rangeStart: { attribute: 'range-start' },
    rangeEnd: { attribute: 'range-end' },
    focusedDate: { state: true },
  };
  /** Accessible name for the calendar group. */
  label = 'Calendar';
  /** Selected date in YYYY-MM-DD form. Empty means no selection. */
  value = '';
  /** Displayed month in YYYY-MM form. An empty value follows the selected date or today. */
  month = '';
  /** Earliest selectable date in YYYY-MM-DD form. */
  min = '';
  /** Latest selectable date in YYYY-MM-DD form. */
  max = '';
  /** Language tag for month, weekday, and date names. Empty inherits the page language. */
  locale = '';
  /** First column of the week: 0 for Sunday through 6 for Saturday. */
  firstDayOfWeek = 0;
  /** Prevents date selection and month navigation. */
  disabled = false;
  /** Mark a range while retaining one-day selection events. */
  range = false;
  /** First marked day in range mode. */
  rangeStart = '';
  /** Last marked day in range mode. */
  rangeEnd = '';
  private focusedDate = '';

  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      .calendar {
        min-width: 0;
        padding: var(--t-space, 16px);
        border: var(--t-line-width, 1px) solid var(--t-border);
        background: var(--t-surface);
        box-shadow: var(--_t-edge-glow);
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      h2 {
        margin: 0;
        font-size: 1em;
        text-align: center;
        overflow-wrap: anywhere;
      }
      .header button {
        min-width: 36px;
        min-height: 36px;
        flex: none;
        padding: 4px;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        background: var(--t-bg);
        color: var(--t-text);
      }
      .grid-scroll {
        max-width: 100%;
        overflow-x: auto;
        margin-top: var(--t-space, 16px);
      }
      .empty {
        color: var(--t-muted);
        margin: var(--t-space, 16px) 0 0;
      }
      table {
        width: max-content;
        min-width: max(100%, 280px);
        table-layout: auto;
        border-collapse: collapse;
        text-align: center;
      }
      th {
        color: var(--t-muted);
        font-weight: 600;
        padding: 4px 6px;
        white-space: nowrap;
      }
      td {
        padding: 2px;
      }
      td button {
        width: 100%;
        min-width: 36px;
        min-height: 36px;
        padding: 4px;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        background: transparent;
        color: var(--t-text);
        white-space: nowrap;
      }
      td[data-outside] button {
        color: var(--t-muted);
      }
      td[aria-selected='true'] button {
        border-color: var(--t-accent);
        background: var(--t-accent);
        color: var(--t-on-accent);
        font-weight: 700;
      }
      td[data-range-between] button {
        background: var(--t-raised);
        color: var(--t-text);
      }
      td button[aria-current='date']:not(:disabled) {
        text-decoration: underline;
        text-decoration-thickness: 2px;
        text-underline-offset: 3px;
      }
      .header button:hover:not(:disabled),
      td:not([aria-selected='true']) button:hover:not(:disabled) {
        border-color: var(--t-control-border, var(--t-border));
        background: var(--t-raised);
      }
      td button:focus-visible,
      .header button:focus-visible {
        outline: 2px solid var(--t-focus);
        outline-offset: 2px;
      }
      @media (forced-colors: active) {
        .header button,
        td button:focus-visible,
        td[aria-selected='true'] button {
          border-color: ButtonText;
        }
        td[aria-selected='true'] button {
          background: Highlight;
          color: HighlightText;
        }
        td[data-range-between] button {
          background: Canvas;
          color: CanvasText;
          border-color: Highlight;
        }
      }
    `,
  ];

  protected willUpdate(changed: PropertyValues) {
    if (changed.has('value')) {
      const selected = parseDate(this.value);
      if (selected && (!changed.has('month') || !this.month)) this.month = isoMonth(selected);
      if (selected) this.focusedDate = this.value;
    }
    const requested =
      parseDate(`${this.month}-01`) ?? firstOfMonth(parseDate(this.value) ?? today());
    const { min, max } = this.bounds();
    const first =
      min && addDays(addMonthsFirst(requested, 1), -1) < min
        ? firstOfMonth(min)
        : max && requested > max
          ? firstOfMonth(max)
          : requested;
    this.month = isoMonth(first);
  }
  private viewMonth() {
    return parseDate(`${this.month}-01`) ?? firstOfMonth(parseDate(this.value) ?? today());
  }
  private language() {
    const requested =
      this.locale ||
      this.lang ||
      this.closest('[lang]')?.getAttribute('lang') ||
      document.documentElement.lang ||
      navigator.language ||
      'en-US';
    try {
      return Intl.getCanonicalLocales(requested)[0] || 'en-US';
    } catch {
      return 'en-US';
    }
  }
  private bounds() {
    return { min: parseDate(this.min), max: parseDate(this.max) };
  }
  private allowed(date: Date) {
    const { min, max } = this.bounds();
    return (
      date.getUTCFullYear() > 0 &&
      date.getUTCFullYear() <= 9999 &&
      !this.disabled &&
      (!min || date >= min) &&
      (!max || date <= max)
    );
  }
  private availableMonth(month: Date) {
    if (this.disabled || month.getUTCFullYear() < 1 || month.getUTCFullYear() > 9999) return false;
    const { min, max } = this.bounds();
    const last = addDays(addMonthsFirst(month, 1), -1);
    return (!min || min <= last) && (!max || max >= month);
  }
  private tabStop(month: Date, days: Date[]) {
    const requested = parseDate(this.focusedDate) ?? parseDate(this.value) ?? today();
    const sameMonth =
      requested.getUTCFullYear() === month.getUTCFullYear() &&
      requested.getUTCMonth() === month.getUTCMonth();
    if (sameMonth && this.allowed(requested)) return isoDate(requested);
    const candidate = addMonths(month, 0);
    candidate.setUTCDate(
      Math.min(requested.getUTCDate(), addDays(addMonthsFirst(month, 1), -1).getUTCDate()),
    );
    if (this.allowed(candidate)) return isoDate(candidate);
    return isoDate(days.find((day) => this.allowed(day)) ?? requested);
  }
  private focusDay(value: string, from: HTMLElement | undefined) {
    void this.updateComplete.then(() => {
      if (value !== this.focusedDate) return;
      const button = this.renderRoot.querySelector<HTMLButtonElement>(
        `button[data-date="${value}"]`,
      );
      recoverFocus(from, button);
    });
  }
  /** Focus the current keyboard day when the calendar is opened from another control. */
  focus(options?: FocusOptions) {
    const button = this.renderRoot.querySelector<HTMLButtonElement>(
      'button[data-date][tabindex="0"]',
    );
    button?.focus(options);
    button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  private showMonth(value: string) {
    if (value === isoMonth(this.viewMonth())) return;
    this.month = value;
    this.emit('t-month-change', { month: value });
  }
  private moveFocus(date: Date) {
    const { min, max } = this.bounds();
    if (min && date < min) date = min;
    if (max && date > max) date = max;
    if (!this.allowed(date)) return;
    const from = activeElement(this.ownerDocument);
    this.focusedDate = isoDate(date);
    this.showMonth(isoMonth(date));
    this.focusDay(this.focusedDate, from);
  }
  private navigate(count: number) {
    const next = addMonthsFirst(this.viewMonth(), count);
    if (!this.availableMonth(next)) return;
    const previous = parseDate(this.focusedDate) ?? parseDate(this.value) ?? today();
    const candidate = new Date(next);
    candidate.setUTCDate(
      Math.min(previous.getUTCDate(), addDays(addMonthsFirst(next, 1), -1).getUTCDate()),
    );
    const { min, max } = this.bounds();
    this.focusedDate = isoDate(
      min && candidate < min ? min : max && candidate > max ? max : candidate,
    );
    this.showMonth(isoMonth(next));
  }
  private onDayKeydown(event: KeyboardEvent, date: Date) {
    const weekStart =
      Number.isInteger(this.firstDayOfWeek) && this.firstDayOfWeek >= 0 && this.firstDayOfWeek <= 6
        ? this.firstDayOfWeek
        : 0;
    const rtl = getComputedStyle(this).direction === 'rtl';
    let target: Date | null = null;
    switch (event.key) {
      case 'ArrowLeft':
        target = addDays(date, rtl ? 1 : -1);
        break;
      case 'ArrowRight':
        target = addDays(date, rtl ? -1 : 1);
        break;
      case 'ArrowUp':
        target = addDays(date, -7);
        break;
      case 'ArrowDown':
        target = addDays(date, 7);
        break;
      case 'Home':
        target = addDays(date, -((date.getUTCDay() - weekStart + 7) % 7));
        break;
      case 'End':
        target = addDays(date, 6 - ((date.getUTCDay() - weekStart + 7) % 7));
        break;
      case 'PageUp':
        target = addMonths(date, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        target = addMonths(date, event.shiftKey ? 12 : 1);
        break;
    }
    if (!target) return;
    event.preventDefault();
    this.moveFocus(target);
  }
  private select(date: Date) {
    if (!this.allowed(date)) return;
    const value = isoDate(date);
    if (value === this.value && !this.range) return;
    const from = activeElement(this.ownerDocument);
    this.value = value;
    this.focusedDate = this.value;
    this.showMonth(isoMonth(date));
    this.focusDay(this.value, from);
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    this.emit('t-change', { value: this.value });
  }
  render() {
    const month = this.viewMonth();
    const { min, max } = this.bounds();
    const invalidRange = !!(min && max && min > max);
    const selected = this.value ? parseDate(this.value) : null;
    const rangeStart = this.range ? parseDate(this.rangeStart) : null;
    const rangeEnd = this.range ? parseDate(this.rangeEnd) : null;
    const status = invalidRange
      ? 'No dates are available in this range.'
      : this.value && !selected
        ? 'The selected date is invalid. Use YYYY-MM-DD.'
        : selected && ((min && selected < min) || (max && selected > max))
          ? `The selected date ${this.value} is outside the available range.`
          : '';
    const monthName = new Intl.DateTimeFormat(this.language(), {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(month);
    const weekStart =
      Number.isInteger(this.firstDayOfWeek) && this.firstDayOfWeek >= 0 && this.firstDayOfWeek <= 6
        ? this.firstDayOfWeek
        : 0;
    const offset = (month.getUTCDay() - weekStart + 7) % 7;
    const start = addDays(month, -offset);
    const days = Array.from({ length: 42 }, (_, index) => addDays(start, index));
    const tabStop = this.tabStop(month, days);
    const dateName = new Intl.DateTimeFormat(this.language(), {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const weekdayName = new Intl.DateTimeFormat(this.language(), {
      weekday: 'long',
      timeZone: 'UTC',
    });
    const weekdayShort = new Intl.DateTimeFormat(this.language(), {
      weekday: 'short',
      timeZone: 'UTC',
    });
    const current = isoDate(today());
    return html`<section
      class="calendar"
      part="calendar"
      role="group"
      aria-label=${this.label}
      aria-describedby=${status ? 'calendar-status' : nothing}
    >
      <div class="header">
        <button
          type="button"
          part="previous"
          aria-label="Previous month"
          ?disabled=${!this.availableMonth(addMonthsFirst(month, -1))}
          @click=${() => this.navigate(-1)}
        >
          ←
        </button>
        <h2 id="month-heading" aria-live="polite">${monthName}</h2>
        <button
          type="button"
          part="next"
          aria-label="Next month"
          ?disabled=${!this.availableMonth(addMonthsFirst(month, 1))}
          @click=${() => this.navigate(1)}
        >
          →
        </button>
      </div>
      <div class="grid-scroll" part="grid">
        <table role="grid" aria-labelledby="month-heading">
          <thead>
            <tr>
              ${Array.from({ length: 7 }, (_, index) => {
                const day = addDays(parseDate('2024-01-07')!, (weekStart + index) % 7);
                return html`<th scope="col" abbr=${weekdayName.format(day)}>
                  ${weekdayShort.format(day)}
                </th>`;
              })}
            </tr>
          </thead>
          <tbody>
            ${Array.from(
              { length: 6 },
              (_, week) =>
                html`<tr>
                  ${days.slice(week * 7, week * 7 + 7).map((date) => {
                    const value = isoDate(date);
                    const first = !!rangeStart && value === this.rangeStart;
                    const last = !!rangeEnd && value === this.rangeEnd;
                    const between = !!(
                      rangeStart &&
                      rangeEnd &&
                      date > rangeStart &&
                      date < rangeEnd
                    );
                    const selected = this.range ? first || last || between : this.value === value;
                    const rangeLabel =
                      first && last
                        ? ', start and end of range'
                        : first
                          ? ', start of range'
                          : last
                            ? ', end of range'
                            : between
                              ? ', in selected range'
                              : '';
                    const outside = isoMonth(date) !== isoMonth(month);
                    return html`<td
                      ?data-outside=${outside}
                      ?data-range-start=${first}
                      ?data-range-end=${last}
                      ?data-range-between=${between}
                      aria-selected=${selected ? 'true' : nothing}
                      aria-disabled=${this.allowed(date) ? nothing : 'true'}
                    >
                      <button
                        type="button"
                        part="day"
                        data-date=${value}
                        aria-label=${`${dateName.format(date)}${rangeLabel}`}
                        aria-current=${value === current ? 'date' : nothing}
                        tabindex=${value === tabStop && this.allowed(date) ? 0 : -1}
                        ?disabled=${!this.allowed(date)}
                        @focus=${() => {
                          this.focusedDate = value;
                        }}
                        @keydown=${(event: KeyboardEvent) => this.onDayKeydown(event, date)}
                        @click=${() => this.select(date)}
                      >
                        ${date.getUTCDate()}
                      </button>
                    </td>`;
                  })}
                </tr>`,
            )}
          </tbody>
        </table>
      </div>
      ${status ? html`<p class="empty" id="calendar-status" role="status">${status}</p>` : nothing}
    </section>`;
  }
}
if (!customElements.get('t-calendar')) customElements.define('t-calendar', TCalendar);
declare global {
  interface HTMLElementTagNameMap {
    't-calendar': TCalendar;
  }
}
