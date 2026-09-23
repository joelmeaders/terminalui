import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@terminal-kit/core/components/input';
import '@terminal-kit/core/components/button';
import '@terminal-kit/core/themes.css';
import './shared.css';
import type { TInput } from '../src';
function Example() {
  const [value, setValue] = useState('Initial');
  return h(
    'div',
    null,
    h('h1', null, 'React'),
    h('t-input', {
      label: 'Name',
      value,
      onInput: (event: Event) => setValue((event.target as TInput).value),
    }),
    h('t-button', { onClick: () => setValue('Updated') }, 'Update from app'),
    h('output', null, value),
  );
}
createRoot(document.getElementById('example')!).render(h(Example));
