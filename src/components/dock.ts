import { css, html, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import { baseStyles, HullframeElement } from '../internal/base';
import { activeElement, observeFloating, recoverFocus } from '../internal/floating';

export type DockPlacement = 'inline' | 'top' | 'bottom' | 'left' | 'right';
export interface DockEditChange {
  editing: boolean;
}
export interface DockChange {
  operation: 'reorder' | 'snap' | 'resize';
  source: 'pointer' | 'keyboard' | 'control';
  order: string[];
  placement: DockPlacement;
  orientation: 'horizontal' | 'vertical';
  width: number;
  height: number;
}
type DockState = Pick<DockChange, 'order' | 'placement' | 'orientation' | 'width' | 'height'>;
type DockItem = {
  element: Element;
  key: string;
  slot: string;
  originalSlot: string | null;
  label: string;
  hidden: boolean;
  inert: boolean;
  originalOrientation?: string | null;
  ownedOrientation?: string;
};
type DockDrag = {
  pointer: number;
  handle: HTMLElement;
  operation: DockChange['operation'];
  item?: DockItem;
  before: DockState;
  last: DockState;
  x: number;
  y: number;
  width: number;
  height: number;
  started: boolean;
};
let dockSequence = 0;
const placements: DockPlacement[] = ['inline', 'top', 'bottom', 'left', 'right'];
const observeItems: MutationObserverInit = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    'slot',
    'id',
    'data-dock-id',
    'data-dock-label',
    'label',
    'aria-label',
    'name',
    'hidden',
    'inert',
    'style',
    'class',
    'open',
    'disabled',
    'aria-disabled',
  ],
};

/**
 * A single scrollable row or column for arbitrary elements. Native Tab order follows order.
 * The dock does not intercept content keys or disable application controls.
 * Each direct child receives a private slot. Its original slot returns on removal or disconnect.
 * Supply a unique data-dock-id or id for persistent order. Duplicate IDs use an internal fallback.
 * Supply data-dock-label, label, aria-label, or name for useful editor item names.
 * Native hr elements are movable separators. Text nodes must be inside an element.
 * The editor has click and keyboard alternatives for reorder, edge snapping, and both size axes.
 * Pointer changes are previews until pointerup. Escape and canceled drags restore committed state.
 * Parent snapping requires a positioned parent, such as position: relative.
 * Viewport snapping uses fixed positioning. Width and height use CSS pixels. Zero means automatic.
 * Available space can reduce the rendered size below the configured minimum. Content still scrolls.
 *
 * @slot - Direct element children, including existing components and native hr separators.
 * @fires {CustomEvent<DockChange>} t-input - User preview. External property changes emit no event.
 * @fires {CustomEvent<DockChange>} t-change - One committed user action, with the final state.
 * @fires {CustomEvent<DockEditChange>} t-edit - User changed edit mode.
 * @csspart dock - Named group containing the strip and editor trigger.
 * @csspart strip - Single row or column with native overflow scrolling.
 * @csspart item - An item wrapper. The application element remains in light DOM.
 * @csspart item-handle - Native button for item dragging while editing.
 * @csspart edit-button - Native editor trigger.
 * @csspart settings-button - Opens the native settings panel while editing.
 * @csspart move-handle - Native dock drag button. Arrow keys select physical edges.
 * @csspart resize-handle - Native size button. Horizontal arrows change width. Vertical arrows change height.
 * @csspart editor - Non-modal top-layer editor with native labelled controls.
 * @csspart status - Polite status for committed changes.
 * @cssprop --t-dock-gap - Space between items. Defaults to 8px.
 * @cssprop --t-dock-padding - Strip padding. Defaults to 8px.
 * @cssprop --t-dock-editor-width - Preferred editor width. Defaults to 320px, limited by the viewport.
 */
