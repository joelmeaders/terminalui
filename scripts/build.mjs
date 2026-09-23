import { build } from 'esbuild';
import { readdir, mkdir, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const components = (await readdir('src/components'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => `src/components/${f}`);
const internal = (await readdir('src/internal'))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => `src/internal/${f}`);
await mkdir('dist', { recursive: true });
// ESM keeps one shared Lit dependency for applications using a bundler.
await build({
  entryPoints: ['src/index.ts', ...components, ...internal],
  outdir: 'dist',
  outbase: 'src',
  bundle: false,
  format: 'esm',
  target: 'es2022',
});
// Add file extensions so these modules also follow native ESM resolution.
const { readFile, writeFile } = await import('node:fs/promises');
for (const source of ['src/index.ts', ...components, ...internal]) {
  const file = source.replace(/^src\//, 'dist/').replace(/\.ts$/, '.js');
  const content = await readFile(file, 'utf8');
  await writeFile(file, content.replace(/(from\s+["'])(\.\.?\/[^"']+)(["'])/g, '$1$2.js$3'));
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
for (const source of ['src/index.ts', ...components, ...internal]) {
  const file = source.replace(/^src\//, 'dist/').replace(/\.ts$/, '.d.ts');
  const content = await readFile(file, 'utf8');
  await writeFile(file, content.replace(/(from\s+["'])(\.\.?\/[^"']+)(["'])/g, '$1$2.js$3'));
}
await copyFile('src/themes.css', 'dist/themes.css');
console.log('Built ESM modules, declarations, themes, and standalone browser bundle.');
