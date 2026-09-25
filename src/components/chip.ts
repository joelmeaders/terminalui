import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import { optionalSlotStyles, syncSlot } from '../internal/slots';

/**
 * Compact text token. A selectable chip uses a native toggle button; a removable chip has a separate named action.
 * Removal is a request. The application removes the chip and moves focus to a logical next control.
 *
 * @slot start - Decorative icon before the label. It is hidden from assistive technology.
 * @slot end - Decorative icon after the label. It is hidden from assistive technology.
 * @fires t-toggle - User changed selection: `{ selected, label }`.
 * @fires t-remove - User requested removal: `{ label }`. The element remains until the application removes it.
 * @csspart chip - Outer token surface.
 * @csspart action - Native selection button, present when selectable.
 * @csspart label - Visible token label.
 * @csspart remove - Native removal button, present when removable.
 */
export class TChip extends TerminalElement {
  static properties = {
    label: {},
    variant: { reflect: true },
    size: { reflect: true },
    selectable: { type: Boolean, reflect: true },
    selected: { type: Boolean, reflect: true },
    removable: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };
  /** Visible label and accessible name for the selection and removal actions. */
  label = 'Chip';
  /** Decorative accent: neutral, accent, success, warning, or danger. Meaning must also be in the label. */
  variant: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' = 'neutral';
  /** Height: small, medium, or large. */
  size: 'small' | 'medium' | 'large' = 'medium';
  /** Give the chip a toggle button and an exposed pressed state. */
  selectable = false;
  /** Pressed state when selectable. Programmatic changes do not emit an event. */
  selected = false;
  /** Add a separate removal request button. */
  removable = false;
  /** Disable selection and removal actions. */
  disabled = false;

  static styles = [
    baseStyles,
    optionalSlotStyles,
    css`
      :host {
        display: inline-flex;
        max-width: 100%;
        min-width: 0;
        --_chip-accent: var(--t-muted);
      }
      :host([variant='accent']) {
        --_chip-accent: var(--t-accent);
      }
      :host([variant='success']) {
        --_chip-accent: var(--t-success);
      }
      :host([variant='warning']) {
        --_chip-accent: var(--t-warning);
      }
      :host([variant='danger']) {
        --_chip-accent: var(--t-danger);
      }
      .chip {
        display: inline-flex;
        align-items: stretch;
        max-width: 100%;
        min-width: 0;
        min-height: 36px;
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        background: var(--t-surface);
        color: var(--t-text);
        box-shadow: var(--_t-edge-glow);
      }
      :host([selectable][selected]) .chip {
        border-color: var(--_chip-accent);
        background: var(--t-raised);
      }
      .content {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        max-width: 100%;
        min-width: 0;
        min-height: 34px;
        padding: 5px 10px;
        color: inherit;
        background: transparent;
        border: 0;
        text-align: start;
        font-size: 11px;
        line-height: 1.4;
        letter-spacing: 0.04em;
      }
      .content[part='action']:hover:not(:disabled),
      .remove:hover:not(:disabled) {
        background: var(--t-raised);
      }
      .content[part='action']:focus-visible,
      .remove:focus-visible {
        outline: 2px solid var(--t-focus);
        outline-offset: -3px;
        position: relative;
        z-index: 1;
      }
      .mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
        width: 12px;
        height: 12px;
        border: 1px solid var(--_chip-accent);
        color: var(--t-text);
        font-size: 11px;
        line-height: 1;
      }
      :host(:not([selectable])) .mark {
        width: 6px;
        height: 6px;
        background: var(--_chip-accent);
      }
      .label {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .remove {
        flex: none;
        min-width: 32px;
        min-height: 32px;
        padding: 4px 7px;
        border: 0;
        border-inline-start: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        background: transparent;
        color: var(--t-text);
        font-size: 18px;
        line-height: 1;
      }
      :host([size='small']) .chip {
        min-height: 32px;
      }
      :host([size='small']) .content {
        min-height: 30px;
        padding: 4px 8px;
      }
      :host([size='large']) .chip {
        min-height: 44px;
      }
      :host([size='large']) .content {
        min-height: 42px;
        padding: 8px 14px;
        font-size: 13px;
      }
      @media (forced-colors: active) {
        .chip,
        .mark,
        .remove {
          border-color: ButtonText;
        }
        :host([selectable][selected]) .chip {
          border-color: Highlight;
        }
      }
    `,
  ];

  private toggle() {
    if (this.disabled || !this.selectable) return;
    this.selected = !this.selected;
    this.emit('t-toggle', { selected: this.selected, label: this.label });
  }
  private requestRemoval() {
    if (!this.disabled && this.removable) this.emit('t-remove', { label: this.label });
  }
  focus(options?: FocusOptions) {
    this.renderRoot.querySelector<HTMLButtonElement>('.action, .remove')?.focus(options);
  }
  render() {
    const content = html`<span class="mark" aria-hidden="true"
        >${this.selectable && this.selected ? '✓' : ''}</span
      >
      <slot name="start" aria-hidden="true" data-optional @slotchange=${syncSlot}></slot>
      <span class="label" part="label">${this.label}</span>
      <slot name="end" aria-hidden="true" data-optional @slotchange=${syncSlot}></slot>`;
    return html`<span class="chip" part="chip">
      ${
        this.selectable
          ? html`<button
              class="content action"
              part="action"
              type="button"
              aria-pressed=${this.selected ? 'true' : 'false'}
              ?disabled=${this.disabled}
              @click=${this.toggle}
            >
              ${content}
            </button>`
          : html`<span class="content">${content}</span>`
      }
      ${
        this.removable
          ? html`<button
              class="remove"
              part="remove"
              type="button"
              aria-label=${`Remove ${this.label}`}
              ?disabled=${this.disabled}
              @click=${this.requestRemoval}
            >
              ×
            </button>`
          : ''
      }
    </span>`;
  }
}
if (!customElements.get('t-chip')) customElements.define('t-chip', TChip);
declare global {
  interface HTMLElementTagNameMap {
    't-chip': TChip;
  }
}