export class TDock extends HullframeElement {
  static properties = {
    label: {},
    orientation: { reflect: true },
    align: { reflect: true },
    editing: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    placement: { reflect: true },
    snapTarget: { attribute: 'snap-target', reflect: true },
    width: { type: Number },
    height: { type: Number },
    minWidth: { type: Number, attribute: 'min-width' },
    minHeight: { type: Number, attribute: 'min-height' },
    maxWidth: { type: Number, attribute: 'max-width' },
    maxHeight: { type: Number, attribute: 'max-height' },
    step: { type: Number },
    autoOrient: { type: Boolean, attribute: 'auto-orient' },
    order: { type: Array },
    items: { state: true },
    selected: { state: true },
    editorOpen: { state: true },
    availableWidth: { state: true },
    availableHeight: { state: true },
    announcement: { state: true },
  };
  /** Accessible name for the content group. */
  label = 'Dock';
  /** One row or one column. Content never wraps into another track. */
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  /** Item distribution along the strip axis. */
  align: 'start' | 'end' | 'center' | 'justify' = 'start';
  /** Shows drag handles and the settings control. The settings panel opens separately. */
  editing = false;
  /** Disables only the dock editor. Application controls remain available. */
  disabled = false;
  /** Inline placement or a physical edge of the snap target. */
  placement: DockPlacement = 'inline';
  /** Parent is the default boundary. Viewport edges use fixed positioning. */
  snapTarget: 'parent' | 'viewport' = 'parent';
  /** Requested width in CSS pixels. Zero uses automatic width. */
  width = 0;
  /** Requested height in CSS pixels. Zero uses automatic height. */
  height = 0;
  /** Minimum width for user resizing, subject to available space. */
  minWidth = 160;
  /** Minimum height for user resizing, subject to available space. */
  minHeight = 56;
  /** Maximum width for user resizing. */
  maxWidth = 4096;
  /** Maximum height for user resizing. */
  maxHeight = 4096;
  /** Keyboard resize increment in CSS pixels. Shift multiplies it by ten. */
  step = 8;
  /** Edge snapping chooses horizontal for top/bottom and vertical for left/right. */
  autoOrient = true;
  /** Stable item IDs in rendered and native Tab order. Missing IDs append in child order. */
  order: string[] = [];
  private items: DockItem[] = [];
  private selected = '';
  private availableWidth = 0;
  private availableHeight = 0;
  private announcement = '';
  private editorOpen = false;
  private editorFocus?: HTMLElement;
  private editorField = 'dock-item';
  private slotPrefix = `t-dock-${++dockSequence}`;
  private sequence = 0;
  private records = new Map<Element, DockItem>();
  private fallbacks = new WeakMap<Element, string>();
  private observer = new MutationObserver(() => this.syncItems());
  private resize = new ResizeObserver(() => {
    if (!this.isConnected) return;
    this.measure();
    this.syncItems();
  });
  private resizeParent?: Element;
  private resizeStrip?: HTMLElement;
  private slots = new Set<HTMLSlotElement>();
  private slotsChanged = false;
  private cleanupFloating?: () => void;
  private listeningDocument?: Document;
  private get viewportWindow() {
    return this.ownerDocument.defaultView ?? window;
  }
  private drag?: DockDrag;
  private focused?: HTMLElement;
  private recovery?: { from: HTMLElement; target?: HTMLElement; index: number };
  private onSlotChange = () => this.syncItems();
  private onViewportChange = () => this.measure();
  private onOutsidePointer = (event: PointerEvent) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      (this.drag && event.pointerId !== this.drag.pointer)
    )
      return;
    if (this.editing && !event.composedPath().includes(this)) this.setEditing(false);
  };
  private onDocumentKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (this.drag) {
      event.preventDefault();
      this.cancelDrag();
    }
  };
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        width: fit-content;
        min-width: 0;
        max-width: 100%;
      }
      :host([placement='top']),
      :host([placement='bottom']),
      :host([placement='left']),
      :host([placement='right']) {
        position: absolute;
        z-index: 1;
      }
      :host([placement='top']) {
        top: var(--_t-dock-top, 0px);
        left: var(--_t-dock-left, 0px);
      }
      :host([placement='bottom']) {
        bottom: var(--_t-dock-bottom, 0px);
        left: var(--_t-dock-left, 0px);
      }
      :host([placement='left']) {
        left: var(--_t-dock-left, 0px);
        top: var(--_t-dock-top, 0px);
      }
      :host([placement='right']) {
        right: var(--_t-dock-right, 0px);
        top: var(--_t-dock-top, 0px);
      }
      :host([snap-target='viewport'][placement]:not([placement='inline'])) {
        position: fixed;
      }
      .dock {
        display: grid;
        grid-template-columns: minmax(24px, 1fr) auto;
        min-width: 0;
        min-height: 0;
        overflow: auto;
        scroll-padding: 8px;
        border: var(--t-line-width, 1px) solid var(--t-border);
        background: var(--t-surface);
        box-shadow: var(--_t-edge-glow);
      }
      .strip {
        min-width: 0;
        min-height: 24px;
        overflow: auto;
        scroll-padding: 8px;
        padding: var(--t-dock-padding, 8px);
      }
      .items {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: var(--t-dock-gap, 8px);
        min-width: 100%;
        min-height: 100%;
        width: max-content;
      }
      .item {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 4px;
        min-width: 0;
        max-width: var(--_t-dock-item-width, 100vw);
      }
      .item [part='item-handle'] {
        flex: none;
      }
      .item slot {
        display: contents;
      }
      ::slotted(*) {
        box-sizing: border-box;
        min-width: 0;
        max-width: 100%;
        flex-shrink: 1;
      }
      .tools {
        display: flex;
        flex-wrap: wrap;
        align-content: start;
        align-items: start;
        gap: 4px;
        padding: 4px;
      }
      :host([orientation='vertical']) .dock {
        grid-template-columns: minmax(24px, 1fr);
        grid-template-rows: minmax(24px, 1fr) auto;
      }
      :host([orientation='vertical']) .items {
        flex-direction: column;
        width: auto;
        height: max-content;
        align-items: stretch;
      }
      :host([orientation='vertical']) .item {
        flex-direction: row;
      }
      :host([align='end']) .items {
        justify-content: flex-end;
      }
      :host([align='center']) .items {
        justify-content: center;
      }
      :host([align='justify']) .items {
        justify-content: space-between;
      }
      button,
      input,
      select {
        min-width: 24px;
        min-height: var(--t-control-height, 42px);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        color: var(--t-text);
        background: var(--t-surface);
        padding: 4px 8px;
      }
      .handle {
        touch-action: none;
        user-select: none;
        cursor: grab;
      }
      .dock button:focus-visible {
        outline-offset: -3px;
      }
      .resize {
        cursor: nwse-resize;
      }
      .handle:active {
        cursor: grabbing;
      }
      ::slotted(hr) {
        flex: none;
        align-self: stretch;
        width: var(--t-line-width, 1px);
        min-height: 24px;
        margin: 0 4px;
        border: 0;
        border-inline-start: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
      }
      :host([orientation='vertical']) ::slotted(hr) {
        width: 100%;
        height: var(--t-line-width, 1px);
        min-height: 0;
        margin: 4px 0;
        border-inline-start: 0;
        border-block-start: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
      }
      .editor {
        position: fixed;
        inset: auto;
        margin: 0;
        width: var(--t-dock-editor-width, 320px);
        overflow: auto;
        padding: var(--t-space, 16px);
        scroll-padding: 8px;
        color: var(--t-text);
        background: var(--t-raised);
        border: var(--t-line-width, 1px) solid var(--t-control-border, var(--t-border));
        font: inherit;
        animation: none !important;
      }
      .editor label {
        display: block;
        margin-block: 8px 4px;
        overflow-wrap: anywhere;
      }
      .editor select,
      .editor input {
        width: 100%;
        min-width: 0;
      }
      .editor .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-block: 8px;
      }
      .editor p {
        overflow-wrap: anywhere;
        margin-block: 8px;
      }
      .editor button,
      .editor input,
      .editor select {
        scroll-margin: 8px;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.listeningDocument = this.ownerDocument;
    this.listeningDocument.addEventListener('pointerdown', this.onOutsidePointer, true);
    this.listeningDocument.addEventListener('keydown', this.onDocumentKey);
    this.viewportWindow.addEventListener('resize', this.onViewportChange);
    this.viewportWindow.visualViewport?.addEventListener('resize', this.onViewportChange);
    this.viewportWindow.visualViewport?.addEventListener('scroll', this.onViewportChange);
    this.resize.observe(this);
    this.syncItems();
    this.measure();
  }
  disconnectedCallback() {
    this.cancelDrag();
    this.observer.disconnect();
    this.resize.disconnect();
    this.resizeParent = undefined;
    this.resizeStrip = undefined;
    this.cleanupFloating?.();
    this.cleanupFloating = undefined;
    this.listeningDocument?.removeEventListener('pointerdown', this.onOutsidePointer, true);
    this.listeningDocument?.removeEventListener('keydown', this.onDocumentKey);
    const view = this.listeningDocument?.defaultView;
    view?.removeEventListener('resize', this.onViewportChange);
    view?.visualViewport?.removeEventListener('resize', this.onViewportChange);
    view?.visualViewport?.removeEventListener('scroll', this.onViewportChange);
    this.listeningDocument = undefined;
    for (const slot of this.slots) slot.removeEventListener('slotchange', this.onSlotChange);
    this.slots.clear();
    this.slotsChanged = false;
    for (const item of this.records.values()) this.restoreSlot(item);
    this.records.clear();
    this.items = [];
    this.focused = undefined;
    this.recovery = undefined;
    super.disconnectedCallback();
  }
  private restoreSlot(item: DockItem) {
    if (
      item.ownedOrientation &&
      item.element.getAttribute('aria-orientation') === item.ownedOrientation
    ) {
      if (item.originalOrientation === null) item.element.removeAttribute('aria-orientation');
      else if (item.originalOrientation !== undefined)
        item.element.setAttribute('aria-orientation', item.originalOrientation);
    }
    // Do not replace a slot value that the application changed after ownership ended.
    if (item.element.getAttribute('slot') !== item.slot) return;
    if (item.originalSlot === null) item.element.removeAttribute('slot');
    else item.element.setAttribute('slot', item.originalSlot);
  }
  private fallback(element: Element) {
    let key = this.fallbacks.get(element);
    if (!key) {
      key = `${this.slotPrefix}-item-${++this.sequence}`;
      this.fallbacks.set(element, key);
    }
    return key;
  }
  private composedContains(ancestor: Element, element: Element | undefined) {
    let node: Element | undefined = element;
    while (node) {
      if (node === ancestor) return true;
      node = this.composedParent(node);
    }
    return false;
  }
  private composedParent(element: Element): Element | undefined {
    const root = element.getRootNode();
    return (
      element.assignedSlot ??
      element.parentElement ??
      ('host' in root ? (root as ShadowRoot).host : undefined)
    );
  }
  private isAvailable(element: HTMLElement) {
    if (!element.isConnected || element.matches(':disabled,[aria-disabled="true"]')) return false;
    let child: Element | undefined = element;
    while (child) {
      if (child.matches('[hidden],[inert]')) return false;
      const style = getComputedStyle(child);
      if (style.display === 'none' || style.visibility !== 'visible') return false;
      const parent = this.composedParent(child);
      if (
        parent?.localName === 'details' &&
        !(parent as HTMLDetailsElement).open &&
        child.tagName !== 'SUMMARY'
      )
        return false;
      child = parent;
    }
    return element.getClientRects().length > 0;
  }
  private captureFocus() {
    if (!this.ownerDocument.hasFocus()) return;
    const current = activeElement(this.ownerDocument);
    const from = this.composedContains(this, current)
      ? current
      : current === this.ownerDocument.body
        ? this.focused
        : undefined;
    if (!from || this.recovery) return;
    const index = this.orderedItems().findIndex(
      (item) =>
        this.composedContains(item.element, from) ||
        this.renderRoot.querySelector(`[data-item-slot="${item.slot}"]`)?.contains(from),
    );
    this.recovery = { from, target: from, index };
  }
  private onFocusIn(event: FocusEvent) {
    this.focused = event
      .composedPath()
      .find((node) => (node as Element).namespaceURI === 'http://www.w3.org/1999/xhtml') as
      HTMLElement | undefined;
    if (this.editorOpen && event.composedPath().includes(this.renderRoot.querySelector('.strip')!))
      this.editorOpen = false;
  }
  private onFocusOut() {
    queueMicrotask(() => {
      const current = activeElement(this.ownerDocument);
      if (current !== this.ownerDocument.body && !this.composedContains(this, current))
        this.focused = undefined;
    });
  }
  private syncItems() {
    if (!this.isConnected) return;
    this.captureFocus();
    this.observer.disconnect();
    const children = Array.from(this.children),
      keys = new Set<string>(),
      keyChanges = new Map<string, string>();
    for (const [element, item] of this.records) {
      if (children.includes(element)) continue;
      if (this.drag?.item === item) this.cancelDrag();
      this.restoreSlot(item);
      this.records.delete(element);
    }
    const next = children.map((element, index) => {
      let item = this.records.get(element);
      if (!item) {
        this.slotsChanged = true;
        item = {
          element,
          key: '',
          slot: `${this.slotPrefix}-slot-${++this.sequence}`,
          originalSlot: element.getAttribute('slot'),
          label: '',
          hidden: false,
          inert: false,
        };
        this.records.set(element, item);
      }
      const explicit = element.getAttribute('data-dock-id')?.trim() || element.id;
      const key = explicit && !keys.has(explicit) ? explicit : this.fallback(element);
      keys.add(key);
      if (item.key && item.key !== key) keyChanges.set(item.key, key);
      item.key = key;
      item.label =
        ['data-dock-label', 'label', 'aria-label', 'name']
          .map((name) => element.getAttribute(name)?.trim())
          .find(Boolean) || `${element.tagName === 'HR' ? 'Separator' : 'Item'} ${index + 1}`;
      const style = getComputedStyle(element);
      item.hidden =
        element.hasAttribute('hidden') ||
        style.display === 'none' ||
        ['hidden', 'collapse'].includes(style.visibility);
      item.inert = element.hasAttribute('inert');
      const slot = element.getAttribute('slot');
      if (slot !== item.slot) {
        item.originalSlot = slot;
        element.setAttribute('slot', item.slot);
      }
      return item;
    });
    const mappedOrder = (Array.isArray(this.order) ? this.order : []).map(
      (key) => keyChanges.get(key) ?? key,
    );
    const normalized = [...new Set(mappedOrder.filter((key) => keys.has(key)))];
    for (const item of next) if (!normalized.includes(item.key)) normalized.push(item.key);
    if (!Array.isArray(this.order) || this.order.join('\0') !== normalized.join('\0'))
      this.order = normalized;
    if (keyChanges.has(this.selected)) this.selected = keyChanges.get(this.selected)!;
    if (!next.some((item) => item.key === this.selected && !item.hidden && !item.inert))
      this.selected = next.find((item) => !item.hidden && !item.inert)?.key ?? '';
    this.items = next;
    if (this.drag?.item && (this.drag.item.hidden || this.drag.item.inert)) this.cancelDrag();
    // Watch open roots and nested slot changes as well as the application light DOM.
    const slots = new Set<HTMLSlotElement>();
    const visited = new Set<Element>();
    const visit = (element: Element) => {
      if (visited.has(element)) return;
      visited.add(element);
      if (element.localName === 'slot' && element.namespaceURI === 'http://www.w3.org/1999/xhtml') {
        const slot = element as HTMLSlotElement;
        slots.add(slot);
        for (const assigned of slot.assignedElements({ flatten: true })) visit(assigned);
      }
      if (element.shadowRoot) {
        this.observer.observe(element.shadowRoot, observeItems);
        for (const child of element.shadowRoot.children) visit(child);
      }
      for (const child of element.children) visit(child);
    };
    for (const child of children) visit(child);
    for (const slot of this.slots)
      if (!slots.has(slot)) slot.removeEventListener('slotchange', this.onSlotChange);
    for (const slot of slots)
      if (!this.slots.has(slot)) slot.addEventListener('slotchange', this.onSlotChange);
    this.slots = slots;
    this.observer.observe(this, observeItems);
  }
  private syncSeparatorSemantics() {
    for (const item of this.items) {
      if (item.element.tagName !== 'HR') continue;
      const current = item.element.getAttribute('aria-orientation');
      if (item.ownedOrientation === undefined || current !== item.ownedOrientation)
        item.originalOrientation = current;
      item.ownedOrientation = this.orientation === 'horizontal' ? 'vertical' : 'horizontal';
      item.element.setAttribute('aria-orientation', item.ownedOrientation);
    }
  }
  private measure() {
    const parent = this.parentElement;
    if (parent !== this.resizeParent) {
      if (this.resizeParent) this.resize.unobserve(this.resizeParent);
      this.resizeParent = parent ?? undefined;
      if (parent) this.resize.observe(parent);
    }
    const viewport = this.viewportWindow.visualViewport;
    const viewportEdges = this.snapTarget === 'viewport' && this.placement !== 'inline' && viewport;
    for (const [edge, value] of Object.entries({
      left: viewportEdges ? viewport.offsetLeft : 0,
      top: viewportEdges ? viewport.offsetTop : 0,
      right: viewportEdges
        ? this.viewportWindow.innerWidth - viewport.offsetLeft - viewport.width
        : 0,
      bottom: viewportEdges
        ? this.viewportWindow.innerHeight - viewport.offsetTop - viewport.height
        : 0,
    })) {
      const property = `--_t-dock-${edge}`;
      const pixels = `${Math.max(0, value)}px`;
      if (this.style.getPropertyValue(property) !== pixels)
        this.style.setProperty(property, pixels);
    }
    const inline = this.placement === 'inline';
    const parentStyle = parent ? getComputedStyle(parent) : undefined;
    const padding =
      inline && parentStyle
        ? Number.parseFloat(parentStyle.paddingLeft) + Number.parseFloat(parentStyle.paddingRight)
        : 0;
    this.availableWidth = Math.max(
      0,
      this.snapTarget === 'viewport' && !inline
        ? (viewport?.width ?? this.viewportWindow.innerWidth)
        : (parent?.clientWidth ?? this.viewportWindow.innerWidth) - padding,
    );
    // An inline dock can establish its parent's height. That height cannot bound the dock itself.
    this.availableHeight = Math.max(
      0,
      this.snapTarget === 'viewport' || this.placement === 'inline'
        ? (viewport?.height ?? this.viewportWindow.innerHeight)
        : (parent?.clientHeight ?? this.viewportWindow.innerHeight),
    );
    if (this.resizeStrip) {
      const style = getComputedStyle(this.resizeStrip);
      const width = Math.max(
        24,
        this.resizeStrip.clientWidth -
          Number.parseFloat(style.paddingLeft) -
          Number.parseFloat(style.paddingRight),
      );
      const value = `${width}px`;
      if (this.style.getPropertyValue('--_t-dock-item-width') !== value)
        this.style.setProperty('--_t-dock-item-width', value);
    }
  }
  private orderedItems() {
    const byKey = new Map(this.items.map((item) => [item.key, item]));
    return this.order.map((key) => byKey.get(key)).filter((item): item is DockItem => !!item);
  }
  private clampDimension(value: number, axis: 'width' | 'height', allowAuto = false) {
    if (allowAuto && value === 0) return 0;
    const minimum = axis === 'width' ? this.minWidth : this.minHeight;
    const maximum = axis === 'width' ? this.maxWidth : this.maxHeight;
    const available = axis === 'width' ? this.availableWidth : this.availableHeight;
    const low = Number.isFinite(minimum) ? Math.max(0, minimum) : 0;
    const high = Math.max(low, Number.isFinite(maximum) ? maximum : 4096);
    const limit = Math.min(high, available || high);
    return (
      Math.round(
        Math.min(limit, Math.max(Math.min(low, limit), Number.isFinite(value) ? value : low)) * 100,
      ) / 100
    );
  }
  private state(): DockState {
    return {
      order: [...this.order],
      placement: this.placement,
      orientation: this.orientation,
      width: this.width,
      height: this.height,
    };
  }
  private same(a: DockState, b: DockState) {
    return (
      a.order.length === b.order.length &&
      a.order.every((key, index) => key === b.order[index]) &&
      a.placement === b.placement &&
      a.orientation === b.orientation &&
      a.width === b.width &&
      a.height === b.height
    );
  }
  private apply(state: DockState) {
    this.captureFocus();
    this.order = [...state.order];
    this.placement = state.placement;
    this.orientation = state.orientation;
    this.width = state.width;
    this.height = state.height;
  }
  private detail(operation: DockChange['operation'], source: DockChange['source']): DockChange {
    return { operation, source, ...this.state() };
  }
  private announce(operation: DockChange['operation']) {
    const selected = this.items.find((item) => item.key === this.selected);
    this.announcement =
      operation === 'reorder'
        ? `${selected?.label ?? 'Dock item'} moved to position ${this.order.indexOf(this.selected) + 1}.`
        : operation === 'snap'
          ? `Dock position: ${this.placement}.`
          : `Dock size: ${this.width || 'automatic'} by ${this.height || 'automatic'} pixels.`;
  }
  private commit(
    operation: DockChange['operation'],
    source: 'control' | 'keyboard',
    next: DockState,
  ) {
    if (this.disabled || !this.editing) return;
    this.cancelDrag();
    if (this.same(next, this.state())) return;
    this.apply(next);
    this.emit('t-input', this.detail(operation, source));
    this.emit('t-change', this.detail(operation, source));
    this.announce(operation);
  }
  private setEditing(editing: boolean) {
    if (editing && this.disabled) return;
    if (this.editing === editing) return;
    this.captureFocus();
    if (!editing) this.cancelDrag();
    this.editing = editing;
    this.emit('t-edit', { editing });
  }
  private toggleEditor() {
    if (!this.editing || this.disabled) return;
    this.captureFocus();
    this.editorOpen = !this.editorOpen;
    this.editorField = 'dock-item';
    this.editorFocus = this.editorOpen ? activeElement(this.ownerDocument) : undefined;
  }
  private openEditor(field: string, item?: DockItem) {
    if (!this.editing || this.disabled) return;
    this.captureFocus();
    if (item) this.selected = item.key;
    this.editorField = field;
    this.editorOpen = true;
    this.editorFocus = activeElement(this.ownerDocument);
    this.requestUpdate();
  }
  protected willUpdate(changed: PropertyValues) {
    if (!this.isConnected) return;
    this.captureFocus();
    if (this.drag && !this.same(this.state(), this.drag.last)) this.cancelDrag(false);
    if ((!this.editing || this.disabled) && this.drag) this.cancelDrag();
    if (this.disabled) this.editing = false;
    if (!this.editing) this.editorOpen = false;
    if (!placements.includes(this.placement)) this.placement = 'inline';
    if (!['horizontal', 'vertical'].includes(this.orientation)) this.orientation = 'horizontal';
    if (!['start', 'end', 'center', 'justify'].includes(this.align)) this.align = 'start';
    if (!['parent', 'viewport'].includes(this.snapTarget)) this.snapTarget = 'parent';
    this.width = Number.isFinite(this.width) ? Math.max(0, this.width) : 0;
    this.height = Number.isFinite(this.height) ? Math.max(0, this.height) : 0;
    this.step = Number.isFinite(this.step) && this.step > 0 ? this.step : 8;
    if (changed.has('snapTarget') || changed.has('placement')) this.measure();
    const keys = new Set(this.items.map((item) => item.key));
    const normalized = [
      ...new Set((Array.isArray(this.order) ? this.order : []).filter((key) => keys.has(key))),
    ];
    for (const item of this.items) if (!normalized.includes(item.key)) normalized.push(item.key);
    if (
      !Array.isArray(this.order) ||
      normalized.length !== this.order.length ||
      normalized.some((key, index) => key !== this.order[index])
    )
      this.order = normalized;
  }
  protected updated() {
    if (!this.isConnected) return;
    if (this.slotsChanged) {
      // Newly assigned children can have no computed styles until their slot renders.
      this.slotsChanged = false;
      this.syncItems();
    }
    const strip = this.renderRoot.querySelector<HTMLElement>('.strip');
    if (strip && strip !== this.resizeStrip) {
      if (this.resizeStrip) this.resize.unobserve(this.resizeStrip);
      this.resizeStrip = strip;
      this.resize.observe(strip);
      this.measure();
    }
    this.syncSeparatorSemantics();
    const panel = this.renderRoot.querySelector<HTMLElement>('.editor');
    const editTrigger = this.renderRoot.querySelector<HTMLElement>('[part="edit-button"]');
    const trigger = this.renderRoot.querySelector<HTMLElement>('[part="settings-button"]');
    const selector = this.renderRoot.querySelector<HTMLSelectElement>('#dock-item');
    if (selector) selector.value = this.selected;
    if (panel && trigger) {
      if (this.editorOpen && !panel.matches(':popover-open')) panel.showPopover();
      if (!this.editorOpen && panel.matches(':popover-open')) panel.hidePopover();
      this.cleanupFloating?.();
      this.cleanupFloating = this.editorOpen ? observeFloating(trigger, panel) : undefined;
    }
    const recovery = this.recovery;
    this.recovery = undefined;
    if (recovery) {
      let target = recovery.target;
      if (!target || !this.isAvailable(target)) {
        const handles = Array.from(
          this.renderRoot.querySelectorAll<HTMLElement>('[part="item-handle"]'),
        ).filter((element) => this.isAvailable(element));
        target =
          this.editing && recovery.index >= 0
            ? handles[Math.min(recovery.index, handles.length - 1)]
            : undefined;
        target ??= this.disabled
          ? (this.renderRoot.querySelector<HTMLElement>('[part="dock"]') ?? undefined)
          : (editTrigger ?? undefined);
      }
      if (this.ownerDocument.hasFocus()) recoverFocus(recovery.from, target);
    }
    const editorFrom = this.editorFocus;
    this.editorFocus = undefined;
    if (editorFrom && this.editorOpen && this.ownerDocument.hasFocus())
      recoverFocus(editorFrom, this.renderRoot.querySelector<HTMLElement>(`#${this.editorField}`));
  }
  private moveItem(amount: number) {
    const index = this.order.indexOf(this.selected),
      destination = index + amount;
    if (index < 0 || destination < 0 || destination >= this.order.length) return;
    const next = this.state();
    [next.order[index], next.order[destination]] = [next.order[destination], next.order[index]];
    this.commit('reorder', 'control', next);
  }
  private snapped(state: DockState, placement: DockPlacement) {
    return {
      ...state,
      placement,
      orientation:
        this.autoOrient && placement !== 'inline'
          ? placement === 'left' || placement === 'right'
            ? ('vertical' as const)
            : ('horizontal' as const)
          : state.orientation,
    };
  }
  private changePlacement(event: Event) {
    const placement = (event.currentTarget as HTMLSelectElement).value as DockPlacement;
    this.commit('snap', 'control', this.snapped(this.state(), placement));
  }
  private changeDimension(event: Event, axis: 'width' | 'height') {
    const input = event.currentTarget as HTMLInputElement;
    if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) {
      input.value = String(this[axis]);
      return;
    }
    this.commit('resize', 'control', {
      ...this.state(),
      [axis]: this.clampDimension(input.valueAsNumber, axis, true),
    });
    input.value = String(this[axis]);
  }
  private onMoveKey(event: KeyboardEvent) {
    const edge = (
      { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'top', ArrowDown: 'bottom' } as const
    )[event.key as 'ArrowLeft'];
    if (!edge || this.disabled || !this.editing) return;
    event.preventDefault();
    this.commit('snap', 'keyboard', this.snapped(this.state(), edge));
  }
  private onResizeKey(event: KeyboardEvent) {
    if (
      this.disabled ||
      !this.editing ||
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    )
      return;
    event.preventDefault();
    const axis = event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 'width' : 'height';
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const box = this.getBoundingClientRect();
    const value = this[axis] || box[axis];
    this.commit('resize', 'keyboard', {
      ...this.state(),
      [axis]: this.clampDimension(value + direction * this.step * (event.shiftKey ? 10 : 1), axis),
    });
  }
  private beginDrag(event: PointerEvent, operation: DockChange['operation'], item?: DockItem) {
    if (
      this.disabled ||
      !this.editing ||
      this.drag ||
      event.button !== 0 ||
      !event.isPrimary ||
      item?.hidden ||
      item?.inert
    )
      return;
    const handle = event.currentTarget as HTMLElement,
      capture = this.renderRoot.querySelector<HTMLElement>('[part="dock"]')!,
      box = this.getBoundingClientRect(),
      before = this.state();
    handle.focus({ preventScroll: true });
    this.drag = {
      pointer: event.pointerId,
      handle: capture,
      operation,
      item,
      before,
      last: before,
      x: event.clientX,
      y: event.clientY,
      width: box.width,
      height: box.height,
      started: false,
    };
    if (item) this.selected = item.key;
    capture.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  private reorderAt(drag: DockDrag, event: PointerEvent) {
    const strip = this.renderRoot.querySelector<HTMLElement>('.strip')!;
    const horizontal = this.orientation === 'horizontal',
      box = strip.getBoundingClientRect();
    const coordinate = horizontal ? event.clientX : event.clientY;
    const low = horizontal ? box.left : box.top,
      high = horizontal ? box.right : box.bottom;
    if (coordinate < low + 24) {
      if (horizontal) strip.scrollLeft -= 16;
      else strip.scrollTop -= 16;
    } else if (coordinate > high - 24) {
      if (horizontal) strip.scrollLeft += 16;
      else strip.scrollTop += 16;
    }
    const direction = horizontal && getComputedStyle(this).direction === 'rtl' ? -1 : 1;
    const remaining = this.order.filter((key) => key !== drag.item!.key);
    const before = this.orderedItems()
      .filter((item) => item !== drag.item && !item.hidden)
      .find((item) => {
        const rect = this.renderRoot
          .querySelector(`[data-item-slot="${item.slot}"]`)!
          .getBoundingClientRect();
        const center = horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
        return coordinate * direction < center * direction;
      });
    remaining.splice(before ? remaining.indexOf(before.key) : remaining.length, 0, drag.item!.key);
    return { ...this.state(), order: remaining };
  }
  private nearestEdge(event: PointerEvent): Exclude<DockPlacement, 'inline'> {
    const viewport = this.viewportWindow.visualViewport,
      parent = this.parentElement;
    const box = parent?.getBoundingClientRect();
    const viewportTarget = this.snapTarget === 'viewport' || !box;
    const left = viewportTarget ? (viewport?.offsetLeft ?? 0) : box!.left + parent!.clientLeft;
    const top = viewportTarget ? (viewport?.offsetTop ?? 0) : box!.top + parent!.clientTop;
    const width = viewportTarget
      ? (viewport?.width ?? this.viewportWindow.innerWidth)
      : parent!.clientWidth;
    const height = viewportTarget
      ? (viewport?.height ?? this.viewportWindow.innerHeight)
      : parent!.clientHeight;
    const edges: [Exclude<DockPlacement, 'inline'>, number][] = [
      ['top', Math.abs(event.clientY - top)],
      ['bottom', Math.abs(event.clientY - top - height)],
      ['left', Math.abs(event.clientX - left)],
      ['right', Math.abs(event.clientX - left - width)],
    ];
    edges.sort((a, b) => a[1] - b[1]);
    return edges[0][0];
  }
  private previewDrag(event: PointerEvent) {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointer) return;
    if (
      this.disabled ||
      !this.editing ||
      (drag.item && (!this.records.has(drag.item.element) || drag.item.hidden || drag.item.inert))
    ) {
      this.cancelDrag();
      return;
    }
    if (!drag.started && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
    drag.started = true;
    const next =
      drag.operation === 'reorder'
        ? this.reorderAt(drag, event)
        : drag.operation === 'snap'
          ? this.snapped(this.state(), this.nearestEdge(event))
          : {
              ...this.state(),
              width:
                event.clientX === drag.x
                  ? drag.before.width
                  : this.clampDimension(drag.width + event.clientX - drag.x, 'width'),
              height:
                event.clientY === drag.y
                  ? drag.before.height
                  : this.clampDimension(drag.height + event.clientY - drag.y, 'height'),
            };
    if (this.same(next, this.state())) return;
    this.apply(next);
    drag.last = this.state();
    this.emit('t-input', this.detail(drag.operation, 'pointer'));
    // An application handler owns any state that it changed during the event.
    if (!this.same(this.state(), drag.last)) this.cancelDrag(false);
  }
  private releaseDrag(drag: DockDrag) {
    this.drag = undefined;
    if (drag.handle.hasPointerCapture(drag.pointer))
      drag.handle.releasePointerCapture(drag.pointer);
  }
  private endDrag(event: PointerEvent) {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointer) return;
    this.previewDrag(event);
    if (this.drag !== drag) return;
    const changed = !this.same(drag.before, this.state());
    this.releaseDrag(drag);
    if (changed) {
      this.emit('t-change', this.detail(drag.operation, 'pointer'));
      this.announce(drag.operation);
    }
  }
  private cancelDrag(restore = true) {
    const drag = this.drag;
    if (!drag) return;
    this.releaseDrag(drag);
    if (restore && this.same(this.state(), drag.last)) this.apply(drag.before);
  }
  private cancelPointer(event: PointerEvent) {
    if (this.drag?.pointer === event.pointerId) this.cancelDrag();
  }
  private editorKey(event: KeyboardEvent) {
    if (event.key !== 'Escape' || event.defaultPrevented || (!this.editing && !this.drag)) return;
    event.preventDefault();
    this.drag ? this.cancelDrag() : this.setEditing(false);
  }
  render() {
    const ordered = this.orderedItems(),
      index = this.order.indexOf(this.selected);
    const width = this.width ? this.clampDimension(this.width, 'width') : undefined;
    const height = this.height ? this.clampDimension(this.height, 'height') : undefined;
    return html` <div
        class="dock"
        part="dock"
        role="group"
        aria-label=${this.label?.trim() || 'Dock'}
        tabindex="-1"
        style=${styleMap({
          width: width === undefined ? undefined : `${width}px`,
          height: height === undefined ? undefined : `${height}px`,
          maxWidth: this.availableWidth ? `${this.availableWidth}px` : undefined,
          maxHeight: this.availableHeight ? `${this.availableHeight}px` : undefined,
        })}
        @focusin=${this.onFocusIn}
        @focusout=${this.onFocusOut}
        @pointermove=${this.previewDrag}
        @pointerup=${this.endDrag}
        @pointercancel=${this.cancelPointer}
        @lostpointercapture=${this.cancelPointer}
      >
        <div class="strip" part="strip">
          <div class="items">
            ${repeat(
              ordered,
              (item) => item.slot,
              (item) =>
                html` <div
                  class="item"
                  part="item"
                  data-item-slot=${item.slot}
                  ?hidden=${item.hidden}
                >
                  <button
                    type="button"
                    class="handle"
                    part="item-handle"
                    ?hidden=${!this.editing || item.inert}
                    ?disabled=${this.disabled}
                    aria-label=${`Move ${item.label}`}
                    @click=${() => this.openEditor('dock-item', item)}
                    @pointerdown=${(event: PointerEvent) => this.beginDrag(event, 'reorder', item)}
                    @keydown=${(event: KeyboardEvent) => {
                      if (event.key === 'Escape' && !event.defaultPrevented) {
                        event.preventDefault();
                        this.drag ? this.cancelDrag() : this.setEditing(false);
                      }
                    }}
                  >
                    ${this.orientation === 'horizontal' ? '↔' : '↕'}
                  </button>
                  <slot name=${item.slot}></slot>
                </div>`,
            )}
          </div>
        </div>
        <div class="tools" @keydown=${this.editorKey}>
          <button
            part="edit-button"
            type="button"
            ?disabled=${this.disabled}
            aria-pressed=${String(this.editing)}
            aria-label=${this.editing ? 'Finish editing dock' : 'Edit dock'}
            @click=${() => this.setEditing(!this.editing)}
          >
            ${this.editing ? 'Done' : 'Edit'}
          </button>
          <button
            part="settings-button"
            type="button"
            ?hidden=${!this.editing}
            ?disabled=${this.disabled}
            aria-expanded=${String(this.editorOpen)}
            aria-haspopup="dialog"
            @click=${this.toggleEditor}
          >
            Dock settings
          </button>
          <button
            part="move-handle"
            class="handle"
            type="button"
            ?hidden=${!this.editing}
            ?disabled=${this.disabled}
            aria-label="Move dock"
            aria-describedby="dock-move-help"
            @click=${() => this.openEditor('dock-position')}
            @keydown=${this.onMoveKey}
            @pointerdown=${(event: PointerEvent) => this.beginDrag(event, 'snap')}
          >
            ↔
          </button>
          <button
            part="resize-handle"
            class="handle resize"
            type="button"
            ?hidden=${!this.editing}
            ?disabled=${this.disabled}
            aria-label="Resize dock"
            aria-describedby="dock-size-help"
            @click=${() => this.openEditor('dock-width')}
            @keydown=${this.onResizeKey}
            @pointerdown=${(event: PointerEvent) => this.beginDrag(event, 'resize')}
          >
            ↘
          </button>
        </div>
      </div>
      <div
        id="dock-editor"
        class="editor"
        part="editor"
        popover="manual"
        role="dialog"
        aria-label=${`${this.label?.trim() || 'Dock'} editor`}
        @keydown=${this.editorKey}
        @focusin=${this.onFocusIn}
        @focusout=${this.onFocusOut}
      >
        <p>
          Move items with the buttons. Drag a handle to preview a change. Escape cancels a drag.
        </p>
        <label for="dock-item">Item</label>
        <select
          id="dock-item"
          .value=${this.selected}
          ?disabled=${this.disabled || !ordered.some((item) => !item.hidden && !item.inert)}
          @change=${(event: Event) => {
            this.selected = (event.currentTarget as HTMLSelectElement).value;
          }}
        >
          ${ordered.filter((item) => !item.hidden && !item.inert).map((item) => html`<option value=${item.key}>${item.label}</option>`)}
        </select>
        <div class="actions">
          <button
            type="button"
            ?disabled=${this.disabled || index <= 0}
            @click=${() => this.moveItem(-1)}
          >
            Move earlier
          </button>
          <button
            type="button"
            ?disabled=${this.disabled || index < 0 || index >= this.order.length - 1}
            @click=${() => this.moveItem(1)}
          >
            Move later
          </button>
        </div>
        <label for="dock-position">Dock position</label>
        <select
          id="dock-position"
          .value=${this.placement}
          ?disabled=${this.disabled}
          @change=${this.changePlacement}
        >
          ${placements.map((placement) => html`<option value=${placement}>${placement[0].toUpperCase() + placement.slice(1)}</option>`)}
        </select>
        <p id="dock-move-help">The move handle uses arrow keys to select a physical edge.</p>
        <label for="dock-width">Width (px)</label>
        <input
          id="dock-width"
          type="number"
          min="0"
          step="any"
          .value=${String(this.width)}
          ?disabled=${this.disabled}
          aria-describedby="dock-size-help"
          @change=${(event: Event) => this.changeDimension(event, 'width')}
        />
        <label for="dock-height">Height (px)</label>
        <input
          id="dock-height"
          type="number"
          min="0"
          step="any"
          .value=${String(this.height)}
          ?disabled=${this.disabled}
          aria-describedby="dock-size-help"
          @change=${(event: Event) => this.changeDimension(event, 'height')}
        />
        <p id="dock-size-help">
          Zero uses automatic size. The resize handle changes width with horizontal arrows and
          height with vertical arrows. Shift uses a larger step.
        </p>
        <button type="button" @click=${() => this.setEditing(false)}>Finish editing</button>
      </div>
      <span class="visually-hidden" part="status" role="status" aria-live="polite"
        >${this.announcement}</span
      >`;
  }
}
if (!customElements.get('t-dock')) customElements.define('t-dock', TDock);
declare global {
  interface HTMLElementTagNameMap {
    't-dock': TDock;
  }
}
