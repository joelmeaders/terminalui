import { css, html } from 'lit';
import { FormControl, fieldStyles } from '../internal/form-control';
/**
 * Form-associated checkbox. The switch option changes presentation and accessible role.
 * @csspart input - input element.
 */
export class TCheckbox extends FormControl {
  static properties = {
    checked: { type: Boolean, reflect: true },
    switch: { type: Boolean, reflect: true },
  };
  /** Current checked state. Unchecked controls do not submit a value. */
  checked = false;
  switch = false;
  value = 'on';
  private defaultChecked = false;
  static styles = [
    fieldStyles,
    css`
      label {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        min-height: 32px;
      }
      input {
        margin: 0;
        flex: none;
        width: 18px;
        height: 18px;
        min-height: 0;
        padding: 0;
      }
      :host([switch]) input {
        appearance: none;
        width: 36px;
        height: 20px;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        box-shadow: var(--_t-edge-glow);
        background: var(--t-raised);
        position: relative;
      }
      :host([switch]) input::before {
        transition: left var(--_t-motion-duration, var(--t-motion-fast, 120ms))
          var(--t-motion-ease, ease);
        content: '';
        display: block;
        width: 12px;
        height: 12px;
        background: var(--t-muted);
        position: absolute;
        top: calc(4px - var(--t-line-width, 1px));
        left: calc(4px - var(--t-line-width, 1px));
      }
      :host([switch]) input:checked {
        border-color: var(--t-accent);
      }
      :host([switch]) input:checked::before {
        background: var(--t-accent);
        left: calc(20px - var(--t-line-width, 1px));
      }
      @media (forced-colors: active) {
        :host([switch]) input {
          appearance: auto;
        }
        :host([switch]) input::before {
          display: none;
        }
      }
    `,
  ];
  protected firstUpdated() {
    super.firstUpdated();
    this.defaultChecked = this.checked;
  }
  protected syncForm() {
    super.syncForm();
    this.internals.setFormValue(
      this.checked && !this.isDisabled ? this.value : null,
      this.checked ? 'checked' : 'unchecked',
    );
  }
  protected handleInput(event: Event) {
    event.stopPropagation();
    this.checked = (event.target as HTMLInputElement).checked;
    this.invalid = false;
    this.syncForm();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }
  formResetCallback() {
    this.checked = this.defaultChecked;
    if (this.control) (this.control as HTMLInputElement).checked = this.checked;
    this.invalid = false;
    this.syncForm();
  }
  formStateRestoreCallback(state: string | File | FormData | null) {
    this.checked = state === 'checked';
  }
  render() {
    return html`<label
        ><input
          part="input"
          type="checkbox"
          role=${this.switch ? 'switch' : 'checkbox'}
          .checked=${this.checked}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          aria-describedby="help"
          aria-invalid=${this.hasVisibleError ? 'true' : 'false'}
          @input=${this.handleInput}
          @change=${this.handleChange}
        />${this.label}</label
      >
      ${this.renderDescription()}`;
  }
}
if (!customElements.get('t-checkbox')) customElements.define('t-checkbox', TCheckbox);
declare global {
  interface HTMLElementTagNameMap {
    't-checkbox': TCheckbox;
  }
}
