import { css, html, type PropertyValues } from 'lit';
import { TInput } from './input';

/**
 * Password field with an accessible visibility action. Inherits native input constraints and form behavior.
 *
 * @fires {CustomEvent<{ revealed: boolean }>} t-visibility-change - The user changed password visibility.
 *
 * @csspart reveal - Password visibility button.
 */
export class TPasswordInput extends TInput {
  static properties = { ...TInput.properties, revealed: { type: Boolean, reflect: true } };
  label = 'Password';
  type = 'password';
  autocomplete = 'current-password';
  /** Reveal the password as plain text. Form reset hides it again. */
  revealed = false;
  private pointerSelection?: {
    start: number | null;
    end: number | null;
    direction: 'forward' | 'backward' | 'none' | null;
    focused: boolean;
  };
  static styles = [
    ...TInput.styles,
    css`
      button {
        min-height: 32px;
        min-width: 32px;
        margin-top: 8px;
        padding: 5px 10px;
        font-size: 12px;
        color: var(--t-text);
        background: var(--t-raised);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        overflow-wrap: anywhere;
      }
    `,
  ];
  protected willUpdate(_changed: PropertyValues) {
    this.type = this.revealed ? 'text' : 'password';
  }
  private async toggleVisibility(event: Event) {
    event.preventDefault();
    if (this.isDisabled) return;
    const input = this.control as HTMLInputElement;
    const saved = this.pointerSelection;
    this.pointerSelection = undefined;
    const selection = saved
      ? ([saved.start, saved.end, saved.direction] as const)
      : ([input.selectionStart, input.selectionEnd, input.selectionDirection] as const);
    const restoreFocus = saved?.focused ?? this.shadowRoot?.activeElement === input;
    this.revealed = !this.revealed;
    await this.updateComplete;
    // Restore after the click's default selection handling finishes.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (restoreFocus) input.focus({ preventScroll: true });
    if (selection[0] !== null && selection[1] !== null)
      input.setSelectionRange(selection[0], selection[1], selection[2] ?? undefined);
    this.emit('t-visibility-change', { revealed: this.revealed });
  }
  formResetCallback() {
    super.formResetCallback();
    this.revealed = false;
  }
  render() {
    return html`${super.render()}<button
        type="button"
        part="reveal"
        ?disabled=${this.isDisabled}
        aria-label=${`${this.revealed ? 'Hide' : 'Show'} ${this.label || 'password'}`}
        @pointerdown=${(event: PointerEvent) => {
          const input = this.control as HTMLInputElement;
          this.pointerSelection = {
            start: input.selectionStart,
            end: input.selectionEnd,
            direction: input.selectionDirection,
            focused: this.shadowRoot?.activeElement === input,
          };
          event.preventDefault();
        }}
        @click=${this.toggleVisibility}
      >
        ${this.revealed ? 'Hide password' : 'Show password'}
      </button>`;
  }
}
if (!customElements.get('t-password-input'))
  customElements.define('t-password-input', TPasswordInput);
declare global {
  interface HTMLElementTagNameMap {
    't-password-input': TPasswordInput;
  }
}
