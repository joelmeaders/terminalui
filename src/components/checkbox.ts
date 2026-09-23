import { css, html } from 'lit';
import { FormControl, fieldStyles } from '../internal/form-control';
/** Form-associated checkbox. The switch option changes presentation and accessible role. */
export class TCheckbox extends FormControl {
  static properties = {
    checked: { type: Boolean, reflect: true },
    switch: { type: Boolean, reflect: true },
  };
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
        border: var(--t-line-width, 1px) solid var(--t-border);
        box-shadow: var(--_t-edge-glow);
        background: var(--t-raised);
        position: relative;
      }
      :host([switch]) input::before {
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
  connectedCallback() {
    if (!this.hasUpdated) this.defaultChecked = this.hasAttribute('checked');
    super.connectedCallback();
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
    this.emit('input');
  }
  formResetCallback() {
    this.checked = this.defaultChecked;
    this.invalid = false;
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
          aria-invalid=${this.invalid || !!this.error ? 'true' : 'false'}
          @input=${this.handleInput}
          @change=${this.handleChange}
        />${this.label}</label
      >
      <p id="help" class="help ${this.invalid || this.error ? 'error' : ''}">
        ${this.error || (this.invalid ? this.validationMessage : this.help)}
      </p>`;
  }
}
customElements.define('t-checkbox', TCheckbox);
declare global {
  interface HTMLElementTagNameMap {
    't-checkbox': TCheckbox;
  }
}
