import { css, html } from 'lit';
import { baseStyles, TerminalElement } from '../internal/base';
/**
 * Responsive flex layout. Gap follows --t-space or --t-stack-gap.
 * @slot - Items.
 * @csspart layout - Flex container.
 * @cssprop --t-stack-gap - gap.
 */
export class TStack extends TerminalElement {
  static properties = {
    direction: { reflect: true },
    align: { reflect: true },
    justify: { reflect: true },
    wrap: { type: Boolean, reflect: true },
  };
  direction = 'column';
  align = 'stretch';
  justify = 'start';
  wrap = false;
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      .layout {
        display: flex;
        flex-direction: column;
        gap: var(--t-stack-gap, var(--t-space, 16px));
        min-width: 0;
        align-items: stretch;
      }
      :host([direction='row']) .layout {
        flex-direction: row;
      }
      :host([wrap]) .layout {
        flex-wrap: wrap;
      }
      :host([align='center']) .layout {
        align-items: center;
      }
      :host([align='start']) .layout {
        align-items: flex-start;
      }
      :host([align='end']) .layout {
        align-items: flex-end;
      }
      :host([justify='center']) .layout {
        justify-content: center;
      }
      :host([justify='end']) .layout {
        justify-content: flex-end;
      }
      :host([justify='between']) .layout {
        justify-content: space-between;
      }
      ::slotted(*) {
        min-width: 0;
      }
    `,
  ];
  render() {
    return html`<div class="layout" part="layout"><slot></slot></div>`;
  }
}
if (!customElements.get('t-stack')) customElements.define('t-stack', TStack);
declare global {
  interface HTMLElementTagNameMap {
    't-stack': TStack;
  }
}
