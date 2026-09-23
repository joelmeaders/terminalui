import { defineConfig } from 'vite';
export default defineConfig({
  resolve: { dedupe: ['lit', 'lit-html', 'lit-element', '@lit/reactive-element'] },
  build: { outDir: 'demo-dist' },
});
