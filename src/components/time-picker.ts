import { css, html, nothing, type PropertyValues } from 'lit';
import { FormControl, fieldStyles } from '../internal/form-control';
import { submitOnEnter } from '../internal/implicit-submit';
import { fieldSlotStyles, optionalSlotStyles, syncSlot } from '../internal/slots';
import './dialog';
import type { TDialog } from './dialog';

const parseTime = (value: string): number | null => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
const formatTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const hours = Array.from({ length: 24 }, (_, value) => value);
const minutes = Array.from({ length: 60 }, (_, value) => value);

/**
 * Form-associated 24-hour time field. Users can type HH:mm or use native hour and minute choices in a modal.
 * No timezone or date is implied by the value.
 *
 * @slot start - Leading icon or short prefix beside the text field. Inert while disabled.
 * @slot end - Trailing icon or short suffix beside the text field. Inert while disabled.
 * @slot trigger-icon - Decorative icon inside the time trigger.
 * @fires input - A user typed a time or applied a modal choice. Read `event.target.value`.
 * @fires change - A user committed a typed time or applied a modal choice.
 * @fires {CustomEvent<{ value: string }>} t-change - A modal choice was applied: `{ value }`.
 * @fires {CustomEvent<null>} t-close - The modal closed.
 * @csspart control - Text field and modal trigger row.
 * @csspart input - Native time-text input.
 * @csspart trigger - Button that opens the modal.
 * @csspart hours - Native hour select inside the modal.
 * @csspart minutes - Native minute select inside the modal.
 * @csspart preview - Readable draft time inside the modal.
 * @csspart cancel - Button that discards the draft.
 * @csspart apply - Button that applies the draft.
 */
