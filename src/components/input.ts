import { html, nothing, type PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { FormControl, fieldStyles } from '../internal/form-control';

/** Form-associated text input. Label and help are associated inside the shadow root. */
export class TInput extends FormControl {
  static properties = {
    type: {},
    placeholder: {},
    autocomplete: {},
    readonly: { type: Boolean, reflect: true },
    min: {},
    max: {},
    step: {},
    pattern: {},
    minlength: { type: Number },
    maxlength: { type: Number },
    multiple: { type: Boolean },
  };
  type = 'text';
  placeholder = '';
  autocomplete = 'off';
  readonly = false;
  /** Native minimum, maximum, and step constraints for numeric and date inputs. */
  min?: string;
  max?: string;
  step?: string;
  /** Native regular-expression constraint. */
  pattern?: string;
  minlength?: number;
  maxlength?: number;
  /** Accept more than one email address when type is email. */
  multiple = false;
  static styles = fieldStyles;
  protected updated(changed: PropertyValues) {
    // Keep the public value and FormData consistent with native type sanitization.
    if (this.control && this.control.value !== this.value) this.value = this.control.value;
    super.updated(changed);
  }
  private onKeydown(event: KeyboardEvent) {
    if (
      event.key !== 'Enter' ||
      event.isComposing ||
      event.defaultPrevented ||
      !this.form ||
      this.isDisabled
    )
      return;
    if (
      ![
        'text',
        'email',
        'password',
        'search',
        'tel',
        'url',
        'number',
        'date',
        'datetime-local',
        'month',
        'time',
        'week',
      ].includes(this.type)
    )
      return;
    const submitter = Array.from(this.form.elements).find(
      (element) =>
        ((element instanceof HTMLButtonElement || element instanceof HTMLInputElement) &&
          element.type === 'submit') ||
        (element.localName === 't-button' &&
          (element as HTMLElement & { type: string }).type === 'submit'),
    ) as HTMLElement | undefined;
    if (submitter) {
      event.preventDefault();
      // The first disabled submit button blocks implicit submission, as in a native form.
      if (
        !submitter.matches(':disabled') &&
        !(submitter as HTMLElement & { loading?: boolean }).loading
      )
        submitter.click();
    } else {
      const blockers = Array.from(this.form.elements).filter(
        (element) =>
          (element instanceof HTMLInputElement || element.localName === 't-input') &&
          [
            'text',
            'email',
            'password',
            'search',
            'tel',
            'url',
            'number',
            'date',
            'datetime-local',
            'month',
            'time',
            'week',
          ].includes((element as HTMLInputElement).type),
      );
      if (blockers.length === 1) {
        event.preventDefault();
        this.form.requestSubmit();
      }
    }
  }
  render() {
    const type = [
      'text',
      'email',
      'password',
      'search',
      'tel',
      'url',
      'number',
      'date',
      'datetime-local',
      'month',
      'time',
      'week',
      'color',
    ].includes(this.type)
      ? this.type
      : 'text';
    return html`<label
        ><span class="label"
          >${this.label}${this.required ? html` <abbr title="required">*</abbr>` : nothing}</span
        >
        <input
          part="input"
          .value=${this.value}
          type=${type}
          placeholder=${this.placeholder}
          autocomplete=${this.autocomplete}
          min=${ifDefined(this.min)}
          max=${ifDefined(this.max)}
          step=${ifDefined(this.step)}
          pattern=${ifDefined(this.pattern)}
          minlength=${ifDefined(this.minlength)}
          maxlength=${ifDefined(this.maxlength)}
          ?multiple=${this.multiple}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          ?readonly=${this.readonly}
          aria-invalid=${this.invalid || !!this.error ? 'true' : 'false'}
          aria-describedby="help"
          @input=${this.handleInput}
          @change=${this.handleChange}
          @keydown=${this.onKeydown}
        />
      </label>
      <p id="help" class="help ${this.invalid || this.error ? 'error' : ''}">
        ${this.error || (this.invalid ? this.validationMessage : this.help)}
      </p>`;
  }
}
if (!customElements.get('t-input')) customElements.define('t-input', TInput);
declare global {
  interface HTMLElementTagNameMap {
    't-input': TInput;
  }
}
