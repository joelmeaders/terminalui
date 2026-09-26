import { css, html, nothing, type PropertyValues } from 'lit';
import { FormControl, fieldStyles } from '../internal/form-control';
import { parseDate } from '../internal/date';
import { submitOnEnter } from '../internal/implicit-submit';
import './calendar';
import './dialog';
import type { TCalendar } from './calendar';
import type { TDialog } from './dialog';

type RangeIssue = { field: 'start' | 'end' | 'both'; message: string; flags: ValidityStateFlags };

/**
 * Form-associated ISO date range. The value is `start/end`, with each date in YYYY-MM-DD form.
 * The calendar keeps a draft until both dates are selected; closing it cancels the draft.
 *
 * @slot trigger-icon - Decorative icon before the calendar button label.
 * @fires input - A user edited a date or completed a calendar selection. Read `event.target.value`.
 * @fires change - A user committed a typed date or completed a calendar selection.
 * @fires {CustomEvent<{ start: string; end: string; value: string }>} t-change - A calendar selection completed: `{ start, end, value }`.
 * @fires {CustomEvent<null>} t-close - The calendar dialog closed.
 * @csspart fields - Paired text fields.
 * @csspart start-input - Native start-date text field.
 * @csspart end-input - Native end-date text field.
 * @csspart trigger - Button that opens the calendar dialog.
 */
export class TDateRangePicker extends FormControl {
  static properties = {
    start: {},
    end: {},
    min: {},
    max: {},
    locale: {},
    firstDayOfWeek: { type: Number, attribute: 'first-day-of-week' },
    readonly: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    draftStart: { state: true },
    draftEnd: { state: true },
    choosingEnd: { state: true },
  };
  /** First date in YYYY-MM-DD form. */
  start = '';
  /** Last date in YYYY-MM-DD form. */
  end = '';
  /** Earliest allowed date. */
  min = '';
  /** Latest allowed date. */
  max = '';
  /** Language for the calendar's month, weekdays, and date names. */
  locale = '';
  /** First calendar weekday: 0 for Sunday through 6 for Saturday. */
  firstDayOfWeek = 0;
  /** Keep the submitted range without allowing edits. */
  readonly = false;
  /** Whether the calendar dialog is open. Use show() or close() to change it. */
  open = false;
  label = 'Date range';
  private serialized = '';
  private entryError = '';
  private draftStart = '';
  private draftEnd = '';
  private choosingEnd = false;

  static styles = [
    fieldStyles,
    css`
      fieldset {
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
      }
      legend {
        padding: 0;
        margin-bottom: 8px;
        color: var(--t-text);
        font-size: 12px;
      }
      .fields {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: var(--t-space, 16px);
      }
      .fields label {
        min-width: 0;
      }
      .fields .label {
        margin-bottom: 4px;
      }
      input {
        min-width: 0;
      }
      .trigger {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: var(--t-control-height, 42px);
        margin-top: 10px;
        padding: 8px 12px;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        background: var(--t-bg);
        color: var(--t-text);
        box-shadow: var(--_t-edge-glow);
      }
      .trigger:focus-visible {
        outline: 2px solid var(--t-focus);
        outline-offset: 2px;
      }
      .format {
        margin: 7px 0 0;
        color: var(--t-muted);
        font-size: 11px;
      }
      .instruction {
        margin: 0 0 12px;
        color: var(--t-text);
      }
      @media (max-width: 400px) {
        .fields {
          grid-template-columns: minmax(0, 1fr);
        }
        t-dialog::part(dialog) {
          width: calc(100vw - 16px);
          max-width: calc(100vw - 16px);
        }
        t-dialog::part(body) {
          padding: 0;
        }
        t-calendar::part(calendar) {
          padding: 8px;
        }
      }
      @media (forced-colors: active) {
        .trigger {
          border-color: ButtonText;
        }
      }
    `,
  ];