export class TTimePicker extends FormControl {
  static properties = {
    min: {},
    max: {},
    readonly: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    draft: { state: true },
  };
  /** Earliest allowed time in HH:mm form. */
  min = '';
  /** Latest allowed time in HH:mm form. Overnight ranges are not supported. */
  max = '';
  /** Keep the submitted value without allowing edits. */
  readonly = false;
  /** Whether the modal is open. Use show() or close() to change it. */
  open = false;
  label = 'Time';
  private draft = 540;

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
      .trigger:focus-visible,
      .modal-action:focus-visible {
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
      .choices {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: var(--t-space, 16px);
      }
      .choices label {
        min-width: 0;
      }
      .choices select {
        min-width: 0;
      }
      .preview {
        display: block;
        margin-top: 16px;
        padding: 8px 12px;
        border: var(--t-line-width, 1px) solid var(--t-border);
        color: var(--t-text);
        font-size: 20px;
        text-align: center;
      }
      .unavailable {
        margin: 12px 0 0;
        color: var(--t-danger);
      }
      .modal-action {
        min-width: 88px;
        min-height: var(--t-control-height, 42px);
        padding: 8px 12px;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        background: var(--t-bg);
        color: var(--t-text);
      }
      .modal-action.apply:not(:disabled) {
        border-color: var(--t-accent);
        background: var(--t-accent);
        color: var(--t-on-accent);
      }
      @media (max-width: 400px) {
        t-dialog::part(dialog) {
          width: calc(100vw - 16px);
          max-width: calc(100vw - 16px);
        }
        t-dialog::part(body) {
          padding: 12px;
        }
        .choices {
          grid-template-columns: minmax(0, 1fr);
        }
      }
      @media (forced-colors: active) {
        .trigger,
        .modal-action {
          border-color: ButtonText;
        }
        .modal-action.apply:not(:disabled) {
          border-color: Highlight;
          background: Highlight;
          color: HighlightText;
        }
      }
    `,
  ];

  private get dialog() {
    return this.renderRoot.querySelector<TDialog>('t-dialog');
  }
  private bounds() {
    const min = parseTime(this.min) ?? 0;
    const max = parseTime(this.max) ?? 1439;
    return { min, max, available: min <= max };
  }
  private issue() {
    const custom = this.error || this.customValidationMessage;
    if (custom) return { flags: { customError: true }, message: custom };
    const { min, max, available } = this.bounds();
    if (!available)
      return { flags: { customError: true }, message: 'No times are available in this range.' };
    if (!this.value)
      return this.required
        ? { flags: { valueMissing: true }, message: 'Choose a time.' }
        : { flags: {}, message: '' };
    const time = parseTime(this.value);
    if (time === null)
      return { flags: { customError: true }, message: 'Enter a valid time as HH:mm.' };
    if (time < min)
      return { flags: { rangeUnderflow: true }, message: `Choose ${this.min} or a later time.` };
    if (time > max)
      return { flags: { rangeOverflow: true }, message: `Choose ${this.max} or an earlier time.` };
    return { flags: {}, message: '' };
  }
  protected syncForm() {
    const issue = this.issue();
    this.internals.setFormValue(this.isDisabled ? null : this.value);
    const inactive =
      this.isDisabled || (this.readonly && !this.error && !this.customValidationMessage);
    this.internals.setValidity(
      inactive ? {} : issue.flags,
      inactive ? '' : issue.message,
      this.control ?? undefined,
    );
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
  private onBlur() {
    if (!this.isDisabled && !this.validity.valid) this.invalid = true;
  }
  /** Open the time choices without changing the submitted value. */
  show() {
    if (this.isDisabled || this.readonly) return;
    const { min, max, available } = this.bounds();
    const current = parseTime(this.value);
    this.draft = !available
      ? -1
      : current !== null && current >= min && current <= max
        ? current
        : Math.max(min, Math.min(max, 540));
    this.open = true;
  }
  /** Discard the draft and restore focus to the trigger. */
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
      void dialog.updateComplete.then(() => {
        if (this.open && dialog.open)
          this.renderRoot.querySelector<HTMLSelectElement>('#hours')?.focus();
      });
    } else if (!this.open && dialog.open) dialog.close();
  }
  private chooseHour(event: Event) {
    event.stopPropagation();
    const hour = Number((event.target as HTMLSelectElement).value);
    const { min, max } = this.bounds();
    const first = Math.max(hour * 60, min);
    const last = Math.min(hour * 60 + 59, max);
    if (first > last) return;
    this.draft = Math.max(first, Math.min(last, hour * 60 + (this.draft % 60)));
  }
  private chooseMinute(event: Event) {
    event.stopPropagation();
    const minute = Number((event.target as HTMLSelectElement).value);
    const candidate = Math.floor(this.draft / 60) * 60 + minute;
    const { min, max } = this.bounds();
    if (candidate >= min && candidate <= max) this.draft = candidate;
  }
  private apply() {
    const { min, max, available } = this.bounds();
    if (!available || this.draft < min || this.draft > max || this.isDisabled || this.readonly)
      return;
    const value = formatTime(this.draft);
    if (this.value !== value) {
      this.value = value;
      if (this.control) this.control.value = value;
      this.invalid = false;
      this.syncForm();
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      this.emit('t-change', { value });
    }
    this.close();
  }
  formResetCallback() {
    super.formResetCallback();
    this.open = false;
  }
  render() {
    const { min, max, available } = this.bounds();
    const hour = this.draft >= 0 ? Math.floor(this.draft / 60) : -1;
    const minute = this.draft >= 0 ? this.draft % 60 : -1;
    return html`<label for="control"
        ><span class="label"
          >${this.label}${
            this.required ? html` <abbr title="required" aria-hidden="true">*</abbr>` : nothing
          }</span
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
          placeholder="HH:mm"
          .value=${this.value}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
          aria-describedby="format help"
          @input=${this.handleInput}
          @change=${this.handleChange}
          @blur=${this.onBlur}
          @keydown=${(event: KeyboardEvent) => submitOnEnter(event, this.form)}
        />
        <slot name="end" data-optional @slotchange=${syncSlot} ?inert=${this.isDisabled}></slot>
        <button
          class="trigger"
          part="trigger"
          type="button"
          aria-label=${this.value ? `Change time, ${this.value}` : 'Choose time'}
          aria-haspopup="dialog"
          aria-expanded=${this.open ? 'true' : 'false'}
          ?disabled=${this.isDisabled || this.readonly}
          @click=${this.show}
        >
          <slot name="trigger-icon" aria-hidden="true"><span aria-hidden="true">◷</span></slot>
        </button>
      </div>
      <p id="format" class="format">Format: HH:mm, 24-hour time</p>
      ${this.renderDescription()}
      <t-dialog
        .heading=${`Choose ${this.label}`}
        @t-close=${() => {
          this.open = false;
        }}
      >
        <div class="choices">
          <label for="hours"
            ><span class="label">Hours</span>
            <select
              id="hours"
              part="hours"
              ?disabled=${!available}
              @input=${(event: Event) => event.stopPropagation()}
              @change=${this.chooseHour}
            >
              ${hours.map(
                (value) =>
                  html`<option
                    value=${value}
                    .selected=${value === hour}
                    ?disabled=${value * 60 > max || value * 60 + 59 < min}
                  >
                    ${String(value).padStart(2, '0')}
                  </option>`,
              )}
            </select></label
          >
          <label for="minutes"
            ><span class="label">Minutes</span>
            <select
              id="minutes"
              part="minutes"
              ?disabled=${!available}
              @input=${(event: Event) => event.stopPropagation()}
              @change=${this.chooseMinute}
            >
              ${minutes.map(
                (value) =>
                  html`<option
                    value=${value}
                    .selected=${value === minute}
                    ?disabled=${hour < 0 || hour * 60 + value < min || hour * 60 + value > max}
                  >
                    ${String(value).padStart(2, '0')}
                  </option>`,
              )}
            </select></label
          >
        </div>
        <output class="preview" part="preview"
          >${available ? formatTime(this.draft) : '—:—'}</output
        >
        ${available ? nothing : html`<p class="unavailable">No times are available in this range.</p>`}
        <button class="modal-action" part="cancel" slot="footer" type="button" @click=${this.close}>
          Cancel
        </button>
        <button
          class="modal-action apply"
          part="apply"
          slot="footer"
          type="button"
          ?disabled=${!available}
          @click=${this.apply}
        >
          Use time
        </button>
      </t-dialog>`;
  }
}
if (!customElements.get('t-time-picker')) customElements.define('t-time-picker', TTimePicker);
declare global {
  interface HTMLElementTagNameMap {
    't-time-picker': TTimePicker;
  }
}
