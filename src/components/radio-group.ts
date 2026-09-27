import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { FormControl, fieldStyles } from '../internal/form-control';
import { activeElement } from '../internal/floating';
import type { SelectOption } from './select';

/**
 * Form-associated native radio group. Arrow keys move between enabled options.
 * Live updates retain focus by value without changing selection. Empty groups can receive validation focus.
 * @csspart input - input element.
 */
export class TRadioGroup extends FormControl {
  static properties = { options: { attribute: false }, orientation: { reflect: true } };
  /** Choices with unique values. Replace the array to update options and preserve focus by value. */
  options: SelectOption[] = [];
  orientation: 'vertical' | 'horizontal' = 'vertical';
  private focusedChoice?: { element: HTMLInputElement; value: string; index: number };
  private groupHadFocus = false;
  static styles = [
    fieldStyles,
    css`
      fieldset {
        border: 0;
        padding: 0;
        margin: 0;
        min-width: 0;
      }
      fieldset:focus {
        outline: 2px solid var(--t-focus);
        outline-offset: 4px;
      }
      legend {
        padding: 0;
        font-size: 12px;
        margin-bottom: 8px;
      }
      .options {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      :host([orientation='horizontal']) .options {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 16px;
      }
      label {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 32px;
      }
      input {
        margin: 0;
        width: 18px;
        height: 18px;
        min-height: 0;
        padding: 0;
        flex: none;
      }
      @media (forced-colors: active) {
        fieldset:focus {
          outline-color: Highlight;
        }
      }
    `,
  ];
  protected get control() {
    return (
      this.renderRoot?.querySelector<HTMLInputElement>('input:checked:not(:disabled)') ??
      this.renderRoot?.querySelector<HTMLInputElement>('input:not(:disabled)') ??
      null
    );
  }
  protected willUpdate(_changed: PropertyValues) {
    const active = this.shadowRoot?.activeElement;
    const choice =
      active?.localName === 'input' && (active as HTMLInputElement).type === 'radio'
        ? (active as HTMLInputElement)
        : undefined;
    this.focusedChoice = choice
      ? {
          element: choice,
          value: choice.value,
          index: [
            ...this.renderRoot.querySelectorAll<HTMLInputElement>('input:not(:disabled)'),
          ].indexOf(choice),
        }
      : undefined;
    this.groupHadFocus = active?.localName === 'fieldset';
  }
  protected updated(changed: PropertyValues) {
    super.updated(changed);
    const focused = this.focusedChoice;
    const groupHadFocus = this.groupHadFocus;
    this.focusedChoice = undefined;
    this.groupHadFocus = false;
    if ((!focused && !groupHadFocus) || this.isDisabled || !this.ownerDocument.hasFocus()) return;
    const group = this.renderRoot.querySelector<HTMLElement>('fieldset');
    const current = activeElement(this.ownerDocument);
    if (
      current &&
      current !== focused?.element &&
      current !== group &&
      current !== this &&
      current !== this.ownerDocument.body
    )
      return;
    const enabled = [...this.renderRoot.querySelectorAll<HTMLInputElement>('input:not(:disabled)')];
    const target = focused
      ? (enabled.find((choice) => choice.value === focused.value) ??
        enabled[Math.min(focused.index, enabled.length - 1)])
      : this.control;
    if (current !== target) (target ?? group)?.focus();
  }
  protected syncForm() {
    const selected = this.options.find((option) => option.value === this.value && !option.disabled);
    this.internals.setFormValue(!this.isDisabled && selected ? this.value : null);
    const customError = this.error || this.customValidationMessage;
    const missing = this.required && !selected;
    const message = this.isDisabled ? '' : customError || (missing ? 'Select an option.' : '');
    this.internals.setValidity(
      message ? (customError ? { customError: true } : { valueMissing: true }) : {},
      message,
      this.control ?? this.renderRoot.querySelector<HTMLElement>('fieldset') ?? undefined,
    );
  }
  focus(options?: FocusOptions) {
    if (this.isDisabled) return;
    (this.control ?? this.renderRoot.querySelector<HTMLElement>('fieldset'))?.focus(options);
  }
  formResetCallback() {
    this.value = this.getAttribute('value') ?? this.initialValue;
    this.renderRoot.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.checked = input.value === this.value;
    });
    this.invalid = false;
    this.syncForm();
  }
  render() {
    return html`<fieldset
        tabindex="-1"
        aria-describedby="help"
        aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
        ?disabled=${this.isDisabled}
      >
        <legend>
          ${this.label}${this.required ? html` <abbr title="required" aria-hidden="true">*</abbr>` : nothing}
        </legend>
        <div class="options">
          ${repeat(
            this.options,
            (option) => option.value,
            (option) =>
              html`<label
                ><input
                  type="radio"
                  part="input"
                  name="choice"
                  value=${option.value}
                  .checked=${this.value === option.value}
                  ?disabled=${option.disabled || this.isDisabled}
                  ?required=${this.required}
                  aria-describedby="help"
                  aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
                  @input=${this.handleInput}
                  @change=${this.handleChange}
                />${option.label}</label
              >`,
          )}
        </div>
      </fieldset>
      ${this.renderDescription()}`;
  }
}
if (!customElements.get('t-radio-group')) customElements.define('t-radio-group', TRadioGroup);
declare global {
  interface HTMLElementTagNameMap {
    't-radio-group': TRadioGroup;
  }
}
