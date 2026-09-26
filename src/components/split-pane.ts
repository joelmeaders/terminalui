import { css, html, type PropertyValues } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { baseStyles, TerminalElement } from '../internal/base';
import { activeElement } from '../internal/floating';

export interface SplitPaneChange {
  size: number;
  orientation: 'horizontal' | 'vertical';
  source: 'keyboard' | 'pointer';
}
/**
 * Two scrollable regions with an accessible, adjustable separator.
 * Collapsing focused content moves focus to the separator, or the surviving pane when disabled.
 * Focus recovery follows nested wrappers, rendered slots, and open shadow roots.
 *
 * @slot primary - Primary pane contents.
 *
 * @slot secondary - Secondary pane contents.
 *
 * @fires {CustomEvent<SplitPaneChange>} t-input - Resize preview: `{ size, orientation, source }`.
 *
 * @fires {CustomEvent<SplitPaneChange>} t-change - Committed resize, with the same detail as t-input.
 *
 * @csspart primary - Primary scroll region.
 *
 * @csspart secondary - Secondary scroll region.
 *
 * @csspart separator - Keyboard and pointer resize handle.
 * @cssprop --t-split-height - Inner layout height. Defaults to 360px, with a minimum of 120px. Each pane scrolls within this height.
 */
export class TSplitPane extends TerminalElement {
  static properties = {
    size: { type: Number, reflect: true },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    orientation: { reflect: true },
    stackAt: { type: Number, attribute: 'stack-at' },
    label: {},
    primaryLabel: { attribute: 'primary-label' },
    secondaryLabel: { attribute: 'secondary-label' },
    disabled: { type: Boolean, reflect: true },
    narrow: { state: true },
  };
  /** Primary pane percentage. Zero hides the primary pane; 100 hides the secondary pane. */
  size = 50;
  /** Minimum primary pane percentage. Set to zero to allow full primary collapse. */
  min = 10;
  /** Maximum primary pane percentage. Set to 100 to allow full secondary collapse. */
  max = 90;
  /** Arrow key percentage increment. Shift multiplies it by ten. */
  step = 1;
  /** Pane layout. Horizontal means side by side; vertical means stacked. */
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  /** Horizontal layouts stack below this host width in CSS pixels. Zero disables this behavior. */
  stackAt = 480;
  /** Separator accessible name. Defaults to the primary pane name; an explicit name should match it. */
  label = '';
  /** Accessible primary region name. */
  primaryLabel = 'Primary pane';
  /** Accessible secondary region name. */
  secondaryLabel = 'Secondary pane';
  /** Disables separator input while keeping both regions accessible. */
  disabled = false;
  private narrow = false;
  private restoreSize?: number;
  private hiddenSlotted = new Map<Element, string | null>();
  private focusRecovery?: {
    from: HTMLElement;
    part: 'separator' | 'primary' | 'secondary';
  };
  private resize = new ResizeObserver((entries) => {
    this.narrow = this.stackAt > 0 && entries[0].contentRect.width < this.stackAt;
  });
  private drag?: {
    pointer: number;
    coordinate: number;
    size: number;
    available: number;
    axis: 'horizontal' | 'vertical';
    direction: number;
  };
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      .layout {
        display: grid;
        height: var(--t-split-height, 360px);
        min-height: 120px;
        border: var(--t-line-width, 1px) solid var(--t-border);
      }
      .pane {
        min-width: 0;
        min-height: 0;
        overflow: auto;
        padding: var(--t-space, 16px);
        overflow-wrap: anywhere;
      }
      .pane[hidden] {
        display: none;
      }
      .pane:focus-visible {
        outline-offset: -3px;
      }
      [role='separator'] {
        position: relative;
        min-width: 24px;
        min-height: 24px;
        background: var(--t-raised);
        color: var(--t-text);
        cursor: col-resize;
        touch-action: none;
        user-select: none;
      }
      [role='separator']::before {
        content: '';
        position: absolute;
        inset: 0 calc(50% - 1px);
        background: var(--t-control-border, var(--t-border));
      }
      [aria-orientation='horizontal'] {
        cursor: row-resize;
      }
      [aria-orientation='horizontal']::before {
        inset: calc(50% - 1px) 0;
      }
      [role='separator']:focus-visible {
        outline-offset: -3px;
      }
      [aria-disabled='true'] {
        cursor: default;
      }
      ::slotted(*) {
        max-width: 100%;
      }
    `,
  ];
  /** Actual pane layout after the responsive threshold is applied. */
  get effectiveOrientation(): 'horizontal' | 'vertical' {
    return this.orientation === 'vertical' || this.narrow ? 'vertical' : 'horizontal';
  }
  connectedCallback() {
    super.connectedCallback();
    this.resize.observe(this);
    void this.updateComplete.then(() => {
      if (this.isConnected) this.syncSlottedVisibility();
    });
  }
  disconnectedCallback() {
    this.resize.disconnect();
    this.drag = undefined;
    this.focusRecovery = undefined;
    for (const [element, original] of this.hiddenSlotted) {
      if (original === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', original);
    }
    this.hiddenSlotted.clear();
    super.disconnectedCallback();
  }
  protected willUpdate(changed: PropertyValues) {
    this.min = Number.isFinite(this.min) ? Math.max(0, Math.min(100, this.min)) : 10;
    this.max = Number.isFinite(this.max)
      ? Math.max(this.min, Math.min(100, this.max))
      : Math.max(this.min, 90);
    this.step = Number.isFinite(this.step) && this.step > 0 ? this.step : 1;
    this.size = this.clamp(this.size);
    this.captureCollapsedFocus();
    if (changed.has('stackAt'))
      this.narrow = this.stackAt > 0 && this.getBoundingClientRect().width < this.stackAt;
  }
  private captureCollapsedFocus() {
    this.focusRecovery = undefined;
    const from = activeElement(this.ownerDocument);
    if (!from) return;
    let node: Element | undefined = from;
    while (node && node !== this) {
      if (node.getRootNode() === this.renderRoot && node.classList.contains('pane')) {
        if (
          (this.size === 0 && node.getAttribute('part') === 'primary') ||
          (this.size === 100 && node.getAttribute('part') === 'secondary')
        )
          this.focusRecovery = {
            from,
            part: this.disabled ? (this.size === 0 ? 'secondary' : 'primary') : 'separator',
          };
        return;
      }
      const root = node.getRootNode();
      node =
        node.assignedSlot ??
        node.parentElement ??
        (root instanceof ShadowRoot ? root.host : undefined);
    }
  }
  private syncSlottedVisibility() {
    if (!this.isConnected) return;
    const hidden = new Set<Element>();
    for (const [name, collapsed] of [
      ['primary', this.size === 0],
      ['secondary', this.size === 100],
    ] as const) {
      if (!collapsed) continue;
      const slot = this.renderRoot.querySelector<HTMLSlotElement>(`slot[name="${name}"]`);
      for (const element of slot?.assignedElements() ?? []) hidden.add(element);
    }
    for (const [element, original] of this.hiddenSlotted) {
      if (hidden.has(element)) continue;
      if (original === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', original);
      this.hiddenSlotted.delete(element);
    }
    for (const element of hidden) {
      if (this.hiddenSlotted.has(element)) continue;
      this.hiddenSlotted.set(element, element.getAttribute('aria-hidden'));
      element.setAttribute('aria-hidden', 'true');
    }
  }
  protected updated() {
    this.syncSlottedVisibility();
    const recovery = this.focusRecovery;
    this.focusRecovery = undefined;
    const active = activeElement(this.ownerDocument);
    if (recovery && (active === recovery.from || active === this.ownerDocument.body))
      this.renderRoot.querySelector<HTMLElement>(`[part="${recovery.part}"]`)?.focus();
  }
  private clamp(size: number) {
    return Math.max(this.min, Math.min(this.max, Number.isFinite(size) ? size : 50));
  }
  private detail(source: 'keyboard' | 'pointer'): SplitPaneChange {
    return { size: this.size, orientation: this.effectiveOrientation, source };
  }
  private onKey(event: KeyboardEvent) {
    if (this.disabled || this.min === this.max) return;
    const horizontal = this.effectiveOrientation === 'horizontal',
      rtl = getComputedStyle(this).direction === 'rtl';
    const increase = horizontal ? (rtl ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown',
      decrease = horizontal ? (rtl ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';
    let value = this.size;
    if (event.key === 'Enter') {
      if (this.size > this.min) {
        this.restoreSize = this.size;
        value = this.min;
      } else {
        value = this.restoreSize ?? (this.min + this.max) / 2;
        this.restoreSize = undefined;
      }
    } else if (event.key === increase) value += this.step * (event.shiftKey ? 10 : 1);
    else if (event.key === decrease) value -= this.step * (event.shiftKey ? 10 : 1);
    else if (event.key === 'Home') value = this.min;
    else if (event.key === 'End') value = this.max;
    else return;
    event.preventDefault();
    value = this.clamp(value);
    if (value !== this.size) {
      this.size = value;
      this.emit('t-input', this.detail('keyboard'));
      this.emit('t-change', this.detail('keyboard'));
    }
  }
  private pointerDown(event: PointerEvent) {
    if (this.disabled || event.button !== 0 || this.min === this.max) return;
    const handle = event.currentTarget as HTMLElement,
      layout = this.renderRoot.querySelector('.layout')!.getBoundingClientRect(),
      axis = this.effectiveOrientation;
    this.drag = {
      pointer: event.pointerId,
      coordinate: axis === 'horizontal' ? event.clientX : event.clientY,
      size: this.size,
      available: Math.max(1, (axis === 'horizontal' ? layout.width : layout.height) - 24),
      axis,
      direction: axis === 'horizontal' && getComputedStyle(this).direction === 'rtl' ? -1 : 1,
    };
    handle.focus();
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  private pointerMove(event: PointerEvent) {
    if (!this.drag || event.pointerId !== this.drag.pointer || this.disabled) return;
    const coordinate = this.drag.axis === 'horizontal' ? event.clientX : event.clientY;
    const value = this.clamp(
      this.drag.size +
        (((coordinate - this.drag.coordinate) * this.drag.direction) / this.drag.available) * 100,
    );
    if (value !== this.size) {
      this.size = Number(value.toFixed(2));
      this.emit('t-input', this.detail('pointer'));
    }
  }
  private pointerEnd(event: PointerEvent) {
    if (!this.drag || event.pointerId !== this.drag.pointer) return;
    const changed = this.drag.size !== this.size;
    this.drag = undefined;
    const handle = event.currentTarget as HTMLElement;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    if (changed) this.emit('t-change', this.detail('pointer'));
  }
  render() {
    const horizontal = this.effectiveOrientation === 'horizontal',
      tracks = `minmax(0,calc((100% - 24px) * ${this.size / 100})) 24px minmax(0,1fr)`,
      primaryLabel = this.primaryLabel?.trim() || 'Primary pane';
    return html`<div
      class="layout"
      style=${styleMap({ gridTemplateColumns: horizontal ? tracks : 'minmax(0,1fr)', gridTemplateRows: horizontal ? 'minmax(0,1fr)' : tracks })}
    >
      <section
        class="pane"
        id="primary"
        part="primary"
        style="grid-area: 1 / 1"
        tabindex="0"
        aria-label=${primaryLabel}
        ?hidden=${this.size === 0}
        ?inert=${this.size === 0}
      >
        <slot name="primary" @slotchange=${this.syncSlottedVisibility}></slot>
      </section>
      <div
        part="separator"
        style=${horizontal ? 'grid-area: 1 / 2' : 'grid-area: 2 / 1'}
        role="separator"
        tabindex=${this.disabled ? -1 : 0}
        aria-label=${this.label?.trim() || primaryLabel}
        aria-orientation=${horizontal ? 'vertical' : 'horizontal'}
        aria-valuemin=${this.min}
        aria-valuemax=${this.max}
        aria-valuenow=${this.size}
        aria-valuetext=${`${this.size}% ${primaryLabel}`}
        aria-controls="primary"
        aria-disabled=${this.disabled}
        @keydown=${this.onKey}
        @pointerdown=${this.pointerDown}
        @pointermove=${this.pointerMove}
        @pointerup=${this.pointerEnd}
        @pointercancel=${this.pointerEnd}
        @lostpointercapture=${this.pointerEnd}
      ></div>
      <section
        class="pane"
        part="secondary"
        style=${horizontal ? 'grid-area: 1 / 3' : 'grid-area: 3 / 1'}
        tabindex="0"
        aria-label=${this.secondaryLabel}
        ?hidden=${this.size === 100}
        ?inert=${this.size === 100}
      >
        <slot name="secondary" @slotchange=${this.syncSlottedVisibility}></slot>
      </section>
    </div>`;
  }
}
if (!customElements.get('t-split-pane')) customElements.define('t-split-pane', TSplitPane);
declare global {
  interface HTMLElementTagNameMap {
    't-split-pane': TSplitPane;
  }
}
