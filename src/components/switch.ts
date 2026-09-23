import { TCheckbox } from './checkbox';

/** On/off switch. Uses a native checkbox with the switch role and checkbox form behavior. */
export class TSwitch extends TCheckbox {
  switch = true;
}
if (!customElements.get('t-switch')) customElements.define('t-switch', TSwitch);
declare global {
  interface HTMLElementTagNameMap {
    't-switch': TSwitch;
  }
}
