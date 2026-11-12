import { createApp, h, ref } from 'vue';
import { useHullframeModel } from '@joelmeaders/hullframe/vue';
import '@joelmeaders/hullframe/components/input';
import '@joelmeaders/hullframe/components/button';
import '@joelmeaders/hullframe/components/checkbox';
import '@joelmeaders/hullframe/themes.css';
import './shared.css';
import type { TInput } from '@joelmeaders/hullframe/components/input';
import type { TCheckbox } from '@joelmeaders/hullframe/components/checkbox';
createApp({
  setup() {
    const value = ref('Initial');
    const control = ref<TInput | null>(null);
    useHullframeModel(control, value, 'value');
    const checked = ref(false);
    const checkbox = ref<TCheckbox | null>(null);
    const disabled = ref(false);
    useHullframeModel(checkbox, checked, 'checked');
    return () =>
      h('div', [
        h('h1', 'Vue'),
        h('t-input', {
          ref: control,
          label: 'Name',
          value: value.value,
          disabled: disabled.value,
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
        h('t-checkbox', { ref: checkbox, label: 'Subscribe', checked: checked.value }),
        h('span', { 'data-testid': 'checked' }, String(checked.value)),
        h(
          't-button',
          {
            onClick: () => {
              disabled.value = !disabled.value;
            },
          },
          () => 'Toggle disabled',
        ),
        h(
          't-button',
          {
            onClick: () => {
              value.value = 'Initial';
              checked.value = false;
            },
          },
          () => 'Reset from app',
        ),
      ]);
  },
}).mount('#example');
