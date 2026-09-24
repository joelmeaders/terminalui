import { css, html, svg, nothing } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { getRegisteredIcon, subscribeIcons } from '../internal/icon-registry';

/** Built-in or registered provider icon. Supply a label for meaningful icons; omit it for decoration. @csspart svg - Vector artwork. */
export class TIcon extends TerminalElement {
  static properties = { name: {}, label: {}, size: { type: Number } };
  name: string = 'info';
  label = '';
  size = 20;
  private unsubscribe?: () => void;
  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = subscribeIcons((name) => {
      if (name === this.name) this.requestUpdate();
    });
    this.requestUpdate();
  }
  disconnectedCallback() {
    this.unsubscribe?.();
    super.disconnectedCallback();
  }
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
        flex: none;
        color: inherit;
      }
      svg {
        display: block;
        fill: none;
        stroke: currentColor;
        stroke-width: calc(var(--t-line-width, 1px) + 0.5px);
        stroke-linecap: square;
        stroke-linejoin: miter;
      }
      svg[data-provider] {
        fill: currentColor;
        stroke: none;
        stroke-width: 0;
      }
    `,
  ];
  render() {
    const size = Number.isFinite(this.size) ? Math.max(8, Math.min(this.size, 128)) : 20;
    const registered = getRegisteredIcon(this.name);
    const paths = Object.hasOwn(icons, this.name) ? icons[this.name as IconName] : icons.info;
    return html`<svg
      part="svg"
      viewBox=${registered?.viewBox ?? '0 0 24 24'}
      ?data-provider=${!!registered}
      focusable="false"
      width=${size}
      height=${size}
      role=${this.label ? 'img' : nothing}
      aria-label=${this.label || nothing}
      aria-hidden=${this.label ? nothing : 'true'}
    >
      ${registered ? unsafeSVG(registered.body) : paths.map((path) => svg`<path d=${path}></path>`)}
    </svg>`;
  }
}
export const icons = {
  add: ['M12 4v16M4 12h16'],
  remove: ['M4 12h16'],
  close: ['m5 5 14 14M19 5 5 19'],
  check: ['m4 12 5 5L20 6'],
  search: ['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM15 15l6 6'],
  'chevron-left': ['m15 5-7 7 7 7'],
  'chevron-right': ['m9 5 7 7-7 7'],
  'chevron-up': ['m5 15 7-7 7 7'],
  'chevron-down': ['m5 9 7 7 7-7'],
  menu: ['M3 5h18M3 12h18M3 19h18'],
  more: ['M4 11h2v2H4zM11 11h2v2h-2zM18 11h2v2h-2z'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 11v6M12 7v1'],
  warning: ['m12 2 10 19H2ZM12 8v6M12 17v1'],
  error: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-4-14 8 8M16 8l-8 8'],
  'arrow-up-right': ['M5 19 19 5M5 5h14v14'],
  copy: ['M8 8h13v13H8ZM16 4V2H2v14h2'],
  download: ['M12 2v13m-5-5 5 5 5-5M3 16v6h18v-6'],
  upload: ['M12 16V3m-5 5 5-5 5 5M3 16v6h18v-6'],
  user: ['M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 22v-3a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v3'],
  folder: ['M2 6V3h7l3 3h10v15H2Z'],
  file: ['M4 2h10l6 6v14H4ZM14 2v6h6'],
  settings: ['M4 4v16M12 4v16M20 4v16M1 8h6M9 16h6M17 10h6'],
  sun: [
    'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2',
  ],
  moon: ['M21 13A9 9 0 0 1 11 3 9 9 0 1 0 21 13Z'],
  eye: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
} as const;
export type IconName = keyof typeof icons;
if (!customElements.get('t-icon')) customElements.define('t-icon', TIcon);
declare global {
  interface HTMLElementTagNameMap {
    't-icon': TIcon;
  }
}
