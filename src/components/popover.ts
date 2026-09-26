import { css, html, type PropertyValues } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import { activeElement, observeFloating, type Placement } from '../internal/floating';
import { inlineSlotStyles } from '../internal/slots';

/**
 * Non-modal top-layer disclosure with native light dismissal and collision handling.
 *
 * @slot - Interactive panel contents.
 *
 * @slot trigger-label - Trigger label content.
 * @slot start - Non-interactive icon before the trigger label.
 * @slot end - Non-interactive icon after the trigger label.
 *
 * @fires {CustomEvent<{ open: boolean }>} t-toggle - The panel changed visibility.
 *
 * @csspart trigger - Native trigger button.
 *
 * @csspart panel - Non-modal panel.
 * @cssprop --t-popover-width - Preferred panel width. Defaults to 320px; floating placement limits the panel to the available viewport.
 */
export class TPopover extends TerminalElement {
  static properties = {
    label: {},
    heading: {},
    open: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    placement: {},
  };
  label = 'Details';
  heading = 'Details';
  open = false;
  disabled = false;
  placement: Placement = 'bottom';
  private cleanup?: () => void;
  private opener?: HTMLElement;
  private outsidePointer = false;
  private onPointerDown = (event: PointerEvent) => {
    if (this.open) this.outsidePointer = !event.composedPath().includes(this);
  };
  static styles = [
    baseStyles,
    inlineSlotStyles,
    css`
      :host {
        display: inline-block;
      }
      button {
        min-height: var(--t-control-height, 42px);
        padding: 9px 14px;
        color: var(--t-accent);
        background: var(--t-surface);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        box-shadow: var(--_t-edge-glow);
      }
      [popover] {
        position: fixed;
        inset: auto;
        margin: 0;
        width: var(--t-popover-width, 320px);
        padding: var(--t-space, 16px);
        overflow: auto;
        color: var(--t-text);
        background: var(--t-raised);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        box-shadow:
          var(--_t-edge-glow),
          0 8px 32px #0005;
        font: inherit;
      }
    `,
  ];
  show() {
    if (!this.disabled) {
      if (!this.open) this.opener = activeElement();
      this.open = true;
    }
  }
  close() {
    this.open = false;
  }
  focus(options?: FocusOptions) {
    this.renderRoot.querySelector('button')?.focus(options);
  }
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('pointerdown', this.onPointerDown, true);
  }
  disconnectedCallback() {
    this.open = false;
    this.cleanup?.();
    this.cleanup = undefined;
    this.opener = undefined;
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    super.disconnectedCallback();
  }
  private containsFocus(panel: HTMLElement) {
    let node: Node | null = activeElement() ?? null;
    while (node) {
      if (node === panel) return true;
      node =
        node instanceof Element && node.assignedSlot
          ? node.assignedSlot
          : node instanceof ShadowRoot
            ? node.host
            : node.parentNode;
    }
    return false;
  }
  private beforeToggle(event: Event) {
    const panel = event.currentTarget as HTMLElement;
    if ((event as ToggleEvent).newState === 'open') {
      this.opener ??= activeElement();
      this.outsidePointer = false;
      return;
    }
    const opener = this.opener;
    const restore = !this.outsidePointer && this.containsFocus(panel);
    this.opener = undefined;
    this.outsidePointer = false;
    if (restore && opener?.isConnected)
      setTimeout(() => {
        const active = activeElement();
        if (
          this.isConnected &&
          !panel.matches(':popover-open') &&
          (!active || active === document.body || this.containsFocus(panel))
        )
          opener.focus();
      }, 0);
  }
  protected updated(changed: PropertyValues) {
    const panel = this.renderRoot.querySelector<HTMLElement>('[popover]')!;
    if (this.disabled && this.open) {
      this.open = false;
      return;
    }
    if (this.open && !panel.matches(':popover-open')) panel.showPopover();
    if (!this.open && panel.matches(':popover-open')) panel.hidePopover();
    if (this.open && (changed.has('open') || changed.has('placement'))) {
      this.cleanup?.();
      this.cleanup = observeFloating(
        this.renderRoot.querySelector('button')!,
        panel,
        this.placement,
      );
    } else if (!this.open) {
      this.cleanup?.();
      this.cleanup = undefined;
    }
  }
  private toggle(event: Event) {
    const open = (event as ToggleEvent).newState === 'open';
    this.open = open;
    this.emit('t-toggle', { open });
  }
  render() {
    return html` <button
        part="trigger"
        type="button"
        popovertarget="panel"
        aria-expanded=${String(this.open)}
        aria-haspopup="dialog"
        ?disabled=${this.disabled}
        @click=${(event: Event) => {
          if (!this.open) this.opener = event.currentTarget as HTMLElement;
        }}
      >
        <slot name="start"></slot><slot name="trigger-label">${this.label}</slot
        ><slot name="end"></slot>
      </button>
      <div
        part="panel"
        id="panel"
        popover="auto"
        role="dialog"
        tabindex="-1"
        autofocus
        aria-label=${this.heading}
        @beforetoggle=${this.beforeToggle}
        @toggle=${this.toggle}
      >
        <slot></slot>
      </div>`;
  }
}
if (!customElements.get('t-popover')) customElements.define('t-popover', TPopover);
declare global {
  interface HTMLElementTagNameMap {
    't-popover': TPopover;
  }
}
