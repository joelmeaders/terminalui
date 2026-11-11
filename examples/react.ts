import { createElement as h, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TInput } from '@joelmeaders/terminalui/react/input';
import { TButton } from '@joelmeaders/terminalui/react/button';
import { TCheckbox } from '@joelmeaders/terminalui/react/checkbox';
import '@joelmeaders/terminalui/themes.css';
import './shared.css';
import type { TInput as TInputElement } from '@joelmeaders/terminalui/components/input';
function Example() {
  const input = useRef<TInputElement | null>(null);
  const [value, setValue] = useState('Initial');
  const [checked, setChecked] = useState(false);
  const [disabled, setDisabled] = useState(false);
  return h(
    'div',
    null,
    h('h1', null, 'React'),
    h(TInput, {
      ref: input,
      label: 'Name',
      value,
      disabled,
      onInput: (event: Event) => setValue((event.target as TInputElement).value),
    }),
    h(TButton, { onClick: () => setValue('Updated') }, 'Update from app'),
    h(TButton, { onClick: () => input.current?.focus() }, 'Focus name'),
    h(TCheckbox, {
      label: 'Subscribe',
      checked,
      onInput: (event: Event) => setChecked((event.target as HTMLInputElement).checked),
    }),
    h('span', { 'data-testid': 'checked' }, String(checked)),
    h(TButton, { onClick: () => setDisabled(!disabled) }, 'Toggle disabled'),
    h(
      TButton,
      {
        onClick: () => {
          setValue('Initial');
          setChecked(false);
        },
      },
      'Reset from app',
    ),
    h('output', null, value),
  );
}
createRoot(document.getElementById('example')!).render(h(Example));
