import { build } from 'esbuild';
import { readdir, mkdir, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
await import('./metadata.mjs');
const components = (await readdir('src/components'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => `src/components/${f}`);
const internal = (await readdir('src/internal'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => `src/internal/${f}`);
const adapters = [
  'src/adapters/react.ts',
  'src/adapters/vue.ts',
  ...(await readdir('src/adapters/react'))
    .filter((file) => file.endsWith('.ts'))
    .map((file) => `src/adapters/react/${file}`),
];
const effects = (await readdir('src/effects'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => `src/effects/${f}`);
const sources = [
  'src/index.ts',
  'src/icons.ts',
  ...components,
  ...internal,
  ...adapters,
  ...effects,
];
await mkdir('dist', { recursive: true });
// ESM keeps one shared Lit dependency for applications using a bundler.
await build({
  entryPoints: sources,
  outdir: 'dist',
  outbase: 'src',
  bundle: false,
  format: 'esm',
  target: 'es2022',
});
// Add file extensions so these modules also follow native ESM resolution.
const { readFile, writeFile } = await import('node:fs/promises');
const esmExtensions = (content) =>
  content.replace(
    /((?:from\s*|import\s*)["'])(\.\.?\/[^"']+)(["'])/g,
    (match, before, path, after) =>
      `${before}${/\.[a-z]+$/i.test(path) ? path : path + '.js'}${after}`,
  );
for (const source of sources) {
  const file = source.replace(/^src\//, 'dist/').replace(/\.ts$/, '.js');
  const content = await readFile(file, 'utf8');
  await writeFile(file, esmExtensions(content));
}
// Browser build is self-contained: one module script, with no import map required.
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/terminal.js',
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  metafile: true,
}).then(async (result) =>
  writeFile('dist/metafile.json', JSON.stringify(result.metafile, null, 2)),
);
execFileSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '--project', 'tsconfig.build.json'],
  { stdio: 'inherit' },
);
for (const source of sources) {
  const file = source.replace(/^src\//, 'dist/').replace(/\.ts$/, '.d.ts');
  const content = await readFile(file, 'utf8');
  await writeFile(file, esmExtensions(content));
}
for (const name of ['themes', 'typography', 'image-effects']) {
  await copyFile(`src/${name}.css`, `dist/${name}.css`);
  await writeFile(`dist/${name}.css.d.ts`, 'export {};\n');
}
execFileSync(
  process.execPath,
  ['node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js', '-p', 'tsconfig.angular.json'],
  { stdio: 'inherit' },
);
console.log(
  'Built ESM, declarations, standalone bundle, metadata, and optional framework adapters.',
);
