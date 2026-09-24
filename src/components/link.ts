import { css, html, nothing } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
/**
 * Native anchor with safe URL schemes and external-window protection.
 *
 * @slot - Link text or content. Provide label when the slot contains only an icon.
 *
 * @csspart link - Native anchor.
 */
export class TLink extends TerminalElement {
  static properties = {
    href: {},
    target: {},
    rel: {},
    label: {},
    external: { type: Boolean },
    disabled: { type: Boolean, reflect: true },
    download: {},
  };
  /** Navigation URL. Relative, HTTP(S), mailto, and tel links are supported. */
  href = '';
  /** Native target browsing context. */
  target = '';
  /** Additional native link relationships. */
  rel = '';
  /** Optional accessible label for icon-only links. */
  label = '';
  /** Opens a new tab and adds an accessible new-tab notice. */
  external = false;
  /** Removes navigation and the link from the tab sequence. */
  disabled = false;
  /** Optional download filename. Browser restrictions still apply. */
  download?: string;
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline;
      }
      a {
        color: var(--t-accent);
        text-decoration: underline;
        text-underline-offset: 0.2em;
        overflow-wrap: anywhere;
      }
      a:hover {
        text-decoration-thickness: 2px;
      }
      [aria-disabled='true'] {
        color: var(--t-muted);
        cursor: not-allowed;
      }
      .external {
        margin-inline-start: 0.3em;
      }
    `,
  ];
  private safeHref() {
    if (!this.href || this.disabled) return undefined;
    try {
      return ['http:', 'https:', 'mailto:', 'tel:'].includes(
        new URL(this.href, this.ownerDocument.baseURI).protocol,
      )
        ? this.href
        : undefined;
    } catch {
      return undefined;
    }
  }
  focus(options?: FocusOptions) {
    this.renderRoot.querySelector('a')?.focus(options);
  }
  render() {
    const href = this.safeHref(),
      target = this.external ? '_blank' : this.target,
      newTab = target.toLowerCase() === '_blank';
    const rel = [
      ...new Set([
        ...this.rel.split(/\s+/).filter(Boolean),
        ...(newTab ? ['noopener', 'noreferrer'] : []),
      ]),
    ].join(' ');
    return html`<a
      part="link"
      href=${href ?? nothing}
      role=${href ? nothing : 'link'}
      tabindex=${href ? nothing : -1}
      aria-disabled=${href ? nothing : 'true'}
      aria-label=${this.label ? `${this.label}${newTab ? ' (opens in a new tab)' : ''}` : nothing}
      target=${target || nothing}
      rel=${rel || nothing}
      download=${this.download ?? nothing}
      ><slot></slot
      >${newTab ? html`<span class="external" aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span>` : nothing}</a
    >`;
  }
}
if (!customElements.get('t-link')) customElements.define('t-link', TLink);
declare global {
  interface HTMLElementTagNameMap {
    't-link': TLink;
  }
}
