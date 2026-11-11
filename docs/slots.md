# Slots and icons

A slot is a place where you can put your own content inside a component. Your application still owns that content and its event handlers. Use the same `slot="name"` attribute in HTML, Angular, Vue, and React. The global framework selector shows complete examples above.

## Choose the slot

- **Button, Link, Accordion, Menu, Popover:** `start` and `end` place icons or short, non-interactive content beside the action label.
- **Badge:** `start` replaces the default status dot. `end` adds short trailing content.
- **Input, Password Input, Number Input, Select, Combobox:** `start` and `end` place icons, short prefixes/suffixes, or named actions beside the native field.
- **Alert:** `icon` replaces the default decorative status symbol.
- **Toast:** `icon` adds a decorative status icon. `actions` adds independent notification actions.
- **Icon Button:** the default slot replaces its icon while keeping the button's `label`.

`start` and `end` follow the text direction. In a right-to-left region, `start` is on the right. Empty optional slots add no space. Removing a custom icon restores the Badge dot or Alert symbol.

Card, Dialog, Drawer, Empty State, Popover, and the layout components retain their existing content slots. Use their API tables for exact names. For example, a Card's `heading` slot can contain a real heading and an icon.

## Icons beside a label

```html
<t-button>
  <t-icon slot="start" name="download"></t-icon>
  Download report
  <t-icon slot="end" name="chevron-right"></t-icon>
</t-button>

<t-badge variant="success">
  <t-icon slot="start" name="check" size="14"></t-icon>
  Ready
</t-badge>
```

Import both components when using individual entry points. Use registered provider icons in exactly the same slots. The Icon manual explains provider imports and registration.

```js
import '@joelmeaders/terminalui/components/button';
import '@joelmeaders/terminalui/components/icon';
import '@joelmeaders/terminalui/themes.css';
```

Keep the visible action label. A `t-icon` without `label` is decorative and does not repeat that label. For raw SVGs, use `aria-hidden="true"` and `focusable="false"`. Put the slot attribute on an element that is a direct child of the component. To group several items in one slot, put them inside one element and add the slot attribute to that element.

For an action with only an icon, use `t-icon-button`. Give it a specific `label`. Do not put buttons, links, or other interactive controls inside a Button, Link, Badge, Accordion summary, Menu trigger, or Popover trigger slot.

## An input action

This example assumes a bundler and the package's shared theme CSS. Importing Icon Button also registers its default icon component.

```html
<t-input id="query" name="query" label="Search archive" type="search">
  <t-icon slot="start" name="search"></t-icon>
  <t-icon-button slot="end" name="close" label="Clear search"></t-icon-button>
</t-input>
```

```js
import '@joelmeaders/terminalui/components/input';
import '@joelmeaders/terminalui/components/icon-button';
import '@joelmeaders/terminalui/themes.css';

const input = document.querySelector('#query');
input.querySelector('[slot="end"]').addEventListener('click', () => {
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  input.focus();
});
```

The native field keeps its own label, help, validation, and form value. Content beside the field does not become part of its accessible name, the name assistive technology announces. Include essential units in `label` or `help`, even when you also show a unit in a slot.

Input actions have their own place in the keyboard tab order. A disabled field or disabled fieldset makes its affix slots inert, so their actions cannot be used. The component does not overwrite your action's disabled property. A read-only field can still offer a copy or help action. Your handler must respect read-only state if it would change the value.

Use short affixes and named buttons. Keep larger content outside the control. The `control` CSS part styles the shared field frame. Existing `input` and `select` parts still address the native element.

## Notification actions

```html
<t-toast id="notice" message="Draft archived.">
  <t-icon slot="icon" name="check"></t-icon>
  <t-button slot="actions" variant="secondary">Undo archive</t-button>
</t-toast>
```

The application owns the Undo action and the operation it reverses. Handle the action's `click` and complete the operation. Then call `notice.close()` when appropriate. The Toast story includes a working local example.

Default-slot content replaces the `message` property. Formatting whitespace between named slots does not hide the message. Changes to that content are detected, including text updates and removal.

Notification actions are outside the message live region. Focus on an action pauses auto-dismiss. Closing hides the icon and actions and restores focus when focus was inside the notification. Use a persistent notification when its action must remain available.

## Framework and styling rules

- Vue: use native `slot="start"` attributes on children of these Web Components. Vue's `#start` template syntax is for Vue component slots.
- React: import the typed wrappers, then use `slot="start"` on the child component. Use normal React event handlers for actions.
- Angular: use the custom-element setup from the framework guide and native `slot="start"` attributes. Use Angular event bindings on slotted actions.
- Style your light-DOM content with application CSS. Use `t-button` or `t-icon-button` for actions that should inherit the kit's control styling. Native buttons need your own theme styles.
- Test the complete composition. A slot cannot correct missing labels, low-contrast artwork, or invalid nested interactive controls.
