import { css, html, nothing, type PropertyValues } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
/**
 * Image or initials with an accessible name.
 * @csspart avatar - Outer frame.
 * @csspart image - Image.
 */
export class TAvatar extends TerminalElement {
  static properties = { name: {}, src: {}, size: { reflect: true }, failed: { state: true } };
  name = '';
  src = '';
  size = 'medium';
  private failed = false;
  static styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
        vertical-align: middle;
      }
      .avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        background: var(--t-raised);
        color: var(--t-accent);
        border: var(--t-line-width, 1px) solid var(--t-border);
        box-shadow: var(--_t-edge-glow);
        font-size: 14px;
      }
      :host([size='small']) .avatar {
        width: 32px;
        height: 32px;
        font-size: 11px;
      }
      :host([size='large']) .avatar {
        width: 64px;
        height: 64px;
        font-size: 22px;
      }
      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    `,
  ];
  protected willUpdate(changed: PropertyValues) {
    if (changed.has('src')) this.failed = false;
  }
  render() {
    const initials =
      this.name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => [...word][0])
        .join('')
        .toUpperCase() || '?';
    return html`<span
      class="avatar"
      part="avatar"
      role=${this.name ? 'img' : nothing}
      aria-label=${this.name || nothing}
      aria-hidden=${this.name ? nothing : 'true'}
      >${
        this.src && !this.failed
          ? html`<img
              part="image"
              src=${this.src}
              alt=""
              @error=${() => {
                this.failed = true;
              }}
            />`
          : initials
      }</span
    >`;
  }
}
if (!customElements.get('t-avatar')) customElements.define('t-avatar', TAvatar);
declare global {
  interface HTMLElementTagNameMap {
    't-avatar': TAvatar;
  }
}