  private get startInput() {
    return this.renderRoot.querySelector<HTMLInputElement>('#start');
  }
  private get endInput() {
    return this.renderRoot.querySelector<HTMLInputElement>('#end');
  }
  private get dialog() {
    return this.renderRoot.querySelector<TDialog>('t-dialog');
  }
  private get calendar() {
    return this.renderRoot.querySelector<TCalendar>('t-calendar');
  }
  private serialize() {
    return this.start || this.end ? `${this.start}/${this.end}` : '';
  }
  private readValue(value: string) {
    const dates = value ? value.split('/') : ['', ''];
    this.serialized = value;
    this.start = dates.length === 2 ? dates[0] : '';
    this.end = dates.length === 2 ? dates[1] : '';
    this.entryError = dates.length === 2 ? '' : 'Enter a range as YYYY-MM-DD/YYYY-MM-DD.';
    if (this.entryError) this.invalid = true;
  }
  protected willUpdate(changed: PropertyValues) {
    if (changed.has('value')) {
      if (this.value !== this.serialized) this.readValue(this.value);
    } else if (changed.has('start') || changed.has('end')) {
      this.value = this.serialized = this.serialize();
      this.entryError = '';
    }
  }
  private issue(): RangeIssue {
    const custom = this.error || this.customValidationMessage || this.entryError;
    if (custom) return { field: 'both', message: custom, flags: { customError: true } };
    const min = parseDate(this.min);
    const max = parseDate(this.max);
    if (min && max && min > max)
      return {
        field: 'both',
        message: 'No dates are available in this range.',
        flags: { customError: true },
      };
    if (!this.start && !this.end)
      return this.required
        ? { field: 'both', message: 'Choose a date range.', flags: { valueMissing: true } }
        : { field: 'both', message: '', flags: {} };
    if (!this.start)
      return { field: 'start', message: 'Enter a start date.', flags: { customError: true } };
    if (!this.end)
      return { field: 'end', message: 'Enter an end date.', flags: { customError: true } };
    const start = parseDate(this.start);
    const end = parseDate(this.end);
    if (!start)
      return {
        field: 'start',
        message: 'Enter a valid start date as YYYY-MM-DD.',
        flags: { customError: true },
      };
    if (!end)
      return {
        field: 'end',
        message: 'Enter a valid end date as YYYY-MM-DD.',
        flags: { customError: true },
      };
    if (min && start < min)
      return {
        field: 'start',
        message: `Choose ${this.min} or a later start date.`,
        flags: { rangeUnderflow: true },
      };
    if (max && end > max)
      return {
        field: 'end',
        message: `Choose ${this.max} or an earlier end date.`,
        flags: { rangeOverflow: true },
      };
    if (end < start)
      return {
        field: 'end',
        message: 'End date must not be before start date.',
        flags: { customError: true },
      };
    return { field: 'both', message: '', flags: {} };
  }
  protected syncForm() {
    const issue = this.issue();
    this.internals.setFormValue(this.isDisabled ? null : this.value);
    const anchor = issue.field === 'end' ? this.endInput : this.startInput;
    this.internals.setValidity(
      this.isDisabled || (this.readonly && !this.error && !this.customValidationMessage)
        ? {}
        : issue.flags,
      this.isDisabled || (this.readonly && !this.error && !this.customValidationMessage)
        ? ''
        : issue.message,
      anchor ?? undefined,
    );
  }
  /** Open the calendar. An unfinished typed start date can be completed there. */
  show() {
    if (this.isDisabled || this.readonly) return;
    this.draftStart = parseDate(this.start) ? this.start : '';
    this.draftEnd = parseDate(this.end) ? this.end : '';
    this.choosingEnd = !!this.draftStart && !this.draftEnd;
    this.open = true;
  }
  /** Close the calendar without applying an unfinished selection. */
  close() {
    this.open = false;
  }
  protected updated(changed: PropertyValues) {
    super.updated(changed);
    const dialog = this.dialog;
    if (!dialog) return;
    if ((this.isDisabled || this.readonly) && this.open) this.open = false;
    if (this.open && changed.has('open')) {
      dialog.show(this.renderRoot.querySelector<HTMLButtonElement>('.trigger') ?? undefined);
      void dialog.updateComplete.then(async () => {
        await this.calendar?.updateComplete;
        if (this.open && dialog.open) this.calendar?.focus();
      });
    } else if (!this.open && dialog.open) dialog.close();
  }
  private edit(field: 'start' | 'end', event: Event) {
    event.stopPropagation();
    this[field] = (event.target as HTMLInputElement).value;
    this.value = this.serialized = this.serialize();
    this.entryError = '';
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }
  private commit(event: Event) {
    event.stopPropagation();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }
  private onBlur() {
    if (!this.isDisabled && !this.validity.valid) this.invalid = true;
  }
  private choose(event: CustomEvent<{ value: string }>) {
    event.stopPropagation();
    const value = event.detail.value;
    if (!this.choosingEnd || value < this.draftStart) {
      this.draftStart = value;
      this.draftEnd = '';
      this.choosingEnd = true;
      return;
    }
    this.draftEnd = value;
    this.start = this.draftStart;
    this.end = value;
    this.value = this.serialized = this.serialize();
    this.entryError = '';
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    this.emit('t-change', { start: this.start, end: this.end, value: this.value });
    this.close();
  }
  formResetCallback() {
    this.value = this.getAttribute('value') ?? this.initialValue;
    this.readValue(this.value);
    this.invalid = false;
    this.open = false;
    this.syncForm();
  }
  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') {
      this.value = state;
      this.readValue(state);
    }
  }
  focus(options?: FocusOptions) {
    this.startInput?.focus(options);
  }
  protected renderDescription() {
    const visible = this.hasVisibleError;
    const message = visible ? this.issue().message : this.help;
    return html`<p
      id="help"
      class="help ${visible ? 'error' : ''}"
      aria-live="polite"
      aria-atomic="true"
    >
      ${message}
    </p>`;
  }
  render() {
    const issue = this.issue();
    const visible = this.hasVisibleError;
    const activeStart = this.open ? this.draftStart : this.start;
    const activeEnd = this.open ? this.draftEnd : this.end;
    return html`<fieldset ?disabled=${this.isDisabled}>
        <legend>
          ${this.label}${
            this.required ? html` <abbr title="required" aria-hidden="true">*</abbr>` : nothing
          }
        </legend>
        <div class="fields" part="fields">
          <label for="start"
            ><span class="label">Start date</span>
            <input
              id="start"
              part="start-input"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="YYYY-MM-DD"
              .value=${this.start}
              ?disabled=${this.isDisabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              aria-invalid=${visible && issue.field !== 'end' ? 'true' : 'false'}
              aria-describedby="format help"
              @input=${(event: Event) => this.edit('start', event)}
              @change=${this.commit}
              @blur=${this.onBlur}
              @keydown=${(event: KeyboardEvent) => submitOnEnter(event, this.form)}
            />
          </label>
          <label for="end"
            ><span class="label">End date</span>
            <input
              id="end"
              part="end-input"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="YYYY-MM-DD"
              .value=${this.end}
              ?disabled=${this.isDisabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              aria-invalid=${visible && issue.field !== 'start' ? 'true' : 'false'}
              aria-describedby="format help"
              @input=${(event: Event) => this.edit('end', event)}
              @change=${this.commit}
              @blur=${this.onBlur}
              @keydown=${(event: KeyboardEvent) => submitOnEnter(event, this.form)}
            />
          </label>
        </div>
        <button
          class="trigger"
          part="trigger"
          type="button"
          aria-haspopup="dialog"
          aria-expanded=${this.open ? 'true' : 'false'}
          ?disabled=${this.isDisabled || this.readonly}
          @click=${this.show}
        >
          <slot name="trigger-icon"><span aria-hidden="true">▦</span></slot>
          ${this.start && this.end ? 'Change date range' : 'Choose date range'}
        </button>
        <p id="format" class="format">Format: YYYY-MM-DD for each date</p>
        ${this.renderDescription()}
      </fieldset>
      <t-dialog
        .heading=${`Choose ${this.label}`}
        @t-close=${() => {
          this.open = false;
        }}
      >
        <p class="instruction" aria-live="polite">
          Choose ${this.choosingEnd ? 'an end' : 'a start'} date.
        </p>
        <t-calendar
          range
          .label=${`${this.label} calendar`}
          .value=${activeEnd || activeStart}
          .rangeStart=${activeStart}
          .rangeEnd=${activeEnd}
          .min=${this.min}
          .max=${this.max}
          .locale=${this.locale}
          .firstDayOfWeek=${this.firstDayOfWeek}
          @input=${(event: Event) => event.stopPropagation()}
          @change=${(event: Event) => event.stopPropagation()}
          @t-change=${this.choose}
        ></t-calendar>
      </t-dialog>`;
  }
}
if (!customElements.get('t-date-range-picker'))
  customElements.define('t-date-range-picker', TDateRangePicker);
declare global {
  interface HTMLElementTagNameMap {
    't-date-range-picker': TDateRangePicker;
  }
}
