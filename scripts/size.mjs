import { build } from 'esbuild';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { readFile, readdir } from 'node:fs/promises';
const count = (await readdir('src/components')).filter((file) => file.endsWith('.ts')).length;
const scenarios = {
  'One button': 'import "./src/components/button.ts";',
  'Form controls':
    'import "./src/components/input.ts"; import "./src/components/select.ts"; import "./src/components/checkbox.ts";',
  [`All ${count} components`]: 'import "./src/index.ts";',
  'One Ionicons icon':
    'import "./src/components/icon.ts"; import {registerIcon} from "./src/icons.ts"; import {rocketOutline} from "ionicons/icons"; registerIcon("rocket", rocketOutline);',
};
console.log('Production JS including Lit. CSS themes and fonts excluded.');
for (const [name, contents] of Object.entries(scenarios)) {
  const result = await build({
    stdin: { contents, resolveDir: process.cwd() },
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2022',
    write: false,
  });
  const bytes = result.outputFiles[0].contents;
  const gzipBytes = gzipSync(bytes).length;
  // The complete catalog includes collection, overlay, and form behaviors. Keep small imports strict.
  // 50 components plus optional icon registration measured about 39.3 kB gzip.
  const budget =
    name === 'One button'
      ? 8000
      : name === 'Form controls'
        ? 9500
        : name === 'One Ionicons icon'
          ? 12000
          : 42000;
  if (bytes.length === 0 || gzipBytes > budget)
    throw new Error(
      `${name}: ${gzipBytes} B exceeds its ${budget} B gzip budget or has no output.`,
    );
  console.log(
    `${name}: raw ${bytes.length} B | gzip ${gzipSync(bytes).length} B | Brotli ${brotliCompressSync(bytes).length} B`,
  );
}
const css = await readFile('src/themes.css');
console.log(
  `All six themes: raw ${css.length} B | gzip ${gzipSync(css).length} B | Brotli ${brotliCompressSync(css).length} B`,
);
