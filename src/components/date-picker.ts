import { css, html, nothing, type PropertyValues } from 'lit';
import { FormControl, fieldStyles } from '../internal/form-control';
import { parseDate } from '../internal/date';
import { submitOnEnter } from '../internal/implicit-submit';
import { fieldSlotStyles, optionalSlotStyles, syncSlot } from '../internal/slots';
import './calendar';
import './dialog';
import type { TCalendar } from './calendar';
import type { TDialog } from './dialog';

/**
 * Form-associated ISO date field with an optional modal calendar. Users can type a date or choose one.
 * @slot start - Leading icon or short prefix. Inert while disabled.
 * @slot end - Trailing icon or short suffix. Inert while disabled.
 * @fires input - The user edited the date or selected a calendar day.
 * @fires change - The user committed a typed date or selected a calendar day.
 * @fires t-change - The user selected a calendar day: `{ value }`.
 * @fires t-close - The calendar dialog closed.
 * @csspart control - Input and calendar-trigger row.
 * @csspart input - Native date-text input.
 * @csspart trigger - Button that opens the calendar dialog.
 */
export class TDatePicker extends FormControl {
  static properties = {
    min: {},
    max: {},
    locale: {},
    firstDayOfWeek: { type: Number, attribute: 'first-day-of-week' },
    readonly: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
  };
  /** Earliest valid date in YYYY-MM-DD form. */
  min = '';
  /** Latest valid date in YYYY-MM-DD form. */
  max = '';
  /** Calendar month, weekday, and date language. The input still uses ISO dates. */
  locale = '';
  /** First column of the calendar week: 0 for Sunday through 6 for Saturday. */
  firstDayOfWeek = 0;
  /** Keep the value but prevent user edits and calendar selection. */
  readonly = false;
  /** Whether the calendar dialog is open. Use show() or close() to change it. */
  open = false;
  label = 'Date';

  static styles = [
    fieldStyles,
    optionalSlotStyles,
    fieldSlotStyles,
    css`
      .field-row > input {
        min-width: 0;
      }
      .trigger {
        flex: none;
        min-width: var(--t-control-height, 42px);
        min-height: var(--t-control-height, 42px);
        margin-inline-start: 8px;
        padding: 6px;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        background: var(--t-bg);
        color: var(--t-text);
        box-shadow: var(--_t-edge-glow);
      }
      .trigger:focus-visible {
        outline: 2px solid var(--t-focus);
        outline-offset: 2px;
      }
      .trigger span {
        display: block;
        font-size: 20px;
        line-height: 1;
      }
      .format {
        margin: 7px 0 0;
        color: var(--t-muted);
        font-size: 11px;
      }
      @media (max-width: 400px) {
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

  private get dialog() {
    return this.renderRoot.querySelector<TDialog>('t-dialog');
  }
  private get calendar() {
    return this.renderRoot.querySelector<TCalendar>('t-calendar');
  }
  /** Open the calendar and focus its selected or current day. */
  show() {
    if (!this.isDisabled && !this.readonly) this.open = true;
  }
  /** Close the calendar and restore focus to its trigger. */
  close() {
    this.open = false;
  }
  formResetCallback() {
    super.formResetCallback();
    this.open = false;
  }
  protected updated(changed: PropertyValues) {
    super.updated(changed);
    const dialog = this.dialog;
    if (!dialog) return;
    if (this.isDisabled || this.readonly) {
      if (this.open) this.open = false;
    }
    if (this.open && changed.has('open')) {
      dialog.show(this.renderRoot.querySelector<HTMLButtonElement>('.trigger') ?? undefined);
      void dialog.updateComplete.then(async () => {
        await this.calendar?.updateComplete;
        if (this.open && dialog.open) this.calendar?.focus();
      });
    } else if (!this.open && dialog.open) dialog.close();
  }
  protected syncForm() {
    super.syncForm();
    const control = this.control;
    if (!control || this.isDisabled || this.error || this.customValidationMessage) return;
    if (this.readonly) {
      this.internals.setValidity({});
      return;
    }
    const date = this.value ? parseDate(this.value) : null;
    const min = parseDate(this.min);
    const max = parseDate(this.max);
    const issue =
      min && max && min > max
        ? [{ customError: true }, 'No dates are available in this range.']
        : !this.value
          ? this.required
            ? [{ valueMissing: true }, 'Choose a date.']
            : [{}, '']
          : !date
            ? [{ customError: true }, 'Enter a valid date as YYYY-MM-DD.']
            : min && date < min
              ? [{ rangeUnderflow: true }, `Choose ${this.min} or a later date.`]
              : max && date > max
                ? [{ rangeOverflow: true }, `Choose ${this.max} or an earlier date.`]
                : [{}, ''];
    this.internals.setValidity(issue[0] as ValidityStateFlags, issue[1] as string, control);
  }
  private onBlur() {
    if (!this.isDisabled && !this.validity.valid) this.invalid = true;
  }
  private choose(event: CustomEvent<{ value: string }>) {
    event.stopPropagation();
    const value = event.detail.value;
    this.value = value;
    this.invalid = false;
    if (this.control) this.control.value = value;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    this.emit('t-change', { value });
    this.close();
  }
  private closeOnCurrentDay(event: MouseEvent) {
    const day = event
      .composedPath()
      .find(
        (node): node is HTMLButtonElement =>
          node instanceof HTMLButtonElement && node.hasAttribute('data-date'),
      );
    if (day?.dataset.date === this.value) this.close();
  }
  render() {
    return html`<label for="control"
        ><span class="label"
          >${this.label}${this.required ? html` <abbr title="required" aria-hidden="true">*</abbr>` : nothing}</span
        >
      </label>
      <div class="field-row" part="control">
        <slot name="start" data-optional @slotchange=${syncSlot} ?inert=${this.isDisabled}></slot>
        <input
          id="control"
          part="input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="YYYY-MM-DD"
          .value=${this.value}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
          aria-describedby="format help"
          @input=${this.handleInput}
          @change=${this.handleChange}
          @blur=${this.onBlur}
          @keydown=${(event: KeyboardEvent) => {
            if (!this.isDisabled) submitOnEnter(event, this.form);
          }}
        />
        <slot name="end" data-optional @slotchange=${syncSlot} ?inert=${this.isDisabled}></slot>
        <button
          class="trigger"
          part="trigger"
          type="button"
          aria-label=${this.value ? `Change date, ${this.value}` : 'Choose date'}
          aria-haspopup="dialog"
          aria-expanded=${this.open ? 'true' : 'false'}
          ?disabled=${this.isDisabled || this.readonly}
          @click=${this.show}
        >
          <span aria-hidden="true">▦</span>
        </button>
      </div>
      <p id="format" class="format">Format: YYYY-MM-DD</p>
      ${this.renderDescription()}
      <t-dialog
        .heading=${`Choose ${this.label}`}
        @t-close=${() => {
          this.open = false;
        }}
      >
        <t-calendar
          .label=${this.label}
          .value=${this.value}
          .min=${this.min}
          .max=${this.max}
          .locale=${this.locale}
          .firstDayOfWeek=${this.firstDayOfWeek}
          @input=${(event: Event) => event.stopPropagation()}
          @change=${(event: Event) => event.stopPropagation()}
          @t-change=${this.choose}
          @click=${this.closeOnCurrentDay}
        ></t-calendar>
      </t-dialog>`;
  }
}
if (!customElements.get('t-date-picker')) customElements.define('t-date-picker', TDatePicker);
declare global {
  interface HTMLElementTagNameMap {
    't-date-picker': TDatePicker;
  }
}
