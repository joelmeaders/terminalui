import { createApp, h, ref } from 'vue';
import '@terminal-kit/core/components/input';
import '@terminal-kit/core/components/button';
import '@terminal-kit/core/themes.css';
import './shared.css';
import type { TInput } from '../src';
createApp({
  setup() {
    const value = ref('Initial');
    return () =>
      h('div', [
        h('h1', 'Vue'),
        h('t-input', {
          label: 'Name',
          value: value.value,
          onInput: (event: Event) => {
            value.value = (event.target as TInput).value;
          },
        }),
        h(
          't-button',
          {
            onClick: () => {
              value.value = 'Updated';
            },
          },
          () => 'Update from app',
        ),
        h('output', value.value),
      ]);
  },
}).mount('#example');
