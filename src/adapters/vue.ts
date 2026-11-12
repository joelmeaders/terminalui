import { onBeforeUnmount, watch, type Ref } from 'vue';

/** Bind a Vue ref to a custom element property. Call within setup(). */
export function useHullframeModel<E extends HTMLElement, K extends keyof E>(
  element: Ref<E | null>,
  model: Ref<E[K]>,
  property: K,
  eventName = 'input',
): void {
  let removeListener = () => {};
  const stopElement = watch(
    element,
    (control) => {
      removeListener();
      if (!control) return;
      control[property] = model.value;
      const onInput = () => {
        model.value = control[property];
      };
      control.addEventListener(eventName, onInput);
      removeListener = () => control.removeEventListener(eventName, onInput);
    },
    { immediate: true, flush: 'post' },
  );
  const stopModel = watch(
    model,
    (value) => {
      if (element.value && !Object.is(element.value[property], value))
        element.value[property] = value;
    },
    { flush: 'sync' },
  );
  onBeforeUnmount(() => {
    removeListener();
    stopElement();
    stopModel();
  });
}

/** @deprecated Use useHullframeModel. */
export { useHullframeModel as useTerminalModel };
