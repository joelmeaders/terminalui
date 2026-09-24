import { css, html, type PropertyValues } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import { observeFloating } from '../internal/floating';
import { inlineSlotStyles } from '../internal/slots';

export interface MenuOption {
  value: string;
  label: string;
  disabled?: boolean;
  separator?: boolean;
}

/**
 * Single-level action menu with arrow navigation, typeahead, and focus return.
 * @slot start - Non-interactive icon before the trigger label.
 * @slot end - Non-interactive icon or content after the trigger label, before the arrow.
 *
 * @fires t-select - Selected action: `{ value, option }`.
 *
 * @csspart trigger - Native trigger button.
 *
 * @csspart menu - Menu surface.
 *
 * @csspart item - Action button.
 */
export class TMenu extends TerminalElement {
  static properties = {
    label: {},
    options: { attribute: false },
    disabled: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
  };
  /** Accessible trigger text. */
  label = 'Actions';
  /** Actions with unique values. A separator entry displays a divider. */
  options: MenuOption[] = [];
  /** Prevents opening the menu. */
  disabled = false;
  /** Whether the menu is visible. */
  open = false;
  private search = '';
  private searchTime = 0;
  private cleanup?: () => void;
  static styles = [
    baseStyles,
    inlineSlotStyles,
    css`
      :host {
        display: inline-block;
        position: relative;
      }
      button {
        color: var(--t-text);
        background: var(--t-surface);
        padding: var(--t-space-2, 8px) var(--t-space-3, 12px);
      }
      .trigger {
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        box-shadow: var(--_t-edge-glow);
      }
      [role='menu'] {
        position: fixed;
        inset: auto;
        margin: 0;
        min-width: min(180px, calc(100vw - 16px));
        width: max-content;
        overflow: auto;
        background: var(--t-surface);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        padding: 4px;
        box-shadow:
          var(--_t-edge-glow),
          0 8px 24px #0005;
      }
      [role='menuitem'] {
        display: block;
        width: 100%;
        border: 0;
        text-align: start;
        white-space: nowrap;
      }
      [role='menuitem']:focus,
      [role='menuitem']:hover {
        background: var(--t-raised);
        color: var(--t-accent);
        outline-offset: -2px;
      }
      [role='separator'] {
        border-top: var(--t-divider-width, 1px) solid var(--t-control-border, var(--t-border));
        margin: 4px;
      }
    `,
  ];
  private outside = (event: Event) => {
    if (this.open && !event.composedPath().includes(this)) this.dismiss(false);
  };
  connectedCallback() {
    super.connectedCallback();
    this.requestUpdate();
    document.addEventListener('pointerdown', this.outside);
    document.addEventListener('focusin', this.outside);
  }
  disconnectedCallback() {
    this.open = false;
    super.disconnectedCallback();
    this.cleanup?.();
    this.cleanup = undefined;
    document.removeEventListener('pointerdown', this.outside);
    document.removeEventListener('focusin', this.outside);
  }
  protected updated(changed: PropertyValues) {
    if (this.disabled && this.open) {
      this.open = false;
      return;
    }
    const panel = this.renderRoot.querySelector<HTMLElement>('[role=menu]')!;
    if (this.open && !panel.matches(':popover-open')) panel.showPopover();
    if (!this.open && panel.matches(':popover-open')) panel.hidePopover();
    if (this.open && !this.cleanup)
      this.cleanup = observeFloating(
        this.renderRoot.querySelector<HTMLButtonElement>('.trigger')!,
        panel,
      );
    if (!this.open) {
      this.cleanup?.();
      this.cleanup = undefined;
    }
    if (changed.has('open') && this.open) (this.buttons()[0] ?? panel).focus();
  }
  private buttons() {
    return [
      ...this.renderRoot.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not(:disabled)'),
    ];
  }
  private dismiss(restore = true) {
    this.open = false;
    this.search = '';
    if (restore) this.renderRoot.querySelector<HTMLButtonElement>('.trigger')?.focus();
  }
  private async show(last = false) {
    if (this.disabled) return;
    this.open = true;
    await this.updateComplete;
    const buttons = this.buttons();
    (
      buttons[last ? buttons.length - 1 : 0] ??
      this.renderRoot.querySelector<HTMLElement>('[role=menu]')
    )?.focus();
  }
  private choose(option: MenuOption) {
    if (option.disabled || option.separator) return;
    this.dismiss();
    this.emit('t-select', { value: option.value, option });
  }
  private onKey(event: KeyboardEvent) {
    const buttons = this.buttons();
    const index = buttons.indexOf(
      this.renderRoot.querySelector('[role=menuitem]:focus') as HTMLButtonElement,
    );
    let next = index;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.dismiss();
      return;
    }
    if (event.key === 'Tab') {
      this.dismiss();
      return;
    }
    if (event.key === 'ArrowDown') next = (index + 1) % buttons.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else if (
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const now = Date.now();
      this.search = now - this.searchTime > 700 ? event.key : this.search + event.key;
      this.searchTime = now;
      const search = [...this.search].every((c) => c === this.search[0])
        ? this.search[0]
        : this.search;
      next = buttons.findIndex((_, offset) =>
        buttons[(index + 1 + offset) % buttons.length]
          .textContent!.trim()
          .toLocaleLowerCase()
          .startsWith(search.toLocaleLowerCase()),
      );
      if (next >= 0) next = (index + 1 + next) % buttons.length;
    } else return;
    event.preventDefault();
    buttons[next]?.focus();
  }
  render() {
    return html` <button
        class="trigger"
        part="trigger"
        type="button"
        ?disabled=${this.disabled}
        aria-haspopup="menu"
        aria-expanded=${this.open}
        aria-controls="menu"
        @click=${() => (this.open ? this.dismiss() : this.show())}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            void this.show(event.key === 'ArrowUp');
          }
        }}
      >
        <slot name="start"></slot>${this.label}<slot name="end"></slot>
        <span aria-hidden="true">▾</span>
      </button>
      <div
        id="menu"
        part="menu"
        role="menu"
        tabindex="-1"
        popover="manual"
        aria-label=${this.label}
        @keydown=${this.onKey}
      >
        ${this.options.map((option) => (option.separator ? html`<div role="separator"></div>` : html`<button part="item" type="button" role="menuitem" tabindex="-1" ?disabled=${option.disabled} @click=${() => this.choose(option)}>${option.label}</button>`))}
      </div>`;
  }
}
if (!customElements.get('t-menu')) customElements.define('t-menu', TMenu);
declare global {
  interface HTMLElementTagNameMap {
    't-menu': TMenu;
  }
}
