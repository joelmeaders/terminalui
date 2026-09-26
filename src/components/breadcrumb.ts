import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}
/**
 * Native navigation links. The last item is current unless another item is marked current.
 * Complete labels wrap at narrow widths. Links have a minimum 24-by-24 CSS pixel target.
 *
 * @csspart nav - Navigation landmark.
 *
 * @csspart link - Navigation links.
 */
export class TBreadcrumb extends TerminalElement {
  static properties = { label: {}, items: { attribute: false } };
  /** Navigation landmark name. */
  label = 'Breadcrumb';
  /** Ordered ancestors followed by the current page. Use trusted navigation URLs. */
  items: BreadcrumbItem[] = [];
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      ol {
        display: flex;
        flex-wrap: wrap;
        gap: var(--t-space-2, 8px);
        padding: 0;
        margin: 0;
        list-style: none;
      }
      li {
        display: flex;
        min-width: 0;
        max-width: 100%;
        gap: var(--t-space-2, 8px);
        align-items: baseline;
        overflow-wrap: anywhere;
      }
      li > span:not(.separator) {
        min-width: 0;
      }
      a {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        min-width: 24px;
        max-width: 100%;
        color: var(--t-accent);
        text-underline-offset: 3px;
      }
      [aria-current='page'] {
        color: var(--t-text);
      }
      .separator {
        flex: none;
        color: var(--t-muted);
      }
    `,
  ];
  private canNavigate(href: string) {
    try {
      return ['http:', 'https:'].includes(new URL(href, this.ownerDocument.baseURI).protocol);
    } catch {
      return false;
    }
  }
  render() {
    const explicit = this.items.findIndex((item) => item.current);
    const current = explicit < 0 ? this.items.length - 1 : explicit;
    return html`<nav part="nav" aria-label=${this.label}>
      <ol>
        ${this.items.map((item, index) => html`<li>${index ? html`<span class="separator" aria-hidden="true">/</span>` : ''}${item.href && this.canNavigate(item.href) ? html`<a part="link" href=${item.href} aria-current=${index === current ? 'page' : 'false'}>${item.label}</a>` : html`<span aria-current=${index === current ? 'page' : 'false'}>${item.label}</span>`}</li>`)}
      </ol>
    </nav>`;
  }
}
if (!customElements.get('t-breadcrumb')) customElements.define('t-breadcrumb', TBreadcrumb);
declare global {
  interface HTMLElementTagNameMap {
    't-breadcrumb': TBreadcrumb;
  }
}
