import { css, type PropertyValues, type PropertyDeclarations } from 'lit';
import { TerminalElement, baseStyles } from './base';

export const fieldStyles = [
  baseStyles,
  css`
    :host {
      display: block;
    }
    label {
      display: block;
      color: var(--t-text);
      font-size: 12px;
    }
    .label {
      display: block;
      margin-bottom: 8px;
    }
    input,
    select,
    textarea {
      display: block;
      width: 100%;
      min-height: var(--t-control-height, 42px);
      padding: 10px 12px;
      border: var(--t-line-width, 1px) solid var(--t-border);
      box-shadow: var(--_t-edge-glow);
      border-radius: 0;
      background: var(--t-bg);
      color: var(--t-text);
      font-size: 13px;
      accent-color: var(--t-accent);
    }
    input::placeholder,
    textarea::placeholder {
      color: var(--t-muted);
      opacity: 1;
    }
    input:focus,
    select:focus,
    textarea:focus {
      outline: 2px solid var(--t-focus);
      outline-offset: 2px;
    }
    .help {
      font-size: 11px;
      color: var(--t-muted);
      margin: 7px 0 0;
    }
    .error {
      color: var(--t-danger);
    }
    :host([invalid]) input,
    :host([invalid]) select {
      border-color: var(--t-danger);
    }
    abbr {
      color: var(--t-accent);
      text-decoration: none;
    }
  `,
];

export abstract class FormControl extends TerminalElement {
  static formAssociated = true;
  static properties: PropertyDeclarations = {
    name: { reflect: true },
    value: {},
    label: {},
    help: {},
    error: {},
    disabled: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
    invalid: { type: Boolean, reflect: true },
    fieldsetDisabled: { state: true },
  };
  name = '';
  value = '';
  label = '';
  help = '';
  error = '';
  disabled = false;
  required = false;
  invalid = false;
  protected fieldsetDisabled = false;
  protected internals = this.attachInternals();
  protected get control() {
    return this.renderRoot.querySelector<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >('input,select,textarea');
  }
  protected get isDisabled() {
    return this.disabled || this.fieldsetDisabled;
  }
  constructor() {
    super();
    this.addEventListener('invalid', () => {
      this.invalid = true;
    });
  }
  protected updated(_changed: PropertyValues) {
    this.syncForm();
  }
  protected syncForm() {
    const control = this.control;
    if (!control) return;
    this.internals.setFormValue(this.isDisabled ? null : this.value);
    if (this.isDisabled) this.internals.setValidity({});
    else if (this.error) this.internals.setValidity({ customError: true }, this.error, control);
    else this.internals.setValidity(control.validity, control.validationMessage, control);
  }
  protected handleInput(event: Event) {
    event.stopPropagation();
    this.value = (event.target as HTMLInputElement).value;
    this.invalid = false;
    this.syncForm();
    this.emit('input');
  }
  protected handleChange(event: Event) {
    event.stopPropagation();
    this.emit('change');
  }
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
  }
  formResetCallback() {
    this.value = this.getAttribute('value') ?? '';
    this.invalid = false;
  }
  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') this.value = state;
  }
  get form() {
    return this.internals.form;
  }
  get validity() {
    return this.internals.validity;
  }
  get validationMessage() {
    return this.internals.validationMessage;
  }
  checkValidity() {
    return this.internals.checkValidity();
  }
  reportValidity() {
    return this.internals.reportValidity();
  }
  focus(options?: FocusOptions) {
    this.control?.focus(options);
  }
}
