import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import './icon';
/** Copy explicit text to the clipboard after user activation.
 * @fires t-copy - Text was copied: { value }.
 * @fires t-copy-error - Clipboard access failed. No success is announced.
 * @csspart button - Native action button.
 * @csspart status - Visible clipboard completion or failure message.
 */
export class TCopyButton extends TerminalElement {
  static properties = {
    value: {},
    label: {},
    disabled: { type: Boolean, reflect: true },
    status: { state: true },
    busy: { state: true },
  };
  value = '';
  label = 'Copy';
  disabled = false;
  private status = '';
  private busy = false;
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
        max-width: 100%;
        min-width: 0;
      }
      button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        max-width: 100%;
        overflow-wrap: anywhere;
        padding: 8px 12px;
        min-height: var(--t-control-height, 42px);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        background: var(--t-surface);
        color: var(--t-accent);
      }
      .status {
        display: block;
        max-width: 36ch;
        overflow-wrap: anywhere;
        font-size: 12px;
        color: var(--t-muted);
      }
      .status:not(:empty) {
        margin-top: 8px;
      }
    `,
  ];
  focus(options?: FocusOptions) {
    this.renderRoot.querySelector('button')?.focus(options);
  }
  private async copy() {
    if (this.disabled || this.busy) return;
    this.busy = true;
    this.status = '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable.');
      const value = this.value;
      await navigator.clipboard.writeText(value);
      this.status = 'Copied to clipboard.';
      this.emit('t-copy', { value });
    } catch {
      this.status = 'Could not copy. Select the text and copy it manually.';
      this.emit('t-copy-error');
    } finally {
      this.busy = false;
    }
  }
  render() {
    return html`<button
        part="button"
        type="button"
        ?disabled=${this.disabled}
        aria-busy=${this.busy ? 'true' : 'false'}
        @click=${this.copy}
      >
        <t-icon name="copy" size="16"></t-icon>${this.label}</button
      ><span class="status" part="status" role="status">${this.status}</span>`;
  }
}
if (!customElements.get('t-copy-button')) customElements.define('t-copy-button', TCopyButton);
declare global {
  interface HTMLElementTagNameMap {
    't-copy-button': TCopyButton;
  }
}
