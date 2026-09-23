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
    :host([invalid]) select,
    :host([invalid]) textarea {
      border-color: var(--t-danger);
    }
    abbr {
      color: var(--t-accent);
      text-decoration: none;
    }
    textarea:disabled {
      cursor: not-allowed;
      opacity: 0.55;
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
  /** Submitted field name. Use the `form` attribute to associate an external form. */
  name = '';
  /** Current field value. The initial value is restored by form reset. */
  value = '';
  /** Accessible label for the native control. */
  label = '';
  /** Supporting text associated with the native control. */
  help = '';
  /** Application validation message. An empty string clears the error. */
  error = '';
  disabled = false;
  required = false;
  invalid = false;
  protected fieldsetDisabled = false;
  protected internals = this.attachInternals();
  protected initialValue = '';
  protected customValidationMessage = '';
  protected get control() {
    return (
      this.renderRoot?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input,select,textarea',
      ) ?? null
    );
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
  protected firstUpdated() {
    this.initialValue = this.value;
  }
  protected updated(_changed: PropertyValues) {
    this.syncForm();
  }
  protected syncForm() {
    const control = this.control;
    if (!control) return;
    this.internals.setFormValue(this.isDisabled ? null : this.value);
    if (this.isDisabled) this.internals.setValidity({});
    else if (this.error || this.customValidationMessage)
      this.internals.setValidity(
        { customError: true },
        this.error || this.customValidationMessage,
        control,
      );
    else this.internals.setValidity(control.validity, control.validationMessage, control);
  }
  protected handleInput(event: Event) {
    event.stopPropagation();
    this.value = (event.target as HTMLInputElement).value;
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }
  protected handleChange(event: Event) {
    event.stopPropagation();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }
  formDisabledCallback(disabled: boolean) {
    this.fieldsetDisabled = disabled;
    // Attribute reflection can invoke this during a Lit update. Schedule a later
    // render so an own-disabled toggle cannot leave the native control stale.
    if (this.control) this.control.disabled = disabled;
    queueMicrotask(() => this.requestUpdate());
  }
  formResetCallback() {
    this.value = this.getAttribute('value') ?? this.initialValue;
    if (this.control) this.control.value = this.value;
    this.invalid = false;
    this.syncForm();
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
  get willValidate() {
    return this.internals.willValidate;
  }
  /** Set a custom constraint error. Pass an empty string to clear it. */
  setCustomValidity(message: string) {
    this.customValidationMessage = message;
    this.syncForm();
    this.requestUpdate();
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
